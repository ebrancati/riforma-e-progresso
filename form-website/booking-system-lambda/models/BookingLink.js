import { DynamoDBBase, config, createErrorResponse } from '../utils/dynamodb.js';
import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';

export class BookingLink extends DynamoDBBase {
  constructor(dynamoClient, data = {}) {
    super(dynamoClient);
    
    // Validate and sanitize data if provided
    if (Object.keys(data).length > 0) {
      const sanitizedData = BookingLink.validateBookingLinkData(data);
      
      this.id = data.id || IdGenerator.generateBookingLinkId();
      this.name = sanitizedData.name;
      this.templateId = sanitizedData.templateId;
      this.urlSlug = sanitizedData.urlSlug;
      this.duration = sanitizedData.duration;
      this.requireAdvanceBooking = sanitizedData.requireAdvanceBooking;
      this.advanceHours = sanitizedData.advanceHours;
      this.isActive = data.isActive !== undefined ? data.isActive : true;
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
    }
  }

  /**
   * Find all booking links
   */
  async findAll() {
    try {
      const result = await this.queryGSI(
        config.indexes.entityType,
        'BOOKING_LINK'
      );
      
      return result.items.map(item => this.formatBookingLink(item));
    } catch (error) {
      console.error('Error finding all booking links:', error);
      throw new Error('Failed to retrieve booking links');
    }
  }

