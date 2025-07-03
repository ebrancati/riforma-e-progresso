import React from 'react';
import type { BookingLinkInfo } from '../../../types/booking';

interface BookingHeaderProps {
  bookingLink: BookingLinkInfo | null;
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
  currentStep?: 1 | 2 | 3;
}

const BookingHeader: React.FC<BookingHeaderProps> = ({
  bookingLink,
  title,
  subtitle,
  showProgress = false,
  currentStep = 1
}) => {
  const getStepInfo = (step: number) => {
    const steps = [
      { number: 1, title: 'Seleziona Data', icon: '📅' },
      { number: 2, title: 'Scegli Orario', icon: '⏰' },
      { number: 3, title: 'Compila Dati', icon: '📝' }
    ];
    
    return steps[step - 1];
  };

  return (
    <div className="booking-header">
      <div className="booking-header-content">
        <h1 className="booking-title">
          {title || `Prenotazione ${bookingLink?.name || 'Colloquio'}`}
        </h1>
        
        {subtitle && (
          <p className="booking-subtitle">{subtitle}</p>
        )}
        
        {bookingLink && (
          <div className="booking-info">
            <div className="booking-info-item">
              <span className="info-icon">⏱️</span>
              <span className="info-text">Durata: {bookingLink.duration} minuti</span>
            </div>
            
            {bookingLink.requireAdvanceBooking && (
              <div className="booking-info-item">
                <span className="info-icon">📅</span>
                <span className="info-text">
                  Preavviso richiesto: {bookingLink.advanceHours} ore
                </span>
              </div>
            )}
          </div>
        )}
        
        {showProgress && (
          <div className="booking-progress">
            <div className="progress-steps">
              {[1, 2, 3].map((step) => {
                const stepInfo = getStepInfo(step);
                const isActive = step === currentStep;
                const isCompleted = step < currentStep;
                
                return (
                  <div 
                    key={step}
                    className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="step-circle">
                      {isCompleted ? '✓' : stepInfo.icon}
                    </div>
                    <span className="step-title">{stepInfo.title}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingHeader;