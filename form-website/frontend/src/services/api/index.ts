// Export base classes and types
export { BaseApiService, ApiError } from './base/ApiService';
export type { ApiErrorDetails } from './base/ApiService';

// Export shared types
export type * from './shared/types';

// Export health service
export { healthApi } from './health/healthApi';

// Export admin API services
export { templatesApi } from './admin/templatesApi';
export { bookingLinksApi } from './admin/bookingLinksApi';

// Export public API services  
export { publicBookingApi } from './public/bookingApi';
export { publicDirectoryApi } from './public/directoryApi';
export { cancelRescheduleApi } from './public/cancelRescheduleApi';

// Export all types
export type * from './admin/types';
export type * from './public/types';