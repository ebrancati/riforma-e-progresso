import { Template } from '../models/Template.js';

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

// CORS Middleware
export function setCorsHeaders(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
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