import { BookingLink } from '../models/BookingLink.js';
import { Template } from '../models/Template.js';

export class BookingLinkController {
  // GET /api/booking-links
  static async getAllBookingLinks(req, res) {
    try {
      const bookingLinks = await BookingLink.findAll();
      res.status(200).json(bookingLinks);
    } catch (error) {
      console.error('Error retrieving booking links:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // GET /api/booking-links/:id
  static async getBookingLinkById(req, res) {
    try {
      const { id } = req.params;
      const bookingLink = await BookingLink.findById(id);
      res.status(200).json(bookingLink);
    } catch (error) {
      console.error('Error retrieving booking link:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }
      
      if (error.message === 'Invalid booking link ID') {
        return res.status(400).json({
          error: 'Invalid Booking Link ID',
          details: 'The ID provided is not a valid booking link ID (must start with BL_)'
        });
      }
      
      if (error.message === 'Booking link not found') {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No booking link found with this ID'
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }

  // PUT /api/booking-links/:id
  static async updateBookingLink(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove non-modifiable fields if present in request
      delete updateData.urlSlug;
      delete updateData.duration;
      delete updateData.id;
      delete updateData.created;
      delete updateData.updatedAt;

      // Define allowed fields for update
      const allowedFields = ['name', 'templateId', 'requireAdvanceBooking', 'advanceHours', 'isActive'];
      const sanitizedData = {};

      // Only include allowed fields
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          sanitizedData[field] = updateData[field];
        }
      });

      // Validate that we have something to update
      if (Object.keys(sanitizedData).length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update',
          details: 'Please provide at least one field to update (name, templateId, requireAdvanceBooking, advanceHours, isActive)'
        });
      }

      // If templateId is being updated, verify it exists
      if (sanitizedData.templateId) {
        try {
          await Template.findById(sanitizedData.templateId);
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

      // Validate advance booking settings consistency
      if (sanitizedData.requireAdvanceBooking !== undefined || sanitizedData.advanceHours !== undefined) {
        // Get current booking link to check existing values
        const currentBookingLink = await BookingLink.findById(id);
        
        const finalRequireAdvance = sanitizedData.requireAdvanceBooking !== undefined 
          ? sanitizedData.requireAdvanceBooking 
          : currentBookingLink.requireAdvanceBooking;
        
        const finalAdvanceHours = sanitizedData.advanceHours !== undefined 
          ? sanitizedData.advanceHours 
          : currentBookingLink.advanceHours;

        if (finalRequireAdvance && ![6, 12, 24, 48].includes(finalAdvanceHours)) {
          return res.status(400).json({
            error: 'Invalid advance hours',
            details: 'Advance hours must be 6, 12, 24, or 48 when advance booking is required'
          });
        }

        if (!finalRequireAdvance) {
          sanitizedData.advanceHours = 0;
        }
      }

      // Perform the update
      const updatedBookingLink = await BookingLink.updateById(id, sanitizedData);

      res.status(200).json({
        message: 'Booking link updated successfully',
        bookingLink: updatedBookingLink
      });

    } catch (error) {
      console.error('Error updating booking link:', error);

      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }

      if (error.message === 'Invalid booking link ID') {
        return res.status(400).json({
          error: 'Invalid Booking Link ID',
          details: 'The ID provided is not a valid booking link ID (must start with BL_)'
        });
      }

      if (error.message === 'Booking link not found') {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No booking link found with this ID'
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

  // DELETE /api/booking-links/:id
  static async deleteBookingLink(req, res) {
    try {
      const { id } = req.params;
      const result = await BookingLink.deleteById(id);
      
      res.status(200).json({
        message: 'Booking link successfully deleted',
        deletedId: result.deletedId
      });
    } catch (error) {
      console.error('Error deleting booking link:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return res.status(400).json({
          error: 'Invalid ID Format',
          details: 'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)'
        });
      }
      
      if (error.message === 'Invalid booking link ID') {
        return res.status(400).json({
          error: 'Invalid Booking Link ID',
          details: 'The ID provided is not a valid booking link ID (must start with BL_)'
        });
      }
      
      if (error.message === 'Booking link not found') {
        return res.status(404).json({
          error: 'Booking link not found',
          details: 'No booking link found with this ID'
        });
      }
      
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
  
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
      
      // Build URL manually since we're using native HTTP server
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