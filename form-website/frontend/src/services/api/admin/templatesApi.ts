import { BaseApiService } from '../base/ApiService';
import type {
  ApiTemplate,
  CreateTemplateRequest,
  TemplateResponse,
  DeleteTemplateResponse
} from './types';

export class TemplatesApiService extends BaseApiService {
  
  // Get all templates
  async getTemplates(): Promise<ApiTemplate[]> {
    return this.request<ApiTemplate[]>('/api/templates', {}, true);
  }

  // Get template by ID
  async getTemplate(id: string): Promise<ApiTemplate> {
    return this.request<ApiTemplate>(`/api/templates/${id}`, {}, true);
  }

  // Create new template
  async createTemplate(template: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.request<TemplateResponse>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    }, true);
  }

  // Update existing template
  async updateTemplate(id: string, template: CreateTemplateRequest): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    }, true);
  }

  // Delete template
  async deleteTemplate(id: string): Promise<DeleteTemplateResponse> {
    return this.request<DeleteTemplateResponse>(`/api/templates/${id}`, {
      method: 'DELETE',
    }, true);
  }
}

// Export singleton instance
export const templatesApi = new TemplatesApiService();