import type { ApiBookingLink, ApiBooking, ApiTimeSlot, ApiDeleteResponse } from '../shared/types';
export type { ApiBookingLink, ApiBooking, ApiTimeSlot };

// ========== TEMPLATE INTERFACES ==========

export interface ApiTemplate {
  id: string;
  name: string;
  schedule: {
    monday: ApiTimeSlot[];
    tuesday: ApiTimeSlot[];
    wednesday: ApiTimeSlot[];
    thursday: ApiTimeSlot[];
    friday: ApiTimeSlot[];
    saturday: ApiTimeSlot[];
    sunday: ApiTimeSlot[];
  };
  created: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  schedule: {
    monday: ApiTimeSlot[];
    tuesday: ApiTimeSlot[];
    wednesday: ApiTimeSlot[];
    thursday: ApiTimeSlot[];
    friday: ApiTimeSlot[];
    saturday: ApiTimeSlot[];
    sunday: ApiTimeSlot[];
  };
}

export interface TemplateResponse {
  message: string;
  template: ApiTemplate;
}

export type DeleteTemplateResponse = ApiDeleteResponse;

// ========== BOOKING LINK INTERFACES ==========

export interface CreateBookingLinkRequest {
  name: string;
  templateId: string;
  urlSlug: string;
  duration: number;
  requireAdvanceBooking: boolean;
  advanceHours: number;
}

export interface CreateBookingLinkResponse {
  message: string;
  bookingLink: ApiBookingLink;
  url: string;
}

export type DeleteBookingLinkResponse = ApiDeleteResponse;