import { IdGenerator } from './idGenerator.js';

export class InputSanitizer {
  
  /**
   * Sanitize generic string input to prevent XSS and injection attacks
   * @param {string} input - The input string to sanitize
   * @param {number} maxLength - Maximum allowed length (default: 100)
   * @returns {string} Sanitized string
   * @throws {Error} If input is not a string
   */
  static sanitizeString(input, maxLength = 100) {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '')           // Remove HTML tags
      .replace(/javascript:/gi, '')   // Remove javascript: URLs
      .replace(/on\w+=/gi, '')        // Remove event handlers (onclick, onload, etc)
      .replace(/[^\w\s\-_.()]/g, '')  // Allow only safe characters: letters, numbers, spaces, dash, underscore, dot, parentheses
      .substring(0, maxLength);
  }
  
  /**
   * Sanitize template name with specific validation rules
   * @param {string} name - Template name to sanitize
   * @returns {string} Sanitized template name
   * @throws {Error} If name is invalid or empty after sanitization
   */
  static sanitizeTemplateName(name) {
    const sanitized = this.sanitizeString(name, 100);
    
    if (sanitized.length === 0) {
      throw new Error('Template name cannot be empty after sanitization');
    }
    
    // Ensure name doesn't start or end with special characters
    const cleanName = sanitized.replace(/^[\s\-_.]+|[\s\-_.]+$/g, '');
    
    if (cleanName.length === 0) {
      throw new Error('Template name must contain valid characters');
    }
    
    return cleanName;
  }
  
  /**
   * Validate and sanitize a single time slot
   * @param {Object} slot - Time slot object with id, startTime, endTime
   * @returns {Object} Validated time slot
   * @throws {Error} If slot structure or time format is invalid
   */
  static validateTimeSlot(slot) {
    if (!slot || typeof slot !== 'object') {
      throw new Error('Time slot must be an object');
    }
    
    if (!slot.id || !slot.startTime || !slot.endTime) {
      throw new Error('Time slot must have id, startTime, and endTime');
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
      throw new Error('Invalid time format. Use HH:MM format');
    }
    
    // Validate time logic
    const startMinutes = this.timeToMinutes(slot.startTime);
    const endMinutes = this.timeToMinutes(slot.endTime);
    
    if (endMinutes <= startMinutes) {
      throw new Error('End time must be after start time');
    }
    
    return {
      id: this.sanitizeString(slot.id, 50),
      startTime: slot.startTime,
      endTime: slot.endTime
    };
  }
  
  /**
   * Validate and sanitize complete schedule object
   * @param {Object} schedule - Schedule object with day keys and time slot arrays
   * @returns {Object} Validated schedule
   * @throws {Error} If schedule structure is invalid
   */
  static validateSchedule(schedule) {
    if (!schedule || typeof schedule !== 'object') {
      throw new Error('Schedule must be an object');
    }
    
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const sanitizedSchedule = {};
    
    for (const [day, slots] of Object.entries(schedule)) {
      if (!validDays.includes(day)) {
        throw new Error(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
      }
      
      if (!Array.isArray(slots)) {
        throw new Error(`Slots for ${day} must be an array`);
      }
      
      // Validate each slot and check for overlaps
      const validatedSlots = slots.map(slot => this.validateTimeSlot(slot));
      this.checkTimeSlotOverlaps(validatedSlots, day);
      
      sanitizedSchedule[day] = validatedSlots;
    }
    
    return sanitizedSchedule;
  }

  /**
   * Validate and sanitize blackout days array
   * @param {Array} blackoutDays - Array of date strings in YYYY-MM-DD format
   * @returns {Array} Validated and sorted blackout days
   * @throws {Error} If blackout days format is invalid
   */
  static validateBlackoutDays(blackoutDays) {
    if (!blackoutDays) {
      return [];
    }
    
    if (!Array.isArray(blackoutDays)) {
      throw new Error('Blackout days must be an array');
    }
    
    const validatedDays = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    for (const dayString of blackoutDays) {
      if (typeof dayString !== 'string') {
        throw new Error('Each blackout day must be a string');
      }
      
      const trimmedDay = dayString.trim();
      
      if (!dateRegex.test(trimmedDay)) {
        throw new Error(`Invalid date format: ${trimmedDay}. Use YYYY-MM-DD format`);
      }
      
      // Validate that it's a real date
      const testDate = new Date(trimmedDay + 'T12:00:00'); // Use noon to avoid timezone issues
      if (isNaN(testDate.getTime())) {
        throw new Error(`Invalid date: ${trimmedDay}`);
      }
      
      // Validate components individually
      const [year, month, dayNumber] = trimmedDay.split('-').map(Number);
      
      if (year < 2024 || year > 2035) {
        throw new Error(`Year must be between 2024 and 2035: ${year}`);
      }
      
      if (month < 1 || month > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      
      if (dayNumber < 1 || dayNumber > 31) {
        throw new Error(`Invalid day: ${dayNumber}`);
      }
      
      // Check for valid day in month
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      if (dayNumber > lastDayOfMonth) {
        throw new Error(`Invalid day ${dayNumber} for month ${month}/${year}`);
      }
      
      validatedDays.push(trimmedDay);
    }
    
    // Remove duplicates and sort
    const uniqueDays = [...new Set(validatedDays)];
    return uniqueDays.sort();
  }

  /**
   * Validate and sanitize booking cutoff date
   * @param {string|null} cutoffDate - Date string in YYYY-MM-DD format or null
   * @returns {string|null} Validated cutoff date or null
   * @throws {Error} If cutoff date format is invalid
   */
  static validateBookingCutoffDate(cutoffDate) {
    if (!cutoffDate || cutoffDate === null || cutoffDate === '') {
      return null;
    }
    
    if (typeof cutoffDate !== 'string') {
      throw new Error('Booking cutoff date must be a string or null');
    }
    
    const trimmedDate = cutoffDate.trim();
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateRegex.test(trimmedDate)) {
      throw new Error(`Invalid cutoff date format: ${trimmedDate}. Use YYYY-MM-DD format`);
    }
    
    // Validate that it's a real date
    const testDate = new Date(trimmedDate + 'T00:00:00');
    if (isNaN(testDate.getTime())) {
      throw new Error(`Invalid cutoff date: ${trimmedDate}`);
    }
    
    // Validate components individually
    const [year, month, dayNumber] = trimmedDate.split('-').map(Number);
    
    if (year < 2024 || year > 2035) {
      throw new Error(`Year must be between 2024 and 2035: ${year}`);
    }
    
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}`);
    }
    
    if (dayNumber < 1 || dayNumber > 31) {
      throw new Error(`Invalid day: ${dayNumber}`);
    }
    
    // Additional check for valid day in month
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (dayNumber > lastDayOfMonth) {
      throw new Error(`Invalid day ${dayNumber} for month ${month}/${year}`);
    }
    
    return trimmedDate;
  }
  
  /**
   * Check for overlapping time slots within a day
   * @param {Array} slots - Array of time slots
   * @param {string} dayName - Name of the day (for error messages)
   * @throws {Error} If overlapping slots are found
   */
  static checkTimeSlotOverlaps(slots, dayName) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];
        
        const start1 = this.timeToMinutes(slot1.startTime);
        const end1 = this.timeToMinutes(slot1.endTime);
        const start2 = this.timeToMinutes(slot2.startTime);
        const end2 = this.timeToMinutes(slot2.endTime);
        
        // Check for overlap
        if (start1 < end2 && start2 < end1) {
          throw new Error(`Overlapping time slots found on ${dayName}: ${slot1.startTime}-${slot1.endTime} and ${slot2.startTime}-${slot2.endTime}`);
        }
      }
    }
  }
  
  /**
   * Convert time string to minutes for easy comparison
   * @param {string} time - Time in HH:MM format
   * @returns {number} Minutes since midnight
   */
  static timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * Validate custom ID format
   * @param {string} id - ID to validate
   * @returns {boolean} True if valid custom ID format
   */
  static isValidId(id) {
    return IdGenerator.isValidId(id);
  }
  
  /**
   * Validate template ID specifically
   * @param {string} id - Template ID to validate
   * @returns {boolean} True if valid template ID
   */
  static isValidTemplateId(id) {
    return IdGenerator.isTemplateId(id);
  }
  
  /**
   * Sanitize and validate template data for creation/update
   * @param {Object} templateData - Raw template data from request
   * @returns {Object} Sanitized template data
   * @throws {Error} If validation fails
   */
  static validateTemplateData(templateData) {
    if (!templateData || typeof templateData !== 'object') {
      throw new Error('Template data must be an object');
    }
    
    const sanitized = {};
    
    // Validate and sanitize name
    if (!templateData.name) {
      throw new Error('Template name is required');
    }
    sanitized.name = this.sanitizeTemplateName(templateData.name);
    
    // Validate and sanitize schedule
    if (!templateData.schedule) {
      throw new Error('Template schedule is required');
    }
    sanitized.schedule = this.validateSchedule(templateData.schedule);
    
    // Validate advanced settings (optional)
    if (templateData.blackoutDays !== undefined) {
      sanitized.blackoutDays = this.validateBlackoutDays(templateData.blackoutDays);
    }
    
    if (templateData.bookingCutoffDate !== undefined) {
      sanitized.bookingCutoffDate = this.validateBookingCutoffDate(templateData.bookingCutoffDate);
    }
    
    return sanitized;
  }
}