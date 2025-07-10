export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/schedule-templates',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  
  // Database settings
  dbName: 'schedule-templates',
  collections: {
    templates: 'templates',
    bookingLinks: 'booking-links',
    bookings: 'bookings'
  },
  
  // Validation settings
  template: {
    maxNameLength: 100,
    requiredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  
  // Booking settings
  booking: {
    allowedDurations: [30], // Currently only 30-minute slots
    maxAdvanceHours: 168, // Maximum 1 week advance booking
    minAdvanceHours: 1, // Minimum 1 hour advance booking
    maxNameLength: 50,
    maxRoleLength: 100,
    maxNotesLength: 500,
    maxPhoneLength: 20
  }
};