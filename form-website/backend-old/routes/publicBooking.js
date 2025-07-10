import url from 'url';
import { PublicBookingController } from '../controllers/publicBookingController.js';
import { PublicDirectoryController } from '../controllers/publicDirectoryController.js';

/**
 * Router to manage public booking routes
 * These routes are used by the public booking interface
 */
export async function handlePublicBookingRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Add parameters to the request
  req.query = parsedUrl.query;
  req.params = {};

  try {
    // GET /api/public/directory
    // Get all active booking links for public display
    if (pathname === '/api/public/directory' && method === 'GET') {
      return await PublicDirectoryController.getActiveBookingLinks(req, res);
    }
    // GET /api/public/booking/:slug
    // Get booking link information by URL slug
    const bookingInfoMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)$/);
    if (bookingInfoMatch && method === 'GET') {
      req.params.slug = bookingInfoMatch[1];
      return await PublicBookingController.getBookingLinkBySlug(req, res);
    }

    // GET /api/public/booking/:slug/availability/:year/:month
    // Get availability for a specific month
    const availabilityMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/availability\/(\d{4})\/(\d{1,2})$/);
    if (availabilityMatch && method === 'GET') {
      req.params.slug = availabilityMatch[1];
      req.params.year = availabilityMatch[2];
      req.params.month = availabilityMatch[3];
      return await PublicBookingController.getMonthAvailability(req, res);
    }

    // GET /api/public/booking/:slug/slots/:date
    // Get available time slots for a specific date
    const slotsMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/slots\/(\d{4}-\d{2}-\d{2})$/);
    if (slotsMatch && method === 'GET') {
      req.params.slug = slotsMatch[1];
      req.params.date = slotsMatch[2];
      return await PublicBookingController.getAvailableTimeSlots(req, res);
    }

    // POST /api/public/booking/:slug/book
    // Create a new booking
    const bookMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/book$/);
    if (bookMatch && method === 'POST') {
      req.params.slug = bookMatch[1];
      return await PublicBookingController.createBooking(req, res);
    }

    // GET /api/public/booking/:slug/validate/:date/:time
    // Validate if a specific time slot is available
    const validateMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/validate\/(\d{4}-\d{2}-\d{2})\/(\d{1,2}:\d{2})$/);
    if (validateMatch && method === 'GET') {
      req.params.slug = validateMatch[1];
      req.params.date = validateMatch[2];
      req.params.time = validateMatch[3];
      return await PublicBookingController.validateTimeSlot(req, res);
    }

    // Route not found
    return res.status(404).json({
      error: 'Endpoint not found',
      details: `${method} ${pathname} doesn't exist in public booking API`
    });

  } catch (error) {
    console.error('Error in public booking routing:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}