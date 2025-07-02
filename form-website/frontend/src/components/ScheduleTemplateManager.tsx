import React, { useState, useEffect } from 'react';
import './ScheduleTemplateManager.css';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  [key: string]: TimeSlot[];
}

interface Template {
  id: number;
  name: string;
  schedule: DaySchedule;
  created: string;
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const ScheduleTemplateManager: React.FC = () => {
  const [templateName, setTemplateName] = useState('');
  const [schedule, setSchedule] = useState<DaySchedule>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [copiedDaySlots, setCopiedDaySlots] = useState<TimeSlot[] | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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

  // Generate time options (every 30 minutes)
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

  // Convert hours to minutes for comparisons
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to hours
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Sort slots by start time
  const sortTimeSlots = (slots: TimeSlot[]): TimeSlot[] => {
    return [...slots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  };

  // Load template from localStorage on startup
  useEffect(() => {
    loadTemplates();
  }, []);

  const timeOptions = generateTimeOptions();

  // Add time slot to a day
  const addTimeSlot = (day: DayKey) => {
    // Find the first free slot
    const existingSlots = schedule[day];
    let startTime = '09:00';
    let endTime = '10:00';
    
    // If there are already slots, find the next available time
    if (existingSlots.length > 0) {
      const sortedSlots = sortTimeSlots(existingSlots);
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      startTime = lastSlot.endTime;
      
      // Calculate end time (1 hour later)
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + 60;
      
      // If it goes beyond 24:00, use the last slot + 30 minutes
      if (endMinutes >= 24 * 60) {
        const nextStart = timeToMinutes(lastSlot.endTime);
        const nextEnd = Math.min(nextStart + 30, 24 * 60 - 30);
        startTime = minutesToTime(nextStart);
        endTime = minutesToTime(nextEnd);
      } else {
        endTime = minutesToTime(endMinutes);
      }
    }

    const newSlot: TimeSlot = {
      id: `${day}-${Date.now()}`,
      startTime,
      endTime
    };

    setSchedule(prev => ({
      ...prev,
      [day]: sortTimeSlots([...prev[day], newSlot])
    }));
  };

  const removeTimeSlot = (day: DayKey, slotId: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(slot => slot.id !== slotId)
    }));
  };

  const updateTimeSlot = (day: DayKey, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const currentSlot = schedule[day].find(slot => slot.id === slotId);
    if (!currentSlot) return;

    const newStartTime = field === 'startTime' ? value : currentSlot.startTime;
    const newEndTime = field === 'endTime' ? value : currentSlot.endTime;

    // Make sure the end time is after the start time
    if (timeToMinutes(newEndTime) <= timeToMinutes(newStartTime)) {
      alert('L\'orario di fine deve essere successivo a quello di inizio.');
      return;
    }

    // Check for conflicts with other slots (excluding the current one)
    const hasConflict = schedule[day].some(slot => {
      if (slot.id === slotId) return false;
      
      const slotStartMinutes = timeToMinutes(slot.startTime);
      const slotEndMinutes = timeToMinutes(slot.endTime);
      const newStartMinutes = timeToMinutes(newStartTime);
      const newEndMinutes = timeToMinutes(newEndTime);
      
      return (newStartMinutes < slotEndMinutes && newEndMinutes > slotStartMinutes);
    });

    if (hasConflict) {
      alert('Questo orario si sovrappone con un altro slot esistente.');
      return;
    }

    setSchedule(prev => ({
      ...prev,
      [day]: sortTimeSlots(prev[day].map(slot => 
        slot.id === slotId ? { ...slot, [field]: value } : slot
      ))
    }));
  };

  const copyDay = (day: DayKey) => {
    const daySlots = schedule[day];
    
    if (daySlots.length === 0) {
      alert('Nessun orario da copiare per questo giorno');
      return;
    }

    setCopiedDaySlots([...daySlots]);
    
    setTimeout(() => {
      const targetDay = prompt(`Orari copiati! Inserisci il giorno dove incollare (es: tuesday, wednesday, etc.)\n\nGiorni disponibili: monday, tuesday, wednesday, thursday, friday, saturday, sunday`);
      if (targetDay && targetDay !== day && Object.keys(dayNames).includes(targetDay)) {
        pasteToDay(targetDay as DayKey);
      }
    }, 500);
  };

  // Paste copied schedules
  const pasteToDay = (targetDay: DayKey) => {
    if (!copiedDaySlots) {
      alert('Nessun orario copiato');
      return;
    }

    // Check if any copied slots create conflicts
    const existingSlots = schedule[targetDay];
    const hasAnyConflict = copiedDaySlots.some(copiedSlot => {
      return existingSlots.some(existingSlot => {
        const copiedStartMinutes = timeToMinutes(copiedSlot.startTime);
        const copiedEndMinutes = timeToMinutes(copiedSlot.endTime);
        const existingStartMinutes = timeToMinutes(existingSlot.startTime);
        const existingEndMinutes = timeToMinutes(existingSlot.endTime);
        
        return (copiedStartMinutes < existingEndMinutes && copiedEndMinutes > existingStartMinutes);
      });
    });

    if (hasAnyConflict) {
      alert('Alcuni degli orari copiati si sovrappongono con quelli esistenti. Operazione annullata.');
      return;
    }

    const newSlots = copiedDaySlots.map(slot => ({
      ...slot,
      id: `${targetDay}-${Date.now()}-${Math.random()}`
    }));

    setSchedule(prev => ({
      ...prev,
      [targetDay]: sortTimeSlots([...prev[targetDay], ...newSlots])
    }));
  };

  // Clears the form without confirmation (for internal use)
  const clearForm = () => {
    setTemplateName('');
    setSchedule({
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    });
  };

  // Complete form reset, with confirmation
  const resetForm = () => {
    if (!window.confirm('Sei sicuro di voler resettare tutto il form?')) return;
    
    clearForm();
  };

  const saveTemplate = () => {
    const trimmedName = templateName.trim();
    
    if (!trimmedName) {
      alert('Inserisci un nome per il template');
      return;
    }

    // Check if a template with the same name already exists
    const existingTemplate = templates.find(t => 
      t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingTemplate) {
      alert('Esiste già un template con questo nome. Scegli un nome diverso.');
      return;
    }

    // Check that there is at least one time configured
    const hasAnySlots = Object.values(schedule).some(daySlots => daySlots.length > 0);
    if (!hasAnySlots) {
      alert('Aggiungi almeno un orario prima di salvare il template.');
      return;
    }

    const template: Template = {
      id: Date.now(),
      name: trimmedName,
      schedule: { ...schedule },
      created: new Date().toLocaleDateString('it-IT')
    };

    const existingTemplates = JSON.parse(localStorage.getItem('scheduleTemplates') || '[]');
    const updatedTemplates = [...existingTemplates, template];
    localStorage.setItem('scheduleTemplates', JSON.stringify(updatedTemplates));

    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);

    // Reset form and reload template
    clearForm();
    loadTemplates();
  };

  // Load saved templates
  const loadTemplates = () => {
    const savedTemplates = JSON.parse(localStorage.getItem('scheduleTemplates') || '[]');
    setTemplates(savedTemplates);
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

  // Load template into form
  const loadTemplate = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    
    if (!template) return;

    setTemplateName(template.name + ' (copia)');
    
    // Sort each day's slots as they load
    const sortedSchedule: DaySchedule = {};
    Object.keys(template.schedule).forEach(day => {
      sortedSchedule[day] = sortTimeSlots(template.schedule[day]);
    });
    
    setSchedule(sortedSchedule);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTemplate = (templateId: number) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo template?')) return;

    const filteredTemplates = templates.filter(t => t.id !== templateId);
    localStorage.setItem('scheduleTemplates', JSON.stringify(filteredTemplates));
    
    loadTemplates();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Gestione Template Orari</h1>
        <p>Crea e gestisci i tuoi template di disponibilità settimanali</p>
      </div>

      <div className="main-content">
        {/* Sezione Creazione Template */}
        <div className="create-section">
          {showSuccessMessage && (
            <div className="success-message show">
              Template salvato con successo!
            </div>
          )}

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
            />
          </div>

          <div className="schedule-grid">
            {Object.keys(dayNames).map((day, index) => {
              const dayKey = day as DayKey;
              const daySlots = schedule[dayKey];
              
              return (
                <div key={day} className="day-card" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                  <div className="day-header">
                    <div className="day-name">{dayNames[dayKey]}</div>
                    <div className="day-actions">
                      <button
                        className="btn-icon copy"
                        onClick={() => copyDay(dayKey)}
                        title="Copia"
                      >
                        📋
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => addTimeSlot(dayKey)}
                        title="Aggiungi"
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
                            onChange={(e) => updateTimeSlot(dayKey, slot.id, 'startTime', e.target.value)}
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="time-separator">-</span>
                          <select
                            className="time-input end-time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(dayKey, slot.id, 'endTime', e.target.value)}
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <button
                            className="btn-delete"
                            onClick={() => removeTimeSlot(dayKey, slot.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={resetForm}>
              Reset
            </button>
            <button className="btn btn-primary" onClick={saveTemplate}>
              Salva Template
            </button>
          </div>
        </div>

        {/* Sezione Template Salvati */}
        <div className="templates-section">
          <h2>Template Salvati</h2>
          <div className="templates-grid">
            {templates.length === 0 ? (
              <div className="empty-state">
                <h3>Nessun template salvato</h3>
                <p>Crea il tuo primo template di orari utilizzando il form sopra</p>
              </div>
            ) : (
              templates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <div className="template-name">{template.name}</div>
                    <div className="template-actions">
                      <button
                        className="btn-icon"
                        onClick={() => loadTemplate(template.id)}
                        title="Carica"
                      >
                        📝
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => deleteTemplate(template.id)}
                        title="Elimina"
                        style={{ background: '#e53e3e' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="template-summary">
                    {generateTemplateSummary(template.schedule)}
                    <br />
                    <small>Creato: {template.created}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTemplateManager;