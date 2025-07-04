import { config } from '../config/config.js';

// Basic Auth credentials
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'password123'
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
 * Basic Auth middleware for admin routes
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware function
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Missing Authorization header'
    });
  }
  
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials) {
    return res.status(401).json({
      error: 'Invalid authentication',
      details: 'Invalid Authorization header format'
    });
  }
  
  if (!verifyCredentials(credentials.username, credentials.password)) {
    return res.status(401).json({
      error: 'Authentication failed',
      details: 'Invalid username or password'
    });
  }
  
  // Add user info to request for logging
  req.user = {
    username: credentials.username,
    authenticated: true
  };
  
  next();
}

/**
 * Auth verification endpoint
 * @param {object} req - Request object
 * @param {object} res - Response object
 */
export function verifyAuth(req, res) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Missing Authorization header'
    });
  }
  
  const credentials = parseBasicAuth(authHeader);
  
  if (!credentials || !verifyCredentials(credentials.username, credentials.password)) {
    return res.status(401).json({
      error: 'Authentication failed',
      details: 'Invalid credentials'
    });
  }
  
  // Return success response
  res.status(200).json({
    message: 'Authentication successful',
    user: {
      username: credentials.username,
      authenticated: true
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Middleware to log authentication attempts
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware function
 */
export function logAuthAttempt(req, res, next) {
  const authHeader = req.headers.authorization;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  if (authHeader) {
    const credentials = parseBasicAuth(authHeader);
    console.log(`[AUTH] Login attempt from ${ip} - Username: ${credentials?.username || 'unknown'} - ${userAgent}`);
  }
  
  next();
}