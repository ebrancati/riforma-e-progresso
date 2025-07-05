import React, { useState } from 'react';
import type { AdvancedTemplateSettings } from '../../../types/schedule';

interface AdvancedSettingsSectionProps {
  advancedSettings: AdvancedTemplateSettings;
  onUpdateSettings: (settings: Partial<AdvancedTemplateSettings>) => void;
  onAddBlackoutDay: (date: string) => { success: boolean; error?: string };
  onRemoveBlackoutDay: (date: string) => void;
  isLoading: boolean;
  isServerAvailable: boolean;
}

const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  advancedSettings,
  onUpdateSettings,
  onAddBlackoutDay,
  onRemoveBlackoutDay,
  isLoading,
  isServerAvailable
}) => {
  const [newBlackoutDate, setNewBlackoutDate] = useState('');
  const [blackoutError, setBlackoutError] = useState<string | null>(null);

  // Handle enabling/disabling advanced settings
  const handleToggleAdvanced = (enabled: boolean) => {
    onUpdateSettings({ enableAdvanced: enabled });
    
    // Clear settings when disabling
    if (!enabled) {
      onUpdateSettings({
        blackoutDays: [],
        bookingCutoffDate: null
      });
    }
  };

  // Handle adding blackout day
  const handleAddBlackoutDay = () => {
    // Clear any previous error first
    setBlackoutError(null);
    
    if (!newBlackoutDate.trim()) {
      setBlackoutError('Seleziona una data');
      return;
    }

    // Basic validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newBlackoutDate)) {
      setBlackoutError('Formato data non valido. Usa YYYY-MM-DD');
      return;
    }

    // Check if date already exists
    if (advancedSettings.blackoutDays.includes(newBlackoutDate)) {
      setBlackoutError('Questo giorno è già nella lista');
      return;
    }

    // Simple date validity check
    const testDate = new Date(newBlackoutDate + 'T12:00:00');
    if (isNaN(testDate.getTime())) {
      setBlackoutError('Data non valida');
      return;
    }

    // Call the parent function
    const result = onAddBlackoutDay(newBlackoutDate);
    
    if (result.success) {
      setNewBlackoutDate('');
      setBlackoutError(null);
      console.log('Blackout day added successfully:', newBlackoutDate); // Debug log
    } else {
      setBlackoutError(result.error || 'Errore durante l\'aggiunta');
    }
  };

  // Handle cutoff date change
  const handleCutoffDateChange = (date: string) => {
    onUpdateSettings({ 
      bookingCutoffDate: date || null 
    });
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get today's date in YYYY-MM-DD format for input min
  const getTodayString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="advanced-settings-section">
      {/* Toggle Checkbox */}
      <div className="advanced-toggle">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={advancedSettings.enableAdvanced}
            onChange={(e) => handleToggleAdvanced(e.target.checked)}
            disabled={isLoading || !isServerAvailable}
          />
          <span className="checkbox-text">
            🔧 Enable Advanced Settings
          </span>
        </label>
        <div className="advanced-toggle-help">
          Blackout days and booking cutoff date
        </div>
      </div>

      {/* Advanced Settings Content */}
      {advancedSettings.enableAdvanced && (
        <div className="advanced-settings-content">
          
          {/* Blackout Days Section */}
          <div className="advanced-section">
            <h4 className="advanced-section-title">
              🚫 Blackout Days
            </h4>
            <p className="advanced-section-description">
              Days when appointments will never be available (holidays, closures, etc.)
            </p>
            
            {/* Add Blackout Day */}
            <div className="blackout-add-section">
              <div className="blackout-add-controls">
                <input
                  type="date"
                  className="form-input blackout-date-input"
                  value={newBlackoutDate}
                  onChange={(e) => setNewBlackoutDate(e.target.value)}
                  min={getTodayString()}
                  disabled={isLoading || !isServerAvailable}
                />
                <button
                  type="button"
                  className="btn btn-secondary blackout-add-btn"
                  onClick={handleAddBlackoutDay}
                  disabled={isLoading || !isServerAvailable || !newBlackoutDate}
                >
                  Add
                </button>
              </div>
              
              {blackoutError && (
                <div className="blackout-error">
                  ⚠️ {blackoutError}
                </div>
              )}
            </div>

            {/* Blackout Days List */}
            {advancedSettings.blackoutDays.length > 0 && (
              <div className="blackout-days-list">
                <h5 className="blackout-list-title">
                  Blackout Days ({advancedSettings.blackoutDays.length})
                </h5>
                <div className="blackout-days-grid">
                  {advancedSettings.blackoutDays.map((date) => (
                    <div key={date} className="blackout-day-item">
                      <div className="blackout-day-date">
                        <span className="blackout-day-formatted">
                          {formatDateForDisplay(date)}
                        </span>
                        <span className="blackout-day-raw">
                          {date}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-icon delete blackout-remove-btn"
                        onClick={() => onRemoveBlackoutDay(date)}
                        disabled={isLoading || !isServerAvailable}
                        title="Remove blackout day"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {advancedSettings.blackoutDays.length === 0 && (
              <div className="blackout-empty-state">
                <span className="empty-state-icon">📅</span>
                <span className="empty-state-text">No blackout days</span>
              </div>
            )}
          </div>

          {/* Cutoff Date Section */}
          <div className="advanced-section">
            <h4 className="advanced-section-title">
              ⏰ Booking Cutoff Date
            </h4>
            <p className="advanced-section-description">
              After this date, no new bookings will be possible
            </p>
            
            <div className="cutoff-date-section">
              <div className="cutoff-date-controls">
                <input
                  type="date"
                  className="form-input cutoff-date-input"
                  value={advancedSettings.bookingCutoffDate || ''}
                  onChange={(e) => handleCutoffDateChange(e.target.value)}
                  min={getTodayString()}
                  disabled={isLoading || !isServerAvailable}
                />
                
                {advancedSettings.bookingCutoffDate && (
                  <button
                    type="button"
                    className="btn btn-secondary cutoff-clear-btn"
                    onClick={() => handleCutoffDateChange('')}
                    disabled={isLoading || !isServerAvailable}
                    title="Remove cutoff date"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {advancedSettings.bookingCutoffDate && (
                <div className="cutoff-date-preview">
                  <span className="cutoff-preview-icon">ℹ️</span>
                  <span className="cutoff-preview-text">
                    Bookings will be disabled after{' '}
                    <strong>{formatDateForDisplay(advancedSettings.bookingCutoffDate)}</strong>
                  </span>
                </div>
              )}
              
              {!advancedSettings.bookingCutoffDate && (
                <div className="cutoff-empty-state">
                  <span className="empty-state-icon">♾️</span>
                  <span className="empty-state-text">No cutoff date set</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Info */}
          <div className="advanced-info">
            <div className="advanced-info-item">
              <strong>💡 Note:</strong> Existing bookings remain valid even if you add blackout days or cutoff dates.
            </div>
            <div className="advanced-info-item">
              <strong>🔗 Application:</strong> These settings automatically apply to all booking links using this template.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSettingsSection;