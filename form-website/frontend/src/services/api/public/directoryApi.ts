import { BaseApiService } from '../base/ApiService';
import type { PublicDirectoryResponse } from './types';

export class PublicDirectoryApiService extends BaseApiService {
  
  // Get all active booking links for public directory
  async getActiveBookingLinks(): Promise<PublicDirectoryResponse> {
    return this.request<PublicDirectoryResponse>('/api/public/directory');
  }
}

// Export singleton instance
export const publicDirectoryApi = new PublicDirectoryApiService();