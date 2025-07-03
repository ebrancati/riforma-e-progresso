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