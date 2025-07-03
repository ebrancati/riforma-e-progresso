export class IdGenerator {

  /**
   * Generate a unique ID with format: PREFIX_TIMESTAMP_RANDOM
   * @param {string} prefix - Entity type prefix (e.g., 'TPL', 'USR', 'BKG')
   * @param {number} randomLength - Length of random string (default: 6)
   * @returns {string} Generated unique ID
   */
  static generate(prefix, randomLength = 6) {
    if (!prefix || typeof prefix !== 'string') {
      throw new Error('Prefix is required and must be a string');
    }
    
    // Validate prefix format (uppercase letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(prefix)) {
      throw new Error('Prefix must contain only uppercase letters and numbers');
    }
    
    const timestamp = Date.now();
    const random = this.generateRandomString(randomLength);
    
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate booking link ID
   * @returns {string} Booking link ID with BL prefix
   */
  static generateBookingLinkId() {
    return this.generate('BL', 8);
  }
  
  /**
   * Check if ID is booking link ID
   * @param {string} id - Custom ID
   * @returns {boolean} True if booking link ID
   */
  static isBookingLinkId(id) {
    return this.isEntityType(id, 'BL');
  }
  
  /**
   * Generate template ID
   * @returns {string} Template ID with TPL prefix
   */
  static generateTemplateId() {
    return this.generate('TPL', 8);
  }
  
  /**
   * Generate booking ID
   * @returns {string} Booking ID with BKG prefix
   */
  static generateBookingId() {
    return this.generate('BKG', 10);
  }
  
  /**
   * Generate time slot ID
   * @returns {string} Time slot ID with TS prefix
   */
  static generateTimeSlotId() {
    return this.generate('TS', 6);
  }
  
  /**
   * Generate random alphanumeric string
   * @param {number} length - Length of random string
   * @returns {string} Random string
   */
  static generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
  
  /**
   * Validate custom ID format
   * @param {string} id - ID to validate
   * @returns {boolean} True if valid format
   */
  static isValidId(id) {
    if (!id || typeof id !== 'string') return false;
    
    // Format: PREFIX_TIMESTAMP_RANDOM
    const parts = id.split('_');
    if (parts.length !== 3) return false;
    
    const [prefix, timestamp, random] = parts;
    
    // Validate prefix (uppercase letters/numbers, 2-5 chars)
    if (!/^[A-Z0-9]{2,5}$/.test(prefix)) return false;
    
    // Validate timestamp (13 digits for milliseconds)
    if (!/^\d{13}$/.test(timestamp)) return false;
    
    // Validate random part (alphanumeric, 4-12 chars)
    if (!/^[A-Za-z0-9]{4,12}$/.test(random)) return false;
    
    return true;
  }
  
  /**
   * Extract prefix from ID
   * @param {string} id - Custom ID
   * @returns {string|null} Prefix or null if invalid
   */
  static extractPrefix(id) {
    if (!this.isValidId(id)) return null;
    return id.split('_')[0];
  }
  
  /**
   * Extract timestamp from ID
   * @param {string} id - Custom ID
   * @returns {number|null} Timestamp or null if invalid
   */
  static extractTimestamp(id) {
    if (!this.isValidId(id)) return null;
    return parseInt(id.split('_')[1]);
  }
  
  /**
   * Extract creation date from ID
   * @param {string} id - Custom ID
   * @returns {Date|null} Date object or null if invalid
   */
  static extractDate(id) {
    const timestamp = this.extractTimestamp(id);
    return timestamp ? new Date(timestamp) : null;
  }
  
  /**
   * Check if ID belongs to specific entity type
   * @param {string} id - Custom ID
   * @param {string} expectedPrefix - Expected prefix
   * @returns {boolean} True if ID matches prefix
   */
  static isEntityType(id, expectedPrefix) {
    return this.extractPrefix(id) === expectedPrefix;
  }
  
  /**
   * Check if ID is template ID
   * @param {string} id - Custom ID
   * @returns {boolean} True if template ID
   */
  static isTemplateId(id) {
    return this.isEntityType(id, 'TPL');
  }
  
  /**
   * Check if ID is booking ID
   * @param {string} id - Custom ID
   * @returns {boolean} True if booking ID
   */
  static isBookingId(id) {
    return this.isEntityType(id, 'BKG');
  }
}