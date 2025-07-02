export interface ApiTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface ApiTemplate {
  id: string;
  name: string;
  schedule: {
    monday: ApiTimeSlot[];
    tuesday: ApiTimeSlot[];
    wednesday: ApiTimeSlot[];
    thursday: ApiTimeSlot[];
    friday: ApiTimeSlot[];
    saturday: ApiTimeSlot[];
    sunday: ApiTimeSlot[];
  };
  created: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  schedule: {
    monday: ApiTimeSlot[];
    tuesday: ApiTimeSlot[];
    wednesday: ApiTimeSlot[];
    thursday: ApiTimeSlot[];
    friday: ApiTimeSlot[];
    saturday: ApiTimeSlot[];
    sunday: ApiTimeSlot[];
  };
}

class ApiService {
  private baseUrl: string;
  private isOffline: boolean = false;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  // Helper method for API calls with proper error handling
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Create AbortController for timeout functionality
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal, // Add abort signal
    };

    try {
      const response = await fetch(url, config);
      
      // Clear timeout if request completes successfully
      clearTimeout(timeoutId);
      
      // If we get here, we're online
      this.isOffline = false;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Network Error',
          details: `HTTP ${response.status}: ${response.statusText}`
        }));
        
        throw new ApiError(
          errorData.details || errorData.error || 'Unknown error occurred',
          response.status,
          errorData as ApiErrorDetails
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - server is down or no internet
        this.isOffline = true;
        throw new ApiError(
          'Unable to connect to server. Please check your connection and try again.',
          0,
          { type: 'NETWORK_ERROR' } as ApiErrorDetails
        );
      }
      throw error;
    }
  }

  // Check if we're currently offline
  isCurrentlyOffline(): boolean {
    return this.isOffline;
  }

  // Get all templates
  async getTemplates(): Promise<ApiTemplate[]> {
    return this.request<ApiTemplate[]>('/api/templates');
  }

  // Get template by ID
  async getTemplate(id: string): Promise<ApiTemplate> {
    return this.request<ApiTemplate>(`/api/templates/${id}`);
  }

  // Create new template
  async createTemplate(template: CreateTemplateRequest): Promise<{ message: string; template: ApiTemplate }> {
    return this.request<{ message: string; template: ApiTemplate }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  // Update existing template
  async updateTemplate(id: string, template: CreateTemplateRequest): Promise<{ message: string; template: ApiTemplate }> {
    return this.request<{ message: string; template: ApiTemplate }>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  // Delete template
  async deleteTemplate(id: string): Promise<{ message: string; deletedId: string }> {
    return this.request<{ message: string; deletedId: string }>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async checkHealth(): Promise<{ status: string; timestamp: string; environment: string; database: string }> {
    return this.request<{ status: string; timestamp: string; environment: string; database: string }>('/api/health');
  }
}

// Define error details interface
export interface ApiErrorDetails {
  type?: string;
  field?: string;
  code?: string;
  [key: string]: unknown;
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: ApiErrorDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;