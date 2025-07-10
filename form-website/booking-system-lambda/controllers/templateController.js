import { Template } from '../models/Template.js';
import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';
import { InputSanitizer } from '../utils/sanitizer.js';

export class TemplateController {
  /**
   * Handle all template-related requests
   * @param {Object} req - Request object with DynamoDB client
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path, dynamodb } = req;
    
    try {
      // Parse template ID from path if present
      const templateMatch = path.match(/^\/api\/templates\/(.+)$/);
      const templateId = templateMatch ? templateMatch[1] : null;

      // Route to appropriate method
      if (path === '/api/templates' && method === 'GET') {
        return await this.getAllTemplates(dynamodb);
      }

      if (path === '/api/templates' && method === 'POST') {
        return await this.createTemplate(req);
      }

      if (templateId) {
        req.params = { id: templateId };
        
        switch (method) {
          case 'GET':
            return await this.getTemplateById(dynamodb, templateId);
          case 'PUT':
            return await this.updateTemplate(req);
          case 'DELETE':
            return await this.deleteTemplate(dynamodb, templateId);
          default:
            return createErrorResponse(405, 'Method not allowed', `${method} not supported for this endpoint`);
        }
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist`);

    } catch (error) {
      console.error('Error in template controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/templates
   * Get all templates
   */
  static async getAllTemplates(dynamodb) {
    try {
      const template = new Template(dynamodb);
      const templates = await template.findAll();
      
      return createSuccessResponse(200, templates);
    } catch (error) {
      console.error('Error retrieving templates:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/templates/:id
   * Get template by ID
   */
  static async getTemplateById(dynamodb, id) {
    try {
      const template = new Template(dynamodb);
      const foundTemplate = await template.findById(id);
      
      return createSuccessResponse(200, foundTemplate);
    } catch (error) {
      console.error('Error retrieving template:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }
      
      if (error.message === 'Invalid template ID') {
        return createErrorResponse(400, 'Invalid Template ID', 
          'The ID provided is not a valid template ID (must start with TPL_)');
      }
      
      if (error.message === 'Template not found') {
        return createErrorResponse(404, 'Template not found', 
          'No template found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/templates
   * Create new template
   */
  static async createTemplate(req) {
    try {
      const { dynamodb, body } = req;
      
      // Validate and sanitize input data
      const validationResult = this.validateTemplateData(body);
      if (!validationResult.isValid) {
        return createErrorResponse(400, 'Validation Error', validationResult.errors.join(', '));
      }

      // Create and save template
      const template = new Template(dynamodb, body);
      const savedTemplate = await template.save();
      
      return createSuccessResponse(201, 
        { template: savedTemplate }, 
        'Template created successfully'
      );
    } catch (error) {
      console.error('Error creating template:', error);
      
      if (error.message === 'A template with this name already exists') {
        return createErrorResponse(409, 'Template already exists', error.message);
      }
      
      // Handle validation errors from InputSanitizer
      if (error.message.includes('sanitization') || 
          error.message.includes('required') ||
          error.message.includes('Invalid')) {
        return createErrorResponse(400, 'Validation Error', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * PUT /api/templates/:id
   * Update existing template
   */
  static async updateTemplate(req) {
    try {
      const { dynamodb, body, params } = req;
      const { id } = params;
      
      // Validate input data
      const validationResult = this.validateTemplateData(body);
      if (!validationResult.isValid) {
        return createErrorResponse(400, 'Validation Error', validationResult.errors.join(', '));
      }

      // Update template
      const template = new Template(dynamodb);
      const updatedTemplate = await template.updateById(id, body);
      
      return createSuccessResponse(200, 
        { template: updatedTemplate }, 
        'Template updated successfully'
      );
    } catch (error) {
      console.error('Error updating template:', error);
      
      // Handle ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }
      
      if (error.message === 'Invalid template ID') {
        return createErrorResponse(400, 'Invalid Template ID', 
          'The ID provided is not a valid template ID (must start with TPL_)');
      }
      
      if (error.message === 'Template not found') {
        return createErrorResponse(404, 'Template not found', 
          'No template found with this ID');
      }
      
      if (error.message === 'Another template with this name already exists') {
        return createErrorResponse(409, 'Name already exists', error.message);
      }
      
      // Handle validation errors
      if (error.message.includes('sanitization') || 
          error.message.includes('Invalid')) {
        return createErrorResponse(400, 'Validation Error', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * DELETE /api/templates/:id
   * Delete template
   */
  static async deleteTemplate(dynamodb, id) {
    try {
      const template = new Template(dynamodb);
      const result = await template.deleteById(id);
      
      return createSuccessResponse(200, 
        { deletedId: result.deletedId }, 
        'Template successfully deleted'
      );
    } catch (error) {
      console.error('Error deleting template:', error);
      
      // Handle ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }
      
      if (error.message === 'Invalid template ID') {
        return createErrorResponse(400, 'Invalid Template ID', 
          'The ID provided is not a valid template ID (must start with TPL_)');
      }
      
      if (error.message === 'Template not found') {
        return createErrorResponse(404, 'Template not found', 
          'No template found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * Validate template data before processing (enhanced security)
   * @param {Object} data - Template data to validate
   * @returns {Object} Validation result
   */
  static validateTemplateData(data) {
    try {
      // Security: Check for malicious content in all string fields
      const maliciousPatterns = ['<script', 'javascript:', 'eval(', 'Function(', 'setTimeout(', 'setInterval('];
      
      function checkForMaliciousContent(obj, path = '') {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            for (const pattern of maliciousPatterns) {
              if (lowerValue.includes(pattern)) {
                throw new Error(`Malicious content detected in ${path}${key}: ${pattern}`);
              }
            }
          } else if (typeof value === 'object' && value !== null) {
            checkForMaliciousContent(value, `${path}${key}.`);
          }
        }
      }
      
      checkForMaliciousContent(data);
      
      // Pre-validate using InputSanitizer for security
      InputSanitizer.validateTemplateData(data);
      
      // Additional validation using Template class for business rules
      const validation = Template.validate(data);
      
      return validation;
    } catch (error) {
      // InputSanitizer throws errors for security violations
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }
}