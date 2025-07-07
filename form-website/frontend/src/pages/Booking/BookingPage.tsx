import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicBookingApi, ApiError } from '../../services/api';
import BookingHeader from './components/BookingHeader';
import CalendarGrid from './components/CalendarGrid';
import TimeSlotList from './components/TimeSlotList';
import NotificationMessages from '../../components/NotificationMessages';
import type { BookingLinkInfo, DayAvailability, TimeSlot, BookingFormData } from '../../types/booking';
import { formatDateForDisplay } from '../../utils/booking/dateHelpers';
import { XCircle, MoveLeft, Loader2, Paperclip, Rocket } from "lucide-react";
import '../../styles/UserBooking/BookingHeader.css';
import '../../styles/UserBooking/CalendarGrid.css';
import '../../styles/UserBooking/TimeSlotList.css';
import '../../styles/UserBooking/BookingForm.css';
import '../../styles/UserBooking/BookingPage.css';

const BookingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Current step in booking process
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Booking data
  const [bookingLink, setBookingLink] = useState<BookingLinkInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Calendar data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: '',
    notes: '',
    cvFile: null,
    acceptPrivacy: false,
    selectedDate: '',
    selectedTime: '',
    bookingLinkId: ''
  });
  
  // Loading states
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load booking link info on mount
  useEffect(() => {
    loadBookingLinkInfo();
  }, [slug]);

  // Load calendar data when date changes
  useEffect(() => {
    if (bookingLink && currentStep === 1) {
      loadCalendarAvailability();
    }
  }, [currentDate, bookingLink, currentStep]);

  // Load time slots when date is selected
  useEffect(() => {
    if (selectedDate && currentStep === 2) {
      loadTimeSlots();
    }
  }, [selectedDate, currentStep]);

  // Update form data when booking details change
  useEffect(() => {
    if (bookingLink) {
      setFormData(prev => ({
        ...prev,
        selectedDate,
        selectedTime,
        bookingLinkId: bookingLink.id
      }));
    }
  }, [bookingLink, selectedDate, selectedTime]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear success message after timeout
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
      
      if (!slug) throw new Error('No booking slug provided');
      
      const linkInfo = await publicBookingApi.getBookingLinkBySlug(slug);
      
      // Convert API response to internal format
      const bookingLinkData: BookingLinkInfo = {
        id: linkInfo.id,
        name: linkInfo.name,
        templateId: linkInfo.templateId,
        urlSlug: linkInfo.urlSlug,
        duration: linkInfo.duration,
        requireAdvanceBooking: linkInfo.requireAdvanceBooking,
        advanceHours: linkInfo.advanceHours,
        isActive: linkInfo.isActive,
        created: linkInfo.created,
        updatedAt: linkInfo.updatedAt
      };
      
      setBookingLink(bookingLinkData);
      setIsLoadingLink(false);
      
    } catch (error) {
      console.error('Failed to load booking link info:', error);
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          setError('Link di prenotazione non trovato o non più attivo.');
        } else if (error.isNetworkError()) {
          setError('Impossibile connettersi al server. Controlla la connessione.');
        } else {
          setError('Errore durante il caricamento del link di prenotazione.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento.');
      }
      setIsLoadingLink(false);
    }
  };

  // Load calendar availability for current month
  const loadCalendarAvailability = async () => {
    try {
      setIsLoadingCalendar(true);
      
      if (!slug) throw new Error('No booking slug provided');
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // API expects 1-based month
      
      const response = await publicBookingApi.getMonthAvailability(slug, year, month);
      
      // Convert API response to internal format
      const convertedAvailability: DayAvailability[] = response.availability.map(day => ({
        date: day.date,
        available: day.available,
        totalSlots: day.totalSlots,
        availableSlots: day.availableSlots
      }));
      
      setAvailability(convertedAvailability);
      setIsLoadingCalendar(false);
      
    } catch (error) {
      console.error('Failed to load calendar availability:', error);
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          setError('Link di prenotazione non trovato.');
        } else if (error.isNetworkError()) {
          setError('Impossibile connettersi al server. Controlla la connessione.');
        } else {
          setError('Errore durante il caricamento delle disponibilità.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento del calendario.');
      }
      setIsLoadingCalendar(false);
    }
  };

  // Load available time slots for selected date
  const loadTimeSlots = async () => {
    try {
      setIsLoadingSlots(true);
      
      if (!slug || !selectedDate) throw new Error('Missing slug or selected date');
      
      const response = await publicBookingApi.getAvailableTimeSlots(slug, selectedDate);
      
      // Convert API response to internal format
      const convertedSlots: TimeSlot[] = response.timeSlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: slot.available
      }));
      
      setTimeSlots(convertedSlots);
      setIsLoadingSlots(false);
      
    } catch (error) {

      if (error instanceof ApiError) {
        if      (error.statusCode === 404) setError('Link di prenotazione non trovato.');
        else if (error.statusCode === 400) setError('Data selezionata non valida.');
        else if (error.isNetworkError())   setError('Impossibile connettersi al server. Controlla la connessione.');
        else                               setError('Errore durante il caricamento degli orari.');
      }
      else {
        setError('Errore imprevisto durante il caricamento degli orari.');
      }

      setIsLoadingSlots(false);
    }
  };

  // Handle month navigation
  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Handle day selection
  const handleDaySelect = (selectedDateString: string) => {
    const dayAvailability = availability.find(day => day.date === selectedDateString);
    
    if (!dayAvailability?.available) {
      setError('Questo giorno non è disponibile per appuntamenti.');
      return;
    }
    
    setSelectedDate(selectedDateString);
    setCurrentStep(2);
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (selectedSlot: TimeSlot) => {
    if (!selectedSlot.available) {
      setError('Questo orario non è più disponibile.');
      return;
    }
    
    setSelectedTime(selectedSlot.startTime);
    setCurrentStep(3);
  };

  // Handle back navigation
  const handleBackToCalendar = () => {
    setCurrentStep(1);
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleBackToTimeSlots = () => {
    setCurrentStep(2);
    setSelectedTime('');
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
    if (!formData.lastName.trim())  return 'Il cognome è obbligatorio';
    if (!formData.phone.trim())     return 'Il telefono è obbligatorio';
    if (!formData.email.trim())     return 'L\'email è obbligatoria';
    if (!formData.role.trim())      return 'Il ruolo è obbligatorio';
    if (!formData.cvFile)           return 'Il curriculum è obbligatorio';
    if (!formData.acceptPrivacy)    return 'Devi accettare la Privacy Policy per procedere';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Formato email non valido';
    
    // Validate phone format (basic)
    const phoneRegex = /^[\d\s\+\-\(\)]{8,}$/;
    if (!phoneRegex.test(formData.phone)) return 'Formato telefono non valido';
    
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
      
      if (!slug) throw new Error('Missing booking slug');
      
      // Crea FormData
      const formDataToSend = new FormData();
      formDataToSend.append('selectedDate', formData.selectedDate);
      formDataToSend.append('selectedTime', formData.selectedTime);
      formDataToSend.append('firstName',    formData.firstName);
      formDataToSend.append('lastName',     formData.lastName);
      formDataToSend.append('phone',        formData.phone);
      formDataToSend.append('email',        formData.email);
      formDataToSend.append('role',         formData.role);
      formDataToSend.append('notes',        formData.notes || '');
      
      // Aggiungi CV
      if (formData.cvFile) formDataToSend.append('cvFile', formData.cvFile);
      
      // Invia al backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/public/booking/${slug}/book`, {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'invio');
      }

      setSuccessMessage(
        'Prenotazione confermata!\n\n' +
        'Riceverai tutti i dettagli via email.'
      );
      
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Failed to submit booking:', error);
      setError('Errore durante l\'invio: ' + (error as Error).message);
      setIsSubmitting(false);
    }
  };

  // Get step subtitle
  const getStepSubtitle = (): string => {
    switch (currentStep) {
      case 1: return 'Clicca su un giorno disponibile nel calendario';
      case 2: return `Orari disponibili per ${formatDateForDisplay(new Date(selectedDate))}`;
      case 3: return 'Compila i tuoi dati e carica il curriculum';
      default: return '';
    }
  };

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
            <XCircle size={48} className="error-icon" />
            <p>Il link che hai seguito non è valido o è scaduto.</p>
            <Link to="/colloqui" className="btn btn-secondary">
              ← Torna alle Opportunità
            </Link>
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
        title={`Prenotazione ${bookingLink.name}`}
        subtitle={getStepSubtitle()}
        showProgress={true}
        currentStep={currentStep}
      />

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        {/* Step Content */}
        <div className="step-content">
          {/* Step 1: Calendar */}
          {currentStep === 1 && (
            <div className="calendar-step">
              <CalendarGrid
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                availability={availability}
                onDayClick={handleDaySelect}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                isLoading={isLoadingCalendar}
                showBackButton={true}
                backButtonUrl="/colloqui"
                backButtonText="Torna alle Opportunità"
              />
            </div>
          )}

          {/* Step 2: Time Slots */}
          {currentStep === 2 && (
            <div className="timeslots-step">
              <TimeSlotList
                selectedDate={selectedDate}
                timeSlots={timeSlots}
                onTimeSlotSelect={handleTimeSlotSelect}
                onBackToCalendar={handleBackToCalendar}
                isLoading={isLoadingSlots}
              />
            </div>
          )}

          {/* Step 3: Form */}
          {currentStep === 3 && (
            <div className="form-step">
              {/* Selected appointment info */}
              <div className="appointment-summary">
                <div className="summary-card">
                  <h3>Riepilogo appuntamento</h3>
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

                  {/* Role Field */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="role">
                        Ruolo *
                      </label>
                      <input
                        type="text"
                        id="role"
                        className="form-input"
                        placeholder="es. Grafico, Analista Politico..."
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>
                    
                  {/* Empty div to maintain grid layout */}
                  <div className="form-group"></div>

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
                        <span className="file-upload-icon"><Paperclip size={20} /></span>
                        <span className="file-upload-text">
                          {formData.cvFile ? formData.cvFile.name : 'Scegli file CV'}
                        </span>
                        <span className="file-upload-button">Sfoglia</span>
                      </label>
                    </div>
                    <div className="file-help">
                      Formati supportati: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx)
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
                      <MoveLeft className='move-left-icon' size={20} />
                      Cambia orario
                    </button>
                    
                    <button 
                      type="submit"
                      className="btn btn-primary btn-submit"
                      disabled={isSubmitting}
                    >
                      <Rocket size={20} />
                      Conferma Prenotazione
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="contact-info">
          <p>Contattaci per assistenza: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link></p>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;