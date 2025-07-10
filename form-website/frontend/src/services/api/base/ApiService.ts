/**
 * Base API Service class with common functionality
 */
export class BaseApiService {
  protected baseUrl: string;
  private _isOffline: boolean = false; // Renamed to avoid collision

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://46e949dbqe.execute-api.eu-central-1.amazonaws.com/prod';
  }

  // Get auth headers from global function set by AuthContext
  private getAuthHeaders(): { Authorization?: string } {
    if (typeof window !== 'undefined' && (window as any).getAuthHeaders) {
      return (window as any).getAuthHeaders();
    }
    return {};
  }

  // Helper method for API calls with proper error handling and auth
  protected async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Create AbortController for timeout functionality
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
    
    // Prepare headers
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add auth headers for protected endpoints
    if (requireAuth) {
      const authHeaders = this.getAuthHeaders();
      headers = { ...headers, ...authHeaders };
    }
    
    const config: RequestInit = {
      headers,
      ...options,
      signal: controller.signal, // Add abort signal
    };

    try {
      const response = await fetch(url, config);
      
      // Clear timeout if request completes successfully
      clearTimeout(timeoutId);
      
      // If we get here, we're online
      this._isOffline = false;
      
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
        this._isOffline = true;
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
  public isCurrentlyOffline(): boolean {
    return this._isOffline;
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

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }
}