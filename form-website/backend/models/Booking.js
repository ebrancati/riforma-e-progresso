import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';
import { getCollection } from '../utils/database.js';
import { randomUUID } from 'crypto';

export class Booking {
  constructor(data) {
    // Validate and sanitize data before setting properties
    const sanitizedData = Booking.validateBookingData(data);
    
    this.id = data.id || IdGenerator.generateBookingId();
    this.bookingLinkId = sanitizedData.bookingLinkId;
    this.selectedDate = sanitizedData.selectedDate;
    this.selectedTime = sanitizedData.selectedTime;
    this.firstName = sanitizedData.firstName;
    this.lastName = sanitizedData.lastName;
    this.email = sanitizedData.email;
    this.phone = sanitizedData.phone;
    this.role = sanitizedData.role;
    this.notes = sanitizedData.notes || '';
    this.cancellationToken = data.cancellationToken || randomUUID(); // Generate UUID for cancel/reschedule
    this.status = data.status || 'confirmed';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static getCollection() {
    return getCollection('bookings');
  }

  // Get all bookings
  static async findAll() {
    const collection = this.getCollection();
    const bookings = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return bookings.map(booking => this.formatBooking(booking));
  }

  // Get booking by ID
  static async findById(id) {
    // Validate custom ID format
    if (!InputSanitizer.isValidId(id)) throw new Error('Invalid ID format');

    // Ensure it's a booking ID
    if (!IdGenerator.isBookingId(id)) throw new Error('Invalid booking ID');

    const collection = this.getCollection();
    const booking = await collection.findOne({ id: id });
    
    if (!booking) throw new Error('Booking not found');

    return this.formatBooking(booking);
  }

  // Get bookings for a specific booking link and date
  static async findByBookingLinkAndDate(bookingLinkId, selectedDate) {
    if (!IdGenerator.isBookingLinkId(bookingLinkId)) {
      throw new Error('Invalid booking link ID');
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    const collection = this.getCollection();
    const bookings = await collection
      .find({ 
        bookingLinkId: bookingLinkId,
        selectedDate: selectedDate,
        status: { $ne: 'cancelled' } // Exclude cancelled bookings
      })
      .sort({ selectedTime: 1 })
      .toArray();
    
    return bookings.map(booking => this.formatBooking(booking));
  }

  // Get bookings for a specific booking link and month
  static async findByBookingLinkAndMonth(bookingLinkId, year, month) {
    if (!IdGenerator.isBookingLinkId(bookingLinkId)) {
      throw new Error('Invalid booking link ID');
    }

    // Create date range for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const collection = this.getCollection();
    const bookings = await collection
      .find({ 
        bookingLinkId: bookingLinkId,
        selectedDate: { 
          $gte: startDate,
          $lte: endDate
        },
        status: { $ne: 'cancelled' }
      })
      .sort({ selectedDate: 1, selectedTime: 1 })
      .toArray();
    
    return bookings.map(booking => this.formatBooking(booking));
  }

  // Check if a specific time slot is available
  static async isTimeSlotAvailable(bookingLinkId, selectedDate, selectedTime) {
    const collection = this.getCollection();
    const existingBooking = await collection.findOne({
      bookingLinkId: bookingLinkId,
      selectedDate: selectedDate,
      selectedTime: selectedTime,
      status: { $ne: 'cancelled' }
    });

    return !existingBooking;
  }

  // Create new booking
  async save() {
    const collection = Booking.getCollection();

    // Check if time slot is still available
    const isAvailable = await Booking.isTimeSlotAvailable(
      this.bookingLinkId, 
      this.selectedDate, 
      this.selectedTime
    );

    if (!isAvailable) throw new Error('This time slot is no longer available');

    // Create document with custom ID
    const bookingDoc = {
      id: this.id,
      bookingLinkId: this.bookingLinkId,
      selectedDate: this.selectedDate,
      selectedTime: this.selectedTime,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      role: this.role,
      notes: this.notes,
      cancellationToken: this.cancellationToken,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    const result = await collection.insertOne(bookingDoc);

    // Return formatted booking
    return Booking.formatBooking({
      _id: result.insertedId,
      ...bookingDoc
    });
  }

  // Update booking status
  static async updateStatus(id, newStatus) {
    if (!['confirmed', 'cancelled'].includes(newStatus))
      throw new Error('Invalid status. Must be: confirmed or cancelled');

    const collection = this.getCollection();
    
    const result = await collection.updateOne(
      { id: id },
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) throw new Error('Booking not found');

    const updatedBooking = await collection.findOne({ id: id });
    return this.formatBooking(updatedBooking);
  }

  // Update booking date and time
  static async updateBookingDateTime(id, newDate, newTime) {

    if (!InputSanitizer.isValidId(id)) throw new Error('Invalid ID format');
    if (!IdGenerator.isBookingId(id))  throw new Error('Invalid booking ID');

    const collection = this.getCollection();
    
    const result = await collection.updateOne(
      { id: id },
      { 
        $set: { 
          selectedDate: newDate,
          selectedTime: newTime,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) throw new Error('Booking not found');

    const updatedBooking = await collection.findOne({ id: id });
    return this.formatBooking(updatedBooking);
  }

  // Delete booking by ID
  static async deleteById(id) {

    // Validate custom ID format
    if (!InputSanitizer.isValidId(id)) throw new Error('Invalid ID format');

    // Ensure it's a booking ID
    if (!IdGenerator.isBookingId(id))  throw new Error('Invalid booking ID');

    const collection = this.getCollection();
    
    const result = await collection.deleteOne({ id: id });
    
    if (result.deletedCount === 0) throw new Error('Booking not found');

    return { deletedId: id, deletedCount: result.deletedCount };
  }

  // Format booking for API response
  static formatBooking(booking) {
    return {
      id: booking.id,
      bookingLinkId: booking.bookingLinkId,
      selectedDate: booking.selectedDate,
      selectedTime: booking.selectedTime,
      firstName: booking.firstName,
      lastName: booking.lastName,
      email: booking.email,
      phone: booking.phone,
      role: booking.role,
      notes: booking.notes,
      cancellationToken: booking.cancellationToken,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }

  // Validate booking data
  static validateBookingData(data) {
    if (!data || typeof data !== 'object')
      throw new Error('Booking data must be an object');

    const sanitized = {};

    // Validate booking link ID
    if (!data.bookingLinkId || typeof data.bookingLinkId !== 'string')
      throw new Error('Booking link ID is required');

    if (!IdGenerator.isBookingLinkId(data.bookingLinkId))
      throw new Error('Invalid booking link ID format');

    sanitized.bookingLinkId = data.bookingLinkId;

    // Validate selected date (YYYY-MM-DD format)
    if (!data.selectedDate || typeof data.selectedDate !== 'string')
      throw new Error('Selected date is required');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.selectedDate))
      throw new Error('Invalid date format. Use YYYY-MM-DD');

    sanitized.selectedDate = data.selectedDate;

    // Validate selected time (HH:MM format)
    if (!data.selectedTime || typeof data.selectedTime !== 'string')
      throw new Error('Selected time is required');

    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.selectedTime))
      throw new Error('Invalid time format. Use HH:MM');

    sanitized.selectedTime = data.selectedTime;

    // Validate and sanitize personal data
    if (!data.firstName || typeof data.firstName !== 'string')
      throw new Error('First name is required');

    sanitized.firstName = InputSanitizer.sanitizeString(data.firstName.trim(), 50);
    if (sanitized.firstName.length === 0)
      throw new Error('First name cannot be empty');


    if (!data.lastName || typeof data.lastName !== 'string')
      throw new Error('Last name is required');

    sanitized.lastName = InputSanitizer.sanitizeString(data.lastName.trim(), 50);
    if (sanitized.lastName.length === 0)
      throw new Error('Last name cannot be empty');


    if (!data.email || typeof data.email !== 'string')
      throw new Error('Email is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email))
      throw new Error('Invalid email format');

    sanitized.email = data.email.trim().toLowerCase();

    if (!data.phone || typeof data.phone !== 'string')
      throw new Error('Phone number is required');

    const phoneRegex = /^[\d\s\+\-\(\)]{8,}$/;
    if (!phoneRegex.test(data.phone))
      throw new Error('Invalid phone number format');

    sanitized.phone = InputSanitizer.sanitizeString(data.phone.trim(), 20);

    if (!data.role || typeof data.role !== 'string')
      throw new Error('Role is required');

    sanitized.role = InputSanitizer.sanitizeString(data.role.trim(), 100);
    if (sanitized.role.length === 0)
      throw new Error('Role cannot be empty');

    // Optional notes
    if (data.notes && typeof data.notes === 'string')
      sanitized.notes = InputSanitizer.sanitizeString(data.notes.trim(), 500);

    return sanitized;
  }

  // Helper method to check if an ID belongs to this booking type
  static isValidBookingId(id) {
    return IdGenerator.isBookingId(id);
  }
}