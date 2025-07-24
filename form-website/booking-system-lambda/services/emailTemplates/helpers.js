/**
 * Format date in Italian format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted Italian date
 */
export const formatItalianDate = (dateString) => {
  const date = new Date(dateString + 'T12:00:00');
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName} ${day} ${month} ${year}`;
};

/**
 * Add minutes to time string
 * @param {string} timeString - Time in HH:MM format
 * @param {number} minutes - Minutes to add
 * @returns {string} New time string
 */
export const addMinutesToTime = (timeString, minutes) => {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
};

/**
 * Generate base URL from environment
 * @returns {string} Base URL
 */
export const getBaseUrl = () => {
  return process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') 
    || 'https://candidature.riformaeprogresso.it';
};

/**
 * Generate management URLs for booking
 * @param {string} bookingId - Booking ID
 * @param {string} cancellationToken - Cancellation token
 * @returns {Object} URLs object
 */
export const generateManagementUrls = (bookingId, cancellationToken) => {
  const baseUrl = getBaseUrl();
  return {
    rescheduleUrl: `${baseUrl}/booking/${bookingId}/reschedule?token=${cancellationToken}`,
    cancelUrl: `${baseUrl}/booking/${bookingId}/cancel?token=${cancellationToken}`
  };
};

/**
 * Generate protected CV URL
 * @param {string} fileId - File ID
 * @returns {string} Protected CV URL
 */
export const generateCVUrl = (fileId) => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/admin/cv/${fileId}`;
};