import { Booking } from '../models/Booking.js';
import { BookingLink } from '../models/BookingLink.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { generateUUID } from '../utils/uuid.js';

export class PublicCancelRescheduleController {
  
  /**
   * GET /api/public/booking/{bookingId}/details?token={uuid}
   * Get booking details for cancel/reschedule (with token validation)
   */
  static async getBookingDetails(req, res) {
    try {
      const { bookingId } = req.params;
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({
          error: 'Missing token',
          details: 'Token is required for accessing booking details'
        });
      }
      
      // Find booking by ID and validate token
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
          details: 'No booking found with this ID'
        });
      }
      
      if (booking.cancellationToken !== token) {
        return res.status(403).json({
          error: 'Invalid token',
          details: 'The provided token is not valid for this booking'
        });
      }
      
      if (booking.status === 'cancelled') {
        return res.status(410).json({
          error: 'Booking already cancelled',
          details: 'This booking has already been cancelled'
        });
      }
      
      // Check if booking is in the past
      const bookingDateTime = new Date(`${booking.selectedDate}T${booking.selectedTime}:00`);
      const now = new Date();
      
      if (bookingDateTime < now) {
        return res.status(410).json({
          error: 'Booking in the past',
          details: 'Cannot modify bookings that have already occurred'
        });
      }
      
      // Get booking link details
      const bookingLink = await BookingLink.findById(booking.bookingLinkId);
      
      res.status(200).json({
        booking: {
          id: booking.id,
          selectedDate: booking.selectedDate,
          selectedTime: booking.selectedTime,
          firstName: booking.firstName,
          lastName: booking.lastName,
          email: booking.email,
          phone: booking.phone,
          role: booking.role,
          notes: booking.notes,
          status: booking.status,
          createdAt: booking.createdAt
        },
        bookingLink: {
          name: bookingLink.name,
          duration: bookingLink.duration,
          urlSlug: bookingLink.urlSlug
        }
      });
      
    } catch (error) {
      console.error('Error retrieving booking details:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * POST /api/public/booking/{bookingId}/cancel
   * Cancel a booking
   */
  static async cancelBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const { token, reason } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'Missing token',
          details: 'Token is required for cancelling booking'
        });
      }
      
      // Find and validate booking
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
          details: 'No booking found with this ID'
        });
      }
      
      if (booking.cancellationToken !== token) {
        return res.status(403).json({
          error: 'Invalid token',
          details: 'The provided token is not valid for this booking'
        });
      }
      
      if (booking.status === 'cancelled') {
        return res.status(410).json({
          error: 'Already cancelled',
          details: 'This booking has already been cancelled'
        });
      }
      
      // Check if booking is in the past
      const bookingDateTime = new Date(`${booking.selectedDate}T${booking.selectedTime}:00`);
      const now = new Date();
      
      if (bookingDateTime < now) {
        return res.status(410).json({
          error: 'Booking in the past',
          details: 'Cannot cancel bookings that have already occurred'
        });
      }
      
      // Update booking status to cancelled
      const updatedBooking = await Booking.updateStatus(bookingId, 'cancelled');
      
      // TODO: Here you could log the cancellation reason if needed
      console.log(`Booking ${bookingId} cancelled. Reason: ${reason || 'No reason provided'}`);
      
      res.status(200).json({
        message: 'Booking cancelled successfully',
        booking: updatedBooking
      });
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * POST /api/public/booking/{bookingId}/reschedule
   * Reschedule a booking to new date/time
   */
  static async rescheduleBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const { token, newDate, newTime } = req.body;
      
      if (!token || !newDate || !newTime) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'Token, newDate, and newTime are required'
        });
      }
      
      // Validate date and time format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        return res.status(400).json({
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format'
        });
      }
      
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
        return res.status(400).json({
          error: 'Invalid time format',
          details: 'Time must be in HH:MM format'
        });
      }
      
      // Find and validate booking
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found',
          details: 'No booking found with this ID'
        });
      }
      
      if (booking.cancellationToken !== token) {
        return res.status(403).json({
          error: 'Invalid token',
          details: 'The provided token is not valid for this booking'
        });
      }
      
      if (booking.status === 'cancelled') {
        return res.status(410).json({
          error: 'Booking cancelled',
          details: 'Cannot reschedule a cancelled booking'
        });
      }
      
      // Check if new date/time is in the past
      const newBookingDateTime = new Date(`${newDate}T${newTime}:00`);
      const now = new Date();
      
      if (newBookingDateTime < now) {
        return res.status(400).json({
          error: 'Invalid new date/time',
          details: 'Cannot reschedule to a date/time in the past'
        });
      }
      
      // Check if original booking is in the past
      const originalDateTime = new Date(`${booking.selectedDate}T${booking.selectedTime}:00`);
      
      if (originalDateTime < now) {
        return res.status(410).json({
          error: 'Original booking in the past',
          details: 'Cannot reschedule bookings that have already occurred'
        });
      }
      
      // Validate that new slot is available
      const validation = await AvailabilityService.validateBookingSlot(
        booking.bookingLinkId,
        newDate,
        newTime
      );
      
      if (!validation.valid) {
        return res.status(409).json({
          error: 'Time slot not available',
          details: validation.error
        });
      }
      
      // Update the booking with new date/time
      const collection = Booking.getCollection();
      await collection.updateOne(
        { id: bookingId },
        { 
          $set: { 
            selectedDate: newDate,
            selectedTime: newTime,
            updatedAt: new Date()
          }
        }
      );
      
      // Get updated booking
      const updatedBooking = await Booking.findById(bookingId);
      
      res.status(200).json({
        message: 'Booking rescheduled successfully',
        booking: updatedBooking,
        oldDateTime: {
          date: booking.selectedDate,
          time: booking.selectedTime
        },
        newDateTime: {
          date: newDate,
          time: newTime
        }
      });
      
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}