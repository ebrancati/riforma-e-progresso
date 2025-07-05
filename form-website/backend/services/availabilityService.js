import { Template } from '../models/Template.js';
import { Booking } from '../models/Booking.js';

export class AvailabilityService {
  
  /**
   * Get availability for a specific month
   * @param {string} bookingLinkId - Booking link ID
   * @param {number} year - Year (e.g., 2025)
   * @param {number} month - Month (1-12)
   * @returns {Array} Array of day availability objects
   */
  static async getMonthAvailability(bookingLinkId, year, month) {
    try {
      // Get booking link to access template and advance booking settings
      const { BookingLink } = await import('../models/BookingLink.js');
      const bookingLink = await BookingLink.findById(bookingLinkId);
      
      // Get template schedule
      const template = await Template.findById(bookingLink.templateId);
      
      // Get existing bookings for this month
      const existingBookings = await Booking.findByBookingLinkAndMonth(bookingLinkId, year, month);
      
      // Generate availability for each day of the month
      const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based here
      const availability = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day); // month is 0-based for Date constructor
        const dateString = this.formatDateToString(date);
        
        const dayAvailability = await this.getDayAvailability(
          template,
          bookingLink,
          dateString,
          existingBookings.filter(booking => booking.selectedDate === dateString)
        );
        
        availability.push(dayAvailability);
      }
      
