import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';
import { EmailNotificationService } from '../services/emailNotificationService.js';

export class ContactController {
  /**
   * Handle all contact-related requests
   * @param {Object} req - Request object
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path } = req;
    
    try {
      // POST /api/contact
      if (path === '/api/contact' && method === 'POST') {
        return await this.submitContactForm(req);
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist`);

    } catch (error) {
      console.error('Error in contact controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/contact
   * Handle contact form submission with email notification
   */
  static async submitContactForm(req) {
    try {
      const { body } = req;
      const { email, message } = body;
      
      // Basic validation
      if (!email || !message) {
        return createErrorResponse(400, 'Validation Error', 
          'Email and message are required');
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createErrorResponse(400, 'Validation Error', 
          'Invalid email format');
      }
      
      // Message length validation
      if (message.trim().length < 10) {
        return createErrorResponse(400, 'Validation Error', 
          'Message must be at least 10 characters long');
      }
      
      if (message.trim().length > 1000) {
        return createErrorResponse(400, 'Validation Error', 
          'Message cannot exceed 1000 characters');
      }
      
      console.log(`Email: ${email}`);
      console.log(`Message: ${message.trim()}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      
      // Send email notification
      try {
        const emailService = new EmailNotificationService();
        await emailService.sendContactFormNotification({
          email: email,
          message: message.trim(),
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Contact form email notification sent');
      } catch (emailError) {
        console.error('❌ Contact form email notification failed:', emailError.message);
        // Continue anyway - don't fail the contact form submission
      }
      
      // Return success response
      return createSuccessResponse(200, {
        timestamp: new Date().toISOString(),
        emailNotificationSent: true
      }, 'Contact form submitted successfully');
      
    } catch (error) {
      console.error('Error processing contact form:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }
}