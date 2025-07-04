import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { cancelRescheduleApi, publicBookingApi, ApiError } from '../../services/api';
import NotificationMessages from '../../components/NotificationMessages';
import CalendarGrid from '../Booking/components/CalendarGrid';
import TimeSlotList from '../Booking/components/TimeSlotList';
import { formatDateForDisplay } from '../../utils/booking/dateHelpers';
import type { DayAvailability, TimeSlot } from '../../types/booking';
import '../../styles/RescheduleBookingPage.css';

interface BookingDetails {
  booking: {
    id: string;
    selectedDate: string;
    selectedTime: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    notes: string;
    status: string;
    createdAt: string;
  };
  bookingLink: {
    name: string;
    duration: number;
    urlSlug: string;
  };
}

const RescheduleBookingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Current step: 1=calendar, 2=timeslots, 3=confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Booking data
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [newSelectedDate, setNewSelectedDate] = useState<string>('');
  const [newSelectedTime, setNewSelectedTime] = useState<string>('');
  
  // Calendar data
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Loading states
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Error and success states
  const [error, setError] = useState<string | null>(null);
  const [isRescheduled, setIsRescheduled] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId, token]);

  useEffect(() => {
    if (bookingDetails && currentStep === 1) {
      loadCalendarAvailability();
    }
  }, [currentDate, bookingDetails, currentStep]);

  useEffect(() => {
    if (newSelectedDate && currentStep === 2) {
      loadTimeSlots();
    }
  }, [newSelectedDate, currentStep]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadBookingDetails = async () => {
    try {
      setIsLoadingDetails(true);
      
      if (!bookingId || !token) {
        setError('Link non valido. Controlla che l\'URL sia corretto.');
        return;
      }

      const response = await cancelRescheduleApi.getBookingDetailsForCancel(bookingId, token);
      setBookingDetails(response);
      setError(null);
      
    } catch (error) {
      console.error('Failed to load booking details:', error);
      
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          setError('Prenotazione non trovata.');
        } else if (error.statusCode === 403) {
          setError('Link non valido o scaduto.');
        } else if (error.statusCode === 410) {
          setError('Non è possibile modificare questa prenotazione.');
        } else if (error.isNetworkError()) {
          setError('Impossibile connettersi al server. Riprova più tardi.');
        } else {
          setError('Errore durante il caricamento dei dettagli.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento.');
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadCalendarAvailability = async () => {
    try {
      setIsLoadingCalendar(true);
      
      if (!bookingDetails) return;
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await publicBookingApi.getMonthAvailability(
        bookingDetails.bookingLink.urlSlug, 
        year, 
        month
      );
      
      setAvailability(response.availability);
      setIsLoadingCalendar(false);
      
    } catch (error) {
      console.error('Failed to load calendar availability:', error);
      setError('Errore durante il caricamento del calendario.');
      setIsLoadingCalendar(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      setIsLoadingSlots(true);
      
      if (!bookingDetails || !newSelectedDate) return;
      
      const response = await publicBookingApi.getAvailableTimeSlots(
        bookingDetails.bookingLink.urlSlug, 
        newSelectedDate
      );
      
      setTimeSlots(response.timeSlots);
      setIsLoadingSlots(false);
      
    } catch (error) {
      console.error('Failed to load time slots:', error);
      setError('Errore durante il caricamento degli orari.');
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
    
    setNewSelectedDate(selectedDateString);
    setCurrentStep(2);
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (selectedSlot: TimeSlot) => {
    if (!selectedSlot.available) {
      setError('Questo orario non è più disponibile.');
      return;
    }
    
    setNewSelectedTime(selectedSlot.startTime);
    setCurrentStep(3);
  };

  // Handle back navigation
  const handleBackToCalendar = () => {
    setCurrentStep(1);
    setNewSelectedDate('');
    setNewSelectedTime('');
  };

  const handleBackToTimeSlots = () => {
    setCurrentStep(2);
    setNewSelectedTime('');
  };

  // Handle reschedule confirmation
  const handleConfirmReschedule = async () => {
    try {
      setIsSubmitting(true);
      
      if (!bookingId || !token || !newSelectedDate || !newSelectedTime) {
        setError('Dati mancanti per la riprogrammazione.');
        return;
      }

      await cancelRescheduleApi.rescheduleBooking(bookingId, token, newSelectedDate, newSelectedTime);
      
      setIsRescheduled(true);
      
    } catch (error) {
      console.error('Failed to reschedule booking:', error);
      
      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          setError('Questo orario non è più disponibile. Scegli un altro slot.');
        } else if (error.statusCode === 410) {
          setError('Non è possibile modificare questa prenotazione.');
        } else if (error.statusCode === 403) {
          setError('Link non valido per questa operazione.');
        } else if (error.isNetworkError()) {
          setError('Errore di connessione. Riprova tra qualche istante.');
        } else {
          setError('Errore durante la riprogrammazione. Riprova.');
        }
      } else {
        setError('Errore imprevisto durante la riprogrammazione.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state for booking details
  if (isLoadingDetails) {
    return (
      <div className="reschedule-container">
        <div className="reschedule-header">
          <h1>Caricamento...</h1>
          <p>Sto verificando i dettagli della prenotazione</p>
        </div>
        <div className="reschedule-content">
          <div className="loading-indicator">
            <div>Caricamento in corso...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (booking not found or invalid token)
  if (!bookingDetails) {
    return (
      <div className="reschedule-container">
        <div className="reschedule-header">
          <h1>Riforma e Progresso</h1>
          <h2>Riprogramma Appuntamento</h2>
        </div>
        <div className="reschedule-content">
          <div className="error-state">
            <h3>😞 Oops!</h3>
            <p>Non è stato possibile accedere alla prenotazione.</p>
            <p>Il link potrebbe essere scaduto o non valido.</p>
            <div className="contact-info">
              <p>Per assistenza, contatta:</p>
              <p><strong>sezione.colloqui@riformaeprogresso.it</strong></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state (booking rescheduled)
  if (isRescheduled) {
    const originalDate = new Date(bookingDetails.booking.selectedDate + 'T00:00:00');
    const newDate = new Date(newSelectedDate + 'T00:00:00');
    
    return (
      <div className="reschedule-container">
        <div className="reschedule-header">
          <h1>Riforma e Progresso</h1>
          <h2>Riprogramma Appuntamento</h2>
        </div>
        <div className="reschedule-content">
          <div className="success-state">
            <div className="success-illustration">
              <div className="success-icon">✅</div>
            </div>
            <h3>Appuntamento riprogrammato.</h3>
            <p>La tua prenotazione è stata modificata con successo.</p>
            
            <div className="reschedule-summary">
              <div className="summary-item">
                <strong>Nuovo appuntamento:</strong>
                <p>{formatDateForDisplay(newDate)} alle {newSelectedTime}</p>
              </div>
              <div className="summary-item">
                <strong>Precedente appuntamento:</strong>
                <p>{formatDateForDisplay(originalDate)} alle {bookingDetails.booking.selectedTime}</p>
              </div>
            </div>
            
            <p>Hai trovato qualche bug? Contattaci: sezione.colloqui@riformaeprogresso.it</p>
          </div>
        </div>
      </div>
    );
  }

  const originalDate = new Date(bookingDetails.booking.selectedDate + 'T00:00:00');
  const originalDisplayDate = formatDateForDisplay(originalDate);

  return (
    <div className="reschedule-container">
      {/* Header */}
      <div className="reschedule-header">
        <h1>Riforma e Progresso</h1>
        <h2>Riprogramma Appuntamento</h2>
        
        {/* Progress indicator */}
        <div className="reschedule-progress">
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="step-circle">
                {currentStep > 1 ? '✓' : '📅'}
              </div>
              <span className="step-title">Seleziona Data</span>
            </div>
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-circle">
                {currentStep > 2 ? '✓' : '⏰'}
              </div>
              <span className="step-title">Scegli Orario</span>
            </div>
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="step-circle">
                {currentStep === 3 ? '📝' : '📝'}
              </div>
              <span className="step-title">Conferma</span>
            </div>
          </div>
        </div>
      </div>

      <div className="reschedule-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={null} 
        />

        {/* Current Booking Info */}
        <div className="current-booking">
          <h3>Appuntamento attuale</h3>
          <div className="current-booking-details">
            <p><strong>{bookingDetails.bookingLink.name}</strong></p>
            <p>{originalDisplayDate} alle {bookingDetails.booking.selectedTime}</p>
            <p>Durata: {bookingDetails.bookingLink.duration} minuti</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          
          {/* Step 1: Calendar */}
          {currentStep === 1 && (
            <div className="calendar-step">
              <h3>Seleziona una nuova data</h3>
              <CalendarGrid
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                availability={availability}
                onDayClick={handleDaySelect}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                isLoading={isLoadingCalendar}
              />
            </div>
          )}

          {/* Step 2: Time Slots */}
          {currentStep === 2 && (
            <div className="timeslots-step">
              <h3>Scegli un nuovo orario</h3>
              <TimeSlotList
                selectedDate={newSelectedDate}
                timeSlots={timeSlots}
                onTimeSlotSelect={handleTimeSlotSelect}
                onBackToCalendar={handleBackToCalendar}
                isLoading={isLoadingSlots}
              />
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 3 && (
            <div className="confirm-step">
              <h3>Conferma riprogrammazione</h3>
              
              <div className="reschedule-comparison">
                <div className="comparison-item old">
                  <h4>Appuntamento precedente</h4>
                  <div className="appointment-info">
                    <p><strong>Data:</strong> {originalDisplayDate}</p>
                    <p><strong>Orario:</strong> {bookingDetails.booking.selectedTime}</p>
                  </div>
                </div>
                
                <div className="comparison-arrow">
                  →
                </div>
                
                <div className="comparison-item new">
                  <h4>Nuovo appuntamento</h4>
                  <div className="appointment-info">
                    <p><strong>Data:</strong> {formatDateForDisplay(new Date(newSelectedDate + 'T00:00:00'))}</p>
                    <p><strong>Orario:</strong> {newSelectedTime}</p>
                  </div>
                </div>
              </div>

              <div className="confirm-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBackToTimeSlots}
                  disabled={isSubmitting}
                >
                  ← Cambia orario
                </button>
                
                <button 
                  type="button"
                  className="btn btn-primary btn-confirm"
                  onClick={handleConfirmReschedule}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading-spinner">⏳</span>
                      Riprogrammazione...
                    </>
                  ) : (
                    <>
                      <span className="confirm-icon">🚀</span>
                      Conferma Riprogrammazione
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RescheduleBookingPage;