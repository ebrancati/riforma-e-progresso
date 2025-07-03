import { BookingLink } from '../models/BookingLink.js';
import { Template } from '../models/Template.js';

export class BookingLinkController {
  // POST /api/booking-links
  static async createBookingLink(req, res) {
    try {
      // Verify that the template exists
      if (req.body.templateId) {
        try {
          await Template.findById(req.body.templateId);
        } catch (templateError) {
          if (templateError.message === 'Template not found') {
            return res.status(400).json({
              error: 'Invalid Template',
              details: 'The specified template does not exist'
            });
          }

          throw templateError;
        }
      }

      const bookingLink = new BookingLink(req.body);
      const savedBookingLink = await bookingLink.save();

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || 'localhost:5000';
      const fullUrl = `${protocol}://${host}/book/${savedBookingLink.urlSlug}`;
      
      res.status(201).json({
        message: 'Booking link created successfully',
        bookingLink: savedBookingLink,
        url: fullUrl
      });
    } catch (error) {
      console.error('Error creating booking link:', error);
      
      if (error.message === 'A booking link with this URL already exists') {
        return res.status(409).json({
          error: 'URL already exists',
          details: 'This URL slug is already in use. Please choose a different one.'
        });
      }
      
      if (error.message === 'A booking link with this name already exists') {
        return res.status(409).json({
          error: 'Name already exists',
          details: 'A booking link with this name already exists. Please choose a different name.'
        });
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('can only contain') ||
          error.message.includes('cannot be empty')) {
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
}