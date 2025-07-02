import { ObjectId } from 'mongodb';
import { getCollection } from '../utils/database.js';
import { config } from '../config/config.js';

export class Template {
  constructor(data) {
    this.name = data.name;
    this.schedule = data.schedule;
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
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid ID');
    }

    const collection = this.getCollection();
    const template = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!template) {
      throw new Error('Template not found');
    }

    return this.formatTemplate(template);
  }

  static async findByName(name) {
    const collection = this.getCollection();
    return await collection.findOne({ name: name.trim() });
  }

  // Create new template
  async save() {
    const collection = Template.getCollection();

    const existing = await Template.findByName(this.name);
    if (existing) throw new Error('A template with this name already exists');

    const result = await collection.insertOne({
      name: this.name.trim(),
      schedule: this.schedule,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });

    return Template.formatTemplate({
      _id: result.insertedId,
      name: this.name,
      schedule: this.schedule,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
  }

  static async updateById(id, updateData) {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid ID');
    }

    const collection = this.getCollection();
    
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) throw new Error('Template not found');

    // Check for duplicate name (excluding current template)
    if (updateData.name) {
      const duplicate = await collection.findOne({ 
        name: updateData.name.trim(), 
        _id: { $ne: new ObjectId(id) }
      });
      if (duplicate) throw new Error('Another template with this name already exists');
    }

    const updateFields = {
      updatedAt: new Date()
    };
    
    if (updateData.name) updateFields.name = updateData.name.trim();
    if (updateData.schedule) updateFields.schedule = updateData.schedule;

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    // Return updated template
    const updated = await collection.findOne({ _id: new ObjectId(id) });
    return this.formatTemplate(updated);
  }

  static async deleteById(id) {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid ID');
    }

    const collection = this.getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new Error('Template not found');
    }

    return { deletedId: id, deletedCount: result.deletedCount };
  }

  // Format template for API response
  static formatTemplate(template) {
    return {
      id: template._id.toString(),
      name: template.name,
      schedule: template.schedule,
      created: template.createdAt.toLocaleDateString('it-IT'),
      updatedAt: template.updatedAt
    };
  }

  static validate(data) {
    const errors = [];

    // Validate name
    if (!data.name || typeof data.name !== 'string')
        errors.push('Required template name');
    else if (data.name.trim().length === 0)
        errors.push('Template name cannot be empty');
    else if (data.name.trim().length > config.template.maxNameLength)
        errors.push(`Template name too long (max ${config.template.maxNameLength} characters)`);

    // Validate schedule
    if (!data.schedule || typeof data.schedule !== 'object') {
      errors.push('Schedule required');
    } else {
      // Make sure all days are present
      for (const day of config.template.requiredDays) {
        if (!Array.isArray(data.schedule[day])) {
          errors.push(`${day} must be an array`);
          continue;
        }

        // Validate every slot of the day
        for (const slot of data.schedule[day]) {
          const slotErrors = this.validateTimeSlot(slot, day);
          errors.push(...slotErrors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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

  // Converts format time in minutes
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}