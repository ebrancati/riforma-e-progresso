import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

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
   * Handle contact form submission
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
      
      // Log the contact form data (as requested - no database save)
      console.log('\n=== CONTACT FORM SUBMITTED ===');
      console.log(`Email: ${email}`);
      console.log(`Message: ${message.trim()}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('===============================\n');
      
      // Return success response
      return createSuccessResponse(200, {
        timestamp: new Date().toISOString()
      }, 'Contact form submitted successfully');
      
    } catch (error) {
      console.error('Error processing contact form:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }
}