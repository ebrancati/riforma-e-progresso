import { formatItalianDate, addMinutesToTime, generateManagementUrls, generateCVUrl } from './helpers.js';

export const generateCandidateCancellationHTML = (bookingData, bookingLinkData, reason) => {
  const formattedDate = formatItalianDate(bookingData.selectedDate);
  const formattedTime = `${bookingData.selectedTime} - ${addMinutesToTime(bookingData.selectedTime, bookingLinkData.duration)}`;
  
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
            <p>Ciao <strong>${bookingData.firstName}</strong>,</p>
            <p>La tua prenotazione è stata cancellata.</p>

            <div class="info-box">
                <h2>Appuntamento Cancellato</h2>
                <p><strong>Era programmato per:</strong> ${formattedDate} alle ${formattedTime}</p>
                <p><strong>Tipo:</strong> ${bookingLinkData.name}</p>
                ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
            </div>

            <p>Grazie per averci contattato. Puoi prenotare un nuovo appuntamento in qualsiasi momento.</p>
            
            <p style="text-align: center; color: #666; font-size: 14px;">candidature.riformaeprogresso.it</p>
        </div>
    </body>
    </html>
  `;
};

// Template per ADMIN - strutturato per web scraping
export const generateAdminCancellationHTML = (bookingData, bookingLinkData, reason) => {
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
            .admin-section { background: white; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0; }
            .header { background: #f44336; color: white; padding: 20px; text-align: center; margin-bottom: 20px; }
            .status-cancelled { background: #ffebee; padding: 10px; border-radius: 5px; border-left: 4px solid #f44336; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Prenotazione Cancellata</h1>
            <p>Notifica Interna</p>
        </div>

        <div class="booking-data" id="booking-${bookingData.id}">
            <h3>Dati Prenotazione Cancellata</h3>
            
            <div class="field">
                <span class="label">ID:</span>
                <span id="booking-id">${bookingData.id}</span>
            </div>
            
            <div class="field">
                <span class="label">Status:</span>
                <span id="booking-status">CANCELLED</span>
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
                <span class="label">Data Originale:</span>
                <span id="original-date">${bookingData.selectedDate}</span>
            </div>
            
            <div class="field">
                <span class="label">Ora Originale:</span>
                <span id="original-time">${bookingData.selectedTime}</span>
            </div>
            
            <div class="field">
                <span class="label">Tipo:</span>
                <span id="booking-type">${bookingLinkData.name}</span>
            </div>
            
            <div class="field">
                <span class="label">Motivo Cancellazione:</span>
                <span id="cancellation-reason">${reason || 'Non specificato'}</span>
            </div>
            
            <div class="field">
                <span class="label">Timestamp Cancellazione:</span>
                <span id="cancelled-at">${new Date().toISOString()}</span>
            </div>
            
            <div class="field">
                <span class="label">Data Creazione Originale:</span>
                <span id="created-at">${bookingData.createdAt}</span>
            </div>
        </div>

        <div class="status-cancelled">
            <h3>⚠️ Stato: CANCELLATA</h3>
            <p><strong>Era programmata per:</strong> ${formattedDate} alle ${formattedTime}</p>
            ${reason ? `<p><strong>Motivo fornito:</strong> ${reason}</p>` : '<p><strong>Motivo:</strong> Non specificato dal candidato</p>'}
        </div>

        <div class="admin-section">
            <h3>Informazioni Aggiuntive</h3>
            <p><strong>Data Formattata:</strong> ${formattedDate}</p>
            <p><strong>Orario Completo:</strong> ${formattedTime}</p>
            <p><strong>Durata Prevista:</strong> ${bookingLinkData.duration} minuti</p>
            <p><strong>Slot Liberato:</strong> Ora disponibile per altre prenotazioni</p>
        </div>
    </body>
    </html>
  `;
};