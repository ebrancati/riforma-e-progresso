/**
 * Format date to YYYY-MM-DD string
 */
export const formatDateToString = (date: Date): string => {
  // Use local timezone instead of UTC to avoid date shifting
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export const parseDateString = (dateString: string): Date => {
  // Create date at midnight in local timezone instead of UTC
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get month name in Italian
 */
export const getMonthName = (month: number): string => {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  return months[month];
};

/**
 * Get day abbreviations in Italian (starting with Monday)
 */
export const getDayAbbreviations = (): string[] => {
  return ['L', 'M', 'M', 'G', 'V', 'S', 'D']; // Lun, Mar, Mer, Gio, Ven, Sab, Dom
};

/**
 * Get full day names in Italian
 */
export const getDayNames = (): string[] => {
  return [
    'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 
    'Venerdì', 'Sabato', 'Domenica'
  ];
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

/**
 * Check if date is in the past 
 */
export const isPastDate = (date: Date): boolean => {
  const today = new Date();
  // Set today to midnight for accurate comparison
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const compareDateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return compareDateMidnight < todayMidnight;
};

/**
 * Check if date is weekend
 */
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

/**
 * Get first day of month (Monday-based week)
 */
export const getFirstDayOfMonth = (year: number, month: number): number => {
  const firstDay = new Date(year, month, 1);
  // Convert Sunday=0 to Monday=0 system
  return (firstDay.getDay() + 6) % 7;
};

/**
 * Get number of days in month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Generate array of dates for calendar grid
 */
export const generateCalendarDates = (year: number, month: number): Date[] => {
  const dates: Date[] = [];
  const firstDayOfWeek = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    // Create dates in local timezone to avoid shifting
    const prevMonthDay = new Date(year, month, -firstDayOfWeek + i + 1);
    dates.push(prevMonthDay);
  }
  
  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    // Create dates in local timezone to avoid shifting
    const currentDate = new Date(year, month, day);
    dates.push(currentDate);
  }
  
  // Add days from next month to complete the grid (6 weeks = 42 days)
  const remainingCells = 42 - dates.length;
  for (let i = 1; i <= remainingCells; i++) {
    // Create dates in local timezone to avoid shifting
    const nextMonthDay = new Date(year, month + 1, i);
    dates.push(nextMonthDay);
  }
  
  return dates;
};

/**
 * Format time to HH:MM
 */
export const formatTime = (hours: number, minutes: number): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Parse time string (HH:MM) to hours and minutes
 */
export const parseTime = (timeString: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

/**
 * Convert time to minutes since midnight
 */
export const timeToMinutes = (timeString: string): number => {
  const { hours, minutes } = parseTime(timeString);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return formatTime(hours, mins);
};

/**
 * Add minutes to a time string
 */
export const addMinutesToTime = (timeString: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(timeString) + minutesToAdd;
  return minutesToTime(totalMinutes);
};

/**
 * Check if time is within business hours
 */
export const isBusinessHours = (timeString: string): boolean => {
  const minutes = timeToMinutes(timeString);
  const startOfDay = timeToMinutes('08:00');
  const endOfDay = timeToMinutes('18:00');
  return minutes >= startOfDay && minutes <= endOfDay;
};

/**
 * Format date for display (e.g., "Venerdi' 11 Luglio 2025")
 */
export const formatDateForDisplay = (date: Date): string => {
  const dayNames = getDayNames();
  // Use getDay() directly on the local date object (0=Sunday, 1=Monday, etc.)
  const dayName = dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Convert Sunday=0 to index 6, Monday=1 to index 0
  const day = date.getDate();
  const monthName = getMonthName(date.getMonth());
  const year = date.getFullYear();
  
  return `${dayName} ${day} ${monthName} ${year}`;
};

/**
 * Get relative date string (today, tomorrow, etc.)
 */
export const getRelativeDateString = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (isToday(date)) {
    return 'Oggi';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Domani';
  } else {
    return formatDateForDisplay(date);
  }
};

/**
 * Check if booking should require advance notice
 */
export const meetsAdvanceNoticeRequirement = (
  bookingDate: Date, 
  bookingTime: string, 
  advanceHours: number
): boolean => {
  const now = new Date();
  const { hours, minutes } = parseTime(bookingTime);
  
  // Create booking datetime in local timezone
  const bookingDateTime = new Date(
    bookingDate.getFullYear(),
    bookingDate.getMonth(),
    bookingDate.getDate(),
    hours,
    minutes,
    0,
    0
  );
  
  const timeDifference = bookingDateTime.getTime() - now.getTime();
  const hoursUntilBooking = timeDifference / (1000 * 60 * 60);
  
  return hoursUntilBooking >= advanceHours;
};