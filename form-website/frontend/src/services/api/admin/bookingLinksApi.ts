import { BaseApiService } from '../base/ApiService';
import type {
  ApiBookingLink,
  CreateBookingLinkRequest,
  CreateBookingLinkResponse,
  UpdateBookingLinkRequest,
  UpdateBookingLinkResponse,
  DeleteBookingLinkResponse
} from './types';

export class BookingLinksApiService extends BaseApiService {
  
  // Get all booking links
  async getBookingLinks(): Promise<ApiBookingLink[]> {
    return this.request<ApiBookingLink[]>('/api/booking-links', {}, true);
  }

  // Get booking link by ID  
  async getBookingLink(id: string): Promise<ApiBookingLink> {
    return this.request<ApiBookingLink>(`/api/booking-links/${id}`, {}, true);
  }

  // Create new booking link
  async createBookingLink(bookingLink: CreateBookingLinkRequest): Promise<CreateBookingLinkResponse> {
    return this.request<CreateBookingLinkResponse>('/api/booking-links', {
      method: 'POST',
      body: JSON.stringify(bookingLink),
    }, true);
  }

  // Update existing booking link
  async updateBookingLink(id: string, bookingLink: UpdateBookingLinkRequest): Promise<UpdateBookingLinkResponse> {
    return this.request<UpdateBookingLinkResponse>(`/api/booking-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingLink),
    }, true);
  }

  // Delete booking link
  async deleteBookingLink(id: string): Promise<DeleteBookingLinkResponse> {
    return this.request<DeleteBookingLinkResponse>(`/api/booking-links/${id}`, {
      method: 'DELETE',
    }, true);
  }
}

// Export singleton instance
export const bookingLinksApi = new BookingLinksApiService();