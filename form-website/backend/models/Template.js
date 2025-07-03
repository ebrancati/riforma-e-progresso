import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';
import { getCollection } from '../utils/database.js';
import { config } from '../config/config.js';

export class Template {
  constructor(data) {
    // Validate and sanitize data before setting properties
    const sanitizedData = InputSanitizer.validateTemplateData(data);
    
    // Generate ID if not provided
    this.id = data.id || IdGenerator.generateTemplateId();
    this.name = sanitizedData.name;
    this.schedule = sanitizedData.schedule;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static getCollection() {
    return getCollection(config.collections.templates);
  }

  static async findAll() {
    const collection = this.getCollection();
    const templates = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return templates.map(template => this.formatTemplate(template));
  }

  static async findById(id) {
    // Validate ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a template ID
    if (!IdGenerator.isTemplateId(id)) {
      throw new Error('Invalid template ID');
    }

    const collection = this.getCollection();
    // Use ID directly as string
    const template = await collection.findOne({ id: id });
    
    if (!template) {
      throw new Error('Template not found');
    }

    return this.formatTemplate(template);
  }

  static async findByName(name) {
    const sanitizedName = InputSanitizer.sanitizeTemplateName(name);
    
    const collection = this.getCollection();
    return await collection.findOne({ name: sanitizedName });
  }

  // Create new template
  async save() {
    const collection = Template.getCollection();

    // Check for existing template with same name
    const existing = await Template.findByName(this.name);
    if (existing) {
      throw new Error('A template with this name already exists');
    }

    // Create document
    const templateDoc = {
      id: this.id,
      name: this.name,
      schedule: this.schedule,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    const result = await collection.insertOne(templateDoc);

    // Return formatted template
    return Template.formatTemplate({
      _id: result.insertedId,
      ...templateDoc
    });
  }

  static async updateById(id, updateData) {
    // Validate ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a template ID
    if (!IdGenerator.isTemplateId(id)) {
      throw new Error('Invalid template ID');
    }

    const collection = this.getCollection();
    
    // Find existing template using ID
    const existing = await collection.findOne({ id: id });
    if (!existing) {
      throw new Error('Template not found');
    }

    // Check for duplicate name (excluding current template)
    if (updateData.name) {
      const duplicate = await collection.findOne({ 
        name: updateData.name.trim(), 
        id: { $ne: id }  // Use custom ID for exclusion
      });
      if (duplicate) {
        throw new Error('Another template with this name already exists');
      }
    }

    const updateFields = {
      updatedAt: new Date()
    };
    
    if (updateData.name) {
      updateFields.name = InputSanitizer.sanitizeTemplateName(updateData.name);
    }
    if (updateData.schedule) {
      updateFields.schedule = InputSanitizer.validateSchedule(updateData.schedule);
    }

    // Update using ID
    await collection.updateOne(
      { id: id },
      { $set: updateFields }
    );

    // Return updated template
    const updated = await collection.findOne({ id: id });
    return this.formatTemplate(updated);
  }

  static async deleteById(id) {
    // Validate ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a template ID
    if (!IdGenerator.isTemplateId(id)) {
      throw new Error('Invalid template ID');
    }

    const collection = this.getCollection();
    
    // Delete using ID
    const result = await collection.deleteOne({ id: id });
    
    if (result.deletedCount === 0) {
      throw new Error('Template not found');
    }

    return { deletedId: id, deletedCount: result.deletedCount };
  }

  // Format template for API response
  static formatTemplate(template) {
    return {
      id: template.id,
      name: template.name,
      schedule: template.schedule,
      created: template.createdAt.toLocaleDateString('it-IT'),
      updatedAt: template.updatedAt
    };
  }

  static validate(data) {
    const errors = [];
    try {
      InputSanitizer.validateTemplateData(data);
    } catch (error) {
      errors.push(error.message);
    }
    return { isValid: errors.length === 0, errors };
  }

  // Validate single time slot
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

  // Convert time string to minutes for easy comparison
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper method to generate new time slot ID
  static generateTimeSlotId() {
    return IdGenerator.generateTimeSlotId();
  }

  // Helper method to check if an ID belongs to this template type
  static isValidTemplateId(id) {
    return IdGenerator.isTemplateId(id);
  }
}