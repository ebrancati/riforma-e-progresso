import React from 'react';
import type { DayKey, TimeSlot } from '../types/schedule';

interface DayScheduleCardProps {
  day: DayKey;
  dayName: string;
  daySlots: TimeSlot[];
  timeOptions: string[];
  isLoading: boolean;
  isServerAvailable: boolean;
  onAddTimeSlot: (day: DayKey) => void;
  onCopyDay: (day: DayKey) => void;
  onRemoveTimeSlot: (day: DayKey, slotId: string) => void;
  onUpdateTimeSlot: (day: DayKey, slotId: string, field: 'startTime' | 'endTime', value: string) => void;
}

const DayScheduleCard: React.FC<DayScheduleCardProps> = ({
  day,
  dayName,
  daySlots,
  timeOptions,
  isLoading,
  isServerAvailable,
  onAddTimeSlot,
  onCopyDay,
  onRemoveTimeSlot,
  onUpdateTimeSlot
}) => {
  return (
    <div className="day-card">
      <div className="day-header">
        <div className="day-name">{dayName}</div>
        <div className="day-actions">
          <button
            className="btn-icon copy"
            onClick={() => onCopyDay(day)}
            title="Copia"
            disabled={isLoading || !isServerAvailable}
          >
            📋
          </button>
          <button
            className="btn-icon"
            onClick={() => onAddTimeSlot(day)}
            title="Aggiungi"
            disabled={isLoading || !isServerAvailable}
          >
            +
          </button>
        </div>
      </div>
      <div className="time-slots">
        {daySlots.length === 0 ? (
          <div className="no-slots">Nessun orario inserito</div>
        ) : (
          daySlots.map((slot) => (
            <div key={slot.id} className="time-slot">
              <select
                className="time-input start-time"
                value={slot.startTime}
                onChange={(e) => onUpdateTimeSlot(day, slot.id, 'startTime', e.target.value)}
                disabled={isLoading || !isServerAvailable}
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <span className="time-separator">-</span>
              <select
                className="time-input end-time"
                value={slot.endTime}
                onChange={(e) => onUpdateTimeSlot(day, slot.id, 'endTime', e.target.value)}
                disabled={isLoading || !isServerAvailable}
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <button
                className="btn-delete"
                onClick={() => onRemoveTimeSlot(day, slot.id)}
                disabled={isLoading || !isServerAvailable}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DayScheduleCard;