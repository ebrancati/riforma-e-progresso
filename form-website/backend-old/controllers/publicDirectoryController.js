import { BookingLink } from '../models/BookingLink.js';

export class PublicDirectoryController {
  
  /**
   * GET /api/public/directory
   * Get all active booking links for public display
   */
  static async getActiveBookingLinks(req, res) {
    try {
      // Get all booking links
      const allBookingLinks = await BookingLink.findAll();
      
      // Filter only active ones
      const activeLinks = allBookingLinks.filter(link => link.isActive);
      
      // Format for public display (remove sensitive internal data)
      const publicLinks = activeLinks.map(link => {
        // Generate the full booking URL
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost:5000';
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
      
      res.status(200).json({
        message: 'Active booking links retrieved successfully',
        count: publicLinks.length,
        bookingLinks: publicLinks,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error retrieving active booking links:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}