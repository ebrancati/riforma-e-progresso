import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiService, ApiError } from '../../services/api';
import NotificationMessages from '../../components/NotificationMessages';
import { formatDateForDisplay } from '../../utils/booking/dateHelpers';
import '../../styles/CancelBookingPage.css';

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

const CancelBookingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId, token]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadBookingDetails = async () => {
    try {
      setIsLoading(true);
      
      if (!bookingId || !token) {
        setError('Link non valido. Controlla che l\'URL sia corretto.');
        return;
      }

      const response = await apiService.getBookingDetailsForCancel(bookingId, token);
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
          if (error.message.includes('cancelled')) {
            setError('Questa prenotazione è già stata cancellata.');
          } else {
            setError('Non è possibile cancellare prenotazioni passate.');
          }
        } else if (error.isNetworkError()) {
          setError('Impossibile connettersi al server. Riprova più tardi.');
        } else {
          setError('Errore durante il caricamento dei dettagli.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmCancel = async () => {
    try {
      setIsSubmitting(true);
      
      if (!bookingId || !token) {
        setError('Dati mancanti per la cancellazione.');
        return;
      }

      await apiService.cancelBooking(bookingId, token, cancelReason);
      
      setIsCancelled(true);
      setShowConfirm(false);
      
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      
      if (error instanceof ApiError) {
        if (error.statusCode === 410) {
          setError('Questa prenotazione è già stata cancellata o è scaduta.');
        } else if (error.statusCode === 403) {
          setError('Link non valido per questa operazione.');
        } else if (error.isNetworkError()) {
          setError('Errore di connessione. Riprova tra qualche istante.');
        } else {
          setError('Errore durante la cancellazione. Riprova.');
        }
      } else {
        setError('Errore imprevisto durante la cancellazione.');
      }
      
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="cancel-container">
        <div className="cancel-header">
          <h1>Caricamento...</h1>
          <p>Sto verificando i dettagli della prenotazione</p>
        </div>
        <div className="cancel-content">
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
      <div className="cancel-container">
        <div className="cancel-header">
          <h1>Riforma e Progresso</h1>
          <h2>Cancellazione Appuntamento</h2>
        </div>
        <div className="cancel-content">
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

  // Success state (booking cancelled)
  if (isCancelled) {
    return (
      <div className="cancel-container">
        <div className="cancel-header">
          <h1>Riforma e Progresso</h1>
          <h2>Cancellazione Appuntamento</h2>
        </div>
        <div className="cancel-content">
          <div className="success-state">
            <div className="success-illustration">
              <div className="success-icon">✅</div>
            </div>
            <h3>Appuntamento cancellato.</h3>
            <p>La tua prenotazione è stata cancellata con successo.</p>
          </div>
        </div>
      </div>
    );
  }

  const bookingDate = new Date(bookingDetails.booking.selectedDate + 'T00:00:00');
  const displayDate = formatDateForDisplay(bookingDate);

  return (
    <div className="cancel-container">
      {/* Header */}
      <div className="cancel-header">
        <h1>Riforma e Progresso</h1>
        <h2>Cancellazione Appuntamento</h2>
      </div>

      <div className="cancel-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={null} 
        />

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal">
              <h3>Stai per annullare l'appuntamento.</h3>
              <p>Sicuro di voler procedere?</p>
              <div className="confirm-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={handleCancelConfirm}
                  disabled={isSubmitting}
                >
                  No
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleConfirmCancel}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Cancellazione...' : 'Sì'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="cancel-form">
          <div className="booking-summary">
            <h3>{bookingDetails.bookingLink.name}</h3>
            <p className="booking-datetime">{displayDate} alle {bookingDetails.booking.selectedTime}</p>
            
            <div className="booking-details">
              <div className="detail-item">
                <strong>Nome:</strong> {bookingDetails.booking.firstName} {bookingDetails.booking.lastName}
              </div>
              <div className="detail-item">
                <strong>Email:</strong> {bookingDetails.booking.email}
              </div>
              <div className="detail-item">
                <strong>Ruolo:</strong> {bookingDetails.booking.role}
              </div>
              <div className="detail-item">
                <strong>Durata:</strong> {bookingDetails.bookingLink.duration} minuti
              </div>
            </div>
          </div>

          <div className="cancel-reason">
            <label htmlFor="cancelReason" className="form-label">
              Motivo della cancellazione
            </label>
            <textarea
              id="cancelReason"
              className="form-textarea"
              placeholder="Inserisci il motivo della cancellazione (opzionale)..."
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="cancel-actions">
            <button 
              className="btn btn-danger btn-cancel"
              onClick={handleCancelClick}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Cancellazione...' : 'Annulla Appuntamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingPage;