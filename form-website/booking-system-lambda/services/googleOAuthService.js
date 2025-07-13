import { google } from 'googleapis';
import { DynamoDBBase, config } from '../utils/dynamodb.js';

export class GoogleOAuthService extends DynamoDBBase {
  constructor(dynamoClient) {
    super(dynamoClient);
    
    // OAuth client configuration
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://y13prg01eb.execute-api.eu-central-1.amazonaws.com/prod/api/auth/google/callback'
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth authorization URL for admin setup
   * @returns {string} Authorization URL
   */
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Forces refresh token
    });
  }

  /**
   * Exchange authorization code for tokens and save them
   * @param {string} authCode - Authorization code from Google
   * @returns {Object} Token information
   */
  async saveTokensFromAuthCode(authCode) {
    try {
      console.log('Received auth code:', authCode ? 'YES' : 'NO');

      console.log('OAuth client config:', {
        clientId: this.oauth2Client._clientId ? 'SET' : 'MISSING',
        clientSecret: this.oauth2Client._clientSecret ? 'SET' : 'MISSING',
        redirectUri: this.oauth2Client.redirectUri
      });

      const tokenResponse = await this.oauth2Client.getToken(authCode);
      console.log('Full token response:', JSON.stringify(tokenResponse, null, 2));
      
      const tokens = tokenResponse.tokens;
      
      if (!tokens)
        throw new Error('No tokens in response');
      
      console.log('Extracted tokens:', tokens);
      
      // Save tokens to DynamoDB
      await this.saveTokens(tokens);
      
      // Set credentials for immediate use
      this.oauth2Client.setCredentials(tokens);
      
      return {
        success: true,
        message: 'Google Calendar connected successfully',
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      };
    } catch (error) {
      console.error('FULL ERROR DETAILS:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      throw new Error('Failed to connect Google Calendar: ' + error.message);
    }
  }

  /**
   * Save tokens to DynamoDB
   * @param {Object} tokens - Google OAuth tokens
   */
  async saveTokens(tokens) {
    const item = {
      PK: 'GOOGLE_OAUTH',
      SK: 'TOKENS',
      EntityType: 'GOOGLE_TOKENS',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type || 'Bearer',
      expiryDate: tokens.expiry_date,
      scope: tokens.scope,
      updatedAt: new Date().toISOString()
    };

    await this.putItem(item);
    console.log('✅ Google tokens saved to DynamoDB');
  }

  /**
   * Load saved tokens from DynamoDB and set credentials
   * @returns {boolean} True if tokens loaded successfully
   */
  async loadSavedTokens() {
    try {
      const tokenData = await this.getItem('GOOGLE_OAUTH', 'TOKENS');
      
      if (!tokenData) {
        console.log('No Google tokens found - OAuth setup required');
        return false;
      }

      const tokens = {
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        token_type: tokenData.tokenType,
        expiry_date: tokenData.expiryDate,
        scope: tokenData.scope
      };

      this.oauth2Client.setCredentials(tokens);
      
      // Set up automatic token refresh
      this.oauth2Client.on('tokens', (newTokens) => {
        if (newTokens.refresh_token) {
          tokens.refresh_token = newTokens.refresh_token;
        }
        tokens.access_token = newTokens.access_token;
        tokens.expiry_date = newTokens.expiry_date;
        
        // Save updated tokens
        this.saveTokens(tokens).catch(err => {
          console.error('Error saving refreshed tokens:', err);
        });
      });

      console.log('✅ Google tokens loaded from DynamoDB');
      return true;
    } catch (error) {
      console.error('Error loading Google tokens:', error);
      return false;
    }
  }

  /**
   * Check if Google Calendar is connected and tokens are valid
   * @returns {Object} Connection status
   */
  async checkConnection() {
    try {
      const hasTokens = await this.loadSavedTokens();
      
      if (!hasTokens) {
        return {
          connected: false,
          message: 'Google Calendar not connected',
          authUrl: this.generateAuthUrl()
        };
      }

      // Test the connection by making a simple API call
      const response = await this.calendar.calendarList.list({
        maxResults: 1
      });

      return {
        connected: true,
        message: 'Google Calendar connected successfully',
        calendarCount: response.data.items?.length || 0
      };
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      
      return {
        connected: false,
        message: 'Google Calendar connection invalid',
        error: error.message,
        authUrl: this.generateAuthUrl()
      };
    }
  }

  /**
   * Format date in short Italian format for email subject
   */
  formatItalianDateShort(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  }

  /**
   * Create Google Calendar event with Meet link (NO automatic emails)
   */
  async createCalendarEventWithMeet(bookingData, bookingLinkData) {
    try {
      await this.loadSavedTokens();

      const startDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + (bookingLinkData.duration * 60 * 1000));

      const eventConfig = {
        calendarId: 'primary',
        requestBody: {
          summary: `${bookingData.selectedTime} - ${bookingData.firstName} ${bookingData.lastName} (${bookingData.role})`,
          description: this.generateEventDescription(bookingData, bookingLinkData),
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Rome',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Rome',
          },
          organizer: {
            email: 'sezione.colloqui@riformaeprogresso.it',
            displayName: 'Sezione Colloqui'
          },
          // Enable Google Meet
          conferenceData: {
            createRequest: {
              requestId: `meet-${bookingData.id}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          },
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          guestsCanSeeOtherGuests: false,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 15 }       // 15 minutes before
            ]
          }
        },
        conferenceDataVersion: 1,
        sendUpdates: 'none' // No automatic emails from google cloud
      };

      const response = await this.calendar.events.insert(eventConfig);
      const event = response.data;

      // Extract Meet link
      const meetLink = event.conferenceData?.entryPoints?.find(
        entry => entry.entryPointType === 'video'
      )?.uri;

      console.log('✅ Google Calendar event created (no emails):', event.id);

      return {
        success: true,
        eventId: event.id,
        meetLink: meetLink,
        calendarLink: event.htmlLink,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime
      };

    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Update existing calendar event (no emails)
   */
  async updateCalendarEvent(eventId, newBookingData, bookingLinkData) {
    try {
      await this.loadSavedTokens();

      const startDateTime = new Date(`${newBookingData.selectedDate}T${newBookingData.selectedTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + (bookingLinkData.duration * 60 * 1000));

      const updateConfig = {
        calendarId: 'primary',
        eventId: eventId,
        requestBody: {
          summary: `${newBookingData.selectedTime} - ${newBookingData.firstName} ${newBookingData.lastName} (${newBookingData.role})`,
          description: this.generateEventDescription(newBookingData, bookingLinkData),
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Rome',
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Rome',
          }
        },
        sendUpdates: 'none'
      };

      const response = await this.calendar.events.update(updateConfig);
      console.log('✅ Google Calendar event updated (no emails):', eventId);

      return {
        success: true,
        eventId: response.data.id,
        updated: true
      };

    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  /**
   * Cancel calendar event
   */
  async cancelCalendarEvent(eventId) {
    try {
      await this.loadSavedTokens();

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'none'
      });

      console.log('✅ Google Calendar event cancelled (no emails):', eventId);

      return {
        success: true,
        cancelled: true,
        eventId: eventId
      };

    } catch (error) {
      console.error('Error cancelling Google Calendar event:', error);
      throw new Error(`Failed to cancel calendar event: ${error.message}`);
    }
  }

  /**
   * Generate event description
   * @param {Object} bookingData - Booking information
   * @param {Object} bookingLinkData - Booking link configuration  
   * @returns {string} Event description
   */
  generateEventDescription(bookingData, bookingLinkData) {
    const baseUrl = 'https://candidature.riformaeprogresso.it';
    const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
    const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;
    
    return `
  Dettagli Colloquio:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  👤 Candidato: ${bookingData.firstName} ${bookingData.lastName}
  💼 Posizione: ${bookingData.role}
  📧 Email: ${bookingData.email}
  📱 Tel: ${bookingData.phone}
  
  📝 Note: ${bookingData.notes || 'No additional notes'}
  
  🔗 Link Meet: ${bookingLinkData.name}
  ⏰ Durata: ${bookingLinkData.duration} minutes
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  🔄 Per riprogrammare: ${rescheduleUrl}
  ❌ Per annullare: ${cancelUrl}
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  /**
   * Disconnect Google Calendar (remove stored tokens)
   * @returns {Object} Disconnection result
   */
  async disconnect() {
    try {
      await this.deleteItem('GOOGLE_OAUTH', 'TOKENS');
      console.log('Google Calendar disconnected');
      
      return {
        success: true,
        message: 'Google Calendar disconnected successfully'
      };
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      throw new Error('Failed to disconnect Google Calendar: ' + error.message);
    }
  }
}