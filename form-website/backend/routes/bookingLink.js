import url from 'url';
import { BookingLinkController } from '../controllers/bookingLinkController.js';
import { validateBookingLinkData } from '../middleware/validation.js';

// Router to manage booking link routes
export async function handleBookingLinkRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Add parameters to the request
  req.query = parsedUrl.query;
  req.params = {};

  try {
    // POST /api/booking-links
    if (pathname === '/api/booking-links' && method === 'POST') {
      // Apply middleware validation
      return await applyMiddleware(req, res, [validateBookingLinkData], () => {
        return BookingLinkController.createBookingLink(req, res);
      });
    }

    // Route not found
    return res.status(404).json({
      error: 'Endpoint not found',
      details: `${method} ${pathname} doesn't exist`
    });

  } catch (error) {
    console.error('Error in booking link routing:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}

async function applyMiddleware(req, res, middlewares, finalHandler) {
  let currentIndex = 0;

  function next(error) {
    if (error) {
      return res.status(500).json({
        error: 'Middleware error',
        details: error.message
      });
    }

    if (currentIndex >= middlewares.length) {
      return finalHandler();
    }

    const middleware = middlewares[currentIndex++];
    
    try {
      middleware(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  next();
}