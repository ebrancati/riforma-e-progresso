import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NotificationMessages from '../../components/NotificationMessages';
import '../../styles/BookingPage.css';

interface BookingFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  cvFile: File | null;
  acceptPrivacy: boolean;
}

const BookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Form data state
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    cvFile: null,
    acceptPrivacy: false
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingLinkInfo, setBookingLinkInfo] = useState<any>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // Load booking link info
  useEffect(() => {
    loadBookingLinkInfo();
  }, [slug]);

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load booking link information
  const loadBookingLinkInfo = async () => {
    try {
      setIsLoadingInfo(true);
      
      // TODO: Replace with actual API call
      // const linkInfo = await apiService.getBookingLinkBySlug(slug);
      
      // Mock data for now
      setTimeout(() => {
        const mockData = {
          name: 'Colloquio Grafici',
          duration: 30,
          requireAdvanceBooking: true,
          advanceHours: 24,
          isActive: true
        };
        setBookingLinkInfo(mockData);
        setIsLoadingInfo(false);
      }, 500);
      
    } catch (error) {
      console.error('Failed to load booking link info:', error);
      setError('Link di prenotazione non trovato o non più attivo.');
      setIsLoadingInfo(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof BookingFormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Formato file non supportato. Carica un file PDF, Word o PowerPoint.');
        event.target.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('Il file è troppo grande. Dimensione massima: 10MB.');
        event.target.value = '';
        return;
      }
      
      handleInputChange('cvFile', file);
      setError(null);
    } else {
      handleInputChange('cvFile', null);
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'Il nome è obbligatorio';
    if (!formData.lastName.trim()) return 'Il cognome è obbligatorio';
    if (!formData.phone.trim()) return 'Il telefono è obbligatorio';
    if (!formData.email.trim()) return 'L\'email è obbligatoria';
    if (!formData.cvFile) return 'Il curriculum è obbligatorio';
    if (!formData.acceptPrivacy) return 'Devi accettare la Privacy Policy per procedere';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Formato email non valido';
    }
    
    // Validate phone format (basic)
    const phoneRegex = /^[\d\s\+\-\(\)]{8,}$/;
    if (!phoneRegex.test(formData.phone)) {
      return 'Formato telefono non valido';
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: Implement actual API call
      console.log('Submitting booking:', {
        ...formData,
        slug,
        cvFile: formData.cvFile?.name
      });
      
      // Mock submission
      setTimeout(() => {
        setSuccessMessage(
          '🎉 Prenotazione inviata con successo!\n\n' +
          'Riceverai una conferma via email a breve con tutti i dettagli del colloquio.\n\n' +
          'Grazie per aver scelto di candidarti!'
        );
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          notes: '',
          cvFile: null,
          acceptPrivacy: false
        });
        
        // Reset file input
        const fileInput = document.getElementById('cvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit booking:', error);
      setError('Errore durante l\'invio della prenotazione. Riprova più tardi.');
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingInfo) {
    return (
      <div className="container">
        <div className="header">
          <h1>Caricamento...</h1>
          <p>Sto caricando le informazioni del colloquio</p>
        </div>
        <div className="main-content">
          <div className="loading-indicator">
            <div>Caricamento in corso...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (link not found)
  if (!bookingLinkInfo) {
    return (
      <div className="container">
        <div className="header">
          <h1>Link non trovato</h1>
          <p>Il link di prenotazione richiesto non esiste o non è più attivo</p>
        </div>
        <div className="main-content">
          <div className="error-state">
            <h3>😞 Oops!</h3>
            <p>Il link che hai seguito non è valido o è scaduto.</p>
            <p>Contatta l'azienda per ottenere un nuovo link di prenotazione.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Prenotazione {bookingLinkInfo.name}</h1>
        <p>Compila tutti i campi per candidarti a questo ruolo</p>
        <div className="booking-info">
          <span className="duration-info">
            ⏱️ Durata colloquio: {bookingLinkInfo.duration} minuti
          </span>
          {bookingLinkInfo.requireAdvanceBooking && (
            <span className="advance-info">
              📅 Preavviso richiesto: {bookingLinkInfo.advanceHours} ore
            </span>
          )}
        </div>
      </div>

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        {/* Booking Form */}
        <div className="booking-form-section">
          <form onSubmit={handleSubmit} className="booking-form">
            
            {/* Name Fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">
                  Nome *
                </label>
                <input
                  type="text"
                  id="firstName"
                  className="form-input"
                  placeholder="Il tuo nome"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">
                  Cognome *
                </label>
                <input
                  type="text"
                  id="lastName"
                  className="form-input"
                  placeholder="Il tuo cognome"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Contact Fields */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Telefono *
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  placeholder="+39 123 456 7890"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="tua@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* CV Upload */}
            <div className="form-group">
              <label className="form-label" htmlFor="cvFile">
                Curriculum Vitae *
              </label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="cvFile"
                  className="file-input"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  required
                />
                <label htmlFor="cvFile" className="file-upload-label">
                  <span className="file-upload-icon">📎</span>
                  <span className="file-upload-text">
                    {formData.cvFile ? formData.cvFile.name : 'Scegli file CV'}
                  </span>
                  <span className="file-upload-button">Sfoglia</span>
                </label>
              </div>
              <div className="file-help">
                Formati supportati: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx) - Max 10MB
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Note aggiuntive
              </label>
              <textarea
                id="notes"
                className="form-textarea"
                placeholder="Inserisci eventuali note aggiuntive (facoltativo)..."
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Privacy Policy */}
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.acceptPrivacy}
                    onChange={(e) => handleInputChange('acceptPrivacy', e.target.checked)}
                    disabled={isLoading}
                    required
                  />
                  <span className="checkbox-text">
                    Accetto la <a href="/privacy-policy" target="_blank" className="privacy-link">Privacy Policy</a> e 
                    autorizzo il trattamento dei miei dati personali per finalità di selezione del personale *
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner">⏳</span>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <span className="submit-icon">🚀</span>
                    Invia Candidatura
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3>Cosa succede dopo?</h3>
          <ol>
            <li>Riceverai una <strong>conferma via email</strong> della tua candidatura</li>
            <li>Il nostro team <strong>esaminerà il tuo CV</strong> entro 48 ore</li>
            <li>Se idoneo, riceverai una <strong>proposta di orari</strong> per il colloquio</li>
            <li>Potrai <strong>scegliere l'orario</strong> più comodo per te</li>
            <li>Ti invieremo i <strong>dettagli del colloquio</strong> (luogo/video call)</li>
          </ol>
          
          <div className="contact-info">
            <p><strong>Hai domande?</strong> Non esitare a contattarci!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;