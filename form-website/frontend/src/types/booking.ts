export interface BookingLinkInfo {
  id: string;
  name: string;
  templateId: string;
  urlSlug: string;
  duration: number;
  requireAdvanceBooking: boolean;
  advanceHours: number;
  isActive: boolean;
  created: string;
  updatedAt: string;
}

export interface DayAvailability {
  date: string;           // YYYY-MM-DD format
  available: boolean;     // Has any available slots
  totalSlots: number;     // Total slots for this day
  availableSlots: number; // Available slots remaining
}

export interface TimeSlot {
  id: string;
  startTime: string;     // HH:MM format
  endTime: string;       // HH:MM format
  available: boolean;    // Is this slot free
  bookingId?: string;    // If booked, reference to booking
}

export interface BookingFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  notes: string;
  cvFile: File | null;
  acceptPrivacy: boolean;
  // Booking details
  selectedDate: string;  // YYYY-MM-DD
  selectedTime: string;  // HH:MM
  bookingLinkId: string;
  fileId: string;
}

export interface CreateBookingRequest {
  bookingLinkId: string;
  selectedDate: string;
  selectedTime: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  notes?: string;
  acceptPrivacy: boolean;
  // CV will be handled separately as FormData
}

export interface BookingResponse {
  id: string;
  bookingLinkId: string;
  selectedDate: string;
  selectedTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  notes?: string;
  cvFilePath?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarViewData {
  year: number;
  month: number;          // 0-based (0 = January)
  monthName: string;
  days: DayAvailability[];
  previousMonth: { year: number; month: number };
  nextMonth: { year: number; month: number };
}

export interface BookingStep {
  step: 1 | 2 | 3;
  title: string;
  completed: boolean;
  active: boolean;
}

// Error types
export interface BookingError {
  code: string;
  message: string;
  field?: string;
}

// Hook return types
export interface UseBookingLinkReturn {
  bookingLink: BookingLinkInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseCalendarDataReturn {
  calendarData: CalendarViewData | null;
  availability: DayAvailability[];
  currentDate: Date;
  isLoading: boolean;
  error: string | null;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToMonth: (year: number, month: number) => void;
  refetch: () => Promise<void>;
}

export interface UseTimeSlotsReturn {
  timeSlots: TimeSlot[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectTimeSlot: (timeSlot: TimeSlot) => void;
}

export interface UseBookingFormReturn {
  formData: BookingFormData;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  updateField: (field: keyof BookingFormData, value: any) => void;
  submitBooking: () => Promise<boolean>;
  resetForm: () => void;
  validateForm: () => string | null;
}