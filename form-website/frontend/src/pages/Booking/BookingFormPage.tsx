import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import BookingHeader from './components/BookingHeader';
import NotificationMessages from '../../components/NotificationMessages';
import type { BookingLinkInfo, BookingFormData } from '../../types/booking';
import { formatDateForDisplay } from '../../utils/booking/dateHelpers';

const BookingFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get date and time from URL params
  const selectedDate = searchParams.get('date') || '';
  const selectedTime = searchParams.get('time') || '';
  
  // State
  const [bookingLink, setBookingLink] = useState<BookingLinkInfo | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    cvFile: null,
    acceptPrivacy: false,
    selectedDate,
    selectedTime,
    bookingLinkId: ''
  });
  
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load booking link info on mount
  useEffect(() => {
    loadBookingLinkInfo();
  }, [slug]);

  // Update form data when booking link loads
  useEffect(() => {
    if (bookingLink) {
      setFormData(prev => ({
        ...prev,
        bookingLinkId: bookingLink.id
      }));
    }
  }, [bookingLink]);

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
      setIsLoadingLink(true);
      
      // TODO: Replace with actual API call
      // const linkInfo = await apiService.getBookingLinkBySlug(slug);
      
      // Mock data
      setTimeout(() => {
        const mockData: BookingLinkInfo = {
          id: 'BL_123456789_abc',
          name: 'Colloquio Riforma e Progresso',
          templateId: 'TPL_123456789_def',
          urlSlug: slug || '',
          duration: 30,
          requireAdvanceBooking: true,
          advanceHours: 24,
          isActive: true,
          created: '2025-01-01',
          updatedAt: '2025-01-01T00:00:00Z'
        };
        setBookingLink(mockData);
        setIsLoadingLink(false);
      }, 300);
      
    } catch (error) {
      console.error('Failed to load booking link info:', error);
      setError('Link di prenotazione non trovato.');
      setIsLoadingLink(false);
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
      setIsSubmitting(true);
      setError(null);
      
      // TODO: Implement actual API call with file upload
      console.log('Submitting booking:', {
        ...formData,
        cvFile: formData.cvFile?.name
      });
      
      // Mock submission
      setTimeout(() => {
        setSuccessMessage(
          '🎉 Prenotazione confermata!\n\n' +
          `Appuntamento fissato per ${formatDateForDisplay(new Date(selectedDate))} alle ${selectedTime}.\n\n` +
          'Riceverai una conferma via email con tutti i dettagli.\n\n' +
          'Grazie per aver scelto di candidarti!'
        );
        
        setIsSubmitting(false);
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit booking:', error);
      setError('Errore durante l\'invio della prenotazione. Riprova più tardi.');
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleBackToTimeSlots = () => {
    navigate(`/book/${slug}/slots/${selectedDate}`);
  };

  // Validate URL parameters
  if (!selectedDate || !selectedTime) {
    return (
      <div className="container">
        <div className="header">
          <h1>Parametri mancanti</h1>
          <p>Data o orario non specificati</p>
        </div>
        <div className="main-content">
          <div className="error-state">
            <h3>❌ Parametri mancanti</h3>
            <p>Non è stata specificata una data o un orario per la prenotazione.</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/book/${slug}`)}
            >
              Torna al calendario
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for booking link
  if (isLoadingLink) {
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
  if (!bookingLink) {
    return (
      <div className="container">
        <div className="header">
          <h1>Link non trovato</h1>
          <p>Il link di prenotazione richiesto non esiste o non è più attivo</p>
        </div>
        <div className="main-content">
          <div className="error-state">
            <h3>😞 Oops!</h3>
            <p>Contatta l'azienda per ottenere un nuovo link di prenotazione.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <BookingHeader 
        bookingLink={bookingLink}
        showProgress={true}
        currentStep={3}
      />

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        {/* Selected appointment info */}
        <div className="appointment-summary">
          <div className="summary-card">
            <h3>📅 Riepilogo appuntamento</h3>
            <div className="summary-details">
              <div className="summary-item">
                <strong>Data:</strong> {formatDateForDisplay(new Date(selectedDate))}
              </div>
              <div className="summary-item">
                <strong>Orario:</strong> {selectedTime}
              </div>
              <div className="summary-item">
                <strong>Durata:</strong> {bookingLink.duration} minuti
              </div>
            </div>
            <button 
              className="change-appointment-btn"
              onClick={handleBackToTimeSlots}
              disabled={isSubmitting}
            >
              Cambia orario
            </button>
          </div>
        </div>

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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                type="button"
                className="btn btn-secondary"
                onClick={handleBackToTimeSlots}
                disabled={isSubmitting}
              >
                ← Cambia orario
              </button>
              
              <button 
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner">⏳</span>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <span className="submit-icon">🚀</span>
                    Conferma Prenotazione
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
            <li>Riceverai una <strong>conferma via email</strong> della tua prenotazione</li>
            <li>Il nostro team <strong>esaminerà il tuo CV</strong> entro 48 ore</li>
            <li>Ti invieremo i <strong>dettagli del colloquio</strong> (luogo/video call)</li>
            <li>Potrai <strong>modificare o cancellare</strong> la prenotazione se necessario</li>
          </ol>
          
          <div className="contact-info">
            <p><strong>Hai domande?</strong> Non esitare a contattarci per assistenza!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingFormPage;