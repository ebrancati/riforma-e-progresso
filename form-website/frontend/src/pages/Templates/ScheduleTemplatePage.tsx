import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useTemplates } from './hooks/useTemplates';
import { useScheduleForm } from './hooks/useScheduleForm';
import NotificationMessages from '../../components/NotificationMessages';
import DayScheduleCard from './components/DayScheduleCard';
import TemplateCard from './components/TemplateCard';
import EditModal from './components/EditModal';
import type { DayKey, DaySchedule, TimeSlot } from '../../types/schedule';
import '../../styles/ScheduleTemplatePage.css';

const ScheduleTemplatePage: React.FC = () => {
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showEditingReminder, setShowEditingReminder] = useState(true);
  
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

  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

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
      setValidationError(`⚠️ ${result.error}`);
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
    if (!result.success) setValidationError(`⚠️ ${result.error}`);
  };

  // Save or update template
  const saveTemplate = async () => {
    if (!isServerAvailable) {
      setValidationError('Server non disponibile. Impossibile salvare il template.');
      return;
    }

    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setValidationError('Inserisci un nome per il template');
      return;
    }

    if (trimmedName.length > 100) {
      setValidationError(`⚠️ Il nome è troppo lungo (massimo 100 caratteri)`);
      return;
    }

    // Check for duplicate names
    if (!editingTemplateId || templates.find(t => t.id === editingTemplateId)?.name !== trimmedName) {
      const existingTemplate = templates.find(t => 
        t.name.toLowerCase() === trimmedName.toLowerCase() && t.id !== editingTemplateId
      );
      if (existingTemplate) {
        setValidationError('Esiste già un template con questo nome. Scegli un nome diverso.');
        return;
      }
    }

    const hasAnySlots = (Object.values(schedule) as TimeSlot[][]).some(daySlots => daySlots.length > 0);
    if (!hasAnySlots) {
      setValidationError('Aggiungi almeno un orario prima di salvare il template.');
      return;
    }

    try {
      const templateData = { name: trimmedName, schedule };
      
    if (editingTemplateId) {
      await updateTemplate(editingTemplateId, templateData);
      setShowEditingReminder(false);
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
        setShowEditingReminder(true);
      }
      setShowEditConfirm(null);
    }
  };

  const handleEditOriginal = () => {
    if (showEditConfirm) {
      const template = templates.find(t => t.id === showEditConfirm);
      if (template) {
        loadTemplate(template, true);
        setShowEditingReminder(true);
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
    setShowEditingReminder(true);
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
        <div className="server-status">
          <span className={`server-status-indicator ${isServerAvailable ? 'online' : 'offline'}`}></span>
          {isServerAvailable ? 'Server Connesso' : 'Server Non Disponibile'}
          {!isServerAvailable && (
            <button 
              onClick={retryConnection}
              className="retry-button"
              disabled={isLoading}
            >
              Riprova
            </button>
          )}
        </div>
      </div>

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error || validationError} 
          successMessage={successMessage} 
        />

        {/* Editing Reminder Overlay */}
        {editingTemplateId && showEditingReminder && (
          <div className="editing-reminder-overlay">
            ℹ️ Ricorda di premere "Aggiorna Template" per salvare le modifiche
            <button 
              onClick={() => setShowEditingReminder(false)} 
              className="dismiss-reminder"
              title="Nascondi promemoria"
            >
              ✕
            </button>
          </div>
        )}

        {/* Edit Modal */}
        <EditModal
          isOpen={!!showEditConfirm}
          onCreateCopy={handleCreateCopy}
          onEditOriginal={handleEditOriginal}
          onCancel={handleCancelEdit}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <div>Caricamento in corso...</div>
          </div>
        )}

        {/* Create Template Section */}
        <div className="create-section">

          {/* Editing Indicator */}
          {editingTemplateId && (
            <div className="editing-indicator">
              🔧 Stai modificando un template esistente
              <button onClick={() => { clearForm(); setShowEditingReminder(true); }} className="cancel-edit-button">
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

export default ScheduleTemplatePage;