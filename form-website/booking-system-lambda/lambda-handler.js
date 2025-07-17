import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GoogleAuthController } from './controllers/googleAuthController.js';
import { S3CurriculumService } from './services/s3CurriculumService.js';
import { Readable } from 'stream';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Import controllers
import { TemplateController } from './controllers/templateController.js';
import { BookingLinkController } from './controllers/bookingLinkController.js';
import { PublicBookingController } from './controllers/publicBookingController.js';
import { PublicCancelRescheduleController } from './controllers/publicCancelRescheduleController.js';
import { ContactController } from './controllers/contactController.js';
import { requireAuth, verifyAuth } from './middleware/auth.js';
import { IdGenerator } from './utils/idGenerator.js';

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
      dynamodb: docClient,
      s3Client: s3Client
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
          database: 'DynamoDB Connected',
          fileParser: 'Direct S3 Upload'
        }
      };
    }

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return { statusCode: 204, body: {} };
    }

    if (path === '/api/get-upload-url' && method === 'POST') {
      return await getUploadUrl(req);
    }

    // Public cancel/reschedule routes
    if (
      path.startsWith('/api/public/booking/') && 
      (path.includes('/details') || path.includes('/cancel') || path.includes('/reschedule'))
    ) {
      return await PublicCancelRescheduleController.handleRequest(req);
    }

    // Public booking routes
    if (path.startsWith('/api/public/')) {
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

async function getUploadUrl(req) {
  try {
    const { fileName, fileSize, fileType } = req.body;

    if (!fileName || !fileSize || !fileType) {
      return {
        statusCode: 400,
        body: {
          error: 'Missing required fields',
          details: 'fileName, fileSize, and fileType are required'
        }
      };
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSizeBytes) {
      return {
        statusCode: 400,
        body: {
          error: 'File too large',
          details: `File size ${Math.round(fileSize / 1024 / 1024)}MB exceeds limit of 10MB`
        }
      };
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        body: {
          error: 'Invalid file type',
          details: `File type ${fileType} not allowed. Allowed: PDF, DOC, DOCX`
        }
      };
    }

    const fileId = IdGenerator.generateBookingId();
    const fileExtension = getFileExtension(fileName);
    
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const s3Key = `${year}/${month}/CV_${fileId}${fileExtension}`;
    const bucketName = process.env.CV_BUCKET_NAME || 'riformaeprogresso-cvs';
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        originalFileName: fileName,
        uploadedAt: now.toISOString(),
        fileId: fileId
      }
    });

    const uploadUrl = await getSignedUrl(req.s3Client, command, { 
      expiresIn: 300 // 5 min
    });

    console.log('Upload URL generated:', {
      fileId,
      fileName,
      fileSize,
      s3Key,
      expiresIn: 300
    });

    return {
      statusCode: 200,
      body: {
        uploadUrl: uploadUrl,
        fileId: fileId,
        s3Key: s3Key,
        expiresIn: 300
      }
    };

  } catch (error) {
    console.error('❌ Failed to generate upload URL:', error);
    return {
      statusCode: 500,
      body: {
        error: 'Failed to generate upload URL',
        details: error.message
      }
    };
  }
}

function getFileExtension(fileName) {
  if (!fileName) return '.pdf';
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return '.pdf';
  return fileName.substring(lastDotIndex).toLowerCase();
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