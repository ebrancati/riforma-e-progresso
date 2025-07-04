import { BaseApiService } from '../base/ApiService';
import type {
  BookingDetailsResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  RescheduleBookingRequest,
  RescheduleBookingResponse
} from './types';

export class CancelRescheduleApiService extends BaseApiService {
  
  // Get booking details for cancel/reschedule
  async getBookingDetailsForCancel(bookingId: string, token: string): Promise<BookingDetailsResponse> {
    return this.request<BookingDetailsResponse>(
      `/api/public/booking/${bookingId}/details?token=${token}`
    );
  }

  // Cancel booking
  async cancelBooking(bookingId: string, token: string, reason?: string): Promise<CancelBookingResponse> {
    const requestData: CancelBookingRequest = { token };
    if (reason) {
      requestData.reason = reason;
    }

    return this.request<CancelBookingResponse>(`/api/public/booking/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // Reschedule booking
  async rescheduleBooking(
    bookingId: string, 
    token: string, 
    newDate: string, 
    newTime: string
  ): Promise<RescheduleBookingResponse> {
    const requestData: RescheduleBookingRequest = {
      token,
      newDate,
      newTime
    };

    return this.request<RescheduleBookingResponse>(`/api/public/booking/${bookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }
}

// Export singleton instance
export const cancelRescheduleApi = new CancelRescheduleApiService();