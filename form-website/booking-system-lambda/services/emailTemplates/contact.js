export const generateContactFormHTML = (contactData) => {
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
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Nuovo Messaggio di Contatto</h1>
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
                    Rispondi via Email
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
};