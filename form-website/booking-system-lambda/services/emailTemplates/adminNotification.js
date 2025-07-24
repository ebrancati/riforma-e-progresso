import { formatItalianDate, addMinutesToTime } from './helpers.js';

export const generateAdminNotificationHTML = (bookingData, bookingLinkData) => {
  const baseUrl = process.env.GOOGLE_REDIRECT_URI?.replace('/api/auth/google/callback', '') || 'https://candidature.riformaeprogresso.it';
  const rescheduleUrl = `${baseUrl}/booking/${bookingData.id}/reschedule?token=${bookingData.cancellationToken}`;
  const cancelUrl = `${baseUrl}/booking/${bookingData.id}/cancel?token=${bookingData.cancellationToken}`;

  const cvUrl = bookingData.cvFileId ? `${baseUrl}/admin/cv/${bookingData.cvFileId}` : null;
  
  const formattedDate = formatItalianDate(bookingData.selectedDate);
  const formattedTime = `${bookingData.selectedTime} - ${addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;

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

        ${cvUrl ? `
        <div class="cv-link">
            <a href="${cvUrl}" target="_blank">🔒 Visualizza CV del candidato</a>
        </div>
        ` : `
        <div class="admin-section">
            <h3>CV del candidato</h3>
            <p>Nessun CV allegato per questa prenotazione.</p>
        </div>
        `}

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
    </body>
    </html>
  `;
};