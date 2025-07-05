export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DaySchedule {
  [key: string]: TimeSlot[];
}

export interface Template {
  id: string;
  name: string;
  schedule: DaySchedule;
  blackoutDays: string[];           // Array of YYYY-MM-DD dates
  bookingCutoffDate: string | null; // YYYY-MM-DD or null
  created: string;
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayNames {
  [key: string]: string;
}

// Advanced settings form data
export interface AdvancedTemplateSettings {
  enableAdvanced: boolean;
  blackoutDays: string[];
  bookingCutoffDate: string | null;
}

// Result types for operations
export interface OperationResult {
  success: boolean;
  error?: string;
}

// Hook return types
export interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  loadTemplates: () => Promise<void>;
  createTemplate: (templateData: Omit<Template, 'id' | 'created'>) => Promise<Template>;
  updateTemplate: (id: string, templateData: Omit<Template, 'id' | 'created'>) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
  clearError: () => void;
  showSuccess: (message: string) => void;
}

export interface UseScheduleFormReturn {
  templateName: string;
  setTemplateName: (name: string) => void;
  schedule: DaySchedule;
  editingTemplateId: string | null;
  copiedDaySlots: TimeSlot[] | null;
  advancedSettings: AdvancedTemplateSettings;
  updateAdvancedSettings: (settings: Partial<AdvancedTemplateSettings>) => void;
  addBlackoutDay: (date: string) => void;
  removeBlackoutDay: (date: string) => void;
  addTimeSlot: (day: DayKey) => void;
  removeTimeSlot: (day: DayKey, slotId: string) => void;
  updateTimeSlot: (day: DayKey, slotId: string, field: 'startTime' | 'endTime', value: string) => OperationResult;
  copyDay: (day: DayKey) => OperationResult;
  pasteToDay: (targetDay: DayKey) => OperationResult;
  clearForm: () => void;
  loadTemplate: (template: Template, forEditing?: boolean) => void;
  sortTimeSlots: (slots: TimeSlot[]) => TimeSlot[];
}