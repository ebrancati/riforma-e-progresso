import { Booking } from '../models/Booking.js';
import { BookingLink } from '../models/BookingLink.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

export class PublicCancelRescheduleController {
  /**
   * Handle all cancel/reschedule-related requests
   * @param {Object} req - Request object with DynamoDB client
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path, dynamodb, query } = req;
    
    try {
      // GET /api/public/booking/{bookingId}/details
      const detailsMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/details$/);
      if (detailsMatch && method === 'GET') {
        const bookingId = detailsMatch[1];
        return await this.getBookingDetails(dynamodb, bookingId, query.token);
      }

      // POST /api/public/booking/{bookingId}/cancel
      const cancelMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/cancel$/);
      if (cancelMatch && method === 'POST') {
        const bookingId = cancelMatch[1];
        return await this.cancelBooking(req, bookingId);
      }

      // POST /api/public/booking/{bookingId}/reschedule
      const rescheduleMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/reschedule$/);
      if (rescheduleMatch && method === 'POST') {
        const bookingId = rescheduleMatch[1];
        return await this.rescheduleBooking(req, bookingId);
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist`);

    } catch (error) {
      console.error('Error in cancel/reschedule controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/booking/{bookingId}/details?token={uuid}
   * Get booking details for cancel/reschedule (with token validation)
   */
  static async getBookingDetails(dynamodb, bookingId, token) {
    try {
      if (!token) {
        return createErrorResponse(400, 'Missing token', 
          'Token is required for accessing booking details');
      }
      
      // Find booking by ID and validate token
      const booking = new Booking(dynamodb);
      const foundBooking = await booking.findById(bookingId);
      
      if (foundBooking.cancellationToken !== token) {
        return createErrorResponse(403, 'Invalid token', 
          'The provided token is not valid for this booking');
      }
      
      if (foundBooking.status === 'cancelled') {
        return createErrorResponse(410, 'Booking already cancelled', 
          'This booking has already been cancelled');
      }
      
      // Check if booking is in the past
      const bookingDateTime = new Date(`${foundBooking.selectedDate}T${foundBooking.selectedTime}:00`);
      const now = new Date();
      
      if (bookingDateTime < now) {
        return createErrorResponse(410, 'Booking in the past', 
          'Cannot modify bookings that have already occurred');
      }
      
      // Get booking link details
      const bookingLink = new BookingLink(dynamodb);
      const bookingLinkData = await bookingLink.findById(foundBooking.bookingLinkId);
      
      return createSuccessResponse(200, {
        booking: {
          id: foundBooking.id,
          selectedDate: foundBooking.selectedDate,
          selectedTime: foundBooking.selectedTime,
          firstName: foundBooking.firstName,
          lastName: foundBooking.lastName,
          email: foundBooking.email,
          phone: foundBooking.phone,
          role: foundBooking.role,
          notes: foundBooking.notes,
          status: foundBooking.status,
          createdAt: foundBooking.createdAt
        },
        bookingLink: {
          name: bookingLinkData.name,
          duration: bookingLinkData.duration,
          urlSlug: bookingLinkData.urlSlug
        }
      });
      
    } catch (error) {
      console.error('Error retrieving booking details:', error);
      
      if (error.message === 'Booking not found') {
        return createErrorResponse(404, 'Booking not found', 
          'No booking found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/public/booking/{bookingId}/cancel
   * Cancel a booking and invalidate cache
   */
  static async cancelBooking(req, bookingId) {
    try {
      const { dynamodb, body } = req;
      const { token, reason } = body;
      
      if (!token) {
        return createErrorResponse(400, 'Missing token', 
          'Token is required for cancelling booking');
      }
      
      // Find and validate booking
      const booking = new Booking(dynamodb);
      const foundBooking = await booking.findById(bookingId);
      
      if (foundBooking.cancellationToken !== token) {
        return createErrorResponse(403, 'Invalid token', 
          'The provided token is not valid for this booking');
      }
      
      if (foundBooking.status === 'cancelled') {
        return createErrorResponse(410, 'Already cancelled', 
          'This booking has already been cancelled');
      }
      
      // Check if booking is in the past
      const bookingDateTime = new Date(`${foundBooking.selectedDate}T${foundBooking.selectedTime}:00`);
      const now = new Date();
      
      if (bookingDateTime < now) {
        return createErrorResponse(410, 'Booking in the past', 
          'Cannot cancel bookings that have already occurred');
      }
      
      // Store original date for cache invalidation
      const originalDate = foundBooking.selectedDate;
      const bookingLinkId = foundBooking.bookingLinkId;
      
      // Update booking status to cancelled
      const updatedBooking = await booking.updateStatus(bookingId, 'cancelled');
      
      // Invalidate cache after cancellation
      const availabilityService = new AvailabilityService(dynamodb);
      await availabilityService.invalidateCacheForBookingEvent(
        bookingLinkId,
        originalDate,
        'cancel'
      );
      
      console.log(`Cache invalidated after booking cancellation: ${bookingLinkId} - ${originalDate}`);
      
      // Log the cancellation reason
      console.log(`Booking ${bookingId} cancelled. Reason: ${reason || 'No reason provided'}`);
      
      return createSuccessResponse(200, 
        { booking: updatedBooking }, 
        'Booking cancelled successfully'
      );
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      
      if (error.message === 'Booking not found') {
        return createErrorResponse(404, 'Booking not found', 
          'No booking found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/public/booking/{bookingId}/reschedule
   * Reschedule a booking to new date/time and invalidate cache
   */
  static async rescheduleBooking(req, bookingId) {
    try {
      const { dynamodb, body } = req;
      const { token, newDate, newTime } = body;
      
      if (!token || !newDate || !newTime) {
        return createErrorResponse(400, 'Missing required fields', 
          'Token, newDate, and newTime are required');
      }
      
      // Validate date and time format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        return createErrorResponse(400, 'Invalid date format', 
          'Date must be in YYYY-MM-DD format');
      }
      
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
        return createErrorResponse(400, 'Invalid time format', 
          'Time must be in HH:MM format');
      }
      
      // Find and validate booking
      const booking = new Booking(dynamodb);
      const foundBooking = await booking.findById(bookingId);
      
      if (foundBooking.cancellationToken !== token) {
        return createErrorResponse(403, 'Invalid token', 
          'The provided token is not valid for this booking');
      }
      
      if (foundBooking.status === 'cancelled') {
        return createErrorResponse(410, 'Booking cancelled', 
          'Cannot reschedule a cancelled booking');
      }
      
      // Check if new date/time is in the past
      const newBookingDateTime = new Date(`${newDate}T${newTime}:00`);
      const now = new Date();
      
      if (newBookingDateTime < now) {
        return createErrorResponse(400, 'Invalid new date/time', 
          'Cannot reschedule to a date/time in the past');
      }
      
      // Check if original booking is in the past
      const originalDateTime = new Date(`${foundBooking.selectedDate}T${foundBooking.selectedTime}:00`);
      
      if (originalDateTime < now) {
        return createErrorResponse(410, 'Original booking in the past', 
          'Cannot reschedule bookings that have already occurred');
      }
      
      // Validate that new slot is available
      const availabilityService = new AvailabilityService(dynamodb);
      const validation = await availabilityService.validateBookingSlot(
        foundBooking.bookingLinkId,
        newDate,
        newTime
      );
      
      if (!validation.valid) {
        return createErrorResponse(409, 'Time slot not available', validation.error);
      }
      
      // Store original date/time for cache invalidation
      const originalDate = foundBooking.selectedDate;
      const bookingLinkId = foundBooking.bookingLinkId;
      
      // Update the booking with new date/time
      const updatedBooking = await booking.updateBookingDateTime(bookingId, newDate, newTime);
      
      // Invalidate cache for both dates
      await availabilityService.invalidateCacheForBookingEvent(
        bookingLinkId,
        newDate,
        'reschedule',
        originalDate
      );
      
      console.log(`Cache invalidated after booking reschedule: ${bookingLinkId} - ${originalDate} → ${newDate}`);
      
      return createSuccessResponse(200, {
        booking: updatedBooking,
        oldDateTime: {
          date: originalDate,
          time: foundBooking.selectedTime
        },
        newDateTime: {
          date: newDate,
          time: newTime
        }
      }, 'Booking rescheduled successfully');
      
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      
      if (error.message === 'Booking not found') {
        return createErrorResponse(404, 'Booking not found', 
          'No booking found with this ID');
      }
      
      if (error.message.includes('not available')) {
        return createErrorResponse(409, 'Time slot conflict', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }
}