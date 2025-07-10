import url from 'url';
import { TemplateController } from '../controllers/templateController.js';
import { validateTemplateData } from '../middleware/validation.js';

// Router to manage template routes
export async function handleTemplateRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Add parameters to the request
  req.query = parsedUrl.query;
  req.params = {};

  try {
    // GET /api/templates
    if (pathname === '/api/templates' && method === 'GET') {
      return await TemplateController.getAllTemplates(req, res);
    }

    // POST /api/templates
    if (pathname === '/api/templates' && method === 'POST') {
      // Apply middleware validation
      return await applyMiddleware(req, res, [validateTemplateData], () => {
        return TemplateController.createTemplate(req, res);
      });
    }

    // Routes for single template (/api/templates/:id)
    const templateMatch = pathname.match(/^\/api\/templates\/(.+)$/);
    if (templateMatch) {
      req.params.id = templateMatch[1];

      switch (method) {
        case 'GET':
          return await TemplateController.getTemplateById(req, res);
          
        case 'PUT':
          return await applyMiddleware(req, res, [validateTemplateData], () => {
            return TemplateController.updateTemplate(req, res);
          });
          
        case 'DELETE':
          return await TemplateController.deleteTemplate(req, res);
          
        default:
          return res.status(405).json({
            error: 'Method not allowed',
            details: `${method} not supported for this endpoint`
          });
      }
    }

    // Route not found
    return res.status(404).json({
      error: 'Endpoint not found',
      details: `${method} ${pathname} doesn't exist`
    });

  } catch (error) {
    console.error('Error in routing template:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
}

async function applyMiddleware(req, res, middlewares, finalHandler) {
  let currentIndex = 0;

  function next(error) {
    if (error) {
      return res.status(500).json({
        error: 'Middleware error',
        details: error.message
      });
    }

    if (currentIndex >= middlewares.length) {
      return finalHandler();
    }

    const middleware = middlewares[currentIndex++];
    
    try {
      middleware(req, res, next);
    } catch (err) {
      next(err);
    }
  }

  next();
}