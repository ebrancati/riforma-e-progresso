import { BookingLink } from '../models/BookingLink.js';
import { Template } from '../models/Template.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

export class BookingLinkController {

  /**
   * Handle all booking link-related requests
   * @param {Object} req - Request object with DynamoDB client
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path, dynamodb, headers } = req;
    
    try {
      // Parse booking link ID from path if present
      const bookingLinkMatch = path.match(/^\/api\/booking-links\/(.+)$/);
      const bookingLinkId = bookingLinkMatch ? bookingLinkMatch[1] : null;

      // Route to appropriate method
      if (path === '/api/booking-links' && method === 'GET')
        return await BookingLinkController.getAllBookingLinks(dynamodb);

      if (path === '/api/booking-links' && method === 'POST')
        return await BookingLinkController.createBookingLink(req);

      if (bookingLinkId) {
        req.params = { id: bookingLinkId };
        
        switch (method) {
          case 'GET':
            return await BookingLinkController.getBookingLinkById(dynamodb, bookingLinkId);
          case 'PUT':
            return await BookingLinkController.updateBookingLink(req);
          case 'DELETE':
            return await BookingLinkController.deleteBookingLink(dynamodb, bookingLinkId);
          default:
            return createErrorResponse(405, 'Method not allowed', `${method} not supported for this endpoint`);
        }
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist`);

    } catch (error) {
      console.error('Error in booking link controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/booking-links
   * Get all booking links
   */
  static async getAllBookingLinks(dynamodb) {
    try {
      const bookingLink = new BookingLink(dynamodb);
      const bookingLinks = await bookingLink.findAll();
      
      return createSuccessResponse(200, bookingLinks);
    } catch (error) {
      console.error('Error retrieving booking links:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/booking-links/:id
   * Get booking link by ID
   */
  static async getBookingLinkById(dynamodb, id) {
    try {
      const bookingLink = new BookingLink(dynamodb);
      const foundBookingLink = await bookingLink.findById(id);
      
      return createSuccessResponse(200, foundBookingLink);
    } catch (error) {
      console.error('Error retrieving booking link:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }
      
      if (error.message === 'Invalid booking link ID') {
        return createErrorResponse(400, 'Invalid Booking Link ID', 
          'The ID provided is not a valid booking link ID (must start with BL_)');
      }
      
      if (error.message === 'Booking link not found') {
        return createErrorResponse(404, 'Booking link not found', 
          'No booking link found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * POST /api/booking-links
   * Create new booking link
   */
  static async createBookingLink(req) {
    try {
      const { dynamodb, body, headers } = req;

      const validationResult = BookingLinkController.validateBookingLinkData(body);
      if (!validationResult.isValid) {
        return createErrorResponse(400, 'Validation Error', validationResult.errors.join(', '));
      }

      // Verify that the template exists
      if (body.templateId) {
        try {
          const template = new Template(dynamodb);
          await template.findById(body.templateId);
        } catch (templateError) {
          if (templateError.message === 'Template not found') {
            return createErrorResponse(400, 'Invalid Template', 
              'The specified template does not exist');
          }
          throw templateError;
        }
      }

      // Create and save booking link
      const bookingLink = new BookingLink(dynamodb, body);
      const savedBookingLink = await bookingLink.save();
      
      // Build URL manually for Lambda
      const protocol = headers['x-forwarded-proto'] || 'https';
      const host = headers.host || 'api.example.com';
      const fullUrl = `${protocol}://${host}/book/${savedBookingLink.urlSlug}`;
      
      return createSuccessResponse(201, {
        bookingLink: savedBookingLink,
        url: fullUrl
      }, 'Booking link created successfully');
      
    } catch (error) {
      console.error('Error creating booking link:', error);
      
      if (error.message === 'A booking link with this URL already exists') {
        return createErrorResponse(409, 'URL already exists', 
          'This URL slug is already in use. Please choose a different one.');
      }
      
      if (error.message === 'A booking link with this name already exists') {
        return createErrorResponse(409, 'Name already exists', 
          'A booking link with this name already exists. Please choose a different name.');
      }
      
      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('can only contain') ||
          error.message.includes('cannot be empty')) {
        return createErrorResponse(400, 'Validation Error', error.message);
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * PUT /api/booking-links/:id
   * Update existing booking link and invalidate cache if needed
   */
  static async updateBookingLink(req) {
    try {
      const { dynamodb, body, params } = req;
      const { id } = params;

      // Remove non-modifiable fields if present in request
      delete body.urlSlug;
      delete body.duration;
      delete body.id;
      delete body.created;
      delete body.updatedAt;

      // Define allowed fields for update
      const allowedFields = ['name', 'templateId', 'requireAdvanceBooking', 'advanceHours', 'isActive'];
      const sanitizedData = {};

      // Only include allowed fields
      allowedFields.forEach(field => {
        if (body[field] !== undefined) {
          sanitizedData[field] = body[field];
        }
      });

      // Validate that we have something to update
      if (Object.keys(sanitizedData).length === 0) {
        return createErrorResponse(400, 'No valid fields to update', 
          'Please provide at least one field to update (name, templateId, requireAdvanceBooking, advanceHours, isActive)');
      }

      // If templateId is being updated, verify it exists
      if (sanitizedData.templateId) {
        try {
          const template = new Template(dynamodb);
          await template.findById(sanitizedData.templateId);
        } catch (templateError) {
          if (templateError.message === 'Template not found') {
            return createErrorResponse(400, 'Invalid Template', 
              'The specified template does not exist');
          }
          throw templateError;
        }
      }

      const validationResult = BookingLinkController.validateBookingLinkUpdateData(sanitizedData);
      if (!validationResult.isValid) {
        return createErrorResponse(400, 'Validation Error', validationResult.errors.join(', '));
      }

      // Create BookingLink instance to use updateItem method
      const bookingLink = new BookingLink(dynamodb);

      // Prepare update expression
      const updateFields = [];
      const expressionValues = {};
      let expressionAttributeNames = {};

      if (sanitizedData.name !== undefined) {
        updateFields.push('#name = :name');
        updateFields.push('GSI1SK = :gsi1sk');
        expressionValues[':name'] = sanitizedData.name;
        expressionValues[':gsi1sk'] = sanitizedData.name.toLowerCase();
        expressionAttributeNames['#name'] = 'name';
      }
      
      if (sanitizedData.templateId !== undefined) {
        updateFields.push('templateId = :templateId');
        expressionValues[':templateId'] = sanitizedData.templateId;
      }
      
      if (sanitizedData.requireAdvanceBooking !== undefined) {
        updateFields.push('requireAdvanceBooking = :requireAdvanceBooking');
        expressionValues[':requireAdvanceBooking'] = sanitizedData.requireAdvanceBooking;
      }
      
      if (sanitizedData.advanceHours !== undefined) {
        updateFields.push('advanceHours = :advanceHours');
        expressionValues[':advanceHours'] = sanitizedData.advanceHours;
      }
      
      if (sanitizedData.isActive !== undefined) {
        updateFields.push('isActive = :isActive');
        expressionValues[':isActive'] = sanitizedData.isActive;
      }

      // Always update timestamp
      updateFields.push('updatedAt = :updatedAt');
      expressionValues[':updatedAt'] = new Date().toISOString();

      const updateExpression = 'SET ' + updateFields.join(', ');
      const attributeNames = Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined;

      const updatedItem = await bookingLink.updateItem(
        id, 
        'METADATA', // config.sortKeys.metadata
        updateExpression, 
        expressionValues,
        null, // conditionExpression
        attributeNames
      );

      // EVENT-DRIVEN CACHE INVALIDATION: Check if cache-affecting fields changed
      const cacheAffectingFields = ['templateId', 'requireAdvanceBooking', 'advanceHours', 'isActive'];
      const cacheNeedsInvalidation = cacheAffectingFields.some(field => sanitizedData[field] !== undefined);

      if (cacheNeedsInvalidation) {
        console.log(`🔄 Booking link ${id} updated with cache-affecting changes, invalidating availability cache...`);
        
        const availabilityService = new AvailabilityService(dynamodb);
        
        // Run cache invalidation in background (don't block response)
        availabilityService.invalidateCacheForBookingLinkChange(id).catch(error => {
          console.error('Background cache invalidation failed:', error);
        });
        
        console.log(`Booking link updated, cache invalidation initiated in background`);
      } else {
        console.log(`Booking link ${id} updated with non-cache-affecting changes (name only)`);
      }

      return createSuccessResponse(200, 
        { bookingLink: bookingLink.formatBookingLink(updatedItem) }, 
        'Booking link updated successfully'
      );

    } catch (error) {
      console.error('Error updating booking link:', error);

      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }

      if (error.message === 'Invalid booking link ID') {
        return createErrorResponse(400, 'Invalid Booking Link ID', 
          'The ID provided is not a valid booking link ID (must start with BL_)');
      }

      if (error.message === 'Booking link not found') {
        return createErrorResponse(404, 'Booking link not found', 
          'No booking link found with this ID');
      }

      if (error.message === 'A booking link with this name already exists') {
        return createErrorResponse(409, 'Name already exists', 
          'A booking link with this name already exists. Please choose a different name.');
      }

      // Handle validation errors
      if (error.message.includes('required') || 
          error.message.includes('Invalid') ||
          error.message.includes('must be') ||
          error.message.includes('can only contain') ||
          error.message.includes('cannot be empty')) {
        return createErrorResponse(400, 'Validation Error', error.message);
      }

      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * DELETE /api/booking-links/:id
   * Delete booking link and invalidate cache
   */
  static async deleteBookingLink(dynamodb, id) {
    try {
      // EVENT-DRIVEN CACHE INVALIDATION: Invalidate cache before deletion
      console.log(`Booking link ${id} being deleted, invalidating availability cache...`);
      
      const availabilityService = new AvailabilityService(dynamodb);
      
      // Run cache invalidation before deletion
      try {
        await availabilityService.invalidateCacheForBookingLinkChange(id);
        console.log(`✅ Cache invalidated before booking link deletion`);
      } catch (cacheError) {
        console.error('Cache invalidation failed before deletion:', cacheError);
        // Continue with deletion even if cache invalidation fails
      }
      
      // Delete booking link
      const bookingLink = new BookingLink(dynamodb);
      const result = await bookingLink.deleteById(id);
      
      return createSuccessResponse(200, 
        { deletedId: result.deletedId }, 
        'Booking link successfully deleted'
      );
    } catch (error) {
      console.error('Error deleting booking link:', error);
      
      // Handle custom ID validation errors
      if (error.message === 'Invalid ID format') {
        return createErrorResponse(400, 'Invalid ID Format', 
          'The ID provided is not in the correct format (PREFIX_TIMESTAMP_RANDOM)');
      }
      
      if (error.message === 'Invalid booking link ID') {
        return createErrorResponse(400, 'Invalid Booking Link ID', 
          'The ID provided is not a valid booking link ID (must start with BL_)');
      }
      
      if (error.message === 'Booking link not found') {
        return createErrorResponse(404, 'Booking link not found', 
          'No booking link found with this ID');
      }
      
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * Validate booking link data before processing (enhanced security)
   * @param {Object} data - Booking link data to validate
   * @returns {Object} Validation result
   */
  static validateBookingLinkData(data) {
    try {
      // Security: Check for malicious content
      const maliciousPatterns = ['<script', 'javascript:', 'eval(', 'Function(', 'setTimeout(', 'setInterval('];
      
      function checkForMaliciousContent(obj) {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            for (const pattern of maliciousPatterns) {
              if (lowerValue.includes(pattern)) {
                throw new Error(`Malicious content detected in ${key}: ${pattern}`);
              }
            }
          }
        }
      }
      
      checkForMaliciousContent(data);
      
      BookingLink.validateBookingLinkData(data);
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Validate booking link update data (enhanced security)
   * @param {Object} data - Update data to validate
   * @returns {Object} Validation result
   */
  static validateBookingLinkUpdateData(data) {
    try {
      // Security: Check for malicious content
      const maliciousPatterns = ['<script', 'javascript:', 'eval(', 'Function('];
      
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          for (const pattern of maliciousPatterns) {
            if (lowerValue.includes(pattern)) {
              throw new Error(`Malicious content detected in ${key}: ${pattern}`);
            }
          }
        }
      }
      
      // Enhanced validation for advance booking logic
      if (data.requireAdvanceBooking !== undefined && data.advanceHours !== undefined) {
        if (data.requireAdvanceBooking === true && ![6, 12, 24, 48].includes(data.advanceHours)) {
          throw new Error('When advance booking is enabled, hours must be 6, 12, 24, or 48');
        }
        if (data.requireAdvanceBooking === false && data.advanceHours !== 0) {
          throw new Error('When advance booking is disabled, hours must be 0');
        }
      }
      
      // Use static validation from BookingLink model
      const bookingLink = new BookingLink();
      bookingLink.validateBookingLinkUpdateData(data);
      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }
}