import { DynamoDBBase, config } from '../utils/dynamodb.js';
import { Template } from '../models/Template.js';
import { Booking } from '../models/Booking.js';
import { BookingLink } from '../models/BookingLink.js';

export class AvailabilityService extends DynamoDBBase {
  constructor(dynamoClient) {
    super(dynamoClient);
  }

  /**
   * Get availability for a specific month (using pre-calculated data)
   * @param {string} bookingLinkId - Booking link ID
   * @param {number} year - Year (e.g., 2025)
   * @param {number} month - Month (1-12)
   * @returns {Array} Array of day availability objects
   */
  async getMonthAvailability(bookingLinkId, year, month) {
    try {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const pk = `MONTH#${bookingLinkId}#${monthKey}`;
      
      // Try to get pre-calculated availability
      let availabilityData = await this.getItem(pk, config.sortKeys.overview);
      
      // If no pre-calculated data or data is stale, calculate fresh
      if (!availabilityData || this.isDataStale(availabilityData)) {
        console.log(`Calculating fresh availability for ${bookingLinkId} - ${monthKey}`);
        availabilityData = await this.calculateAndCacheMonthAvailability(bookingLinkId, year, month);
      }

      return this.formatMonthAvailability(availabilityData.data, year, month);
    } catch (error) {
      console.error('Error getting month availability:', error);
      throw new Error('Failed to get month availability: ' + error.message);
    }
  }

  /**
   * Get available time slots for a specific date (real-time calculation)
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} selectedDate - Date in YYYY-MM-DD format
   * @returns {Array} Array of available time slots
   */
  async getAvailableTimeSlots(bookingLinkId, selectedDate) {
    try {
      // Get booking link and template
      const bookingLink = new BookingLink(this.client);
      const bookingLinkData = await bookingLink.findById(bookingLinkId);
      
      const template = new Template(this.client);
      const templateData = await template.findById(bookingLinkData.templateId);
      
      // Check if date is unavailable
      if (this.isDateUnavailable(templateData, selectedDate)) {
        return [];
      }
      
      // Get existing bookings for this date
      const booking = new Booking(this.client);
      const existingBookings = await booking.findByBookingLinkAndDate(bookingLinkId, selectedDate);
      
      // Generate all possible time slots for this date
      const allSlots = this.generateTimeSlotsForDate(templateData, selectedDate);
      
      // Filter out booked slots
      const bookedTimes = existingBookings.map(booking => booking.selectedTime);
      const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot.startTime));
      
      // Apply advance booking restrictions
      const filteredSlots = this.applyAdvanceBookingFilter(
        availableSlots,
        selectedDate,
        bookingLinkData.requireAdvanceBooking,
        bookingLinkData.advanceHours
      );
      
