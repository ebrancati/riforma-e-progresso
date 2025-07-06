export function parseFormData(req, res, next) {
  // Only handle multipart form data
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  let data = '';
  req.setEncoding('binary');

  req.on('data', chunk => {
    data += chunk;
  });

  req.on('end', () => {
    try {
      const boundary = '--' + req.headers['content-type'].split('boundary=')[1];
      const parts = data.split(boundary);
      
      req.body = {};
      let fileReceived = false;
      let fileName = '';
      let fileSize = 0;

      parts.forEach(part => {
        if (part.includes('Content-Disposition: form-data;')) {
          const lines = part.split('\r\n');
          const header = lines.find(line => line.includes('Content-Disposition'));
          
          if (header) {
            const nameMatch = header.match(/name="([^"]+)"/);
            const fieldName = nameMatch ? nameMatch[1] : null;
            
            if (header.includes('filename=')) {
              // This is a file
              const fileNameMatch = header.match(/filename="([^"]+)"/);
              fileName = fileNameMatch ? fileNameMatch[1] : 'unknown';
              
              // Find the actual file data (after the empty line)
              const emptyLineIndex = part.indexOf('\r\n\r\n');
              if (emptyLineIndex !== -1) {
                const fileData = part.substring(emptyLineIndex + 4);
                fileSize = fileData.length - 2; // -2 per rimuovere \r\n finale
                fileReceived = true;
              }
            } else if (fieldName) {
              // This is a regular form field
              const emptyLineIndex = part.indexOf('\r\n\r\n');
              if (emptyLineIndex !== -1) {
                const value = part.substring(emptyLineIndex + 4, part.length - 2);
                req.body[fieldName] = value;
              }
            }
          }
        }
      });

      // Check if we received a file
      if (!fileReceived) {
        return res.status(400).json({
          error: 'CV file is required',
          details: 'Please upload your CV'
        });
      }

      // Log file info
      console.log(`\n=== CV RICEVUTO ===`);
      console.log(`Candidato: ${req.body.firstName} ${req.body.lastName}`);
      console.log(`Email: ${req.body.email}`);
      console.log(`Ruolo: ${req.body.role}`);
      console.log(`File: ${fileName}`);
      console.log(`Dimensione: ${formatFileSize(fileSize)}`);
      console.log(`Appuntamento: ${req.body.selectedDate} alle ${req.body.selectedTime}`);
      console.log(`===================\n`);

      // Add file info to request (but don't keep the actual file data)
      req.fileInfo = {
        fileName,
        fileSize,
        received: true
      };

      next();

    } catch (error) {
      console.error('Error parsing form data:', error);
      res.status(400).json({
        error: 'Invalid form data',
        details: 'Could not parse uploaded data'
      });
    }
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
    res.status(400).json({
      error: 'Request error',
      details: error.message
    });
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}