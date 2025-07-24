import { formatItalianDate, addMinutesToTime, generateManagementUrls, generateCVUrl } from './helpers.js';

export const generateCandidateRescheduleHTML = (bookingData, bookingLinkData, oldDateTime) => {
  const oldFormattedDate = formatItalianDate(oldDateTime.date);
  const newFormattedDate = formatItalianDate(bookingData.selectedDate);
  const oldFormattedTime = `${oldDateTime.time} - ${addMinutesToTime(oldDateTime.time, bookingLinkData.duration)}`;
  const newFormattedTime = `${bookingData.selectedTime} - ${addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
  
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
            <p>Ciao <strong>${bookingData.firstName}</strong>,</p>
            <p>La tua prenotazione è stata riprogrammata con successo!</p>

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
                <p>Hai bisogno di modificare nuovamente l'appuntamento?</p>
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
};

export const generateAdminRescheduleHTML = (bookingData, bookingLinkData, oldDateTime) => {
  const oldFormattedDate = formatItalianDate(oldDateTime.date);
  const newFormattedDate = formatItalianDate(bookingData.selectedDate);
  const oldFormattedTime = `${oldDateTime.time} - ${addMinutesToTime(oldDateTime.time, bookingLinkData.duration)}`;
  const newFormattedTime = `${bookingData.selectedTime} - ${addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
  
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
            .admin-section { background: white; padding: 20px; border-left: 4px solid #FF9800; margin: 20px 0; }
            .header { background: #FF9800; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
            .status-rescheduled { background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 10px 0; }
            .schedule-change { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Prenotazione Riprogrammata</h1>
            <p>Notifica Interna</p>
        </div>

        <div class="booking-data" id="booking-${bookingData.id}">
            <h3>Dati Prenotazione Riprogrammata</h3>
            
            <div class="field">
                <span class="label">ID:</span>
                <span id="booking-id">${bookingData.id}</span>
            </div>
            
            <div class="field">
                <span class="label">Status:</span>
                <span id="booking-status">RESCHEDULED</span>
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
                <span class="label">Nuova Data:</span>
                <span id="new-date">${bookingData.selectedDate}</span>
            </div>
            
            <div class="field">
                <span class="label">Nuova Ora:</span>
                <span id="new-time">${bookingData.selectedTime}</span>
            </div>
            
            <div class="field">
                <span class="label">Data Precedente:</span>
                <span id="old-date">${oldDateTime.date}</span>
            </div>
            
            <div class="field">
                <span class="label">Ora Precedente:</span>
                <span id="old-time">${oldDateTime.time}</span>
            </div>
            
            <div class="field">
                <span class="label">Tipo:</span>
                <span id="booking-type">${bookingLinkData.name}</span>
            </div>
            
            <div class="field">
                <span class="label">Durata:</span>
                <span id="appointment-duration">${bookingLinkData.duration}</span>
            </div>
            
            <div class="field">
                <span class="label">Meet:</span>
                <span id="meet-link">${bookingData.meetLink || 'N/A'}</span>
            </div>
            
            <div class="field">
                <span class="label">Timestamp Riprogrammazione:</span>
                <span id="rescheduled-at">${new Date().toISOString()}</span>
            </div>
            
            <div class="field">
                <span class="label">Data Creazione Originale:</span>
                <span id="created-at">${bookingData.createdAt}</span>
            </div>
        </div>

        <div class="status-rescheduled">
            <h3>🔄 Stato: RIPROGRAMMATA</h3>
            <div class="schedule-change">
                <p><strong>DA:</strong> ${oldFormattedDate} alle ${oldFormattedTime}</p>
                <p><strong>A:</strong> ${newFormattedDate} alle ${newFormattedTime}</p>
            </div>
        </div>

        <div class="admin-section">
            <h3>Informazioni Aggiuntive</h3>
            <p><strong>Vecchia Data Formattata:</strong> ${oldFormattedDate}</p>
            <p><strong>Nuova Data Formattata:</strong> ${newFormattedDate}</p>
            <p><strong>Vecchio Orario Completo:</strong> ${oldFormattedTime}</p>
            <p><strong>Nuovo Orario Completo:</strong> ${newFormattedTime}</p>
            <p><strong>Slot Vecchio:</strong> Liberato e ora disponibile</p>
            <p><strong>Slot Nuovo:</strong> Ora occupato</p>
            ${bookingData.meetLink ? `<p><strong>Link Meet Aggiornato:</strong><br><a href="${bookingData.meetLink}" target="_blank">${bookingData.meetLink}</a></p>` : ''}
        </div>
    </body>
    </html>
  `;
};