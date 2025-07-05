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
    if (!newBlackoutDate.trim()) {
      setBlackoutError('Seleziona una data');
      return;
    }

    const result = onAddBlackoutDay(newBlackoutDate);
    if (result.success) {
      setNewBlackoutDate('');
      setBlackoutError(null);
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
            🔧 Abilita Impostazioni Avanzate
          </span>
        </label>
        <div className="advanced-toggle-help">
          Giorni esclusi e data scadenza prenotazioni
        </div>
      </div>

      {/* Advanced Settings Content */}
      {advancedSettings.enableAdvanced && (
        <div className="advanced-settings-content">
          
          {/* Blackout Days Section */}
          <div className="advanced-section">
            <h4 className="advanced-section-title">
              🚫 Giorni Esclusi
            </h4>
            <p className="advanced-section-description">
              Giorni in cui non saranno mai disponibili appuntamenti (festività, chiusure, ecc.)
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
                  Aggiungi
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
                  Giorni esclusi ({advancedSettings.blackoutDays.length})
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
                        title="Rimuovi giorno escluso"
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
                <span className="empty-state-text">Nessun giorno escluso</span>
              </div>
            )}
          </div>

          {/* Cutoff Date Section */}
          <div className="advanced-section">
            <h4 className="advanced-section-title">
              ⏰ Data Scadenza Prenotazioni
            </h4>
            <p className="advanced-section-description">
              Dopo questa data, non sarà più possibile effettuare nuove prenotazioni
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
                    title="Rimuovi data scadenza"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
              
              {advancedSettings.bookingCutoffDate && (
                <div className="cutoff-date-preview">
                  <span className="cutoff-preview-icon">ℹ️</span>
                  <span className="cutoff-preview-text">
                    Le prenotazioni saranno disabilitate dopo il{' '}
                    <strong>{formatDateForDisplay(advancedSettings.bookingCutoffDate)}</strong>
                  </span>
                </div>
              )}
              
              {!advancedSettings.bookingCutoffDate && (
                <div className="cutoff-empty-state">
                  <span className="empty-state-icon">♾️</span>
                  <span className="empty-state-text">Nessuna scadenza impostata</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings Info */}
          <div className="advanced-info">
            <div className="advanced-info-item">
              <strong>💡 Nota:</strong> Le prenotazioni esistenti rimangono valide anche se aggiungete giorni esclusi o date di scadenza.
            </div>
            <div className="advanced-info-item">
              <strong>🔗 Applicazione:</strong> Queste impostazioni si applicano automaticamente a tutti i link di prenotazione che usano questo template.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSettingsSection;