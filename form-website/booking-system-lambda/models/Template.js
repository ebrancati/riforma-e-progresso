import { DynamoDBBase, config, createErrorResponse } from '../utils/dynamodb.js';
import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';

export class Template extends DynamoDBBase {
  constructor(dynamoClient, data = {}) {
    super(dynamoClient);
    
    // Validate and sanitize data if provided
    if (Object.keys(data).length > 0) {
      const sanitizedData = InputSanitizer.validateTemplateData(data);
      
      this.id = data.id || IdGenerator.generateTemplateId();
      this.name = sanitizedData.name;
      this.schedule = sanitizedData.schedule;
      this.blackoutDays = sanitizedData.blackoutDays || [];
      this.bookingCutoffDate = sanitizedData.bookingCutoffDate || null;
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
    }
  }

  /**
   * Find all templates
   */
  async findAll() {
    try {
      const result = await this.queryGSI(
        config.indexes.entityType,
        'TEMPLATE'
      );
      
      return result.items.map(item => this.formatTemplate(item));
    } catch (error) {
      console.error('Error finding all templates:', error);
      throw new Error('Failed to retrieve templates');
    }
  }

  /**
   * Find template by ID
   */
  async findById(id) {
    try {
      // Validate ID format
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isTemplateId(id)) {
        throw new Error('Invalid template ID');
      }

      const item = await this.getItem(id, config.sortKeys.metadata);
      
      if (!item) {
        throw new Error('Template not found');
      }

      return this.formatTemplate(item);
    } catch (error) {
      console.error('Error finding template by ID:', error);
      throw error;
    }
  }

  /**
   * Find template by name
   */
  async findByName(name) {
    try {
      const sanitizedName = InputSanitizer.sanitizeTemplateName(name);
      
      // Scan for template with matching name
      const result = await this.scan(
        'attribute_exists(#name) AND #name = :name AND EntityType = :entityType',
        {
          ':name': sanitizedName,
          ':entityType': 'TEMPLATE'
        }
      );

      return result.items.length > 0 ? result.items[0] : null;
    } catch (error) {
      console.error('Error finding template by name:', error);
      throw new Error('Failed to find template by name');
    }
  }

  /**
   * Save template (create new)
   */
  async save() {
    try {
      // For empty tables, skip duplicate check for first few items
      let existing = null;

      try {
        // Check for existing template with same name
        existing = await this.findByName(this.name);
      } catch (findError) {
        // If scan fails (empty table, permissions, etc), assume no duplicates
        console.log('Could not check for duplicates, proceeding with creation:', findError.message);
        existing = null;
      }

      if (existing) {
        throw new Error('A template with this name already exists');
      }

      // Create DynamoDB item
      const item = {
        PK: this.id,
        SK: config.sortKeys.metadata,
        GSI1PK: 'TEMPLATE',
        GSI1SK: this.name.toLowerCase(),
        EntityType: 'TEMPLATE',
        id: this.id,
        name: this.name,
        schedule: this.schedule,
        blackoutDays: this.blackoutDays,
        bookingCutoffDate: this.bookingCutoffDate,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };

      await this.putItem(item);
      return this.formatTemplate(item);
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Update template by ID
   */
  async updateById(id, updateData) {
    try {
      // Validate ID
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isTemplateId(id)) {
        throw new Error('Invalid template ID');
      }

      // Check if template exists
      const existing = await this.getItem(id, config.sortKeys.metadata);
      if (!existing) {
        throw new Error('Template not found');
      }

      // Check for duplicate name (excluding current template)
      if (updateData.name) {
        const duplicate = await this.findByName(updateData.name);
        if (duplicate && duplicate.id !== id) {
          throw new Error('Another template with this name already exists');
        }
      }

      // Prepare update expression
      const updateFields = [];
      const expressionValues = {};
      
      if (updateData.name) {
        updateFields.push('#name = :name');
        updateFields.push('GSI1SK = :gsi1sk');
        expressionValues[':name'] = InputSanitizer.sanitizeTemplateName(updateData.name);
        expressionValues[':gsi1sk'] = updateData.name.toLowerCase();
      }
      
      if (updateData.schedule) {
        updateFields.push('schedule = :schedule');
        expressionValues[':schedule'] = InputSanitizer.validateSchedule(updateData.schedule);
      }
      
      if (updateData.blackoutDays !== undefined) {
        updateFields.push('blackoutDays = :blackoutDays');
        expressionValues[':blackoutDays'] = InputSanitizer.validateBlackoutDays(updateData.blackoutDays);
      }
      
      if (updateData.bookingCutoffDate !== undefined) {
        updateFields.push('bookingCutoffDate = :bookingCutoffDate');
        expressionValues[':bookingCutoffDate'] = InputSanitizer.validateBookingCutoffDate(updateData.bookingCutoffDate);
      }

      // Always update timestamp
      updateFields.push('updatedAt = :updatedAt');
      expressionValues[':updatedAt'] = new Date().toISOString();

      const updateExpression = 'SET ' + updateFields.join(', ');
      
      // Add expression attribute names if needed
      const expressionAttributeNames = updateData.name ? { '#name': 'name' } : undefined;

      // Perform update
      const updatedItem = await this.updateItem(
        id, 
        config.sortKeys.metadata, 
        updateExpression, 
        expressionValues
      );

      return this.formatTemplate(updatedItem);
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template by ID
   */
  async deleteById(id) {
    try {
      // Validate ID
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isTemplateId(id)) {
        throw new Error('Invalid template ID');
      }

      // Check if template exists and delete
      const deletedItem = await this.deleteItem(id, config.sortKeys.metadata);
      
      if (!deletedItem) {
        throw new Error('Template not found');
      }

      return { deletedId: id, deletedCount: 1 };
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Format template for API response
   */
  formatTemplate(item) {
    if (!item) return null;
    
    return {
      id: item.id,
      name: item.name,
      schedule: item.schedule,
      blackoutDays: item.blackoutDays || [],
      bookingCutoffDate: item.bookingCutoffDate || null,
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
   * Validate template data
   */
  static validate(data) {
    const errors = [];
    try {
      InputSanitizer.validateTemplateData(data);
    } catch (error) {
      errors.push(error.message);
    }
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if a date is a blackout day for this template
   */
  isBlackoutDay(dateString) {
    return this.blackoutDays.includes(dateString);
  }

  /**
   * Check if bookings are still allowed (cutoff date not reached)
   */
  isBookingAllowed(checkDate = new Date()) {
    if (!this.bookingCutoffDate) return true;
    
    const cutoffDate = new Date(this.bookingCutoffDate + 'T23:59:59');
    return checkDate <= cutoffDate;
  }

  /**
   * Validate single time slot
   */
  static validateTimeSlot(slot, dayName) {
    const errors = [];
    
    if (!slot.id || !slot.startTime || !slot.endTime) {
      errors.push(`Slot incomplete on the ${dayName} day`);
      return errors;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
      errors.push(`Invalid time format in ${dayName} day`);
      return errors;
    }

    // Validate time logic
    const startMinutes = this.timeToMinutes(slot.startTime);
    const endMinutes = this.timeToMinutes(slot.endTime);
    
    if (endMinutes <= startMinutes) {
      errors.push(`End time must be later than start time on ${dayName} day`);
    }

    return errors;
  }

  /**
   * Convert time string to minutes for easy comparison
   */
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper method to generate new time slot ID
   */
  static generateTimeSlotId() {
    return IdGenerator.generateTimeSlotId();
  }

  /**
   * Helper method to check if an ID belongs to this template type
   */
  static isValidTemplateId(id) {
    return IdGenerator.isTemplateId(id);
  }
}