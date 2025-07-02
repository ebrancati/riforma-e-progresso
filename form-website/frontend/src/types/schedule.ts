export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface DaySchedule {
  [key: string]: TimeSlot[];
}

export interface Template {
  id: number;
  name: string;
  schedule: DaySchedule;
  created: string;
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayNames {
  [key: string]: string;
}

export interface ScheduleTemplateManagerProps {
  // hypothetical future props for APIs
  onSaveTemplate?: (template: Template) => Promise<void>;
  onDeleteTemplate?: (templateId: number) => Promise<void>;
  onLoadTemplates?: () => Promise<Template[]>;
}