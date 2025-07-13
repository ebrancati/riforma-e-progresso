import { DynamoDBBase, config } from '../utils/dynamodb.js';
import { InputSanitizer } from '../utils/sanitizer.js';
import { IdGenerator } from '../utils/idGenerator.js';
import { GoogleOAuthService } from '../services/googleOAuthService.js';
import { EmailNotificationService } from '../services/emailNotificationService.js';
import { randomUUID } from 'crypto';

export class Booking extends DynamoDBBase {
  constructor(dynamoClient, data = {}) {
    super(dynamoClient);

    if (Object.keys(data).length > 0) {
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
      this.cancellationToken = data.cancellationToken || randomUUID();
      this.status = data.status || 'confirmed';
      
      this.googleEventId = data.googleEventId || null;
      this.meetLink = data.meetLink || null;
      this.calendarLink = data.calendarLink || null;
      
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
    }
  }

  /**
   * Find all bookings
   */
  async findAll() {
    try {
      const result = await this.queryGSI(
        config.indexes.entityType,
        'BOOKING'
      );
      
      return result.items
        .map(item => this.formatBooking(item))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error finding all bookings:', error);
      throw new Error('Failed to retrieve bookings');
    }
  }

  /**
   * Find booking by ID
   */
  async findById(id) {
    try {
      // Validate ID format
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }

      if (!IdGenerator.isBookingId(id)) {
        throw new Error('Invalid booking ID');
      }

      // Bookings are stored with GSI1PK = booking ID for direct lookup
      const result = await this.queryGSI(
        config.indexes.entityType,
        id
      );

      if (result.items.length === 0) {
        throw new Error('Booking not found');
      }

      return this.formatBooking(result.items[0]);
    } catch (error) {
      console.error('Error finding booking by ID:', error);
      throw error;
    }
  }

  /**
   * Find bookings for a specific booking link and date
   */
  async findByBookingLinkAndDate(bookingLinkId, selectedDate) {
    try {
      if (!IdGenerator.isBookingLinkId(bookingLinkId)) {
        throw new Error('Invalid booking link ID');
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      // Query bookings for specific booking link and date
      const result = await this.query(
        bookingLinkId,
        {
          expression: 'begins_with(SK, :datePrefix)', // Only KeyCondition here
          values: {
            ':datePrefix': `BOOKING#${selectedDate}`,
            ':cancelled': 'cancelled'
          },
          attributeNames: {
            '#status': 'status'
          },
          // Add FilterExpression for status filtering
          filterExpression: '#status <> :cancelled'
        }
      );

      return result.items
        .map(item => this.formatBooking(item))
        .sort((a, b) => a.selectedTime.localeCompare(b.selectedTime));
    } catch (error) {
      console.error('Error finding bookings by booking link and date:', error);
      
      // If no bookings exist for this date, return empty array
      if (error.name === 'ResourceNotFoundException' || 
          error.message.includes('no items')) {
        console.log('No bookings found for this date (normal)');
        return [];
      }
      
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Find bookings for a specific booking link and month
   */
  async findByBookingLinkAndMonth(bookingLinkId, year, month) {
    try {
      if (!IdGenerator.isBookingLinkId(bookingLinkId)) {
        throw new Error('Invalid booking link ID');
      }

      // Create date range for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

      // Query all bookings for the booking link in the month range
      const result = await this.query(
        bookingLinkId,
        {
          expression: 'SK BETWEEN :startDate AND :endDate', // Only KeyCondition here
          values: {
            ':startDate': `BOOKING#${startDate}`,
            ':endDate': `BOOKING#${endDate}#99:99`, // Ensure we capture all times
            ':cancelled': 'cancelled'
          },
          attributeNames: {
            '#status': 'status'
          },
          // Add FilterExpression for status filtering
          filterExpression: '#status <> :cancelled'
        }
      );

      return result.items
        .map(item => this.formatBooking(item))
        .sort((a, b) => {
          const dateCompare = a.selectedDate.localeCompare(b.selectedDate);
          return dateCompare !== 0 ? dateCompare : a.selectedTime.localeCompare(b.selectedTime);
        });
    } catch (error) {
      console.error('Error finding bookings by booking link and month:', error);
      
      // If no bookings exist yet (empty table), return empty array
      if (error.name === 'ResourceNotFoundException' || 
          error.message.includes('no items') ||
          error.message.includes('not found')) {
        console.log('No bookings found for this month (normal for new booking link)');
        return [];
      }
      
      // Return empty array instead of throwing for empty scenarios
      console.log('Assuming no bookings for month due to query issue');
      return [];
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(bookingLinkId, selectedDate, selectedTime) {
    try {
      const sk = `BOOKING#${selectedDate}#${selectedTime}`;
      const existingBooking = await this.getItem(bookingLinkId, sk);

      // Check if booking exists and is not cancelled
      return !existingBooking || existingBooking.status === 'cancelled';
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      throw new Error('Failed to check time slot availability');
    }
  }

  /**
   * Save booking (create new)
   */
  async save(cvFileData = null) {
    try {
      // Check if time slot is still available
      const isAvailable = await this.isTimeSlotAvailable(
        this.bookingLinkId, 
        this.selectedDate, 
        this.selectedTime
      );
  
      if (!isAvailable) {
        throw new Error('This time slot is no longer available');
      }

      if (process.env.ENABLE_GOOGLE_INTEGRATION === 'true') {
        try {
          const bookingLink = new (await import('./BookingLink.js')).BookingLink(this.client);
          const bookingLinkData = await bookingLink.findById(this.bookingLinkId);
  
          const googleService = new GoogleOAuthService(this.client);
          const googleResult = await googleService.createCalendarEventWithMeet(this, bookingLinkData);
          
          this.googleEventId = googleResult.eventId;
          this.meetLink = googleResult.meetLink;
          this.calendarLink = googleResult.calendarLink;
          
          console.log('✅ Google Calendar event created:', {
            eventId: this.googleEventId,
            meetLink: this.meetLink
          });
        } catch (googleError) {
          console.error('❌ Google integration failed (continuing without):', googleError.message);
        }
      }
  
      // Create sort key for time slot
      const sk = `BOOKING#${this.selectedDate}#${this.selectedTime}`;
  
      // Create DynamoDB item
      const item = {
        PK: this.bookingLinkId,
        SK: sk,
        GSI1PK: this.id,
        GSI1SK: 'BOOKING',
        EntityType: 'BOOKING',
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
        googleEventId: this.googleEventId,
        meetLink: this.meetLink,
        calendarLink: this.calendarLink,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
  
      await this.putItem(item);
  
      // Send email notifications
      try {
        const emailService = new EmailNotificationService();
        const bookingLink = new (await import('./BookingLink.js')).BookingLink(this.client);
        const bookingLinkData = await bookingLink.findById(this.bookingLinkId);

        await emailService.sendNewBookingNotification(
          this.formatBooking(item),
          bookingLinkData,
          null // No CV
        );
  
        await emailService.sendInternalNotification(
          this.formatBooking(item), 
          bookingLinkData,
          cvFileData
        );
        
        console.log('✅ New booking email notification sent');
      } catch (emailError) {
        console.error('❌ Email notification failed (continuing):', emailError.message);
        // Continue even if email fails
      }
  
      return this.formatBooking(item);
    } catch (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateStatus(id, newStatus, reason = '') {
    try {
      if (!['confirmed', 'cancelled'].includes(newStatus)) {
        throw new Error('Invalid status. Must be: confirmed or cancelled');
      }

      // Find the booking first to get PK and SK
      const booking = await this.findById(id);
      const sk = `BOOKING#${booking.selectedDate}#${booking.selectedTime}`;

      // Handle Google Calendar cancellation
      if (newStatus === 'cancelled' && booking.googleEventId && process.env.ENABLE_GOOGLE_INTEGRATION === 'true') {
        try {
          const googleService = new GoogleOAuthService(this.client);
          await googleService.cancelCalendarEvent(booking.googleEventId);
          console.log('✅ Google Calendar event cancelled');
        } catch (googleError) {
          console.error('❌ Google Calendar cancellation failed:', googleError.message);
        }
      }

      // Prepare update expression
      let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
      let expressionValues = {
        ':status': newStatus,
        ':updatedAt': new Date().toISOString()
      };
      let expressionAttributeNames = {
        '#status': 'status'
      };

      // If it's a cancellation and there's a reason, save it
      if (newStatus === 'cancelled' && reason && reason.trim()) {
        updateExpression += ', cancellationReason = :reason';
        expressionValues[':reason'] = reason.trim();
      }

      const updatedItem = await this.updateItem(
        booking.bookingLinkId,
        sk,
        updateExpression,
        expressionValues,
        null, // conditionExpression
        expressionAttributeNames
      );

      // Send cancellation email notification
      if (newStatus === 'cancelled') {
        try {
          const emailService = new EmailNotificationService();
          const bookingLink = new (await import('./BookingLink.js')).BookingLink(this.client);
          const bookingLinkData = await bookingLink.findById(booking.bookingLinkId);
          
          await emailService.sendCancellationNotification(
            this.formatBooking(updatedItem),
            bookingLinkData,
            reason
          );
          
          console.log('✅ Cancellation email notification sent');
        } catch (emailError) {
          console.error('❌ Email notification failed (continuing):', emailError.message);
        }
      }

      return this.formatBooking(updatedItem);
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Update booking date and time (for rescheduling)
   */
  async updateBookingDateTime(id, newDate, newTime) {
    try {
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }
      if (!IdGenerator.isBookingId(id)) {
        throw new Error('Invalid booking ID');
      }
  
      // Find the current booking
      const currentBooking = await this.findById(id);
      const currentSk = `BOOKING#${currentBooking.selectedDate}#${currentBooking.selectedTime}`;
      const rawBooking = await this.getItem(currentBooking.bookingLinkId, currentSk);

      // Store old date/time for email notification
      const oldDateTime = {
        date: currentBooking.selectedDate,
        time: currentBooking.selectedTime
      };
  
      // Check if new time slot is available
      const isNewSlotAvailable = await this.isTimeSlotAvailable(
        currentBooking.bookingLinkId,
        newDate,
        newTime
      );
  
      if (!isNewSlotAvailable) {
        throw new Error('The new time slot is not available');
      }
  
      // Update Google Calendar event
      if (currentBooking.googleEventId && process.env.ENABLE_GOOGLE_INTEGRATION === 'true') {
        try {
          const googleService = new GoogleOAuthService(this.client);
          const bookingLink = new (await import('./BookingLink.js')).BookingLink(this.client);
          const bookingLinkData = await bookingLink.findById(currentBooking.bookingLinkId);
          
          const updatedBookingData = {
            ...currentBooking,
            selectedDate: newDate,
            selectedTime: newTime
          };
          
          await googleService.updateCalendarEvent(
            currentBooking.googleEventId,
            updatedBookingData,
            bookingLinkData
          );
          
          console.log('✅ Google Calendar event updated for rescheduling');
        } catch (googleError) {
          console.error('❌ Google Calendar update failed:', googleError.message);
        }
      }
  
      // Delete current booking item
      await this.deleteItem(currentBooking.bookingLinkId, currentSk);
  
      // Create new booking item with new date/time but same ID
      const newSk = `BOOKING#${newDate}#${newTime}`;
      const updatedItem = {
        ...rawBooking,
        SK: newSk,
        selectedDate: newDate,
        selectedTime: newTime,
        updatedAt: new Date().toISOString()
      };
  
      await this.putItem(updatedItem);
  
      // Send reschedule email notification
      try {
        const emailService = new EmailNotificationService();
        const bookingLink = new (await import('./BookingLink.js')).BookingLink(this.client);
        const bookingLinkData = await bookingLink.findById(currentBooking.bookingLinkId);
        
        await emailService.sendRescheduleNotification(
          this.formatBooking(updatedItem),
          bookingLinkData,
          oldDateTime
        );
        
        console.log('✅ Reschedule email notification sent');
      } catch (emailError) {
        console.error('❌ Email notification failed (continuing):', emailError.message);
      }
  
      return this.formatBooking(updatedItem);
    } catch (error) {
      console.error('Error updating booking date/time:', error);
      throw error;
    }
  }

  /**
   * Delete booking by ID
   */
  async deleteById(id) {
    try {
      // Validate ID
      if (!InputSanitizer.isValidId(id)) {
        throw new Error('Invalid ID format');
      }
      if (!IdGenerator.isBookingId(id)) {
        throw new Error('Invalid booking ID');
      }

      // Find the booking to get PK and SK
      const booking = await this.findById(id);
      const sk = `BOOKING#${booking.selectedDate}#${booking.selectedTime}`;

      // Delete the booking
      const deletedItem = await this.deleteItem(booking.bookingLinkId, sk);
      
      if (!deletedItem) {
        throw new Error('Booking not found');
      }

      return { deletedId: id, deletedCount: 1 };
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  }

  /**
   * Format booking for API response
   */
  formatBooking(item) {
    if (!item) return null;
    
    return {
      id: item.id,
      bookingLinkId: item.bookingLinkId,
      selectedDate: item.selectedDate,
      selectedTime: item.selectedTime,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      role: item.role,
      notes: item.notes,
      cancellationToken: item.cancellationToken,
      status: item.status,
      cancellationReason: item.cancellationReason || null,
      googleEventId: item.googleEventId,
      meetLink: item.meetLink,
      calendarLink: item.calendarLink,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  }

  /**
   * Validate booking data
   */
  static validateBookingData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Booking data must be an object');
    }

    const sanitized = {};

    // Validate booking link ID
    if (!data.bookingLinkId || typeof data.bookingLinkId !== 'string') {
      throw new Error('Booking link ID is required');
    }
    if (!IdGenerator.isBookingLinkId(data.bookingLinkId)) {
      throw new Error('Invalid booking link ID format');
    }
    sanitized.bookingLinkId = data.bookingLinkId;

    // Validate selected date (YYYY-MM-DD format)
    if (!data.selectedDate || typeof data.selectedDate !== 'string') {
      throw new Error('Selected date is required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.selectedDate)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    sanitized.selectedDate = data.selectedDate;

    // Validate selected time (HH:MM format)
    if (!data.selectedTime || typeof data.selectedTime !== 'string') {
      throw new Error('Selected time is required');
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.selectedTime)) {
      throw new Error('Invalid time format. Use HH:MM');
    }
    sanitized.selectedTime = data.selectedTime;

    // Validate and sanitize personal data
    if (!data.firstName || typeof data.firstName !== 'string') {
      throw new Error('First name is required');
    }
    sanitized.firstName = InputSanitizer.sanitizeString(data.firstName.trim(), 50);
    if (sanitized.firstName.length === 0) {
      throw new Error('First name cannot be empty');
    }

    if (!data.lastName || typeof data.lastName !== 'string') {
      throw new Error('Last name is required');
    }
    sanitized.lastName = InputSanitizer.sanitizeString(data.lastName.trim(), 50);
    if (sanitized.lastName.length === 0) {
      throw new Error('Last name cannot be empty');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new Error('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }
    sanitized.email = data.email.trim().toLowerCase();

    if (!data.phone || typeof data.phone !== 'string') {
      throw new Error('Phone number is required');
    }
    const phoneRegex = /^[\d\s\+\-\(\)]{8,}$/;
    if (!phoneRegex.test(data.phone)) {
      throw new Error('Invalid phone number format');
    }
    sanitized.phone = InputSanitizer.sanitizeString(data.phone.trim(), 20);

    if (!data.role || typeof data.role !== 'string') {
      throw new Error('Role is required');
    }
    sanitized.role = InputSanitizer.sanitizeString(data.role.trim(), 100);
    if (sanitized.role.length === 0) {
      throw new Error('Role cannot be empty');
    }

    // Optional notes
    if (data.notes && typeof data.notes === 'string') {
      sanitized.notes = InputSanitizer.sanitizeString(data.notes.trim(), 500);
    }

    return sanitized;
  }

  /**
   * Helper method to check if an ID belongs to this booking type
   */
  static isValidBookingId(id) {
    return IdGenerator.isBookingId(id);
  }
}