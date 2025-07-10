import url from 'url';
import { PublicCancelRescheduleController } from '../controllers/publicCancelRescheduleController.js';

export async function handlePublicCancelRescheduleRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  req.query = parsedUrl.query;
  req.params = {};

  try {
    // GET /api/public/booking/{bookingId}/details
    const detailsMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/details$/);
    if (detailsMatch && method === 'GET') {
      req.params.bookingId = detailsMatch[1];
      return await PublicCancelRescheduleController.getBookingDetails(req, res);
    }

    // POST /api/public/booking/{bookingId}/cancel
    const cancelMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/cancel$/);
    if (cancelMatch && method === 'POST') {
      req.params.bookingId = cancelMatch[1];
      return await PublicCancelRescheduleController.cancelBooking(req, res);
    }

    // POST /api/public/booking/{bookingId}/reschedule
    const rescheduleMatch = pathname.match(/^\/api\/public\/booking\/([^\/]+)\/reschedule$/);
    if (rescheduleMatch && method === 'POST') {
      req.params.bookingId = rescheduleMatch[1];
      return await PublicCancelRescheduleController.rescheduleBooking(req, res);
    }

    return res.status(404).json({
      error: 'Endpoint not found',
      details: `${method} ${pathname} doesn't exist`
    });

  } catch (error) {
    console.error('Error in cancel/reschedule routing:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}