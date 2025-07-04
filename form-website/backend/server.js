import http from 'http';
import url from 'url';
import { config } from './config/config.js';
import { connectToDatabase } from './utils/database.js';
import { handleBookingLinkRoutes } from './routes/bookingLink.js';
import { handleTemplateRoutes } from './routes/template.js';
import { handlePublicBookingRoutes } from './routes/publicBooking.js';
import { handlePublicCancelRescheduleRoutes } from './routes/publicCancelReschedule.js';
import { parseJsonBody, setCorsHeaders, setJsonHeaders } from './middleware/validation.js';
import { parseFormData } from './middleware/fileHandler.js';
import { requireAuth, verifyAuth, logAuthAttempt } from './middleware/auth.js';

// Health check endpoint
function handleHealthCheck(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: 'Connected'
  });
}

// Apply auth middleware to request
function applyAuthMiddleware(req, res, handler) {
  return new Promise((resolve, reject) => {
    requireAuth(req, res, (error) => {
      if (error) {
        reject(error);
      } else {
        handler(req, res).then(resolve).catch(reject);
      }
    });
  });
}

// Main request handler
async function handleRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Public routes (no auth required)
    if (
      pathname.startsWith('/api/public/booking/') && 
      (
        pathname.includes('/details') ||
        pathname.includes('/cancel')  ||
        pathname.includes('/reschedule')
      )
    ) return await handlePublicCancelRescheduleRoutes(req, res);

    if (pathname === '/api/health')
      return handleHealthCheck(req, res);
    
    if (pathname.startsWith('/api/public/')) {
      // Handle file upload for booking creation
      if (pathname.match(/\/api\/public\/booking\/[^\/]+\/book$/) && req.method === 'POST') {
        return applyMiddleware(req, res, [parseFormData], () => {
          return handlePublicBookingRoutes(req, res);
        });
      }
      
      return await handlePublicBookingRoutes(req, res);
    }
    
    // Auth verification endpoint
    if (pathname === '/api/auth/verify' && req.method === 'GET') {
      logAuthAttempt(req, res, () => {});
      return verifyAuth(req, res);
    }
    
    // Protected admin routes (require auth)
    if (pathname.startsWith('/api/booking-links'))
      return await applyAuthMiddleware(req, res, handleBookingLinkRoutes);
    
    if (pathname.startsWith('/api/templates'))
      return await applyAuthMiddleware(req, res, handleTemplateRoutes);

    // Route not found
    res.status(404).json({
      error: 'Endpoint not found',
      details: `${req.method} ${pathname} doesn't exist`
    });

  } catch (error) {
    console.error('Unhandled error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}

// Utility to add helper methods to res
function enhanceResponse(res) {
  res.status = function(code) {
    res.statusCode = code;
    return this;
  };

  res.json = function(data) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return this;
  };

  return res;
}

function applyMiddleware(req, res, middlewares, finalHandler) {
  let currentIndex = 0;

  function next(error) {
    if (error) {
      console.error('Middleware error:', error);
      return res.status(500).json({
        error: 'Middleware error',
        details: error.message
      });
    }

    if (currentIndex >= middlewares.length) return finalHandler(req, res);

    const middleware = middlewares[currentIndex++];
    middleware(req, res, next);
  }

  next();
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // Enhance response object
  enhanceResponse(res);

  // Apply global middleware
  const globalMiddlewares = [
    setCorsHeaders,
    setJsonHeaders,
    (req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      req.body = {}; // Skip JSON parsing per multipart
      next();
    } else {
      parseJsonBody(req, res, next);
    }
  }
  ];

  applyMiddleware(req, res, globalMiddlewares, handleRequest);
});

async function startServer() {
  try {
    await connectToDatabase();
    
    // Log admin credentials (remove in production)
    console.log('\n🔐 ADMIN CREDENTIALS:');
    console.log(`Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD || 'password123'}`);
    console.log('⚠️  Change these in production via environment variables!\n');
    
    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log('Available endpoints:');
      console.log('  - Public API: /api/public/* (no auth)');
      console.log('  - Admin API: /api/templates, /api/booking-links (requires auth)');
      console.log('  - Auth: /api/auth/verify');
      console.log('  - Health: /api/health');
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nSIGINT received, server shutdown...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, server shutdown...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start application
startServer().catch(console.error);