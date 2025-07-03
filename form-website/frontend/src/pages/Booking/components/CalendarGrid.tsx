// src/components/Booking/CalendarGrid.tsx
import React from 'react';
import type { DayAvailability } from '../../../types/booking';
import { 
  generateCalendarDates, 
  formatDateToString, 
  isToday, 
  isPastDate,
  getMonthName,
  getDayAbbreviations 
} from '../../../utils/booking/dateHelpers';

interface CalendarGridProps {
  year: number;
  month: number;
  availability: DayAvailability[];
  onDayClick: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  year,
  month,
  availability,
  onDayClick,
  onPreviousMonth,
  onNextMonth,
  isLoading = false
}) => {
  const calendarDates = generateCalendarDates(year, month);
  const dayAbbreviations = getDayAbbreviations();
  const monthName = getMonthName(month);
  
  const getDayAvailability = (date: Date): DayAvailability | null => {
    const dateString = formatDateToString(date);
    return availability.find(day => day.date === dateString) || null;
  };
  
  const getDayClassName = (date: Date): string => {
    const dayAvailability = getDayAvailability(date);
    const isCurrentMonth = date.getMonth() === month;
    const today = isToday(date);
    const past = isPastDate(date);
    
    let className = 'calendar-day';
    
    if (!isCurrentMonth) {
      className += ' other-month';
    } else if (past) {
      className += ' past-day';
    } else if (dayAvailability?.available) {
      className += ' available-day';
    } else {
      className += ' unavailable-day';
    }
    
    if (today) {
      className += ' today';
    }
    
    return className;
  };
  
  const handleDayClick = (date: Date) => {
    const dayAvailability = getDayAvailability(date);
    const isCurrentMonth = date.getMonth() === month;
    
    if (!isCurrentMonth || isPastDate(date) || !dayAvailability?.available) {
      return;
    }
    
    onDayClick(formatDateToString(date));
  };
  
  const canGoToPrevious = () => {
    const now = new Date();
    return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
  };

  return (
    <div className={`calendar-container ${isLoading ? 'loading' : ''}`}>
      {/* Calendar Header */}
      <div className="calendar-header">
        <button 
          className="calendar-nav-btn"
          onClick={onPreviousMonth}
          disabled={!canGoToPrevious() || isLoading}
          aria-label="Mese precedente"
        >
          ←
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
          →
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
          <div className="loading-spinner">⏳</div>
          <p>Caricamento disponibilità...</p>
        </div>
      )}
      
      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-indicator available"></span>
          <span className="legend-text">Disponibile</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator unavailable"></span>
          <span className="legend-text">Non disponibile</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator today"></span>
          <span className="legend-text">Oggi</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;