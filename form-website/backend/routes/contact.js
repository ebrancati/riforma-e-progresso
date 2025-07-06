import url from 'url';
import { ContactController } from '../controllers/contactController.js';

export async function handleContactRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Add parameters to the request
  req.query = parsedUrl.query;
  req.params = {};

  try {
    // POST /api/contact
    if (pathname === '/api/contact' && method === 'POST') {
      return await ContactController.submitContactForm(req, res);
    }

    // Route not found
    return res.status(404).json({
      error: 'Endpoint not found',
      details: `${method} ${pathname} doesn't exist`
    });

  } catch (error) {
    console.error('Error in contact routing:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}