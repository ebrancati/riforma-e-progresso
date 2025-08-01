import React from 'react';
import { Link } from 'react-router-dom';
import type { DayAvailability } from '../../../types/booking';
import { 
  generateCalendarDates, 
  formatDateToString, 
  isToday, 
  isPastDate,
  getMonthName,
  getDayAbbreviations 
} from '../../../utils/booking/dateHelpers';
import { Loader2, ArrowLeft, ArrowRight, MoveLeft } from "lucide-react"

interface CalendarGridProps {
  year: number;
  month: number;
  availability: DayAvailability[];
  onDayClick: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
  showBackButton?: boolean;
  backButtonUrl?: string;
  backButtonText?: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  availability,
  onDayClick,
  onPreviousMonth,
  onNextMonth,
  isLoading = false,
  showBackButton = false,
  backButtonUrl = '/colloqui',
  backButtonText = 'Torna alle Opportunità'
}) => {
  const calendarDates = generateCalendarDates(year, month);
  const dayAbbreviations = getDayAbbreviations();
  const monthName = getMonthName(month);
  
  const getDayAvailability = (date: Date): DayAvailability | null => {
    const dateString = formatDateToString(date);
    const backendAvailability = availability.find(day => day.date === dateString);

    if (!backendAvailability) return null;

    if (isPastDate(date)) {
      return {
        ...backendAvailability,
        available: false,           // Force unavailable for past dates
        availableSlots: 0          // No slots available for past dates
      };
    }
    
    // For current and future dates, trust the backend data
    return backendAvailability;
  };
  
  const getDayClassName = (date: Date): string => {
    const dayAvailability = getDayAvailability(date);
    const isCurrentMonth = date.getMonth() === month;
    const today = isToday(date);
    const past = isPastDate(date);
    
    let className = 'calendar-day';
    
    if (!isCurrentMonth)                 className += ' other-month';
    else if (past)                       className += ' past-day';
    else if (dayAvailability?.available) className += ' available-day';
    else                                 className += ' unavailable-day';
    
    if (today) className += ' today';
    
    return className;
  };
  
  const handleDayClick = (date: Date) => {
    const dayAvailability = getDayAvailability(date);
    const isCurrentMonth = date.getMonth() === month;
    
    if (!isCurrentMonth || isPastDate(date) || !dayAvailability?.available)
      return;
    
    onDayClick(formatDateToString(date));
  };
  
  const canGoToPrevious = () => {
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
  };

  return (
    <div className="calendar-wrapper">
      {/* Back button */}
      {showBackButton && (
        <div className="calendar-back-navigation">
          <Link to={backButtonUrl} className="back-button">
            <MoveLeft size={20} />
            {backButtonText}
          </Link>
        </div>
      )}
    
      <div className={`calendar-container ${isLoading ? 'loading' : ''}`}>
        {/* Calendar Header */}
        <div className="calendar-header">
          <button 
            className="calendar-nav-btn"
            onClick={onPreviousMonth}
            disabled={!canGoToPrevious() || isLoading}
            aria-label="Mese precedente"
          >
            <ArrowLeft size={20} />
          </button>
          
          <h2 className="calendar-month-year">
            {monthName} {year}
          </h2>
          
          <button 
            className="calendar-nav-btn"
            onClick={onNextMonth}
            disabled={isLoading}
            aria-label="Mese successivo"
          >
            <ArrowRight size={20} />
          </button>
        </div>
        
        {/* Day Headers */}
        <div className="calendar-day-headers">
          {dayAbbreviations.map((day, index) => (
            <div key={index} className="calendar-day-header">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="calendar-grid">
          {calendarDates.map((date, index) => {
            const dayAvailability = getDayAvailability(date);
            const isCurrentMonth = date.getMonth() === month;
            
            return (
              <div
                key={index}
                className={getDayClassName(date)}
                onClick={() => handleDayClick(date)}
                role={isCurrentMonth && !isPastDate(date) ? "button" : undefined}
                tabIndex={isCurrentMonth && !isPastDate(date) ? 0 : -1}
                aria-label={
                  isCurrentMonth 
                    ? `${date.getDate()} ${monthName} ${year}${dayAvailability?.available ? ' - Disponibile' : ' - Non disponibile'}`
                    : undefined
                }
              >
                <span className="calendar-day-number">
                  {date.getDate()}
                </span>
                
                {isCurrentMonth && dayAvailability && (
                  <div className="calendar-day-indicator">
                    {dayAvailability.available ? (
                      <span className="availability-indicator available">
                        {dayAvailability.availableSlots > 0 && (
                          <span className="slots-count">{dayAvailability.availableSlots}</span>
                        )}
                      </span>
                    ) : (
                      <span className="availability-indicator unavailable">✕</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="calendar-loading-overlay">
            <Loader2 size={20} className="loading-spinner" />
            <p>Caricamento disponibilità...</p>
          </div>
        )}
        
        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-indicator unavailable"></span>
            <span className="legend-text">Non disponibile</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator available"></span>
            <span className="legend-text">Disponibile</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;