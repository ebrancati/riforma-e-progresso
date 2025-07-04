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

export interface ApiDayAvailability {
  date: string;           // YYYY-MM-DD format
  available: boolean;     // Has any available slots
  totalSlots: number;     // Total slots for this day
  availableSlots: number; // Available slots remaining
}

export interface ApiPublicTimeSlot {
  id: string;
  startTime: string;     // HH:MM format
  endTime: string;       // HH:MM format
  available: boolean;    // Always true for public API (only returns available slots)
}

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
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ========== TEMPLATE INTERFACES ==========

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

// ========== BOOKING LINK INTERFACES ==========

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

export interface CreateBookingLinkRequest {
  name: string;
  templateId: string;
  urlSlug: string;
  duration: number;
  requireAdvanceBooking: boolean;
  advanceHours: number;
}

class ApiService {
  private baseUrl: string;
  private isOffline: boolean = false;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  }

  // Get auth headers from global function set by AuthContext
  private getAuthHeaders(): { Authorization?: string } {
    if (typeof window !== 'undefined' && (window as any).getAuthHeaders) {
      return (window as any).getAuthHeaders();
    }
    return {};
  }

  // Helper method for API calls with proper error handling and auth
  private async request<T>(
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

  // ========== PUBLIC BOOKING METHODS (NO AUTH) ==========

  // Get all active booking links for public directory
  async getActiveBookingLinks(): Promise<{
    message: string;
    count: number;
    bookingLinks: PublicBookingLinkInfo[];
    timestamp: string;
  }> {
    return this.request<{
      message: string;
      count: number;
      bookingLinks: PublicBookingLinkInfo[];
      timestamp: string;
    }>('/api/public/directory');
  }

  // Get booking link by URL slug (public)
  async getBookingLinkBySlug(slug: string): Promise<ApiBookingLink> {
    return this.request<ApiBookingLink>(`/api/public/booking/${slug}`);
  }

  // Get month availability (public)
  async getMonthAvailability(slug: string, year: number, month: number): Promise<{
    year: number;
    month: number;
    bookingLinkId: string;
    availability: ApiDayAvailability[];
  }> {
    return this.request<{
      year: number;
      month: number;
      bookingLinkId: string;
      availability: ApiDayAvailability[];
    }>(`/api/public/booking/${slug}/availability/${year}/${month}`);
  }

  // Get available time slots for a date (public)
  async getAvailableTimeSlots(slug: string, date: string): Promise<{
    date: string;
    bookingLinkId: string;
    timeSlots: ApiPublicTimeSlot[];
  }> {
    return this.request<{
      date: string;
      bookingLinkId: string;
      timeSlots: ApiPublicTimeSlot[];
    }>(`/api/public/booking/${slug}/slots/${date}`);
  }

  // Validate time slot availability (public)
  async validateTimeSlot(slug: string, date: string, time: string): Promise<{
    valid: boolean;
    date: string;
    time: string;
    error: string | null;
    bookingLinkId: string;
  }> {
    return this.request<{
      valid: boolean;
      date: string;
      time: string;
      error: string | null;
      bookingLinkId: string;
    }>(`/api/public/booking/${slug}/validate/${date}/${time}`);
  }

  // Create booking (public)
  async createBooking(slug: string, bookingData: CreateBookingRequest): Promise<{
    message: string;
    booking: ApiBooking;
  }> {
    return this.request<{
      message: string;
      booking: ApiBooking;
    }>(`/api/public/booking/${slug}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // ========== PROTECTED ADMIN METHODS (REQUIRE AUTH) ==========

  // Get all templates
  async getTemplates(): Promise<ApiTemplate[]> {
    return this.request<ApiTemplate[]>('/api/templates', {}, true);
  }

  // Get template by ID
  async getTemplate(id: string): Promise<ApiTemplate> {
    return this.request<ApiTemplate>(`/api/templates/${id}`, {}, true);
  }

  // Create new template
  async createTemplate(template: CreateTemplateRequest): Promise<{ message: string; template: ApiTemplate }> {
    return this.request<{ message: string; template: ApiTemplate }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }, true);
  }

  // Update existing template
  async updateTemplate(id: string, template: CreateTemplateRequest): Promise<{ message: string; template: ApiTemplate }> {
    return this.request<{ message: string; template: ApiTemplate }>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    }, true);
  }

  // Delete template
  async deleteTemplate(id: string): Promise<{ message: string; deletedId: string }> {
    return this.request<{ message: string; deletedId: string }>(`/api/templates/${id}`, {
      method: 'DELETE',
    }, true);
  }

  // Get all booking links
  async getBookingLinks(): Promise<ApiBookingLink[]> {
    return this.request<ApiBookingLink[]>('/api/booking-links', {}, true);
  }

  // Get booking link by ID  
  async getBookingLink(id: string): Promise<ApiBookingLink> {
    return this.request<ApiBookingLink>(`/api/booking-links/${id}`, {}, true);
  }

  // Create new booking link
  async createBookingLink(bookingLink: CreateBookingLinkRequest): Promise<{ 
    message: string; 
    bookingLink: ApiBookingLink; 
    url: string 
  }> {
    return this.request<{ 
      message: string; 
      bookingLink: ApiBookingLink; 
      url: string 
    }>('/api/booking-links', {
      method: 'POST',
      body: JSON.stringify(bookingLink),
    }, true);
  }

  async deleteBookingLink(id: string): Promise<{ message: string; deletedId: string }> {
    return this.request<{ message: string; deletedId: string }>(`/api/booking-links/${id}`, {
      method: 'DELETE',
    }, true);
  }

  // ========== HEALTH CHECK ==========

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

// Export singleton instance
export const apiService = new ApiService();
export default apiService;