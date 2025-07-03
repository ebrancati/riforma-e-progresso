import React from 'react';
import type { TimeSlot } from '../../../types/booking';
import { formatDateForDisplay } from '../../../utils/booking/dateHelpers';

interface TimeSlotListProps {
  selectedDate: string;
  timeSlots: TimeSlot[];
  onTimeSlotSelect: (timeSlot: TimeSlot) => void;
  onBackToCalendar: () => void;
  isLoading?: boolean;
}

const TimeSlotList: React.FC<TimeSlotListProps> = ({
  selectedDate,
  timeSlots,
  onTimeSlotSelect,
  onBackToCalendar,
  isLoading = false
}) => {
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const displayDate = formatDateForDisplay(selectedDateObj);
  
  const availableSlots = timeSlots.filter(slot => slot.available);
  const bookedSlots = timeSlots.filter(slot => !slot.available);
  
  const handleSlotClick = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    onTimeSlotSelect(timeSlot);
  };
  
  const formatTimeRange = (slot: TimeSlot): string => {
    return `${slot.startTime} - ${slot.endTime}`;
  };

  return (
    <div className={`time-slots-container ${isLoading ? 'loading' : ''}`}>
      {/* Header */}
      <div className="time-slots-header">
        <h2 className="selected-date-title">{displayDate}</h2>
        <p className="time-slots-subtitle">
          Clicca sull'orario che preferisci
        </p>
      </div>
      
      {/* Back Button */}
      <div className="time-slots-navigation">
        <button 
          className="back-button"
          onClick={onBackToCalendar}
          disabled={isLoading}
        >
          ← Torna al calendario
        </button>
      </div>
      
      {/* Time Slots List */}
      <div className="time-slots-list">
        {isLoading ? (
          <div className="time-slots-loading">
            <div className="loading-spinner">⏳</div>
            <p>Caricamento orari disponibili...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="no-slots-available">
            <div className="no-slots-icon">😞</div>
            <h3>Nessun orario disponibile</h3>
            <p>
              Non ci sono orari liberi per questo giorno.<br />
              Prova a selezionare un altro giorno dal calendario.
            </p>
            <button 
              className="btn btn-primary"
              onClick={onBackToCalendar}
            >
              Scegli un altro giorno
            </button>
          </div>
        ) : (
          <>
            {/* Available Slots */}
            <div className="available-slots-section">
              <h3 className="slots-section-title">
                Orari disponibili ({availableSlots.length})
              </h3>
              
              <div className="slots-grid">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    className="time-slot-button available"
                    onClick={() => handleSlotClick(slot)}
                    disabled={isLoading}
                  >
                    <span className="time-slot-time">
                      {formatTimeRange(slot)}
                    </span>
                    <span className="time-slot-status">
                      Libero
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Booked Slots (optional display) */}
            {bookedSlots.length > 0 && (
              <div className="booked-slots-section">
                <h3 className="slots-section-title">
                  Orari già prenotati ({bookedSlots.length})
                </h3>
                
                <div className="slots-grid">
                  {bookedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="time-slot-button booked"
                    >
                      <span className="time-slot-time">
                        {formatTimeRange(slot)}
                      </span>
                      <span className="time-slot-status">
                        Occupato
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Info Section */}
      {availableSlots.length > 0 && (
        <div className="time-slots-info">
          <div className="info-card">
            <h4>💡 Suggerimento</h4>
            <p>
              Dopo aver selezionato l'orario, potrai compilare i tuoi dati 
              e caricare il curriculum per completare la prenotazione.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotList;