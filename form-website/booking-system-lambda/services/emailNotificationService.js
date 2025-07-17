export class EmailNotificationService {
  constructor() {
    this.sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-central-1' });
    this.notificationEmail = 'sezione.colloqui@riformaeprogresso.it';
    this.systemEmail = 'sezione.colloqui@riformaeprogresso.it'; // Sender email
  }

  /**
   * Send new booking notification with .ics calendar file
   */
  async sendNewBookingNotification(bookingData, bookingLinkData, cvFile = null) {
    try {
      const formattedDate = this.formatItalianDate(bookingData.selectedDate);
      const subject = `✅ Colloquio confermato ${formattedDate} - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const htmlContent = this.generateNewBookingEmailHTML(bookingData, bookingLinkData);
      
      // Generate .ics calendar file
      const icsFile = this.generateIcsFile(bookingData, bookingLinkData);
      
      const emailParams = this.buildRawEmailParams({
        to: bookingData.email,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent,
        attachments: [
          {
            fileName: 'colloquio.ics',
            fileData: icsFile,
            contentType: 'text/calendar'
          }
        ]
      });

      const command = new SendRawEmailCommand(emailParams);
      const result = await this.sesClient.send(command);
      
      console.log('Booking confirmation email sent to candidate:', result.MessageId);
      
      return { success: true, messageId: result.MessageId };
      
    } catch (error) {
      console.error('❌ Failed to send booking confirmation:', error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Send internal notification to admin with CV link
   */
  async sendInternalNotification(bookingData, bookingLinkData, cvFile = null) {
    try {
      const formattedDate = this.formatItalianDate(bookingData.selectedDate);
      const subject = `🆕 Nuova Prenotazione ${formattedDate} - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const htmlContent = this.generateInternalNotificationHTML(bookingData, bookingLinkData);
      
      const emailParams = this.buildRawEmailParams({
        to: this.notificationEmail,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent,
        attachments: [] // CV link is in the email body
      });

      const command = new SendRawEmailCommand(emailParams);
      const result = await this.sesClient.send(command);
      
      console.log('Internal notification sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
      
    } catch (error) {
      console.error('❌ Failed to send internal notification:', error);
    }
  }

  /**
   * Send booking cancellation notification
   * @param {Object} bookingData - Booking information
   * @param {Object} bookingLinkData - Booking link configuration
   * @param {string} reason - Cancellation reason
   * @returns {Object} Send result
   */
  async sendCancellationNotification(bookingData, bookingLinkData, reason = '') {
    try {
      const subject = `Prenotazione Cancellata - ${bookingData.firstName} ${bookingData.lastName}`;
      const htmlContent = this.generateCancellationEmailHTML(bookingData, bookingLinkData, reason);
      
      // Send to admin
      const adminEmailParams = this.buildRawEmailParams({
        to: this.notificationEmail,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent
      });

      // Send to candidate  
      const candidateEmailParams = this.buildRawEmailParams({
        to: bookingData.email,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent
      });

      // Send both emails
      await Promise.all([
        this.sesClient.send(new SendRawEmailCommand(adminEmailParams)),
        this.sesClient.send(new SendRawEmailCommand(candidateEmailParams))
      ]);
      
      console.log('Cancellation notification sent to both admin and candidate');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to send cancellation notification:', error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Send booking reschedule notification
   * @param {Object} bookingData - Updated booking information
   * @param {Object} bookingLinkData - Booking link configuration
   * @param {Object} oldDateTime - Previous date/time {date, time}
   * @returns {Object} Send result
   */
  async sendRescheduleNotification(bookingData, bookingLinkData, oldDateTime) {
    try {
      const subject = `Prenotazione Riprogrammata - ${bookingData.firstName} ${bookingData.lastName}`;
      const htmlContent = this.generateRescheduleEmailHTML(bookingData, bookingLinkData, oldDateTime);
      
      // Send to admin
      const adminEmailParams = this.buildRawEmailParams({
        to: this.notificationEmail,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent
      });

      // Send to candidate
      const candidateEmailParams = this.buildRawEmailParams({
        to: bookingData.email,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent
      });

      // Send both emails
      await Promise.all([
        this.sesClient.send(new SendRawEmailCommand(adminEmailParams)),
        this.sesClient.send(new SendRawEmailCommand(candidateEmailParams))
      ]);
      
      console.log('Reschedule notification sent to both admin and candidate');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to send reschedule notification:', error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Generate .ics calendar file for candidate
   */
  generateIcsFile(bookingData, bookingLinkData) {
    const startDateTime = new Date(`${bookingData.selectedDate}T${bookingData.selectedTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (bookingLinkData.duration * 60 * 1000));
    
    // Format dates for .ics (YYYYMMDDTHHMMSS)
    const formatIcsDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Riforma e Progresso//Booking System//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:booking-${bookingData.id}@riformaeprogresso.it`,
      `DTSTART:${formatIcsDate(startDateTime)}`,
      `DTEND:${formatIcsDate(endDateTime)}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `SUMMARY:Colloquio - ${bookingData.role}`,
      `DESCRIPTION:Colloquio con ${bookingData.firstName} ${bookingData.lastName}\\n`,
      `DESCRIPTION:Posizione: ${bookingData.role}\\n`,
      `DESCRIPTION:${bookingData.meetLink ? `Link Meet: ${bookingData.meetLink}\\n` : ''}`,
      `DESCRIPTION:Note: ${bookingData.notes || 'Nessuna nota'}`,
      `LOCATION:${bookingData.meetLink || 'Google Meet'}`,
      `ORGANIZER;CN=Sezione Colloqui:mailto:sezione.colloqui@riformaeprogresso.it`,
      `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${bookingData.email}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Promemoria colloquio in 15 minuti',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
  }

  /**
   * Generate email HTML for candidate
   */
  generateNewBookingEmailHTML(bookingData, bookingLinkData) {
    const baseUrl = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') || 'https://candidature.riformaeprogresso.it';
    const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
    const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;
    
    const formattedDate = this.formatItalianDate(bookingData.selectedDate);
    const formattedTime = `${bookingData.selectedTime} - ${this.addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
            .meet-link { background: #4CAF50; font-size: 18px; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .meet-link a { color: white; text-decoration: none; font-weight: bold; }
            .divider { border-top: 2px solid #ddd; margin: 20px 0; }
            .emoji { font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Colloquio Confermato!</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>${bookingData.firstName}</strong>,</p>
            <p>Il tuo colloquio è stato confermato con successo!</p>

            <div class="info-box">
                <h2>Dettagli Appuntamento</h2>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Orario:</strong> ${formattedTime}</p>
                <p><strong>Durata:</strong> ${bookingLinkData.duration} minuti</p>
                <p><strong>Posizione:</strong> ${bookingData.role}</p>
            </div>
            
            ${bookingData.meetLink ? `
            <div class="meet-link">
              <a href="${bookingData.meetLink}" target="_blank">ENTRA NEL COLLOQUIO</a>
            </div>
            ` : ''}

            <div class="info-box">
                <h2>Gestisci Appuntamento</h2>
                <p>Hai bisogno di modificare l'appuntamento?</p>
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 15px auto;">
                    <tr>
                        <td style="padding: 8px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background: #2196F3; border-radius: 5px;">
                                <tr>
                                    <td style="padding: 12px 24px; border-radius: 5px;">
                                        <a href="${rescheduleUrl}" 
                                          style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; display: block;">
                                            Riprogramma
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td style="padding: 8px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background: #f44336; border-radius: 5px;">
                                <tr>
                                    <td style="padding: 12px 24px; border-radius: 5px;">
                                        <a href="${cancelUrl}" 
                                          style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; display: block;">
                                            Cancella
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Per qualsiasi domanda, rispondi a questa email
            </p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate internal notification HTML
   */
  generateInternalNotificationHTML(bookingData, bookingLinkData) {
    const formattedDate = this.formatItalianDate(bookingData.selectedDate);
    const formattedTime = `${bookingData.selectedTime} - ${this.addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
    
    const baseUrl = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') || 'https://candidature.riformaeprogresso.it';
    const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
    const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
            .booking-data { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; margin: 20px 0; }
            .field { margin: 8px 0; }
            .label { font-weight: bold; }
            .admin-section { background: white; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
            .cv-link { background: #FF9800; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .cv-link a { color: white; text-decoration: none; font-weight: bold; font-size: 16px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Nuova Prenotazione Ricevuta</h1>
            <p>Notifica Interna</p>
        </div>

        <div class="booking-data" id="booking-${bookingData.id}">
            <h3>Dati Prenotazione</h3>
            
            <div class="field">
                <span class="label">ID:</span>
                <span id="booking-id">${bookingData.id}</span>
            </div>
            
            <div class="field">
                <span class="label">Nome:</span>
                <span id="candidate-name">${bookingData.firstName} ${bookingData.lastName}</span>
            </div>
            
            <div class="field">
                <span class="label">Email:</span>
                <span id="candidate-email">${bookingData.email}</span>
            </div>
            
            <div class="field">
                <span class="label">Telefono:</span>
                <span id="candidate-phone">${bookingData.phone}</span>
            </div>
            
            <div class="field">
                <span class="label">Ruolo:</span>
                <span id="candidate-role">${bookingData.role}</span>
            </div>
            
            <div class="field">
                <span class="label">Data:</span>
                <span id="appointment-date">${bookingData.selectedDate}</span>
            </div>
            
            <div class="field">
                <span class="label">Ora:</span>
                <span id="appointment-time">${bookingData.selectedTime}</span>
            </div>
            
            <div class="field">
                <span class="label">Durata:</span>
                <span id="appointment-duration">${bookingLinkData.duration}</span>
            </div>
            
            <div class="field">
                <span class="label">Tipo:</span>
                <span id="booking-type">${bookingLinkData.name}</span>
            </div>
            
            <div class="field">
                <span class="label">Meet:</span>
                <span id="meet-link">${bookingData.meetLink || 'N/A'}</span>
            </div>
            
            <div class="field">
                <span class="label">Note:</span>
                <span id="candidate-notes">${bookingData.notes || 'Nessuna nota'}</span>
            </div>
            
            <div class="field">
                <span class="label">Timestamp:</span>
                <span id="created-at">${bookingData.createdAt}</span>
            </div>
        </div>

        ${bookingData.cvUrl ? `
        <div class="cv-link">
            <a href="${bookingData.cvUrl}" target="_blank">📎 Visualizza CV del candidato</a>
        </div>
        ` : `
        <div class="admin-section">
            <h3>CV del candidato</h3>
            <p>Nessun CV allegato per questa prenotazione.</p>
        </div>
        `}

        <div class="admin-section">
            <h3>Informazioni Aggiuntive</h3>
            <p><strong>Data Formattata:</strong> ${formattedDate}</p>
            <p><strong>Orario Completo:</strong> ${formattedTime}</p>
            ${bookingData.meetLink ? `<p><strong>Link Meet Completo:</strong><br><a href="${bookingData.meetLink}" target="_blank">${bookingData.meetLink}</a></p>` : ''}
            ${bookingData.cvFileName ? `<p><strong>Nome File CV:</strong> ${bookingData.cvFileName}</p>` : ''}
        </div>

        <div class="admin-section">
            <h3>Gestione Appuntamento</h3>
            <p>Il candidato può gestire autonomamente l'appuntamento con questi link:</p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 15px auto;">
                <tr>
                    <td style="padding: 8px;">
                        <table cellpadding="0" cellspacing="0" border="0" style="background: #2196F3; border-radius: 5px;">
                            <tr>
                                <td style="padding: 12px 24px; border-radius: 5px;">
                                    <a href="${rescheduleUrl}" 
                                      style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px; display: block;">
                                        Riprogramma
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td style="padding: 8px;">
                        <table cellpadding="0" cellspacing="0" border="0" style="background: #f44336; border-radius: 5px;">
                            <tr>
                                <td style="padding: 12px 24px; border-radius: 5px;">
                                    <a href="${cancelUrl}" 
                                      style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px; display: block;">
                                        Cancella
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        <div class="admin-section">
            <h3>Allegati e Status</h3>
            ${bookingData.cvUrl ? `
            <p><strong>CV del candidato:</strong> <a href="${bookingData.cvUrl}" target="_blank">Visualizza CV</a></p>
            ` : `
            <p><strong>CV del candidato:</strong> Non fornito</p>
            `}
            <p style="font-size: 12px; color: #666;">
                Il candidato ha ricevuto separatamente una email di conferma con il file .ics per aggiungere l'appuntamento al suo calendario.
            </p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate HTML content for cancellation notification
   */
  generateCancellationEmailHTML(bookingData, bookingLinkData, reason) {
    const formattedDate = this.formatItalianDate(bookingData.selectedDate);
    const formattedTime = `${bookingData.selectedTime} - ${this.addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336; }
            .emoji { font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Prenotazione Cancellata</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <h2>Candidato</h2>
                <p><strong>Nome:</strong> ${bookingData.firstName} ${bookingData.lastName}</p>
                <p><strong>Email:</strong> ${bookingData.email}</p>
                <p><strong>Posizione:</strong> ${bookingData.role}</p>
            </div>

            <div class="info-box">
                <h2>Appuntamento Cancellato</h2>
                <p><strong>Era programmato per:</strong> ${formattedDate} alle ${formattedTime}</p>
                <p><strong>Tipo:</strong> ${bookingLinkData.name}</p>
                ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
            </div>

            <p style="text-align: center; color: #666; font-size: 14px;">candidature.riformaeprogresso.it</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate HTML content for reschedule notification
   */
  generateRescheduleEmailHTML(bookingData, bookingLinkData, oldDateTime) {
    const oldFormattedDate = this.formatItalianDate(oldDateTime.date);
    const newFormattedDate = this.formatItalianDate(bookingData.selectedDate);
    const oldFormattedTime = `${oldDateTime.time} - ${this.addMinutesToTime(oldDateTime.time, bookingLinkData.duration)}`;
    const newFormattedTime = `${bookingData.selectedTime} - ${this.addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
    
    const baseUrl = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') || 'https://candidature.riformaeprogresso.it';
    const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
    const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #FF9800; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF9800; }
            .change-highlight { background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; }
            .emoji { font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Prenotazione Riprogrammata</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <h2>Candidato</h2>
                <p><strong>Nome:</strong> ${bookingData.firstName} ${bookingData.lastName}</p>
                <p><strong>Email:</strong> ${bookingData.email}</p>
                <p><strong>Posizione:</strong> ${bookingData.role}</p>
            </div>

            <div class="info-box">
                <h2>Cambiamento Orario</h2>
                <div class="change-highlight">
                    <p><strong>❌ PRIMA:</strong> ${oldFormattedDate} alle ${oldFormattedTime}</p>
                    <p><strong>✅ ADESSO:</strong> ${newFormattedDate} alle ${newFormattedTime}</p>
                </div>
                <p><strong>Tipo:</strong> ${bookingLinkData.name}</p>
                ${bookingData.meetLink ? `<p><strong>Link Meet:</strong> <a href="${bookingData.meetLink}" target="_blank">${bookingData.meetLink}</a></p>` : ''}
            </div>

            <div class="info-box">
                <h2>Gestisci Appuntamento</h2>
                <p>Hai bisogno di modificare l'appuntamento?</p>
                <table cellpadding="0" cellspacing="0" border="0" style="margin: 15px auto;">
                    <tr>
                        <td style="padding: 8px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background: #2196F3; border-radius: 5px;">
                                <tr>
                                    <td style="padding: 12px 24px; border-radius: 5px;">
                                        <a href="${rescheduleUrl}" 
                                          style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; display: block;">
                                            Riprogramma
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td style="padding: 8px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background: #f44336; border-radius: 5px;">
                                <tr>
                                    <td style="padding: 12px 24px; border-radius: 5px;">
                                        <a href="${cancelUrl}" 
                                          style="color: white !important; text-decoration: none !important; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; display: block;">
                                            Cancella
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>

            <p style="text-align: center; color: #666; font-size: 14px;">
                candidature.riformaeprogresso.it
            </p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Build raw email parameters with attachments
   */
  buildRawEmailParams({ to, from, subject, htmlContent, attachments = [] }) {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
    
    let rawMessage = `From: ${from}\r\n`;
    rawMessage += `To: ${to}\r\n`;
    rawMessage += `Subject: ${subject}\r\n`;
    rawMessage += `MIME-Version: 1.0\r\n`;
    rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    rawMessage += `\r\n`;

    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
    rawMessage += `Content-Transfer-Encoding: 8bit\r\n`;
    rawMessage += `\r\n`;
    rawMessage += `${htmlContent}\r\n`;
    rawMessage += `\r\n`;

    attachments.forEach(attachment => {
      if (attachment && attachment.fileData) {
        const base64Data = Buffer.isBuffer(attachment.fileData) 
          ? attachment.fileData.toString('base64')
          : Buffer.from(attachment.fileData).toString('base64');
        
        rawMessage += `--${boundary}\r\n`;
        rawMessage += `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${attachment.fileName}"\r\n`;
        rawMessage += `Content-Transfer-Encoding: base64\r\n`;
        rawMessage += `Content-Disposition: attachment; filename="${attachment.fileName}"\r\n`;
        rawMessage += `\r\n`;

        const formattedBase64 = base64Data.match(/.{1,76}/g).join('\r\n');
        rawMessage += `${formattedBase64}\r\n`;
        rawMessage += `\r\n`;
      }
    });
    
    rawMessage += `--${boundary}--\r\n`;
    
    return {
      RawMessage: {
        Data: Buffer.from(rawMessage)
      }
    };
  }

  /**
   * Format date in Italian format
   */
  formatItalianDate(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                   'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName} ${day} ${month} ${year}`;
  }

  /**
   * Add minutes to time string
   */
  addMinutesToTime(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Send contact form notification
   */
  async sendContactFormNotification(contactData) {
    try {
      const subject = `📬 Nuovo Messaggio di Contatto - ${contactData.email}`;
        
      const htmlContent = this.generateContactFormEmailHTML(contactData);
        
      const emailParams = this.buildRawEmailParams({
        to: this.notificationEmail,
        from: this.systemEmail,
        subject: subject,
        htmlContent: htmlContent
      });
  
      const command = new SendRawEmailCommand(emailParams);
      const result = await this.sesClient.send(command);
        
      console.log('Contact form notification sent:', result.MessageId);
      return { success: true, messageId: result.MessageId };
        
    } catch (error) {
      console.error('❌ Failed to send contact form notification:', error);
      throw new Error(`Failed to send contact form notification: ${error.message}`);
    }
  }
  
  /**
   * Generate HTML content for contact form notification
   */
  generateContactFormEmailHTML(contactData) {
    const formattedDate = new Date(contactData.timestamp).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
      
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #9C27B0; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9C27B0; }
            .message-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d; font-style: italic; }
            .reply-button { display: inline-block; padding: 12px 24px; margin: 10px 0; background: #9C27B0; color: white; text-decoration: none; border-radius: 5px; }
            .emoji { font-size: 18px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1><span class="emoji">📬</span> Nuovo Messaggio di Contatto</h1>
            <p style="margin: 5px 0; opacity: 0.9;">Ricevuto da candidature.riformaeprogresso.it</p>
        </div>
        <div class="content">
            <div class="info-box">
                <h2>Mittente</h2>
                <p><strong>Email:</strong> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
                <p><strong>Data/Ora:</strong> ${formattedDate}</p>
            </div>
  
            <div class="info-box">
                <h2>Messaggio</h2>
                <div class="message-box">
                    "${contactData.message}"
                </div>
            </div>
  
            <div class="info-box">
                <h2>Rispondi</h2>
                <p>Per rispondere a questo messaggio:</p>
                <a href="mailto:${contactData.email}?subject=Re: Messaggio dal sito web" class="reply-button">
                    ↩️ Rispondi via Email
                </a>
            </div>
  
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                    <strong>Messaggio automatico</strong><br>
                    Questo messaggio è stato inviato automaticamente dal form di contatto di candidature.riformaeprogresso.it
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}