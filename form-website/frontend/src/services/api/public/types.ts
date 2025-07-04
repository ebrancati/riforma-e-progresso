import type { ApiBookingLink, ApiBooking } from '../shared/types';
export type { ApiBookingLink, ApiBooking };

// ========== PUBLIC BOOKING INTERFACES ==========

export interface PublicBookingLinkInfo {
  name: string;
  urlSlug: string;
  duration: number;
  requireAdvanceBooking: boolean;
  advanceHours: number;
  bookingUrl: string;
  created: string;
}

export interface PublicDirectoryResponse {
  message: string;
  count: number;
  bookingLinks: PublicBookingLinkInfo[];
  timestamp: string;
}

export interface ApiDayAvailability {
  date: string;           // YYYY-MM-DD format
  available: boolean;     // Has any available slots
  totalSlots: number;     // Total slots for this day
  availableSlots: number; // Available slots remaining
}

export interface MonthAvailabilityResponse {
  year: number;
  month: number;
  bookingLinkId: string;
  availability: ApiDayAvailability[];
}

export interface ApiPublicTimeSlot {
  id: string;
  startTime: string;     // HH:MM format
  endTime: string;       // HH:MM format
  available: boolean;    // Always true for public API (only returns available slots)
}

export interface TimeSlotsResponse {
  date: string;
  bookingLinkId: string;
  timeSlots: ApiPublicTimeSlot[];
}

export interface TimeSlotValidationResponse {
  valid: boolean;
  date: string;
  time: string;
  error: string | null;
  bookingLinkId: string;
}

// ========== BOOKING CREATION INTERFACES ==========

export interface CreateBookingRequest {
  selectedDate: string;  // YYYY-MM-DD
  selectedTime: string;  // HH:MM
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  notes?: string;
}

export interface CreateBookingResponse {
  message: string;
  booking: ApiBooking;
}

// ========== CANCEL/RESCHEDULE INTERFACES ==========

export interface BookingDetailsResponse {
  booking: {
    id: string;
    selectedDate: string;
    selectedTime: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    notes: string;
    status: string;
    createdAt: string;
  };
  bookingLink: {
    name: string;
    duration: number;
    urlSlug: string;
  };
}

export interface CancelBookingRequest {
  token: string;
  reason?: string;
}

export interface CancelBookingResponse {
  message: string;
  booking: ApiBooking;
}

export interface RescheduleBookingRequest {
  token: string;
  newDate: string;
  newTime: string;
}

export interface RescheduleBookingResponse {
  message: string;
  booking: ApiBooking;
  oldDateTime: { date: string; time: string };
  newDateTime: { date: string; time: string };
}