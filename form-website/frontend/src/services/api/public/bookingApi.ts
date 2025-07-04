import { BaseApiService } from '../base/ApiService';
import type {
  ApiBookingLink,
  MonthAvailabilityResponse,
  TimeSlotsResponse,
  TimeSlotValidationResponse,
  CreateBookingRequest,
  CreateBookingResponse
} from './types';

export class PublicBookingApiService extends BaseApiService {
  
  // Get booking link by URL slug (public)
  async getBookingLinkBySlug(slug: string): Promise<ApiBookingLink> {
    return this.request<ApiBookingLink>(`/api/public/booking/${slug}`);
  }

  // Get month availability (public)
  async getMonthAvailability(slug: string, year: number, month: number): Promise<MonthAvailabilityResponse> {
    return this.request<MonthAvailabilityResponse>(
      `/api/public/booking/${slug}/availability/${year}/${month}`
    );
  }

  // Get available time slots for a date (public)
  async getAvailableTimeSlots(slug: string, date: string): Promise<TimeSlotsResponse> {
    return this.request<TimeSlotsResponse>(
      `/api/public/booking/${slug}/slots/${date}`
    );
  }

  // Validate time slot availability (public)
  async validateTimeSlot(slug: string, date: string, time: string): Promise<TimeSlotValidationResponse> {
    return this.request<TimeSlotValidationResponse>(
      `/api/public/booking/${slug}/validate/${date}/${time}`
    );
  }

  // Create booking (public)
  async createBooking(slug: string, bookingData: CreateBookingRequest): Promise<CreateBookingResponse> {
    return this.request<CreateBookingResponse>(`/api/public/booking/${slug}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }
}

// Export singleton instance
export const publicBookingApi = new PublicBookingApiService();