import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GoogleAuthController } from './controllers/googleAuthController.js';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Import controllers
import { TemplateController } from './controllers/templateController.js';
import { BookingLinkController } from './controllers/bookingLinkController.js';
import { PublicBookingController } from './controllers/publicBookingController.js';
import { PublicCancelRescheduleController } from './controllers/publicCancelRescheduleController.js';
import { ContactController } from './controllers/contactController.js';
import { requireAuth, verifyAuth } from './middleware/auth.js';

/**
 * Get security headers with CORS support
 * @param {string} origin - Request origin
 * @returns {object} Security headers object
 */
function getSecurityHeaders(origin = null) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Powered-By': 'AWS Lambda' // Hide technology details
  };
}

/**
 * Main Lambda handler
 * @param {Object} event - API Gateway event
 * @param {Object} context - Lambda context
 * @returns {Object} HTTP response
 */
export const handler = async (event, context) => {
  // Enable response streaming for large payloads
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    console.log('Incoming request:', {
      method: event.httpMethod,
      path: event.path,
      headers: event.headers
    });

    // Parse request
    const method = event.httpMethod;
    const path = event.path;
    const headers = event.headers || {};
    const queryParams = event.queryStringParameters || {};
    const pathParams = event.pathParameters || {};
    
    // Parse body based on content type with security checks
    let body = {};
    if (event.body) {
      // Security check for malicious content
      const suspiciousPatterns = ['<script', 'javascript:', '$where', '$regex', 'eval(', 'Function('];
      const lowerBody = event.body.toLowerCase();
      for (const pattern of suspiciousPatterns) {
        if (lowerBody.includes(pattern)) {
          return {
            statusCode: 400,
            headers: getSecurityHeaders(),
            body: JSON.stringify({
              error: 'Malicious content detected',
              details: 'Request contains potentially harmful content'
            })
          };
        }
      }

      if (headers['content-type']?.includes('application/json')) {
        try {
          body = JSON.parse(event.body);
        } catch (error) {
          return {
            statusCode: 400,
            headers: getSecurityHeaders(),
            body: JSON.stringify({
              error: 'Invalid JSON',
              details: 'Request body contains invalid JSON'
            })
          };
        }
      } else if (headers['content-type']?.includes('multipart/form-data')) {
        // Handle file upload (CV submission)
        body = parseMultipartFormData(event.body, headers['content-type']);
      }
    }

    // Create request object similar to Express
    const req = {
      method,
      path,
      headers,
      query: queryParams,
      params: pathParams,
      body,
      // Add DynamoDB client to request for controllers to use
      dynamodb: docClient
    };

    // Route the request
    const response = await routeRequest(req);
    
    return {
      statusCode: response.statusCode || 200,
      headers: getSecurityHeaders(headers.origin),
      body: JSON.stringify(response.body)
    };

  } catch (error) {
    console.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: getSecurityHeaders(),
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      })
    };
  }
};

function prepareCVFileForEmail(fileInfo) {
  if (!fileInfo || !fileInfo.received || !fileInfo.fileData) {
    return null;
  }

  // Prepare CV file data for email attachment
  return {
    fileName: fileInfo.fileName || 'CV.pdf',
    fileData: fileInfo.fileData, // Raw binary data
    contentType: fileInfo.contentType || 'application/pdf'
  };
}

/**
 * Route incoming requests to appropriate controllers
 * @param {Object} req - Request object
 * @returns {Object} Response object
 */
