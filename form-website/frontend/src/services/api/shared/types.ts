// ========== SHARED BOOKING LINK INTERFACE ==========

export interface ApiBookingLink {
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

// ========== SHARED BOOKING INTERFACE ==========

export interface ApiBooking {
  id: string;
  bookingLinkId: string;
  selectedDate: string;
  selectedTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  notes: string;
  cancellationToken: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ========== SHARED TIME SLOT INTERFACE ==========

export interface ApiTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

// ========== SHARED RESPONSE PATTERNS ==========

export interface ApiSuccessResponse {
  message: string;
}

export interface ApiDeleteResponse extends ApiSuccessResponse {
  deletedId: string;
}