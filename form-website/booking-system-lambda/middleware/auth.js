import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

// Basic Auth credentials from environment variables
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD
};

/**
 * Parse Basic Auth header
 * @param {string} authHeader - Authorization header value
 * @returns {object|null} Parsed credentials or null
 */
function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const credentials = authHeader.substring(6); // Remove 'Basic '
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    return { username, password };
  } catch (error) {
    console.error('Error parsing Basic Auth:', error);
    return null;
  }
}

/**
 * Verify credentials
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {boolean} True if credentials are valid
 */
function verifyCredentials(username, password) {
  return username === ADMIN_CREDENTIALS.username && 
         password === ADMIN_CREDENTIALS.password;
}

/**
 * Basic Auth middleware for admin routes (Lambda version)
 * @param {object} req - Request object
 * @returns {object} Response object or null if auth passed
 */
export async function requireAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    return createErrorResponse(401, 'Authentication required', 
      'Missing Authorization header');
  }
  
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials) {
    return createErrorResponse(401, 'Invalid authentication', 
      'Invalid Authorization header format');
  }
  
  if (!verifyCredentials(credentials.username, credentials.password)) {
    // Log failed auth attempt
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    console.log(`[AUTH FAILED] Login attempt from ${ip} - Username: ${credentials.username} - ${userAgent}`);
    
    return createErrorResponse(401, 'Authentication failed', 
      'Invalid username or password');
  }
  
  // Add user info to request for logging
  req.user = {
    username: credentials.username,
    authenticated: true
  };
  
  // Log successful auth
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  console.log(`[AUTH SUCCESS] ${credentials.username} authenticated from ${ip}`);
  
  // Auth passed
  return { statusCode: 200, authenticated: true };;
}

/**
 * Auth verification endpoint (Lambda version)
 * @param {object} req - Request object
 * @returns {object} Response object
 */
export async function verifyAuth(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader) {
    return createErrorResponse(401, 'Authentication required', 
      'Missing Authorization header');
  }
  
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials || !verifyCredentials(credentials.username, credentials.password)) {
    return createErrorResponse(401, 'Authentication failed', 
      'Invalid credentials');
  }
  
  // Return success response
  return createSuccessResponse(200, {
    user: {
      username: credentials.username,
      authenticated: true
    },
    timestamp: new Date().toISOString()
  }, 'Authentication successful');
}