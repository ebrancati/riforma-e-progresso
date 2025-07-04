import { BaseApiService } from '../base/ApiService';

export class HealthApiService extends BaseApiService {
  // Health check method available to all
  async checkHealth(): Promise<{ status: string; timestamp: string; environment: string; database: string }> {
    return this.request<{ status: string; timestamp: string; environment: string; database: string }>('/api/health');
  }
  
  // Expose offline status
  isOffline(): boolean {
    return this.isCurrentlyOffline();
  }
}

// Export singleton instance
export const healthApi = new HealthApiService();