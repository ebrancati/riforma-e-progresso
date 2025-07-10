import { BookingLink } from '../models/BookingLink.js';
import { Template } from '../models/Template.js';
import { InputSanitizer } from '../utils/sanitizer.js';
import { config } from '../config/config.js';

// Middleware to validate booking link data
export function validateBookingLinkData(req, res, next) {
  try {
    // Validate using BookingLink class
    const sanitizedData = BookingLink.validateBookingLinkData(req.body);
    req.body = sanitizedData;
    
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.message
    });
  }
}

// Middleware to validate booking link update data (only modifiable fields)
export function validateBookingLinkUpdateData(req, res, next) {
  try {
    const updateData = req.body;
    
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Update data must be an object'
      });
    }

    // Remove non-modifiable fields if present
    delete updateData.urlSlug;
    delete updateData.duration;
    delete updateData.id;
    delete updateData.created;
    delete updateData.updatedAt;

    // Define allowed fields for update
    const allowedFields = ['name', 'templateId', 'requireAdvanceBooking', 'advanceHours', 'isActive'];
    const sanitizedData = {};

    // Only include allowed fields
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    });

    // Validate name if provided
    if (sanitizedData.name !== undefined) {
      if (typeof sanitizedData.name !== 'string') {
        throw new Error('Booking link name must be a string');
      }
      const trimmedName = sanitizedData.name.trim();
      if (trimmedName.length === 0) {
        throw new Error('Booking link name cannot be empty');
      }
      if (trimmedName.length > 100) {
        throw new Error('Booking link name cannot exceed 100 characters');
      }
      sanitizedData.name = trimmedName;
    }

    // Validate templateId if provided
    if (sanitizedData.templateId !== undefined) {
      if (typeof sanitizedData.templateId !== 'string') {
        throw new Error('Template ID must be a string');
      }
    }

    // Validate advance booking settings
    if (sanitizedData.requireAdvanceBooking !== undefined) {
      sanitizedData.requireAdvanceBooking = Boolean(sanitizedData.requireAdvanceBooking);
    }

    if (sanitizedData.advanceHours !== undefined) {
      const hours = parseInt(sanitizedData.advanceHours);
      if (isNaN(hours) || ![0, 6, 12, 24, 48].includes(hours)) {
        throw new Error('Advance hours must be 0, 6, 12, 24, or 48');
      }
      sanitizedData.advanceHours = hours;
    }

    // Handle advance booking logic correctly
    if (sanitizedData.requireAdvanceBooking === false) {
      // When disabling advance booking, set hours to 0
      sanitizedData.advanceHours = 0;
    } else if (sanitizedData.requireAdvanceBooking === true && sanitizedData.advanceHours === undefined) {
      // When enabling advance booking without specifying hours, default to 24
      sanitizedData.advanceHours = 24;
    }

    // Final validation: if advance booking is required, hours must be valid
    if (sanitizedData.requireAdvanceBooking === true && ![6, 12, 24, 48].includes(sanitizedData.advanceHours)) {
      throw new Error('Advance hours must be 6, 12, 24, or 48 when advance booking is required');
    }

    // Validate isActive if provided
    if (sanitizedData.isActive !== undefined) {
      sanitizedData.isActive = Boolean(sanitizedData.isActive);
    }

    // Check that we have something to update
    if (Object.keys(sanitizedData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        details: 'Please provide at least one field to update (name, templateId, requireAdvanceBooking, advanceHours, isActive)'
      });
    }

    // Replace request body with sanitized data
    req.body = sanitizedData;
    
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.message
    });
  }
}

// Middleware to validate template data
export function validateTemplateData(req, res, next) {
  try {
    // Pre-validate using InputSanitizer for security
    const sanitizedData = InputSanitizer.validateTemplateData(req.body);
    req.body = sanitizedData;
    
    // Additional validation using Template class for business rules
    const validation = Template.validate(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid data',
        details: validation.errors
      });
    }
    
    next();
  } catch (error) {
    // InputSanitizer throws errors for security violations
    return res.status(400).json({
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

      // Security check for malicious content
      const suspiciousPatterns = ['<script', 'javascript:', '$where', '$regex'];
      const lowerBody = body.toLowerCase();
      for (const pattern of suspiciousPatterns) {
        if (lowerBody.includes(pattern)) {
          return res.status(400).json({
            error: 'Malicious content detected',
            details: 'Request contains potentially harmful content'
          });
        }
      }
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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

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