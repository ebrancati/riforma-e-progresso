import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookingHeader from './components/BookingHeader';
import CalendarGrid from './components/CalendarGrid';
import NotificationMessages from '../../components/NotificationMessages';
import type { BookingLinkInfo, DayAvailability } from '../../types/booking';
import { formatDateToString } from '../../utils/booking/dateHelpers';

const BookingCalendarPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // State
  const [bookingLink, setBookingLink] = useState<BookingLinkInfo | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [isLoadingLink, setIsLoadingLink] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load booking link info on mount
  useEffect(() => {
    loadBookingLinkInfo();
  }, [slug]);

  // Load calendar data when date changes
  useEffect(() => {
    if (bookingLink) {
      loadCalendarAvailability();
    }
  }, [currentDate, bookingLink]);

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
      
      // Mock data for now
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
      }, 500);
      
    } catch (error) {
      console.error('Failed to load booking link info:', error);
      setError('Link di prenotazione non trovato o non più attivo.');
      setIsLoadingLink(false);
    }
  };

  // Load calendar availability for current month
  const loadCalendarAvailability = async () => {
    try {
      setIsLoadingCalendar(true);
      
      // TODO: Replace with actual API call
      // const monthData = await apiService.getMonthAvailability(slug, currentDate);
      
      // Mock availability data
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const mockAvailability: DayAvailability[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = formatDateToString(date);
        
        // Mock logic: weekends not available, some weekdays have limited slots
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isPast = date < new Date().setHours(0, 0, 0, 0);
        const randomlyUnavailable = Math.random() < 0.2; // 20% chance of no availability
        
        const totalSlots = isWeekend || isPast ? 0 : Math.floor(Math.random() * 8) + 2; // 2-10 slots
        const bookedSlots = Math.floor(Math.random() * totalSlots * 0.6); // 0-60% booked
        const availableSlots = Math.max(0, totalSlots - bookedSlots);
        
        mockAvailability.push({
          date: dateString,
          available: !isWeekend && !isPast && !randomlyUnavailable && availableSlots > 0,
          totalSlots,
          availableSlots
        });
      }
      
      setAvailability(mockAvailability);
      setIsLoadingCalendar(false);
      
    } catch (error) {
      console.error('Failed to load calendar availability:', error);
      setError('Errore nel caricamento delle disponibilità del calendario.');
      setIsLoadingCalendar(false);
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
  const handleDaySelect = (selectedDate: string) => {
    const dayAvailability = availability.find(day => day.date === selectedDate);
    
    if (!dayAvailability?.available) {
      setError('Questo giorno non è disponibile per appuntamenti.');
      return;
    }
    
    // Navigate to time slots page
    navigate(`/book/${slug}/slots/${selectedDate}`);
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

  return (
    <div className="container">
      {/* Header */}
      <BookingHeader 
        bookingLink={bookingLink}
        title="Prenotazione Appuntamenti"
        subtitle="Seleziona un giorno per visualizzare gli orari disponibili"
        showProgress={true}
        currentStep={1}
      />

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={null} 
        />

        {/* Calendar Section */}
        <div className="calendar-section">
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

        {/* Info Section */}
        <div className="info-section">
          <h3>Come prenotare</h3>
          <ol>
            <li><strong>Seleziona un giorno</strong> disponibile dal calendario</li>
            <li><strong>Scegli l'orario</strong> che preferisci tra quelli liberi</li>
            <li><strong>Compila il form</strong> e carica il curriculum</li>
          </ol>
          
          <div className="contact-info">
            <p><strong>Hai domande?</strong> Non esitare a contattarci per assistenza!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendarPage;