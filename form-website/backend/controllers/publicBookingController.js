import { BookingLink } from '../models/BookingLink.js';
import { Booking } from '../models/Booking.js';
import { AvailabilityService } from '../services/availabilityService.js';

export class PublicBookingController {
  
  /**
   * GET /api/public/booking/:slug
   * Get booking link information by URL slug
   */
  static async getBookingLinkBySlug(req, res) {
    try {
      const { slug } = req.params;
      
      // Validate slug format
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid URL slug',
          details: 'URL slug is required and must be a valid string'
        });
      }
      
      // Find booking link by URL slug
      const bookingLinks = await BookingLink.findAll();
      const bookingLink = bookingLinks.find(link => link.urlSlug === slug.trim());
      
      if (!bookingLink) {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No active booking link found with this URL'
        });
      }
      
      // Check if booking link is active
      if (!bookingLink.isActive) {
        return res.status(404).json({
          error: 'Booking link not available',
          details: 'This booking link is no longer active'
        });
      }
      
      res.status(200).json(bookingLink);
      
    } catch (error) {
      console.error('Error retrieving booking link by slug:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * GET /api/public/booking/:slug/availability/:year/:month
   * Get availability for a specific month
   */
  static async getMonthAvailability(req, res) {
    try {
      const { slug, year, month } = req.params;
      
      // Validate parameters
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      
      if (isNaN(yearNum) || yearNum < 2024 || yearNum > 2030) {
        return res.status(400).json({
          error: 'Invalid year',
          details: 'Year must be a number between 2024 and 2030'
        });
      }
      
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          error: 'Invalid month',
          details: 'Month must be a number between 1 and 12'
        });
      }
      
      // Find booking link by slug
      const bookingLinks = await BookingLink.findAll();
      const bookingLink = bookingLinks.find(link => link.urlSlug === slug.trim());
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No active booking link found with this URL'
        });
      }
      
      // Calculate availability for the month
      const availability = await AvailabilityService.getMonthAvailability(
        bookingLink.id,
        yearNum,
        monthNum
      );
      
      res.status(200).json({
        year: yearNum,
        month: monthNum,
        bookingLinkId: bookingLink.id,
        availability: availability
      });
      
    } catch (error) {
      console.error('Error getting month availability:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Resource not found',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * GET /api/public/booking/:slug/slots/:date
   * Get available time slots for a specific date
   */
  static async getAvailableTimeSlots(req, res) {
    try {
      const { slug, date } = req.params;
      
      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format'
        });
      }
      
      // Validate date is not in the past
      const selectedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return res.status(400).json({
          error: 'Invalid date',
          details: 'Cannot retrieve slots for past dates'
        });
      }
      
      // Find booking link by slug
      const bookingLinks = await BookingLink.findAll();
      const bookingLink = bookingLinks.find(link => link.urlSlug === slug.trim());
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No active booking link found with this URL'
        });
      }
      
      // Get available time slots
      const timeSlots = await AvailabilityService.getAvailableTimeSlots(
        bookingLink.id,
        date
      );
      
      res.status(200).json({
        date: date,
        bookingLinkId: bookingLink.id,
        timeSlots: timeSlots
      });
      
    } catch (error) {
      console.error('Error getting available time slots:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Resource not found',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * POST /api/public/booking/:slug/book
   * Create a new booking
   */
  static async createBooking(req, res) {
    try {
      const { slug } = req.params;
      const bookingData = req.body;
      
      // Find booking link by slug
      const bookingLinks = await BookingLink.findAll();
      const bookingLink = bookingLinks.find(link => link.urlSlug === slug.trim());
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No active booking link found with this URL'
        });
      }
      
      // Add booking link ID to the data
      const completeBookingData = {
        ...bookingData,
        bookingLinkId: bookingLink.id
      };
      
      // Validate the booking slot before creating
      const validation = await AvailabilityService.validateBookingSlot(
        bookingLink.id,
        bookingData.selectedDate,
        bookingData.selectedTime
      );
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid booking slot',
          details: validation.error
        });
      }
      
      // Create the booking
      const booking = new Booking(completeBookingData);
      const savedBooking = await booking.save();
      
      res.status(201).json({
        message: 'Booking created successfully',
        booking: savedBooking
      });
      
    } catch (error) {
      console.error('Error creating booking:', error);
      
      if (error.message.includes('already booked') || 
          error.message.includes('no longer available')) {
        return res.status(409).json({
          error: 'Time slot conflict',
          details: error.message
        });
      }
      
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('format')) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.message
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
  /**
   * GET /api/public/booking/:slug/validate/:date/:time
   * Validate if a specific time slot is available for booking
   */
  static async validateTimeSlot(req, res) {
    try {
      const { slug, date, time } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: 'Invalid date format',
          details: 'Date must be in YYYY-MM-DD format'
        });
      }
      
      // Validate time format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return res.status(400).json({
          error: 'Invalid time format',
          details: 'Time must be in HH:MM format'
        });
      }
      
      // Find booking link by slug
      const bookingLinks = await BookingLink.findAll();
      const bookingLink = bookingLinks.find(link => link.urlSlug === slug.trim());
      
      if (!bookingLink || !bookingLink.isActive) {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No active booking link found with this URL'
        });
      }
      
      // Validate the time slot
      const validation = await AvailabilityService.validateBookingSlot(
        bookingLink.id,
        date,
        time
      );
      
      res.status(200).json({
        valid: validation.valid,
        date: date,
        time: time,
        error: validation.error || null,
        bookingLinkId: bookingLink.id
      });
      
    } catch (error) {
      console.error('Error validating time slot:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}