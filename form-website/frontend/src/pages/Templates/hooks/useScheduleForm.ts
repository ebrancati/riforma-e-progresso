import { useState } from 'react';
import type { Template, DaySchedule, TimeSlot, DayKey, AdvancedTemplateSettings } from '../../../types/schedule';

export const useScheduleForm = () => {
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
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [copiedDaySlots, setCopiedDaySlots] = useState<TimeSlot[] | null>(null);
  
  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedTemplateSettings>({
    enableAdvanced: false,
    blackoutDays: [],
    bookingCutoffDate: null
  });

  // Generate custom time slot ID
  const generateTimeSlotId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TS_${timestamp}_${random}`;
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

  // Add time slot to a day
  const addTimeSlot = (day: DayKey) => {
    const existingSlots = schedule[day];
    let startTime = '09:00';
    let endTime = '10:00';
    
    if (existingSlots.length > 0) {
      const sortedSlots = sortTimeSlots(existingSlots);
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      startTime = lastSlot.endTime;
      
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + 60;
      
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
      id: generateTimeSlotId(),
      startTime,
      endTime
    };

    setSchedule(prev => ({
      ...prev,
      [day]: sortTimeSlots([...prev[day], newSlot])
    }));
  };

  // Remove time slot
  const removeTimeSlot = (day: DayKey, slotId: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(slot => slot.id !== slotId)
    }));
  };

  // Update time slot
  const updateTimeSlot = (day: DayKey, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const currentSlot = schedule[day].find(slot => slot.id === slotId);
    if (!currentSlot) return { success: false, error: 'Slot non trovato' };

    const newStartTime = field === 'startTime' ? value : currentSlot.startTime;
    const newEndTime = field === 'endTime' ? value : currentSlot.endTime;

    if (timeToMinutes(newEndTime) <= timeToMinutes(newStartTime)) {
      return { success: false, error: 'L\'orario di fine deve essere successivo a quello di inizio.' };
    }

    const hasConflict = schedule[day].some(slot => {
      if (slot.id === slotId) return false;
      
      const slotStartMinutes = timeToMinutes(slot.startTime);
      const slotEndMinutes = timeToMinutes(slot.endTime);
      const newStartMinutes = timeToMinutes(newStartTime);
      const newEndMinutes = timeToMinutes(newEndTime);
      
      return (newStartMinutes < slotEndMinutes && newEndMinutes > slotStartMinutes);
    });

    if (hasConflict) {
      return { success: false, error: 'Questo orario si sovrappone con un altro slot esistente.' };
    }

    setSchedule(prev => ({
      ...prev,
      [day]: sortTimeSlots(prev[day].map(slot => 
        slot.id === slotId ? { ...slot, [field]: value } : slot
      ))
    }));

    return { success: true };
  };

  // Copy day slots
  const copyDay = (day: DayKey) => {
    const daySlots = schedule[day];
    
    if (daySlots.length === 0) {
      return { success: false, error: 'Nessun orario da copiare per questo giorno' };
    }

    setCopiedDaySlots([...daySlots]);
    return { success: true };
  };

  // Paste copied slots
  const pasteToDay = (targetDay: DayKey, slotsToUse?: TimeSlot[]) => {
    const slotsToApply = slotsToUse || copiedDaySlots;
      
    if (!slotsToApply) {
      return { success: false, error: 'Nessun orario copiato' };
    }

    const existingSlots = schedule[targetDay];
    const hasAnyConflict = slotsToApply.some(copiedSlot => {
      return existingSlots.some(existingSlot => {
        const copiedStartMinutes = timeToMinutes(copiedSlot.startTime);
        const copiedEndMinutes = timeToMinutes(copiedSlot.endTime);
        const existingStartMinutes = timeToMinutes(existingSlot.startTime);
        const existingEndMinutes = timeToMinutes(existingSlot.endTime);
        
        return (copiedStartMinutes < existingEndMinutes && copiedEndMinutes > existingStartMinutes);
      });
    });

    if (hasAnyConflict) {
      return { success: false, error: 'Alcuni degli orari copiati si sovrappongono con quelli esistenti.' };
    }

    // Generate new IDs for pasted slots to avoid conflicts
    const newSlots = slotsToApply.map(slot => ({
      ...slot,
      id: generateTimeSlotId()
    }));

    setSchedule(prev => ({
      ...prev,
      [targetDay]: sortTimeSlots([...prev[targetDay], ...newSlots])
    }));

    return { success: true };
  };

  // Advanced settings methods
  const updateAdvancedSettings = (settings: Partial<AdvancedTemplateSettings>) => {
    setAdvancedSettings(prev => ({ ...prev, ...settings }));
  };

  const addBlackoutDay = (date: string) => {
    // Basic format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: 'Formato data non valido. Usa YYYY-MM-DD.' };
    }

    // Check if already exists
    if (advancedSettings.blackoutDays.includes(date)) {
      return { success: false, error: 'Questo giorno è già nella lista.' };
    }

    // Simple date validity check (avoid timezone issues)
    const testDate = new Date(date + 'T12:00:00'); // Use noon to avoid timezone edge cases
    if (isNaN(testDate.getTime())) {
      return { success: false, error: 'Data non valida.' };
    }

    // Additional check for reasonable date range
    const year = parseInt(date.split('-')[0]);
    if (year < 2024 || year > 2030) {
      return { success: false, error: 'Anno deve essere tra 2024 e 2030.' };
    }

    setAdvancedSettings(prev => ({
      ...prev,
      blackoutDays: [...prev.blackoutDays, date].sort()
    }));

    return { success: true };
  };

  const removeBlackoutDay = (date: string) => {
    setAdvancedSettings(prev => ({
      ...prev,
      blackoutDays: prev.blackoutDays.filter(day => day !== date)
    }));
  };

  // Clear form
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
    setEditingTemplateId(null);
    // Reset advanced settings
    setAdvancedSettings({
      enableAdvanced: false,
      blackoutDays: [],
      bookingCutoffDate: null
    });
  };

  // Load template data into form
  const loadTemplate = (template: Template, forEditing: boolean = false) => {
    if (forEditing) {
      setTemplateName(template.name);
      setEditingTemplateId(template.id);
    } else {
      setTemplateName(template.name + ' (copia)');
      setEditingTemplateId(null);
    }
    
    // Sort slots and regenerate IDs if creating copy
    const processedSchedule: DaySchedule = {};
    Object.keys(template.schedule).forEach(day => {
      const daySlots = template.schedule[day];
      
      if (forEditing) {
        // Keep original IDs when editing
        processedSchedule[day] = sortTimeSlots(daySlots);
      } else {
        // Generate new IDs when creating copy
        processedSchedule[day] = sortTimeSlots(daySlots.map(slot => ({
          ...slot,
          id: generateTimeSlotId()
        })));
      }
    });
    
    setSchedule(processedSchedule);

    // Load advanced settings
    const hasAdvancedSettings = (template.blackoutDays && template.blackoutDays.length > 0) || 
                               template.bookingCutoffDate;
    
    setAdvancedSettings({
      enableAdvanced: !!hasAdvancedSettings,
      blackoutDays: template.blackoutDays || [],
      bookingCutoffDate: template.bookingCutoffDate || null
    });
  };

  return {
    templateName,
    setTemplateName,
    schedule,
    editingTemplateId,
    copiedDaySlots,
    advancedSettings,
    updateAdvancedSettings,
    addBlackoutDay,
    removeBlackoutDay,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    copyDay,
    pasteToDay,
    clearForm,
    loadTemplate,
    sortTimeSlots,
    generateTimeSlotId
  };
};