  /**
   * Find booking link by ID
   */
  async findById(id) {
    try {
      // Validate ID format
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isBookingLinkId(id)) {
        throw new Error('Invalid booking link ID');
      }

      const item = await this.getItem(id, config.sortKeys.metadata);
      
      if (!item) {
        throw new Error('Booking link not found');
      }

      return this.formatBookingLink(item);
    } catch (error) {
      console.error('Error finding booking link by ID:', error);
      throw error;
    }
  }

  /**
   * Find booking link by URL slug
   */
  async findBySlug(slug) {
    try {
      // Query using slug GSI
      const result = await this.queryGSI(
        config.indexes.slugIndex,
        slug.toLowerCase()
      );

      if (result.items.length === 0) {
        return null;
      }

      return this.formatBookingLink(result.items[0]);
    } catch (error) {
      console.error('Error finding booking link by slug:', error);
      throw new Error('Failed to find booking link by slug');
    }
  }

  /**
   * Save booking link (create new)
   */
  async save() {
    try {
      // Check for existing booking link with same URL slug
      const existingSlug = await this.findBySlug(this.urlSlug);
      if (existingSlug) {
        throw new Error('A booking link with this URL already exists');
      }

      // Check for existing booking link with same name
      const existingName = await this.findByName(this.name);
      if (existingName) {
        throw new Error('A booking link with this name already exists');
      }

      // Create DynamoDB item
      const item = {
        PK: this.id,
        SK: config.sortKeys.metadata,
        GSI1PK: 'BOOKING_LINK',
        GSI1SK: this.name.toLowerCase(),
        GSI2PK: this.urlSlug.toLowerCase(), // For slug lookup
        EntityType: 'BOOKING_LINK',
        id: this.id,
        name: this.name,
        templateId: this.templateId,
        urlSlug: this.urlSlug,
        duration: this.duration,
        requireAdvanceBooking: this.requireAdvanceBooking,
        advanceHours: this.advanceHours,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };

      await this.putItem(item);
      return this.formatBookingLink(item);
    } catch (error) {
      console.error('Error saving booking link:', error);
      throw error;
    }
  }

  /**
   * Find booking link by name
   */
  async findByName(name) {
    try {
      // Scan for booking link with matching name
      const result = await this.scan(
        'attribute_exists(#name) AND #name = :name AND EntityType = :entityType',
        {
          ':name': name,
          ':entityType': 'BOOKING_LINK'
        }
      );

      return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
      console.error('Error finding booking link by name:', error);
      throw new Error('Failed to find booking link by name');
    }
  }

  /**
   * Update booking link by ID
   */
  async updateById(id, updateData) {
    try {
      // Validate ID
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isBookingLinkId(id)) {
        throw new Error('Invalid booking link ID');
      }

      // Check if booking link exists
      const existing = await this.getItem(id, config.sortKeys.metadata);
      if (!existing) {
        throw new Error('Booking link not found');
      }

      // If name is being updated, check for duplicates
      if (updateData.name) {
        const duplicateName = await this.findByName(updateData.name);
        if (duplicateName && duplicateName.id !== id) {
          throw new Error('A booking link with this name already exists');
        }
      }

      // Validate and sanitize update data
      const sanitizedData = this.validateBookingLinkUpdateData(updateData);
      
      // Prepare update expression
      const updateFields = [];
      const expressionValues = {};
      
      if (sanitizedData.name !== undefined) {
        updateFields.push('#name = :name');
        updateFields.push('GSI1SK = :gsi1sk');
        expressionValues[':name'] = sanitizedData.name;
        expressionValues[':gsi1sk'] = sanitizedData.name.toLowerCase();
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
      
      // Add expression attribute names if needed
      const expressionAttributeNames = sanitizedData.name !== undefined ? { '#name': 'name' } : undefined;

      // Perform update
      const updatedItem = await this.updateItem(
        id, 
        config.sortKeys.metadata, 
        updateExpression, 
        expressionValues
      );

      return this.formatBookingLink(updatedItem);
    } catch (error) {
      console.error('Error updating booking link:', error);
      throw error;
    }
  }

  /**
   * Delete booking link by ID
   */
  async deleteById(id) {
    try {
      // Validate ID
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isBookingLinkId(id)) {
        throw new Error('Invalid booking link ID');
      }

      // Check if booking link exists and delete
      const deletedItem = await this.deleteItem(id, config.sortKeys.metadata);
      
      if (!deletedItem) {
        throw new Error('Booking link not found');
      }

      return { deletedId: id, deletedCount: 1 };
    } catch (error) {
      console.error('Error deleting booking link:', error);
      throw error;
    }
  }

  /**
   * Format booking link for API response
   */
  formatBookingLink(item) {
    if (!item) return null;
    
    return {
      id: item.id,
      name: item.name,
      templateId: item.templateId,
      urlSlug: item.urlSlug,
      duration: item.duration,
      requireAdvanceBooking: item.requireAdvanceBooking,
      advanceHours: item.advanceHours,
      isActive: item.isActive,
      created: this.formatDateForDisplay(item.createdAt),
      updatedAt: item.updatedAt
    };
  }

  /**
   * Format date for display (Italian format)
   */
  formatDateForDisplay(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('it-IT');
  }

  /**
   * Validate booking link data
   */
  static validateBookingLinkData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Booking link data must be an object');
    }

    const sanitized = {};

    // Validate and sanitize name
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Booking link name is required');
    }
    sanitized.name = InputSanitizer.sanitizeString(data.name.trim(), 100);
    if (sanitized.name.length === 0) {
      throw new Error('Booking link name cannot be empty');
    }

    // Validate template ID
    if (!data.templateId || typeof data.templateId !== 'string') {
      throw new Error('Template ID is required');
    }
    if (!IdGenerator.isTemplateId(data.templateId)) {
      throw new Error('Invalid template ID format');
    }
    sanitized.templateId = data.templateId;

    // Validate and sanitize URL slug
    if (!data.urlSlug || typeof data.urlSlug !== 'string') {
      throw new Error('URL slug is required');
    }
    const urlSlug = data.urlSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(urlSlug)) {
      throw new Error('URL slug can only contain lowercase letters, numbers, and hyphens');
    }
    if (urlSlug.length < 3 || urlSlug.length > 50) {
      throw new Error('URL slug must be between 3 and 50 characters');
    }
    sanitized.urlSlug = urlSlug;

    // Validate duration
    if (!data.duration || typeof data.duration !== 'number') {
      throw new Error('Duration is required and must be a number');
    }
    if (data.duration !== 30) {
      throw new Error('Currently only 30-minute duration is supported');
    }
    sanitized.duration = data.duration;

    // Validate advance booking settings
    sanitized.requireAdvanceBooking = Boolean(data.requireAdvanceBooking);
    
    if (sanitized.requireAdvanceBooking) {
      if (!data.advanceHours || typeof data.advanceHours !== 'number') {
        throw new Error('Advance hours is required when advance booking is enabled');
      }
      if (![6, 12, 24, 48].includes(data.advanceHours)) {
        throw new Error('Advance hours must be 6, 12, 24, or 48');
      }
      sanitized.advanceHours = data.advanceHours;
    } else {
      sanitized.advanceHours = 0;
    }

    return sanitized;
  }

  /**
   * Validate booking link update data (only for allowed fields)
   */
  validateBookingLinkUpdateData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Update data must be an object');
    }

    const sanitized = {};

    // Validate name if provided
    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        throw new Error('Booking link name must be a string');
      }
      sanitized.name = InputSanitizer.sanitizeString(data.name.trim(), 100);
      if (sanitized.name.length === 0) {
        throw new Error('Booking link name cannot be empty');
      }
    }

    // Validate template ID if provided
    if (data.templateId !== undefined) {
      if (typeof data.templateId !== 'string') {
        throw new Error('Template ID must be a string');
      }
      if (!IdGenerator.isTemplateId(data.templateId)) {
        throw new Error('Invalid template ID format');
      }
      sanitized.templateId = data.templateId;
    }

    // Validate advance booking settings if provided
    if (data.requireAdvanceBooking !== undefined) {
      sanitized.requireAdvanceBooking = Boolean(data.requireAdvanceBooking);
    }

    if (data.advanceHours !== undefined) {
      if (typeof data.advanceHours !== 'number') {
        throw new Error('Advance hours must be a number');
      }
      if (![0, 6, 12, 24, 48].includes(data.advanceHours)) {
        throw new Error('Advance hours must be 0, 6, 12, 24, or 48');
      }
      sanitized.advanceHours = data.advanceHours;
    }

    // Validate isActive if provided
    if (data.isActive !== undefined) {
      sanitized.isActive = Boolean(data.isActive);
    }

    return sanitized;
  }

  /**
   * Helper method to check if an ID belongs to this booking link type
   */
  static isValidBookingLinkId(id) {
    return IdGenerator.isBookingLinkId(id);
  }
}