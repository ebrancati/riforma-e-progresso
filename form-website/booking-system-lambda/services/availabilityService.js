import { DynamoDBBase, config } from '../utils/dynamodb.js';
import { Template } from '../models/Template.js';
import { Booking } from '../models/Booking.js';
import { BookingLink } from '../models/BookingLink.js';

export class AvailabilityService extends DynamoDBBase {
  constructor(dynamoClient) {
    super(dynamoClient);
  }

  /**
   * Get availability for a specific month
   * @param {string} bookingLinkId - Booking link ID
   * @param {number} year - Year (e.g., 2025)
   * @param {number} month - Month (1-12)
   * @returns {Array} Array of day availability objects
   */
  async getMonthAvailability(bookingLinkId, year, month) {
    try {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const pk = `MONTH#${bookingLinkId}#${monthKey}`;
      
      // Try to get cached availability
      let availabilityData = await this.getItem(pk, config.sortKeys.overview);
      
      // If no cached data exists, calculate and cache it
      if (!availabilityData) {
        console.log(`Calculating fresh availability for ${bookingLinkId} - ${monthKey}`);
        availabilityData = await this.calculateAndCacheMonthAvailability(bookingLinkId, year, month);
      } else {
        console.log(`Using cached availability for ${bookingLinkId} - ${monthKey}`);
      }

      return this.formatMonthAvailability(availabilityData.data, year, month);
    } catch (error) {
      console.error('Error getting month availability:', error);
      throw new Error('Failed to get month availability: ' + error.message);
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
        cacheVersion: this.generateCacheVersion() // Version for debugging
      };
      
      await this.putItem(cacheItem);
      console.log(`Cached month availability: ${pk}`);
      return cacheItem;
    } catch (error) {
      console.error('Error calculating month availability:', error);
      throw error;
    }
  }

  /**
   * Event-driven cache invalidation for booking changes
   * Called when bookings are created, cancelled, or rescheduled
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} affectedDate - Date in YYYY-MM-DD format
   * @param {string} eventType - 'create', 'cancel', 'reschedule'
   * @param {string} oldDate - Old date for reschedule events
   */
  async invalidateCacheForBookingEvent(bookingLinkId, affectedDate, eventType = 'update', oldDate = null) {
    try {
      const affectedDates = [affectedDate];
      
      // For reschedule events, also include the old date
      if (eventType === 'reschedule' && oldDate && oldDate !== affectedDate) {
        affectedDates.push(oldDate);
      }

      const affectedMonths = new Set();
      
      // Determine which months need cache invalidation
      affectedDates.forEach(dateString => {
        const date = new Date(dateString + 'T00:00:00');
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        affectedMonths.add(monthKey);
      });

      // Delete cached availability for affected months
      const deletePromises = Array.from(affectedMonths).map(monthKey => {
        const pk = `MONTH#${bookingLinkId}#${monthKey}`;
        return this.deleteItem(pk, config.sortKeys.overview).catch(() => {
          // Ignore errors if cache doesn't exist
          console.log(`Cache not found for ${pk} (normal if first booking)`);
        });
      });

      await Promise.all(deletePromises);
      
      console.log(`Cache invalidated for booking ${eventType} event:`, {
        bookingLinkId,
        affectedDates,
        affectedMonths: Array.from(affectedMonths)
      });

    } catch (error) {
      console.error('Error invalidating cache for booking event:', error);
      // Don't throw - cache invalidation is not critical for functionality
    }
  }

  /**
   * Event-driven cache invalidation for template changes
   * Called when templates are updated
   * @param {string} templateId - Template ID that was changed
   */
  async invalidateCacheForTemplateChange(templateId) {
    try {
      // Find all booking links using this template
      const bookingLink = new BookingLink(this.client);
      const allBookingLinks = await bookingLink.findAll();
      const affectedBookingLinks = allBookingLinks.filter(bl => bl.templateId === templateId);
      
      if (affectedBookingLinks.length === 0) {
        console.log(`No booking links found for template ${templateId}`);
        return;
      }

      // Get current and future months to invalidate (next 12 months)
      const today = new Date();
      const monthsToInvalidate = [];
      
      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsToInvalidate.push(monthKey);
      }

      // Delete cache for all affected booking links and months
      const deletePromises = [];
      
      affectedBookingLinks.forEach(bl => {
        monthsToInvalidate.forEach(monthKey => {
          const pk = `MONTH#${bl.id}#${monthKey}`;
          deletePromises.push(
            this.deleteItem(pk, config.sortKeys.overview).catch(() => {
              // Ignore errors if cache doesn't exist
            })
          );
        });
      });

      await Promise.all(deletePromises);
      
      console.log(`Template change cache invalidation completed:`, {
        templateId,
        affectedBookingLinks: affectedBookingLinks.length,
        monthsInvalidated: monthsToInvalidate.length
      });

    } catch (error) {
      console.error('Error invalidating cache for template change:', error);
      // Don't throw - this runs in background
    }
  }

  /**
   * Event-driven cache invalidation for booking link changes
   * Called when booking link settings are updated (advance booking, etc.)
   * @param {string} bookingLinkId - Booking link ID that was changed
   */
  async invalidateCacheForBookingLinkChange(bookingLinkId) {
    try {
      // Get current and future months to invalidate (next 12 months)
      const today = new Date();
      const monthsToInvalidate = [];
      
      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsToInvalidate.push(monthKey);
      }

      // Delete cache for all months
      const deletePromises = monthsToInvalidate.map(monthKey => {
        const pk = `MONTH#${bookingLinkId}#${monthKey}`;
        return this.deleteItem(pk, config.sortKeys.overview).catch(() => {
          // Ignore errors if cache doesn't exist
        });
      });

      await Promise.all(deletePromises);
      
      console.log(`Booking link change cache invalidation completed:`, {
        bookingLinkId,
        monthsInvalidated: monthsToInvalidate.length
      });

    } catch (error) {
      console.error('Error invalidating cache for booking link change:', error);
      // Don't throw - this runs in background
    }
  }

  /**
   * Bulk cache warming for a booking link
   * Pre-calculate availability for next N months
   * @param {string} bookingLinkId - Booking link ID
   * @param {number} monthsAhead - Number of months to pre-calculate (default: 6)
   */
  async warmCache(bookingLinkId, monthsAhead = 6) {
    try {
      const today = new Date();
      const warmingPromises = [];
      
      for (let i = 0; i < monthsAhead; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        
        // Check if cache already exists
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        const pk = `MONTH#${bookingLinkId}#${monthKey}`;
        const existingCache = await this.getItem(pk, config.sortKeys.overview);
        
        if (!existingCache) {
          console.log(`Warming cache for ${bookingLinkId} - ${monthKey}`);
          warmingPromises.push(
            this.calculateAndCacheMonthAvailability(bookingLinkId, year, month)
          );
        }
      }
      
      if (warmingPromises.length > 0) {
        await Promise.all(warmingPromises);
        console.log(`Cache warming completed for ${bookingLinkId}: ${warmingPromises.length} months calculated`);
      } else {
        console.log(`Cache already warm for ${bookingLinkId}`);
      }

    } catch (error) {
      console.error('Error warming cache:', error);
      // Don't throw - cache warming is optional
    }
  }

  /**
   * Get cache statistics for monitoring
   * @param {string} bookingLinkId - Booking link ID
   * @returns {Object} Cache statistics
   */
  async getCacheStats(bookingLinkId) {
    try {
      const today = new Date();
      const stats = {
        bookingLinkId,
        cachedMonths: 0,
        uncachedMonths: 0,
        cacheDetails: []
      };
      
      // Check next 12 months
      for (let i = 0; i < 12; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        const pk = `MONTH#${bookingLinkId}#${monthKey}`;
        
        const existingCache = await this.getItem(pk, config.sortKeys.overview);
        
        if (existingCache) {
          stats.cachedMonths++;
          stats.cacheDetails.push({
            month: monthKey,
            cached: true,
            lastUpdated: existingCache.lastUpdated
          });
        } else {
          stats.uncachedMonths++;
          stats.cacheDetails.push({
            month: monthKey,
            cached: false
          });
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate cache version for debugging
   * @returns {string} Cache version string
   */
  generateCacheVersion() {
    return `v${Date.now()}`;
  }

  // Keep all the existing helper methods unchanged
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

  getDayOfWeekKey(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  formatDateToString(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}