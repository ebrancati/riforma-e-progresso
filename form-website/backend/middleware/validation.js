import { Template } from '../models/Template.js';
import { config } from '../config/config.js';

// Middleware to validate template data
export function validateTemplateData(req, res, next) {
  try {
    const validation = Template.validate(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid data',
        details: validation.errors
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Validation error',
      details: error.message
    });
  }
}

// Middleware to parse JSON body
export function parseJsonBody(req, res, next) {
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        next();
      } catch (error) {
        res.status(400).json({
          error: 'Invalid JSON',
          details: error.message
        });
      }
    });
    
    req.on('error', (error) => {
      res.status(400).json({
        error: 'Error in request body',
        details: error.message
      });
    });
  } else {
    req.body = {};
    next();
  }
}

// Enhanced CORS Middleware
export function setCorsHeaders(req, res, next) {
  const allowedOrigins = config.corsOrigins;
  const origin = req.headers.origin;

  // Check if origin is allowed
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  next();
}

// Middleware to set JSON headers
export function setJsonHeaders(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  next();
}

// Add request logging middleware
export function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  
  next();
}

// Add error handling middleware
export function errorHandler(error, req, res, next) {
  console.error('Unhandled error:', error);
  
  // Don't leak error details in production
  const isDevelopment = config.nodeEnv === 'development';
  
  res.status(500).json({
    error: 'Internal Server Error',
    details: isDevelopment ? error.message : 'Something went wrong'
  });
}