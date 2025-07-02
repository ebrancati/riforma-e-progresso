import http from 'http';
import url from 'url';
import { config } from './config/config.js';
import { connectToDatabase } from './utils/database.js';
import { handleTemplateRoutes } from './routes/templates.js';
import { parseJsonBody, setCorsHeaders, setJsonHeaders } from './middleware/validation.js';

// Health check endpoint
function handleHealthCheck(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: 'Connected'
  });
}

// Main request handler
async function handleRequest(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Health check
    if (pathname === '/api/health') {
      return handleHealthCheck(req, res);
    }

    // Template routes
    if (pathname.startsWith('/api/templates')) {
      return await handleTemplateRoutes(req, res);
    }

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

    if (currentIndex >= middlewares.length) {
      return finalHandler(req, res);
    }

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
    parseJsonBody
  ];

  applyMiddleware(req, res, globalMiddlewares, handleRequest);
});

async function startServer() {
  try {
    await connectToDatabase();
    
    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Gestione graceful shutdown
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