import { useState, useEffect } from 'react';
import { apiService, ApiError, type ApiTemplate, type CreateTemplateRequest } from '../../../services/api';
import type { Template } from '../../../types/schedule';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Convert API template to internal format
  const convertApiTemplate = (apiTemplate: ApiTemplate): Template => ({
    id: apiTemplate.id,
    name: apiTemplate.name,
    schedule: apiTemplate.schedule,
    created: apiTemplate.created
  });

  // Convert internal template to API format
  const convertToApiTemplate = (template: Omit<Template, 'id' | 'created'>): CreateTemplateRequest => ({
    name: template.name,
    schedule: template.schedule as CreateTemplateRequest['schedule']
  });

  // Handle API errors consistently
  const handleApiError = (error: unknown, defaultMessage: string) => {
    if (error instanceof ApiError) {
      if (error.isNetworkError()) {
        setError('Connessione al server persa. Riprova tra qualche istante.');
      } else if (error.isServerError()) {
        setError('Errore del server. Riprova più tardi.');
      } else {
        setError(error.message || defaultMessage);
      }
    } else {
      setError(defaultMessage);
    }
  };

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const apiTemplates = await apiService.getTemplates();
      const convertedTemplates = apiTemplates.map(convertApiTemplate);
      setTemplates(convertedTemplates);
      setError(null);
    } catch (error) {
      console.error('Failed to load templates:', error);
      handleApiError(error, 'Errore durante il caricamento dei template');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new template
  const createTemplate = async (templateData: Omit<Template, 'id' | 'created'>) => {
    setIsLoading(true);
    try {
      const apiTemplate = convertToApiTemplate(templateData);
      const response = await apiService.createTemplate(apiTemplate);
      const newTemplate = convertApiTemplate(response.template);
      
      setTemplates(prev => [...prev, newTemplate]);
      showSuccess('Template creato con successo!');
      return newTemplate;
    } catch (error) {
      console.error('Failed to create template:', error);
      handleApiError(error, 'Errore durante la creazione del template');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing template
  const updateTemplate = async (id: string, templateData: Omit<Template, 'id' | 'created'>) => {
    setIsLoading(true);
    try {
      const apiTemplate = convertToApiTemplate(templateData);
      const response = await apiService.updateTemplate(id, apiTemplate);
      const updatedTemplate = convertApiTemplate(response.template);
      
      setTemplates(prev => prev.map(t => 
        t.id === id ? updatedTemplate : t
      ));
      
      showSuccess('Template aggiornato con successo!');
      return updatedTemplate;
    } catch (error) {
      console.error('Failed to update template:', error);
      handleApiError(error, 'Errore durante l\'aggiornamento del template');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete template
  const deleteTemplate = async (id: string) => {
    setIsLoading(true);
    try {
      await apiService.deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showSuccess('Template eliminato con successo!');
    } catch (error) {
      console.error('Failed to delete template:', error);
      handleApiError(error, 'Errore durante l\'eliminazione del template');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  return {
    templates,
    isLoading,
    error,
    successMessage,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    clearError,
    showSuccess
  };
};