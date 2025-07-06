export class ContactController {
  
  /**
   * POST /api/contact
   * Handle contact form submission
   */
  static async submitContactForm(req, res) {
    try {
      const { email, message } = req.body;
      
      // Basic validation
      if (!email || !message) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'Email and message are required'
        });
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'Invalid email format'
        });
      }
      
      // Message length validation
      if (message.trim().length < 10) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'Message must be at least 10 characters long'
        });
      }
      
      if (message.trim().length > 1000) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'Message cannot exceed 1000 characters'
        });
      }
      
      // Log the contact form data (as requested - no database save)
      console.log('\n=== CONTACT FORM SUBMITTED ===');
      console.log(`Email: ${email}`);
      console.log(`Message: ${message.trim()}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('===============================\n');
      
      // Return success response
      res.status(200).json({
        message: 'Contact form submitted successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error processing contact form:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        details: error.message
      });
    }
  }
}