async function routeRequest(req) {
  const { method, path } = req;

  try {
    // Health check endpoint
    if (path === '/api/health') {
      return {
        statusCode: 200,
        body: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'production',
          database: 'DynamoDB Connected'
        }
      };
    }

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return { statusCode: 204, body: {} };
    }

    if (
      path.startsWith('/api/public/booking/') && 
      (path.includes('/details') || path.includes('/cancel') || path.includes('/reschedule'))
    ) {
      return await PublicCancelRescheduleController.handleRequest(req);
    }

    if (path.startsWith('/api/public/')) {
      if (method === 'POST' && path.includes('/book')) {
        const cvFileData = prepareCVFileForEmail(req.body.fileInfo);
        req.cvFileData = cvFileData;
        
        console.log('CV data prepared for booking:', {
          hasCV: !!cvFileData,
          fileName: cvFileData?.fileName
        });
      }
      
      return await PublicBookingController.handleRequest(req);
    }

    // Contact form
    if (path.startsWith('/api/contact')) {
      return await ContactController.handleRequest(req);
    }

    // Google OAuth routes
    if (path.startsWith('/api/auth/google')) {
      return await GoogleAuthController.handleRequest(req);
    }

    // Auth verification endpoint
    if (path === '/api/auth/verify' && method === 'GET') {
      return await verifyAuth(req);
    }

    // Protected admin routes (require auth)
    if (path.startsWith('/api/templates')) {
      const authResult = await requireAuth(req);
      if (authResult.statusCode !== 200) {
        return authResult;
      }
      return await TemplateController.handleRequest(req);
    }

    if (path.startsWith('/api/booking-links')) {
      const authResult = await requireAuth(req);
      if (authResult.statusCode !== 200) {
        return authResult;
      }
      return await BookingLinkController.handleRequest(req);
    }

    // Route not found
    return {
      statusCode: 404,
      body: {
        error: 'Endpoint not found',
        details: `${method} ${path} doesn't exist`
      }
    };

  } catch (error) {
    console.error('Routing error:', error);
    return {
      statusCode: 500,
      body: {
        error: 'Internal Server Error',
        details: error.message
      }
    };
  }
}

/**
 * Parse multipart form data for file uploads
 * @param {string} body - Raw body data
 * @param {string} contentType - Content type header
 * @returns {Object} Parsed form data
 */
function parseMultipartFormData(body, contentType) {
  try {
    const boundary = '--' + contentType.split('boundary=')[1];
    const parts = body.split(boundary);
    
    const formData = {};
    let fileReceived = false;
    let fileName = '';
    let fileSize = 0;
    let fileData = null;
    let fileContentType = 'application/octet-stream';

    parts.forEach(part => {
      if (part.includes('Content-Disposition: form-data;')) {
        const lines = part.split('\r\n');
        const header = lines.find(line => line.includes('Content-Disposition'));
        
        if (header) {
          const nameMatch = header.match(/name="([^"]+)"/);
          const fieldName = nameMatch ? nameMatch[1] : null;
          
          if (header.includes('filename=')) {
            // This is a file
            const fileNameMatch = header.match(/filename="([^"]+)"/);
            fileName = fileNameMatch ? fileNameMatch[1] : 'unknown';
            
            // Detect content type from headers
            const contentTypeHeader = lines.find(line => line.includes('Content-Type:'));
            if (contentTypeHeader) {
              fileContentType = contentTypeHeader.split('Content-Type:')[1].trim();
            }
            
            const emptyLineIndex = part.indexOf('\r\n\r\n');
            if (emptyLineIndex !== -1) {
              fileData = part.substring(emptyLineIndex + 4, part.length - 2); // Remove trailing \r\n
              fileSize = fileData.length;
              fileReceived = true;
            }
          } else if (fieldName) {
            // Regular form field
            const emptyLineIndex = part.indexOf('\r\n\r\n');
            if (emptyLineIndex !== -1) {
              const value = part.substring(emptyLineIndex + 4, part.length - 2);
              formData[fieldName] = value;
            }
          }
        }
      }
    });

    // Log file info (come prima)
    if (fileReceived) {
      console.log('\n=== CV RECEIVED ===');
      console.log(`Candidate: ${formData.firstName} ${formData.lastName}`);
      console.log(`Email: ${formData.email}`);
      console.log(`Role: ${formData.role}`);
      console.log(`File: ${fileName}`);
      console.log(`Size: ${formatFileSize(fileSize)}`);
      console.log(`Type: ${fileContentType}`);
      console.log(`Appointment: ${formData.selectedDate} at ${formData.selectedTime}`);
      console.log('==================\n');
    }

    // Add complete file info to form data
    formData.fileInfo = {
      fileName,
      fileSize,
      fileData,
      contentType: fileContentType,
      received: fileReceived
    };

    return formData;

  } catch (error) {
    console.error('Error parsing multipart form data:', error);
    throw new Error('Invalid form data');
  }
}

/**
 * Get allowed origin for CORS
 * @param {string} origin - Request origin
 * @returns {string} Allowed origin
 */
function getAllowedOrigin(origin) {
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['*'];
    
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return origin || '*';
  }
  
  return allowedOrigins[0] || '*';
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}