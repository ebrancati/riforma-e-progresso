import { GoogleOAuthService } from '../services/googleOAuthService.js';
import { createErrorResponse, createSuccessResponse } from '../utils/dynamodb.js';

export class GoogleAuthController {
  /**
   * Handle Google OAuth related requests
   * @param {Object} req - Request object
   * @returns {Object} Response object
   */
  static async handleRequest(req) {
    const { method, path, dynamodb, query } = req;
    
    try {
      // GET /api/auth/google/status - Check connection status
      if (path === '/api/auth/google/status' && method === 'GET') {
        return await this.getConnectionStatus(dynamodb);
      }

      // GET /api/auth/google/connect - Get OAuth URL
      if (path === '/api/auth/google/connect' && method === 'GET') {
        return await this.getConnectUrl(dynamodb);
      }

      // GET /api/auth/google/callback - Handle OAuth callback
      if (path === '/api/auth/google/callback' && method === 'GET') {
        return await this.handleCallback(dynamodb, query.code);
      }

      // POST /api/auth/google/disconnect - Disconnect Google
      if (path === '/api/auth/google/disconnect' && method === 'POST') {
        return await this.disconnect(dynamodb);
      }

      return createErrorResponse(404, 'Endpoint not found', `${method} ${path} doesn't exist`);

    } catch (error) {
      console.error('Error in Google auth controller:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/auth/google/status
   * Check Google Calendar connection status
   */
  static async getConnectionStatus(dynamodb) {
    try {
      const googleService = new GoogleOAuthService(dynamodb);
      const status = await googleService.checkConnection();
      
      return createSuccessResponse(200, status);
    } catch (error) {
      console.error('Error checking Google connection status:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/auth/google/connect
   * Get OAuth authorization URL
   */
  static async getConnectUrl(dynamodb) {
    try {
      const googleService = new GoogleOAuthService(dynamodb);
      const authUrl = googleService.generateAuthUrl();
      
      return createSuccessResponse(200, {
        authUrl: authUrl,
        message: 'Visit this URL to connect your Google Calendar'
      });
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * GET /api/auth/google/callback
   * Handle OAuth callback from Google
   */
  static async handleCallback(dynamodb, authCode) {
    try {
      if (!authCode) {
        return createErrorResponse(400, 'Missing authorization code', 
          'No authorization code received from Google');
      }

      const googleService = new GoogleOAuthService(dynamodb);
      const result = await googleService.saveTokensFromAuthCode(authCode);
      
      // Return HTML page for better UX (since this is called from browser)
      return {
        statusCode: 200,
        body: this.generateSuccessPage(result.message)
      };
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error);
      
      return {
        statusCode: 500,
        body: this.generateErrorPage(error.message)
      };
    }
  }

  /**
   * POST /api/auth/google/disconnect
   * Disconnect Google Calendar
   */
  static async disconnect(dynamodb) {
    try {
      const googleService = new GoogleOAuthService(dynamodb);
      const result = await googleService.disconnect();
      
      return createSuccessResponse(200, result);
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      return createErrorResponse(500, 'Internal Server Error', error.message);
    }
  }

  /**
   * Generate success HTML page for OAuth callback
   * @param {string} message - Success message
   * @returns {string} HTML content
   */
  static generateSuccessPage(message) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Calendar Connected</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .success { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
            .message { color: #333; font-size: 16px; line-height: 1.5; }
            .button { background: #4CAF50; color: white; padding: 12px 24px; border: none; border-radius: 5px; text-decoration: none; font-size: 16px; margin-top: 20px; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success">✅ Success!</div>
            <div class="message">
                ${message}<br><br>
                You can now close this window and return to the admin panel.
                Your booking system will automatically create Google Calendar events for all new bookings.
            </div>
            <a href="javascript:window.close()" class="button">Close Window</a>
        </div>
        <script>
            // Auto-close after 5 seconds
            setTimeout(() => {
                window.close();
            }, 5000);
        </script>
    </body>
    </html>
    `;
  }

  /**
   * Generate error HTML page for OAuth callback
   * @param {string} errorMessage - Error message
   * @returns {string} HTML content
   */
  static generateErrorPage(errorMessage) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Calendar Connection Failed</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #f44336; font-size: 24px; margin-bottom: 20px; }
            .message { color: #333; font-size: 16px; line-height: 1.5; }
            .button { background: #f44336; color: white; padding: 12px 24px; border: none; border-radius: 5px; text-decoration: none; font-size: 16px; margin-top: 20px; display: inline-block; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error">❌ Connection Failed</div>
            <div class="message">
                Failed to connect Google Calendar:<br><br>
                <strong>${errorMessage}</strong><br><br>
                Please try again or contact support if the problem persists.
            </div>
            <a href="javascript:window.close()" class="button">Close Window</a>
        </div>
    </body>
    </html>
    `;
  }
}