      return filteredSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw new Error('Failed to get available time slots: ' + error.message);
    }
  }

  /**
   * Calculate and cache month availability
   * @param {string} bookingLinkId - Booking link ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Object} Availability data
   */
  async calculateAndCacheMonthAvailability(bookingLinkId, year, month) {
    try {
      // Get booking link and template
      const bookingLink = new BookingLink(this.client);
      const bookingLinkData = await bookingLink.findById(bookingLinkId);
      
      const template = new Template(this.client);
      const templateData = await template.findById(bookingLinkData.templateId);
      
      // Get existing bookings for this month
      const booking = new Booking(this.client);
      const existingBookings = await booking.findByBookingLinkAndMonth(bookingLinkId, year, month);
      
      // Calculate availability for each day of the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const monthData = {};
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateString = this.formatDateToString(date);
        
        const dayBookings = existingBookings.filter(booking => booking.selectedDate === dateString);
        const dayAvailability = await this.calculateDayAvailability(
          templateData,
          bookingLinkData,
          dateString,
          dayBookings
        );
        
        monthData[day.toString().padStart(2, '0')] = {
          available: dayAvailability.available,
          slotsCount: dayAvailability.availableSlots
        };
      }
      
      // Cache the calculated data
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const pk = `MONTH#${bookingLinkId}#${monthKey}`;
      
      const cacheItem = {
        PK: pk,
        SK: config.sortKeys.overview,
        EntityType: 'MONTH_AVAILABILITY',
        bookingLinkId: bookingLinkId,
        year: year,
        month: month,
        data: monthData,
        lastUpdated: new Date().toISOString(),
        TTL: this.generateTTL(180) // 6 months TTL
      };
      
      await this.putItem(cacheItem);
      return cacheItem;
    } catch (error) {
      console.error('Error calculating month availability:', error);
      throw error;
    }
  }

  /**
   * Calculate availability for a single day
   * @param {Object} templateData - Template data
   * @param {Object} bookingLinkData - Booking link data
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @param {Array} dayBookings - Existing bookings for this day
   * @returns {Object} Day availability object
   */
  async calculateDayAvailability(templateData, bookingLinkData, dateString, dayBookings) {
    const date = new Date(dateString + 'T00:00:00');
    
    // Check if date is in the past
    if (this.isPastDate(date)) {
      return {
        available: false,
        totalSlots: 0,
        availableSlots: 0
      };
    }
    
    // Check if date is unavailable
    if (this.isDateUnavailable(templateData, dateString)) {
      return {
        available: false,
        totalSlots: 0,
        availableSlots: 0
      };
    }
    
    // Generate all possible slots for this day
    const allSlots = this.generateTimeSlotsForDate(templateData, dateString);
    
    // Filter out booked slots
    const bookedTimes = dayBookings.map(booking => booking.selectedTime);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot.startTime));
    
    // Apply advance booking restrictions
    const filteredSlots = this.applyAdvanceBookingFilter(
      availableSlots,
      dateString,
      bookingLinkData.requireAdvanceBooking,
      bookingLinkData.advanceHours
    );
    
    return {
      available: filteredSlots.length > 0,
      totalSlots: allSlots.length,
      availableSlots: filteredSlots.length
    };
  }

  /**
   * Invalidate cached availability for a booking link
   * @param {string} bookingLinkId - Booking link ID
   * @param {Array} affectedMonths - Array of {year, month} objects
   */
  async invalidateAvailabilityCache(bookingLinkId, affectedMonths) {
    try {
      const deletePromises = affectedMonths.map(({ year, month }) => {
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        const pk = `MONTH#${bookingLinkId}#${monthKey}`;
        return this.deleteItem(pk, config.sortKeys.overview).catch(() => {
          // Ignore errors if item doesn't exist
        });
      });

      await Promise.all(deletePromises);
      console.log(`Invalidated availability cache for ${bookingLinkId}:`, affectedMonths);
    } catch (error) {
      console.error('Error invalidating availability cache:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Update specific day availability after booking change
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} dateString - Date in YYYY-MM-DD format
   */
  async updateDayAvailability(bookingLinkId, dateString) {
    try {
      const date = new Date(dateString + 'T00:00:00');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      // Get the month cache
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const pk = `MONTH#${bookingLinkId}#${monthKey}`;
      
      const availabilityData = await this.getItem(pk, config.sortKeys.overview);
      
      if (!availabilityData) {
        // No cache exists, will be calculated on next request
        return;
      }

      // Recalculate just this day
      const bookingLink = new BookingLink(this.client);
      const bookingLinkData = await bookingLink.findById(bookingLinkId);
      
      const template = new Template(this.client);
      const templateData = await template.findById(bookingLinkData.templateId);
      
      const booking = new Booking(this.client);
      const dayBookings = await booking.findByBookingLinkAndDate(bookingLinkId, dateString);
      
      const dayAvailability = await this.calculateDayAvailability(
        templateData,
        bookingLinkData,
        dateString,
        dayBookings
      );
      
      // Update the specific day in the cache
      const dayKey = date.getDate().toString().padStart(2, '0');
      const updateExpression = 'SET #data.#dayKey = :dayData, lastUpdated = :updated';
      const expressionValues = {
        ':dayData': {
          available: dayAvailability.available,
          slotsCount: dayAvailability.availableSlots
        },
        ':updated': new Date().toISOString()
      };
      const expressionAttributeNames = {
        '#data': 'data',
        '#dayKey': dayKey
      };

      await this.updateItem(
        pk,
        config.sortKeys.overview,
        updateExpression,
        expressionValues
      );

      console.log(`Updated day availability: ${bookingLinkId} - ${dateString}`);
    } catch (error) {
      console.error('Error updating day availability:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Validate if a booking can be made (comprehensive check)
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} selectedDate - Date in YYYY-MM-DD format
   * @param {string} selectedTime - Time in HH:MM format
   * @returns {Object} Validation result
   */
  async validateBookingSlot(bookingLinkId, selectedDate, selectedTime) {
    try {
      // Get booking link and template
      const bookingLink = new BookingLink(this.client);
      const bookingLinkData = await bookingLink.findById(bookingLinkId);
      
      const template = new Template(this.client);
      const templateData = await template.findById(bookingLinkData.templateId);
      
      // Check if booking link is active
      if (!bookingLinkData.isActive) {
        return {
          valid: false,
          error: 'This booking link is no longer active'
        };
      }
      
      // Check if date is in the past
      const date = new Date(selectedDate + 'T00:00:00');
      if (this.isPastDate(date)) {
        return {
          valid: false,
          error: 'Cannot book appointments in the past'
        };
      }
      
      // Check if date is unavailable
      if (this.isDateUnavailable(templateData, selectedDate)) {
        return {
          valid: false,
          error: 'This date is not available for booking'
        };
      }
      
      // Check if time slot exists in template
      const allSlots = this.generateTimeSlotsForDate(templateData, selectedDate);
      const requestedSlot = allSlots.find(slot => slot.startTime === selectedTime);
      
      if (!requestedSlot) {
        return {
          valid: false,
          error: 'This time slot is not available in the schedule'
        };
      }
      
      // Check if slot is already booked
      const booking = new Booking(this.client);
      const isAvailable = await booking.isTimeSlotAvailable(bookingLinkId, selectedDate, selectedTime);
      if (!isAvailable) {
        return {
          valid: false,
          error: 'This time slot is already booked'
        };
      }
      
      // Check advance booking requirements
      if (bookingLinkData.requireAdvanceBooking) {
        const now = new Date();
        const slotDateTime = new Date(selectedDate + 'T' + selectedTime + ':00');
        const timeDifference = slotDateTime.getTime() - now.getTime();
        const hoursUntilSlot = timeDifference / (1000 * 60 * 60);
        
        if (hoursUntilSlot < bookingLinkData.advanceHours) {
          return {
            valid: false,
            error: `This booking requires at least ${bookingLinkData.advanceHours} hours advance notice`
          };
        }
      }
      
      return {
        valid: true,
        bookingLink: bookingLinkData,
        template: templateData
      };
    } catch (error) {
      console.error('Error validating booking slot:', error);
      return {
        valid: false,
        error: 'Failed to validate booking slot: ' + error.message
      };
    }
  }

  /**
   * Check if cached data is stale (older than 1 hour)
   * @param {Object} availabilityData - Cached availability data
   * @returns {boolean} True if data is stale
   */
  isDataStale(availabilityData) {
    if (!availabilityData.lastUpdated) return true;
    
    const lastUpdated = new Date(availabilityData.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate > 1; // Consider stale after 1 hour
  }

  /**
   * Format month availability data for API response
   * @param {Object} monthData - Raw month data
   * @param {number} year - Year
   * @param {number} month - Month
   * @returns {Array} Formatted availability array
   */
  formatMonthAvailability(monthData, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const availability = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = day.toString().padStart(2, '0');
      const dayData = monthData[dayKey] || { available: false, slotsCount: 0 };
      
      const date = new Date(year, month - 1, day);
      const dateString = this.formatDateToString(date);
      
      availability.push({
        date: dateString,
        available: dayData.available,
        totalSlots: dayData.slotsCount,
        availableSlots: dayData.slotsCount
      });
    }
    
    return availability;
  }

  /**
   * Check if a date is unavailable due to blackout days or cutoff date
   * @param {Object} templateData - Template data
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @returns {boolean} True if date is unavailable
   */
  isDateUnavailable(templateData, dateString) {
    // Check if it's a blackout day
    if (templateData.blackoutDays && templateData.blackoutDays.includes(dateString)) {
      return true;
    }
    
    // Check if it's beyond the cutoff date
    if (templateData.bookingCutoffDate) {
      const checkDate = new Date(dateString + 'T00:00:00');
      const cutoffDate = new Date(templateData.bookingCutoffDate + 'T23:59:59');
      
      if (checkDate > cutoffDate) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate 30-minute time slots from template schedule for a specific date
   * @param {Object} templateData - Template data with schedule
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @returns {Array} Array of time slot objects
   */
  generateTimeSlotsForDate(templateData, dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = this.getDayOfWeekKey(date);
    
    // Get schedule for this day of week
    const daySchedule = templateData.schedule[dayOfWeek] || [];
    
    const slots = [];
    
    // Generate 30-minute slots for each time range in the day schedule
    daySchedule.forEach(timeRange => {
      const startMinutes = this.timeToMinutes(timeRange.startTime);
      const endMinutes = this.timeToMinutes(timeRange.endTime);
      
      // Generate 30-minute slots
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const startTime = this.minutesToTime(minutes);
        const endTime = this.minutesToTime(minutes + 30);
        
        // Only add slot if it doesn't exceed the original time range
        if (minutes + 30 <= endMinutes) {
          slots.push({
            id: `TS_${dateString}_${startTime.replace(':', '')}`,
            startTime: startTime,
            endTime: endTime,
            available: true
          });
        }
      }
    });
    
    return slots;
  }

  /**
   * Apply advance booking restrictions to time slots
   * @param {Array} slots - Array of time slots
   * @param {string} selectedDate - Date in YYYY-MM-DD format
   * @param {boolean} requireAdvanceBooking - Whether advance booking is required
   * @param {number} advanceHours - Minimum advance hours required
   * @returns {Array} Filtered array of time slots
   */
  applyAdvanceBookingFilter(slots, selectedDate, requireAdvanceBooking, advanceHours) {
    if (!requireAdvanceBooking) {
      return slots;
    }
    
    const now = new Date();
    
    return slots.filter(slot => {
      const slotDateTime = new Date(selectedDate + 'T' + slot.startTime + ':00');
      const timeDifference = slotDateTime.getTime() - now.getTime();
      const hoursUntilSlot = timeDifference / (1000 * 60 * 60);
      
      return hoursUntilSlot >= advanceHours;
    });
  }

  /**
   * Get day of week key for template schedule
   * @param {Date} date - Date object
   * @returns {string} Day key (monday, tuesday, etc.)
   */
  getDayOfWeekKey(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  /**
   * Convert time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string
   * @param {number} minutes - Minutes since midnight
   * @returns {string} Time in HH:MM format
   */
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Format date to YYYY-MM-DD string
   * @param {Date} date - Date object
   * @returns {string} Date in YYYY-MM-DD format
   */
  formatDateToString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if date is in the past
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is in the past
   */
  isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  /**
   * Get affected months for cache invalidation
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @param {number} monthsAhead - How many months ahead to include
   * @returns {Array} Array of {year, month} objects
   */
  getAffectedMonths(dateString, monthsAhead = 6) {
    const date = new Date(dateString + 'T00:00:00');
    const months = [];
    
    for (let i = 0; i < monthsAhead; i++) {
      const targetDate = new Date(date.getFullYear(), date.getMonth() + i, 1);
      months.push({
        year: targetDate.getFullYear(),
        month: targetDate.getMonth() + 1
      });
    }
    
    return months;
  }

  /**
   * Recalculate availability for all booking links using a template
   * @param {string} templateId - Template ID
   */
  async recalculateAvailabilityForTemplate(templateId) {
    try {
      // Find all booking links using this template
      const bookingLink = new BookingLink(this.client);
      const allBookingLinks = await bookingLink.findAll();
      const affectedBookingLinks = allBookingLinks.filter(bl => bl.templateId === templateId);
      
      // Get months to recalculate (next 6 months)
      const today = new Date();
      const affectedMonths = this.getAffectedMonths(this.formatDateToString(today), 6);
      
      // Invalidate cache for all affected booking links
      const invalidationPromises = affectedBookingLinks.map(bl => 
        this.invalidateAvailabilityCache(bl.id, affectedMonths)
      );
      
      await Promise.all(invalidationPromises);
      
      console.log(`Recalculated availability for template ${templateId}, affecting ${affectedBookingLinks.length} booking links`);
    } catch (error) {
      console.error('Error recalculating availability for template:', error);
      // Don't throw - this runs in background
    }
  }
}