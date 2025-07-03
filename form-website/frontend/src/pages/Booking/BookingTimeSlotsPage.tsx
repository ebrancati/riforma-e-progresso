import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookingHeader from './components/BookingHeader';
import TimeSlotList from './components/TimeSlotList';
import NotificationMessages from '../../components/NotificationMessages';
import type { BookingLinkInfo, TimeSlot } from '../../types/booking';

const BookingTimeSlotsPage: React.FC = () => {
  const { slug, date } = useParams<{ slug: string; date: string }>();
  const navigate = useNavigate();
  
  // State
  const [bookingLink, setBookingLink] = useState<BookingLinkInfo | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadBookingLinkInfo();
  }, [slug]);

  useEffect(() => {
    if (bookingLink && date) {
      loadTimeSlots();
    }
  }, [bookingLink, date]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

  // Load available time slots for selected date
  const loadTimeSlots = async () => {
    try {
      setIsLoadingSlots(true);
      
      // TODO: Replace with actual API call
      // const slots = await apiService.getTimeSlots(slug, date);
      
      // Mock time slots data
      setTimeout(() => {
        const mockSlots: TimeSlot[] = [
          {
            id: 'TS_1_001',
            startTime: '09:00',
            endTime: '09:30',
            available: true
          },
          {
            id: 'TS_1_002',
            startTime: '09:30',
            endTime: '10:00',
            available: false,
            bookingId: 'BKG_123456789_xyz'
          },
          {
            id: 'TS_1_003',
            startTime: '10:00',
            endTime: '10:30',
            available: true
          },
          {
            id: 'TS_1_004',
            startTime: '10:30',
            endTime: '11:00',
            available: true
          },
          {
            id: 'TS_1_005',
            startTime: '11:00',
            endTime: '11:30',
            available: true
          },
          {
            id: 'TS_1_006',
            startTime: '11:30',
            endTime: '12:00',
            available: true
          },
          {
            id: 'TS_1_007',
            startTime: '12:00',
            endTime: '12:30',
            available: true
          },
          {
            id: 'TS_1_008',
            startTime: '14:00',
            endTime: '14:30',
            available: false,
            bookingId: 'BKG_123456789_abc'
          },
          {
            id: 'TS_1_009',
            startTime: '14:30',
            endTime: '15:00',
            available: true
          },
          {
            id: 'TS_1_010',
            startTime: '15:00',
            endTime: '15:30',
            available: true
          },
          {
            id: 'TS_1_011',
            startTime: '15:30',
            endTime: '16:00',
            available: false,
            bookingId: 'BKG_123456789_def'
          },
          {
            id: 'TS_1_012',
            startTime: '16:00',
            endTime: '16:30',
            available: true
          },
          {
            id: 'TS_1_013',
            startTime: '16:30',
            endTime: '17:00',
            available: true
          }
        ];
        
        setTimeSlots(mockSlots);
        setIsLoadingSlots(false);
      }, 500);
      
    } catch (error) {
      console.error('Failed to load time slots:', error);
      setError('Errore nel caricamento degli orari disponibili.');
      setIsLoadingSlots(false);
    }
  };

  // Handle time slot selection
  const handleTimeSlotSelect = (selectedSlot: TimeSlot) => {
    if (!selectedSlot.available) {
      setError('Questo orario non è più disponibile.');
      return;
    }
    
    // Navigate to form page with selected date and time
    navigate(`/book/${slug}/form?date=${date}&time=${selectedSlot.startTime}`);
  };

  // Handle back to calendar
  const handleBackToCalendar = () => {
    navigate(`/book/${slug}`);
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
            <h3>😞 Oops!</h3>
            <p>Il link che hai seguito non è valido o è scaduto.</p>
            <p>Contatta l'azienda per ottenere un nuovo link di prenotazione.</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid date parameter
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div className="container">
        <div className="header">
          <h1>Data non valida</h1>
          <p>La data selezionata non è nel formato corretto</p>
        </div>
        <div className="main-content">
          <div className="error-state">
            <h3>❌ Data non valida</h3>
            <p>La data selezionata non è nel formato corretto.</p>
            <button 
              className="btn btn-primary"
              onClick={handleBackToCalendar}
            >
              Torna al calendario
            </button>
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
        currentStep={2}
      />

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={null} 
        />

        {/* Time Slots Section */}
        <div className="time-slots-section">
          <TimeSlotList
            selectedDate={date}
            timeSlots={timeSlots}
            onTimeSlotSelect={handleTimeSlotSelect}
            onBackToCalendar={handleBackToCalendar}
            isLoading={isLoadingSlots}
          />
        </div>
      </div>
    </div>
  );
};

export default BookingTimeSlotsPage;