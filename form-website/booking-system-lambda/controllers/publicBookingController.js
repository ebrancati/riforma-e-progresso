import { BookingLink } from '../models/BookingLink.js';
import { Booking } from '../models/Booking.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

export class PublicBookingController {
  /**
   * Handle all public booking-related requests
   * @param {Object} req - Request object with DynamoDB client
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path, dynamodb } = req;
    
    try {
      // Parse different URL patterns
      
      // GET /api/public/directory
      if (path === '/api/public/directory' && method === 'GET') {
        return await this.getActiveBookingLinks(req);
      }

      // GET /api/public/booking/:slug
      const bookingInfoMatch = path.match(/^\/api\/public\/booking\/([^\/]+)$/);
      if (bookingInfoMatch && method === 'GET') {
        const slug = bookingInfoMatch[1];
        return await this.getBookingLinkBySlug(dynamodb, slug);
      }

      // GET /api/public/booking/:slug/availability/:year/:month
      const availabilityMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/availability\/(\d{4})\/(\d{1,2})$/);
      if (availabilityMatch && method === 'GET') {
        const [, slug, year, month] = availabilityMatch;
        return await this.getMonthAvailability(dynamodb, slug, parseInt(year), parseInt(month));
      }

      // GET /api/public/booking/:slug/slots/:date
      const slotsMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/slots\/(\d{4}-\d{2}-\d{2})$/);
      if (slotsMatch && method === 'GET') {
        const [, slug, date] = slotsMatch;
        return await this.getAvailableTimeSlots(dynamodb, slug, date);
      }

      // POST /api/public/booking/:slug/book
      const bookMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/book$/);
      if (bookMatch && method === 'POST') {
        const slug = bookMatch[1];
        return await this.createBooking(req, slug);
      }

      // GET /api/public/booking/:slug/validate/:date/:time
      const validateMatch = path.match(/^\/api\/public\/booking\/([^\/]+)\/validate\/(\d{4}-\d{2}-\d{2})\/(\d{1,2}:\d{2})$/);
      if (validateMatch && method === 'GET') {
        const [, slug, date, time] = validateMatch;
        return await this.validateTimeSlot(dynamodb, slug, date, time);
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist in public booking API`);

    } catch (error) {
      console.error('Error in public booking controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/directory
   * Get all active booking links for public display
   */
  static async getActiveBookingLinks(req) {
    try {
      const { dynamodb, headers } = req;
      
      // Get all booking links
      const bookingLink = new BookingLink(dynamodb);
      const allBookingLinks = await bookingLink.findAll();
      
      // Filter only active ones
      const activeLinks = allBookingLinks.filter(link => link.isActive);
      
      // Format for public display (remove sensitive internal data)
      const publicLinks = activeLinks.map(link => {
        // Generate the full booking URL
        const protocol = headers['x-forwarded-proto'] || 'https';
        const host = headers.host || 'api.example.com';
        const bookingUrl = `${protocol}://${host}/book/${link.urlSlug}`;
        
        return {
          name: link.name,
          urlSlug: link.urlSlug,
          duration: link.duration,
          requireAdvanceBooking: link.requireAdvanceBooking,
          advanceHours: link.advanceHours,
          bookingUrl: bookingUrl,
          created: link.created
        };
      });
      
      // Sort by creation date (newest first)
      publicLinks.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return createSuccessResponse(200, {
        count: publicLinks.length,
        bookingLinks: publicLinks,
        timestamp: new Date().toISOString()
      }, 'Active booking links retrieved successfully');
      
    } catch (error) {
      console.error('Error retrieving active booking links:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/booking/:slug
   * Get booking link information by URL slug
   */
  static async getBookingLinkBySlug(dynamodb, slug) {
    try {
      // Validate slug format
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return createErrorResponse(400, 'Invalid URL slug', 
          'URL slug is required and must be a valid string');
      }
      
      // Find booking link by URL slug
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findBySlug(slug.trim());
      
      if (!foundBookingLink) {
        return createErrorResponse(404, 'Booking link not found', 
          'No active booking link found with this URL');
      }
      
      // Check if booking link is active
      if (!foundBookingLink.isActive) {
        return createErrorResponse(404, 'Booking link not available', 
          'This booking link is no longer active');
      }
      
      return createSuccessResponse(200, foundBookingLink);
      
    } catch (error) {
      console.error('Error retrieving booking link by slug:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/booking/:slug/availability/:year/:month
   * Get availability for a specific month (using persistent cache)
   */
  static async getMonthAvailability(dynamodb, slug, year, month) {
    try {
      // Validate parameters
      if (isNaN(year) || year < 2024 || year > 2030) {
        return createErrorResponse(400, 'Invalid year', 
          'Year must be a number between 2024 and 2030');
      }
      
      if (isNaN(month) || month < 1 || month > 12) {
        return createErrorResponse(400, 'Invalid month', 
          'Month must be a number between 1 and 12');
      }
      
      // Find booking link by slug
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findBySlug(slug.trim());
      
      if (!foundBookingLink || !foundBookingLink.isActive) {
        return createErrorResponse(404, 'Booking link not found', 
          'No active booking link found with this URL');
      }
      
      // Get availability using persistent cache
      const availabilityService = new AvailabilityService(dynamodb);
      const availability = await availabilityService.getMonthAvailability(
        foundBookingLink.id,
        year,
        month
      );
      
      return createSuccessResponse(200, {
        year: year,
        month: month,
        bookingLinkId: foundBookingLink.id,
        availability: availability,
        cached: true // Indicate this comes from cache
      });
      
    } catch (error) {
      console.error('Error getting month availability:', error);
      
      if (error.message.includes('not found')) {
        return createErrorResponse(404, 'Resource not found', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/booking/:slug/slots/:date
   * Get available time slots for a specific date (real-time)
   */
  static async getAvailableTimeSlots(dynamodb, slug, date) {
    try {
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return createErrorResponse(400, 'Invalid date format', 
          'Date must be in YYYY-MM-DD format');
      }
      
      // Validate date is not in the past
      const selectedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return createErrorResponse(400, 'Invalid date', 
          'Cannot retrieve slots for past dates');
      }
      
      // Find booking link by slug
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findBySlug(slug.trim());
      
      if (!foundBookingLink || !foundBookingLink.isActive) {
        return createErrorResponse(404, 'Booking link not found', 
          'No active booking link found with this URL');
      }
      
      // Get available time slots (always real-time for accuracy)
      const availabilityService = new AvailabilityService(dynamodb);
      const timeSlots = await availabilityService.getAvailableTimeSlots(
        foundBookingLink.id,
        date
      );
      
      return createSuccessResponse(200, {
        date: date,
        bookingLinkId: foundBookingLink.id,
        timeSlots: timeSlots
      });
      
    } catch (error) {
      console.error('Error getting available time slots:', error);
      
      if (error.message.includes('not found')) {
        return createErrorResponse(404, 'Resource not found', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/public/booking/:slug/book
   * Create a new booking and invalidate cache
   */
  static async createBooking(req, slug) {
    try {
      const { dynamodb, body } = req;
      
      // Find booking link by slug
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findBySlug(slug.trim());
      
      if (!foundBookingLink || !foundBookingLink.isActive) {
        return createErrorResponse(404, 'Booking link not found', 
          'No active booking link found with this URL');
      }
      
      // Add booking link ID to the data
      const completeBookingData = {
        ...body,
        bookingLinkId: foundBookingLink.id
      };
      
      // Validate the booking slot before creating
      const availabilityService = new AvailabilityService(dynamodb);
      const validation = await availabilityService.validateBookingSlot(
        foundBookingLink.id,
        body.selectedDate,
        body.selectedTime
      );
      
      if (!validation.valid) {
        return createErrorResponse(400, 'Invalid booking slot', validation.error);
      }
      
      // Create the booking
      const booking = new Booking(dynamodb, completeBookingData);
      const savedBooking = await booking.save();
      
      // EVENT-DRIVEN CACHE INVALIDATION: Invalidate cache after successful booking
      await availabilityService.invalidateCacheForBookingEvent(
        foundBookingLink.id,
        body.selectedDate,
        'create'
      );
      
      console.log(`✅ Cache invalidated after booking creation: ${foundBookingLink.id} - ${body.selectedDate}`);
      
      return createSuccessResponse(201, 
        { booking: savedBooking }, 
        'Booking created successfully'
      );
      
    } catch (error) {
      console.error('Error creating booking:', error);
      
      if (error.message.includes('already booked') || 
          error.message.includes('no longer available')) {
        return createErrorResponse(409, 'Time slot conflict', error.message);
      }
      
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('format')) {
        return createErrorResponse(400, 'Validation Error', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/public/booking/:slug/validate/:date/:time
   * Validate if a specific time slot is available for booking
   */
  static async validateTimeSlot(dynamodb, slug, date, time) {
    try {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return createErrorResponse(400, 'Invalid date format', 
          'Date must be in YYYY-MM-DD format');
      }
      
      // Validate time format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return createErrorResponse(400, 'Invalid time format', 
          'Time must be in HH:MM format');
      }
      
      // Find booking link by slug
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findBySlug(slug.trim());
      
      if (!foundBookingLink || !foundBookingLink.isActive) {
        return createErrorResponse(404, 'Booking link not found', 
          'No active booking link found with this URL');
      }
      
      // Validate the time slot using AvailabilityService
      const availabilityService = new AvailabilityService(dynamodb);
      const validation = await availabilityService.validateBookingSlot(
        foundBookingLink.id,
        date,
        time
      );
      
      return createSuccessResponse(200, {
        valid: validation.valid,
        date: date,
        time: time,
        error: validation.error || null,
        bookingLinkId: foundBookingLink.id
      });
      
    } catch (error) {
      console.error('Error validating time slot:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }
}