import nodemailer from 'nodemailer';
import { 
  generateBookingConfirmationHTML,
  generateAdminNotificationHTML,
  generateCandidateCancellationHTML,
  generateAdminCancellationHTML,
  generateCandidateRescheduleHTML,
  generateAdminRescheduleHTML,
  generateContactFormHTML
} from './emailTemplates/index.js';
import { formatItalianDate } from './emailTemplates/helpers.js';

export class EmailNotificationService {
  constructor() {
    this.notificationEmail = 'sezione.colloqui@riformaeprogresso.it';
    this.systemEmail = 'sezione.colloqui@riformaeprogresso.it';
    
    // Configura il transporter
    this.transporter = this.createTransporter();
  }

  /**
   * Create email transporter based on environment
   */
  createTransporter() {
    // Opzione 1: SMTP (Gmail, Outlook, server personalizzato)
    if (process.env.SMTP_HOST) {
      console.log('Using SMTP transporter');
      return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Per sviluppo locale
        }
      });
    }
    
    // Opzione 2: Amazon SES via SMTP
    else if (process.env.AWS_SES_REGION) {
      console.log('Using Amazon SES SMTP transporter');
      return nodemailer.createTransporter({
        host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_SMTP_USER,
          pass: process.env.AWS_SES_SMTP_PASS
        }
      });
    }
    
    // Opzione 3: Gmail OAuth2 (più sicuro)
    else if (process.env.GMAIL_USER) {
      console.log('Using Gmail OAuth2 transporter');
      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_USER,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN
        }
      });
    }
    
    // Opzione 4: Outlook/Hotmail
    else if (process.env.OUTLOOK_USER) {
      console.log('Using Outlook transporter');
      return nodemailer.createTransporter({
        service: 'hotmail',
        auth: {
          user: process.env.OUTLOOK_USER,
          pass: process.env.OUTLOOK_PASS
        }
      });
    }
    
    // Fallback: Ethereal (solo per testing)
    else {
      console.log('⚠️ Using Ethereal test transporter (emails will not be delivered!)');
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    }
  }

  /**
   * Send new booking notification with .ics calendar file
   */
  async sendNewBookingNotification(bookingData, bookingLinkData, cvFile = null) {
    try {
      const formattedDate = formatItalianDate(bookingData.selectedDate);
      const subject = `✅ Colloquio confermato ${formattedDate} - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const htmlContent = generateBookingConfirmationHTML(bookingData, bookingLinkData);
      const icsFile = this.generateIcsFile(bookingData, bookingLinkData);
      
      const mailOptions = {
        from: {
          name: 'Sezione Colloqui - Riforma e Progresso',
          address: this.systemEmail
        },
        to: bookingData.email,
        subject: subject,
        html: htmlContent,
        attachments: [
          {
            filename: 'colloquio.ics',
            content: icsFile,
            contentType: 'text/calendar'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Booking confirmation email sent:', result.messageId);
      
      return { success: true, messageId: result.messageId };
      
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
      const formattedDate = formatItalianDate(bookingData.selectedDate);
      const subject = `🆕 Nuova Prenotazione ${formattedDate} - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const htmlContent = generateAdminNotificationHTML(bookingData, bookingLinkData);
      
      const mailOptions = {
        from: {
          name: 'Sistema Prenotazioni',
          address: this.systemEmail
        },
        to: this.notificationEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Internal notification sent:', result.messageId);
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Failed to send internal notification:', error);
      throw error; // Non bloccare il booking per errori email admin
    }
  }

  /**
   * Send booking cancellation notification
   */
  async sendCancellationNotification(bookingData, bookingLinkData, reason = '') {
    try {
      const subject = `Prenotazione Cancellata - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const candidateHtmlContent = generateCandidateCancellationHTML(bookingData, bookingLinkData, reason);
      const adminHtmlContent = generateAdminCancellationHTML(bookingData, bookingLinkData, reason);
      
      // Email per candidato
      const candidateMailOptions = {
        from: {
          name: 'Sezione Colloqui - Riforma e Progresso',
          address: this.systemEmail
        },
        to: bookingData.email,
        subject: subject,
        html: candidateHtmlContent
      };

      // Email per admin
      const adminMailOptions = {
        from: {
          name: 'Sistema Prenotazioni',
          address: this.systemEmail
        },
        to: this.notificationEmail,
        subject: `🚫 Cancellazione - ${subject}`,
        html: adminHtmlContent
      };

      // Invia entrambe le email
      const results = await Promise.allSettled([
        this.transporter.sendMail(candidateMailOptions),
        this.transporter.sendMail(adminMailOptions)
      ]);
      
      console.log('✅ Cancellation notifications sent:', {
        candidate: results[0].status,
        admin: results[1].status
      });
      
      return { success: true, results };
      
    } catch (error) {
      console.error('❌ Failed to send cancellation notification:', error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Send booking reschedule notification
   */
  async sendRescheduleNotification(bookingData, bookingLinkData, oldDateTime) {
    try {
      const subject = `Prenotazione Riprogrammata - ${bookingData.firstName} ${bookingData.lastName}`;
      
      const candidateHtmlContent = generateCandidateRescheduleHTML(bookingData, bookingLinkData, oldDateTime);
      const adminHtmlContent = generateAdminRescheduleHTML(bookingData, bookingLinkData, oldDateTime);
      
      // Email per candidato
      const candidateMailOptions = {
        from: {
          name: 'Sezione Colloqui - Riforma e Progresso',
          address: this.systemEmail
        },
        to: bookingData.email,
        subject: subject,
        html: candidateHtmlContent
      };

      // Email per admin
      const adminMailOptions = {
        from: {
          name: 'Sistema Prenotazioni',
          address: this.systemEmail
        },
        to: this.notificationEmail,
        subject: `🔄 Riprogrammazione - ${subject}`,
        html: adminHtmlContent
      };

      // Invia entrambe le email
      const results = await Promise.allSettled([
        this.transporter.sendMail(candidateMailOptions),
        this.transporter.sendMail(adminMailOptions)
      ]);
      
      console.log('✅ Reschedule notifications sent:', {
        candidate: results[0].status,
        admin: results[1].status
      });
      
      return { success: true, results };
      
    } catch (error) {
      console.error('❌ Failed to send reschedule notification:', error);
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Send contact form notification
   */
  async sendContactFormNotification(contactData) {
    try {
      const subject = `📬 Nuovo Messaggio di Contatto - ${contactData.email}`;
      const htmlContent = generateContactFormHTML(contactData);
      
      const mailOptions = {
        from: {
          name: 'Form Contatti - Sito Web',
          address: this.systemEmail
        },
        to: this.notificationEmail,
        subject: subject,
        html: htmlContent,
        replyTo: contactData.email // Permette di rispondere direttamente
      };
  
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Contact form notification sent:', result.messageId);
      
      return { success: true, messageId: result.messageId };
        
    } catch (error) {
      console.error('❌ Failed to send contact form notification:', error);
      throw new Error(`Failed to send contact form notification: ${error.message}`);
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
   * Test email configuration
   */
  async testEmailConfig() {
    try {
      const testResult = await this.transporter.verify();
      console.log('✅ Email configuration is valid:', testResult);
      return { success: true, message: 'Email configuration is working' };
    } catch (error) {
      console.error('❌ Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(to = this.notificationEmail) {
    try {
      const mailOptions = {
        from: {
          name: 'Test Email',
          address: this.systemEmail
        },
        to: to,
        subject: '🧪 Test Email - Sistema Prenotazioni',
        html: `
          <h2>Test Email</h2>
          <p>Questo è un test per verificare che il sistema email funzioni correttamente.</p>
          <p><strong>Data/Ora:</strong> ${new Date().toLocaleString('it-IT')}</p>
          <p><strong>Configurazione:</strong> ${this.transporter.options.service || this.transporter.options.host}</p>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent:', result.messageId);
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Test email failed:', error);
      throw new Error(`Test email failed: ${error.message}`);
    }
  }
}