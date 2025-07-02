import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useTemplates } from '../hooks/useTemplates';
import { useScheduleForm } from '../hooks/useScheduleForm';
import NotificationMessages from './NotificationMessages';
import DayScheduleCard from './DayScheduleCard';
import TemplateCard from './TemplateCard';
import EditModal from './EditModal';
import type { DayKey, DaySchedule } from '../types/schedule';
import './ScheduleTemplateManager.css';

// Add CSS for animations
const additionalStyles = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = additionalStyles;
  document.head.appendChild(styleSheet);
}

const ScheduleTemplateManager: React.FC = () => {
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState<string | null>(null);
  
  // Custom hooks
  const {
    templates,
    isLoading,
    error,
    successMessage,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplates();

  const {
    templateName,
    setTemplateName,
    schedule,
    editingTemplateId,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    copyDay,
    pasteToDay,
    clearForm,
    loadTemplate
  } = useScheduleForm();

  // Constants
  const dayNames: { [key in DayKey]: string } = {
    monday: 'Lunedì',
    tuesday: 'Martedì',
    wednesday: 'Mercoledì',
    thursday: 'Giovedì',
    friday: 'Venerdì',
    saturday: 'Sabato',
    sunday: 'Domenica'
  };

  const dayAbbreviations: { [key in DayKey]: string } = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mer',
    thursday: 'Gio',
    friday: 'Ven',
    saturday: 'Sab',
    sunday: 'Dom'
  };

  // Generate time options
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await apiService.checkHealth();
      setIsServerAvailable(true);
      await loadTemplates();
    } catch (error) {
      console.error('Server initialization failed:', error);
      setIsServerAvailable(false);
    }
  };

  // Handle day copy with user interaction
  const handleCopyDay = (day: DayKey) => {
    const result = copyDay(day);
    if (!result.success) {
      // Handle error through notification system
      return;
    }

    setTimeout(() => {
      const targetDay = prompt(`Orari copiati! Inserisci il giorno dove incollare (es: tuesday, wednesday, etc.)\n\nGiorni disponibili: monday, tuesday, wednesday, thursday, friday, saturday, sunday`);
      if (targetDay && targetDay !== day && Object.keys(dayNames).includes(targetDay)) {
        pasteToDay(targetDay as DayKey);
      }
    }, 500);
  };

  // Handle time slot update with error handling
  const handleUpdateTimeSlot = (day: DayKey, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const result = updateTimeSlot(day, slotId, field, value);
    if (!result.success) {
      // Handle error through notification system
    }
  };

  // Save or update template
  const saveTemplate = async () => {
    if (!isServerAvailable) return;

    const trimmedName = templateName.trim();
    if (!trimmedName) return;

    // Check for duplicate names
    if (!editingTemplateId || templates.find(t => t.id === editingTemplateId)?.name !== trimmedName) {
      const existingTemplate = templates.find(t => 
        t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingTemplateId
      );
      if (existingTemplate) return;
    }

    const hasAnySlots = Object.values(schedule).some(daySlots => daySlots.length > 0);
    if (!hasAnySlots) return;

    try {
      const templateData = { name: trimmedName, schedule };
      
      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, templateData);
      } else {
        await createTemplate(templateData);
      }

      clearForm();
    } catch (error) { // Error handled by hook
      console.error(error)
    }
  };

  // Generate template summary
  const generateTemplateSummary = (templateSchedule: DaySchedule): string => {
    const activeDays: string[] = [];
    Object.keys(templateSchedule).forEach(day => {
      if (templateSchedule[day].length > 0) {
        activeDays.push(dayAbbreviations[day as DayKey]);
      }
    });

    return activeDays.length > 0 
      ? `Giorni attivi: ${activeDays.join(', ')}`
      : 'Nessun orario configurato';
  };

  // Modal handlers
  const handleEditTemplate = (templateId: string) => {
    setShowEditConfirm(templateId);
  };

  const handleCreateCopy = () => {
    if (showEditConfirm) {
      const template = templates.find(t => t.id === showEditConfirm);
      if (template) {
        loadTemplate(template, false);
      }
      setShowEditConfirm(null);
    }
  };

  const handleEditOriginal = () => {
    if (showEditConfirm) {
      const template = templates.find(t => t.id === showEditConfirm);
      if (template) {
        loadTemplate(template, true);
      }
      setShowEditConfirm(null);
    }
  };

  const handleCancelEdit = () => {
    setShowEditConfirm(null);
  };

  // Reset form with confirmation
  const resetForm = () => {
    if (!window.confirm('Sei sicuro di voler resettare tutto il form?')) return;
    clearForm();
  };

  // Retry connection
  const retryConnection = () => {
    initializeApp();
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Gestione Template Orari</h1>
        <p>Crea e gestisci i tuoi template di disponibilità settimanali</p>
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          <span style={{ 
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isServerAvailable ? '#48bb78' : '#e53e3e',
            marginRight: '8px'
          }}></span>
          {isServerAvailable ? 'Server Connesso' : 'Server Non Disponibile'}
          {!isServerAvailable && (
            <button 
              onClick={retryConnection}
              style={{ 
                marginLeft: '10px', 
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={isLoading}
            >
              Riprova
            </button>
          )}
        </div>
      </div>

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages error={error} successMessage={successMessage} />

        {/* Edit Modal */}
        <EditModal
          isOpen={!!showEditConfirm}
          onCreateCopy={handleCreateCopy}
          onEditOriginal={handleEditOriginal}
          onCancel={handleCancelEdit}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            backgroundColor: '#f0f2f5',
            margin: '20px 0',
            borderRadius: '8px'
          }}>
            <div>⏳ Caricamento in corso...</div>
          </div>
        )}

        {/* Create Template Section */}
        <div className="create-section">
          {/* Editing Indicator */}
          {editingTemplateId && (
            <div style={{
              backgroundColor: '#e8f4fd',
              color: '#1a365d',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #bee3f8',
              textAlign: 'center'
            }}>
              🔧 Stai modificando un template esistente
              <button
                onClick={clearForm}
                style={{
                  marginLeft: '15px',
                  padding: '5px 10px',
                  backgroundColor: '#4299e1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Annulla Modifica
              </button>
            </div>
          )}

          {/* Template Name Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="templateName">Nome Template</label>
            <input
              type="text"
              id="templateName"
              className="form-input"
              placeholder="es. Orari Ufficio, Solo Mattina, Weekend..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
              disabled={isLoading || !isServerAvailable}
            />
          </div>

          {/* Schedule Grid */}
          <div className="schedule-grid">
            {Object.keys(dayNames).map((day) => {
              const dayKey = day as DayKey;
              const daySlots = schedule[dayKey];
              
              return (
                <DayScheduleCard
                  key={day}
                  day={dayKey}
                  dayName={dayNames[dayKey]}
                  daySlots={daySlots}
                  timeOptions={timeOptions}
                  isLoading={isLoading}
                  isServerAvailable={isServerAvailable}
                  onAddTimeSlot={addTimeSlot}
                  onCopyDay={handleCopyDay}
                  onRemoveTimeSlot={removeTimeSlot}
                  onUpdateTimeSlot={handleUpdateTimeSlot}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn btn-secondary" 
              onClick={resetForm}
              disabled={isLoading || !isServerAvailable}
            >
              Reset
            </button>
            <button 
              className="btn btn-primary" 
              onClick={saveTemplate}
              disabled={isLoading || !isServerAvailable}
            >
              {isLoading 
                ? (editingTemplateId ? 'Aggiornamento...' : 'Salvataggio...') 
                : (editingTemplateId ? 'Aggiorna Template' : 'Salva Template')
              }
            </button>
          </div>
        </div>

        {/* Saved Templates Section */}
        <div className="templates-section">
          <h2>Template Salvati</h2>
          <div className="templates-grid">
            {templates.length === 0 ? (
              <div className="empty-state">
                <h3>Nessun template salvato</h3>
                <p>
                  {isServerAvailable 
                    ? 'Crea il tuo primo template di orari utilizzando il form sopra'
                    : 'Connetti il server per visualizzare e gestire i template'
                  }
                </p>
              </div>
            ) : (
              templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isLoading={isLoading}
                  isServerAvailable={isServerAvailable}
                  onEdit={handleEditTemplate}
                  onDelete={deleteTemplate}
                  generateSummary={generateTemplateSummary}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTemplateManager;