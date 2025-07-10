import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';
import { getCollection } from '../utils/database.js';
import { config } from '../config/config.js';

export class BookingLink {
  constructor(data) {
    // Validate and sanitize data before setting properties
    const sanitizedData = BookingLink.validateBookingLinkData(data);
    
    // Generate custom ID if not provided
    this.id = data.id || IdGenerator.generateBookingLinkId();
    this.name = sanitizedData.name;
    this.templateId = sanitizedData.templateId;
    this.urlSlug = sanitizedData.urlSlug;
    this.duration = sanitizedData.duration;
    this.requireAdvanceBooking = sanitizedData.requireAdvanceBooking;
    this.advanceHours = sanitizedData.advanceHours;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static getCollection() {
    return getCollection(config.collections.bookingLinks);
  }

  // Get all booking links
  static async findAll() {
    const collection = this.getCollection();
    const bookingLinks = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return bookingLinks.map(link => this.formatBookingLink(link));
  }

  // Get booking link by ID
  static async findById(id) {
    // Validate custom ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a booking link ID
    if (!IdGenerator.isBookingLinkId(id)) {
      throw new Error('Invalid booking link ID');
    }

    const collection = this.getCollection();
    // Use custom ID directly as string
    const bookingLink = await collection.findOne({ id: id });
    
    if (!bookingLink) {
      throw new Error('Booking link not found');
    }

    return this.formatBookingLink(bookingLink);
  }

  // Update booking link by ID
  static async updateById(id, updateData) {
    // Validate custom ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a booking link ID
    if (!IdGenerator.isBookingLinkId(id)) {
      throw new Error('Invalid booking link ID');
    }

    const collection = this.getCollection();
    
    // Check if booking link exists
    const existingBookingLink = await collection.findOne({ id: id });
    if (!existingBookingLink) {
      throw new Error('Booking link not found');
    }

    // If name is being updated, check for duplicates (excluding current booking link)
    if (updateData.name) {
      const duplicateName = await collection.findOne({ 
        name: updateData.name.trim(),
        id: { $ne: id }
      });
      if (duplicateName) {
        throw new Error('A booking link with this name already exists');
      }
    }

    // Validate and sanitize the update data
    const sanitizedData = this.validateBookingLinkUpdateData(updateData);
    
    // Add updated timestamp
    sanitizedData.updatedAt = new Date();

    // Perform update
    const result = await collection.updateOne(
      { id: id },
      { $set: sanitizedData }
    );

    if (result.matchedCount === 0) {
      throw new Error('Booking link not found');
    }

    // Return updated booking link
    const updatedBookingLink = await collection.findOne({ id: id });
    return this.formatBookingLink(updatedBookingLink);
  }

  // Validate booking link update data (only for allowed fields)
  static validateBookingLinkUpdateData(data) {
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

  // Delete booking link by ID
  static async deleteById(id) {
    // Validate custom ID format
    if (!InputSanitizer.isValidId(id)) {
      throw new Error('Invalid ID format');
    }

    // Ensure it's a booking link ID
    if (!IdGenerator.isBookingLinkId(id)) {
      throw new Error('Invalid booking link ID');
    }

    const collection = this.getCollection();
    
    // Delete using custom ID
    const result = await collection.deleteOne({ id: id });
    
    if (result.deletedCount === 0) {
      throw new Error('Booking link not found');
    }

    return { deletedId: id, deletedCount: result.deletedCount };
  }

  // Create new booking link
  async save() {
    const collection = BookingLink.getCollection();

    // Check for existing booking link with same URL slug
    const existingSlug = await collection.findOne({ urlSlug: this.urlSlug });
    if (existingSlug) {
      throw new Error('A booking link with this URL already exists');
    }

    // Check for existing booking link with same name
    const existingName = await collection.findOne({ name: this.name });
    if (existingName) {
      throw new Error('A booking link with this name already exists');
    }

    // Create document with custom ID
    const bookingLinkDoc = {
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

    const result = await collection.insertOne(bookingLinkDoc);

    // Return formatted booking link
    return BookingLink.formatBookingLink({
      _id: result.insertedId,
      ...bookingLinkDoc
    });
  }

  // Format booking link for API response
  static formatBookingLink(bookingLink) {
    return {
      id: bookingLink.id,
      name: bookingLink.name,
      templateId: bookingLink.templateId,
      urlSlug: bookingLink.urlSlug,
      duration: bookingLink.duration,
      requireAdvanceBooking: bookingLink.requireAdvanceBooking,
      advanceHours: bookingLink.advanceHours,
      isActive: bookingLink.isActive,
      created: bookingLink.createdAt.toLocaleDateString('it-IT'),
      updatedAt: bookingLink.updatedAt
    };
  }

  // Validate booking link data
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

  // Helper method to check if an ID belongs to this booking link type
  static isValidBookingLinkId(id) {
    return IdGenerator.isBookingLinkId(id);
  }
}