      return availability;
    } catch (error) {
      console.error('Error calculating month availability:', error);
      throw new Error('Failed to calculate month availability: ' + error.message);
    }
  }
  
  /**
   * Get available time slots for a specific date
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} selectedDate - Date in YYYY-MM-DD format
   * @returns {Array} Array of available time slots
   */
  static async getAvailableTimeSlots(bookingLinkId, selectedDate) {
    try {
      // Get booking link to access template and settings
      const { BookingLink } = await import('../models/BookingLink.js');
      const bookingLink = await BookingLink.findById(bookingLinkId);
      
      // Get template schedule
      const template = await Template.findById(bookingLink.templateId);
      
      // Check if date is blackout day or beyond cutoff
      if (this.isDateUnavailable(template, selectedDate)) {
        return []; // Return empty array for unavailable dates
      }
      
      // Get existing bookings for this date
      const existingBookings = await Booking.findByBookingLinkAndDate(bookingLinkId, selectedDate);
      
      // Generate all possible time slots for this date
      const allSlots = this.generateTimeSlotsForDate(template, selectedDate);
      
      // Filter out booked slots
      const bookedTimes = existingBookings.map(booking => booking.selectedTime);
      const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot.startTime));
      
      // Apply advance booking restrictions
      const filteredSlots = this.applyAdvanceBookingFilter(
        availableSlots,
        selectedDate,
        bookingLink.requireAdvanceBooking,
        bookingLink.advanceHours
      );
      
      return filteredSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      throw new Error('Failed to get available time slots: ' + error.message);
    }
  }
  
  /**
   * Calculate availability for a single day
   * @param {Object} template - Template object with schedule
   * @param {Object} bookingLink - Booking link object
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @param {Array} dayBookings - Existing bookings for this day
   * @returns {Object} Day availability object
   */
  static async getDayAvailability(template, bookingLink, dateString, dayBookings) {
    const date = new Date(dateString + 'T00:00:00');
    
    // Check if date is in the past
    if (this.isPastDate(date)) {
      return {
        date: dateString,
        available: false,
        totalSlots: 0,
        availableSlots: 0
      };
    }
    
    // Check if date is blackout day or beyond cutoff
    if (this.isDateUnavailable(template, dateString)) {
      return {
        date: dateString,
        available: false,
        totalSlots: 0,
        availableSlots: 0
      };
    }
    
    // Generate all possible slots for this day
    const allSlots = this.generateTimeSlotsForDate(template, dateString);
    
    // Filter out booked slots
    const bookedTimes = dayBookings.map(booking => booking.selectedTime);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot.startTime));
    
    // Apply advance booking restrictions
    const filteredSlots = this.applyAdvanceBookingFilter(
      availableSlots,
      dateString,
      bookingLink.requireAdvanceBooking,
      bookingLink.advanceHours
    );
    
    return {
      date: dateString,
      available: filteredSlots.length > 0,
      totalSlots: allSlots.length,
      availableSlots: filteredSlots.length
    };
  }

  /**
   * Check if a date is unavailable due to blackout days or cutoff date
   * @param {Object} template - Template object
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @returns {boolean} True if date is unavailable
   */
  static isDateUnavailable(template, dateString) {
    // Check if it's a blackout day
    if (template.blackoutDays && template.blackoutDays.includes(dateString)) {
      return true;
    }
    
    // Check if it's beyond the cutoff date
    if (template.bookingCutoffDate) {
      const checkDate = new Date(dateString + 'T00:00:00');
      const cutoffDate = new Date(template.bookingCutoffDate + 'T23:59:59');
      
      if (checkDate > cutoffDate) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate 30-minute time slots from template schedule for a specific date
   * @param {Object} template - Template object with schedule
   * @param {string} dateString - Date in YYYY-MM-DD format
   * @returns {Array} Array of time slot objects
   */
  static generateTimeSlotsForDate(template, dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = this.getDayOfWeekKey(date);
    
    // Get schedule for this day of week
    const daySchedule = template.schedule[dayOfWeek] || [];
    
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
  static applyAdvanceBookingFilter(slots, selectedDate, requireAdvanceBooking, advanceHours) {
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
  static getDayOfWeekKey(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }
  
  /**
   * Convert time string to minutes since midnight
   * @param {string} timeString - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  static timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Convert minutes since midnight to time string
   * @param {number} minutes - Minutes since midnight
   * @returns {string} Time in HH:MM format
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  /**
   * Format date to YYYY-MM-DD string
   * @param {Date} date - Date object
   * @returns {string} Date in YYYY-MM-DD format
   */
  static formatDateToString(date) {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Check if date is in the past
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is in the past
   */
  static isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
  
  /**
   * Validate if a booking can be made (comprehensive check)
   * @param {string} bookingLinkId - Booking link ID
   * @param {string} selectedDate - Date in YYYY-MM-DD format
   * @param {string} selectedTime - Time in HH:MM format
   * @returns {Object} Validation result
   */
  static async validateBookingSlot(bookingLinkId, selectedDate, selectedTime) {
    try {
      // Get booking link and template
      const { BookingLink } = await import('../models/BookingLink.js');
      const bookingLink = await BookingLink.findById(bookingLinkId);
      const template = await Template.findById(bookingLink.templateId);
      
      // Check if booking link is active
      if (!bookingLink.isActive) {
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
      
      // Check if date is unavailable (blackout or beyond cutoff)
      if (this.isDateUnavailable(template, selectedDate)) {
        return {
          valid: false,
          error: 'This date is not available for booking'
        };
      }
      
      // Check if time slot exists in template
      const allSlots = this.generateTimeSlotsForDate(template, selectedDate);
      const requestedSlot = allSlots.find(slot => slot.startTime === selectedTime);
      
      if (!requestedSlot) {
        return {
          valid: false,
          error: 'This time slot is not available in the schedule'
        };
      }
      
      // Check if slot is already booked
      const isAvailable = await Booking.isTimeSlotAvailable(bookingLinkId, selectedDate, selectedTime);
      if (!isAvailable) {
        return {
          valid: false,
          error: 'This time slot is already booked'
        };
      }
      
      // Check advance booking requirements
      if (bookingLink.requireAdvanceBooking) {
        const now = new Date();
        const slotDateTime = new Date(selectedDate + 'T' + selectedTime + ':00');
        const timeDifference = slotDateTime.getTime() - now.getTime();
        const hoursUntilSlot = timeDifference / (1000 * 60 * 60);
        
        if (hoursUntilSlot < bookingLink.advanceHours) {
          return {
            valid: false,
            error: `This booking requires at least ${bookingLink.advanceHours} hours advance notice`
          };
        }
      }
      
      return {
        valid: true,
        bookingLink: bookingLink,
        template: template
      };
    } catch (error) {
      console.error('Error validating booking slot:', error);
      return {
        valid: false,
        error: 'Failed to validate booking slot: ' + error.message
      };
    }
  }
}