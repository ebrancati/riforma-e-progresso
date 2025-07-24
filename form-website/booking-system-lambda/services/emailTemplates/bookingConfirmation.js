import { formatItalianDate, addMinutesToTime, generateManagementUrls, generateCVUrl } from './helpers.js';

export const generateBookingConfirmationHTML = (bookingData, bookingLinkData) => {
  const baseUrl = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') || 'https://candidature.riformaeprogresso.it';
  const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
  const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;
  
  const formattedDate = formatItalianDate(bookingData.selectedDate);
  const formattedTime = `${bookingData.selectedTime} - ${addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
  
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
};