import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import NotificationMessages from '../../components/NotificationMessages';
import type { Template } from '../../types/schedule';
import '../../styles/BookingSetupPage.css';

const BookingSetupPage: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    duration: 30,
    requireAdvanceBooking: false,
    advanceHours: 24,
    urlSlug: ''
  });

  // App state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load available templates
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      await apiService.checkHealth();
      setIsServerAvailable(true);
      
      const loadedTemplates = await apiService.getTemplates();
      setTemplates(loadedTemplates);
      setError(null);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setIsServerAvailable(false);
      setError('Impossibile caricare i template. Verifica la connessione al server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate URL slug from name
  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  // Auto-generate slug when name changes
  const handleNameChange = (name: string) => {
    handleInputChange('name', name);
    if (!formData.urlSlug || formData.urlSlug === generateSlugFromName(formData.name)) {
      handleInputChange('urlSlug', generateSlugFromName(name));
    }
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Il nome del colloquio è obbligatorio';
    if (!formData.templateId) return 'Seleziona un template di disponibilità';
    if (!formData.urlSlug.trim()) return 'L\'URL personalizzato è obbligatorio';
    
    // Validate URL slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.urlSlug)) {
      return 'L\'URL può contenere solo lettere minuscole, numeri e trattini';
    }
    
    if (formData.urlSlug.length < 3) return 'L\'URL deve essere di almeno 3 caratteri';
    if (formData.urlSlug.length > 50) return 'L\'URL non può superare i 50 caratteri';
    
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isServerAvailable) {
      setError('Server non disponibile. Impossibile creare il link.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      
      // TODO: Implement API call to create booking link
      console.log('Creating booking link:', formData);
      
      // For now, just show success message
      setSuccessMessage(`Link creato con successo! URL: ${window.location.origin}/book/${formData.urlSlug}`);
      
      // Reset form
      setFormData({
        name: '',
        templateId: '',
        duration: 30,
        requireAdvanceBooking: false,
        advanceHours: 24,
        urlSlug: ''
      });
      
    } catch (error) {
      console.error('Failed to create booking link:', error);
      setError('Errore durante la creazione del link. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    if (window.confirm('Sei sicuro di voler resettare il form?')) {
      setFormData({
        name: '',
        templateId: '',
        duration: 30,
        requireAdvanceBooking: false,
        advanceHours: 24,
        urlSlug: ''
      });
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Genera Link Colloqui</h1>
        <p>Crea link personalizzati per permettere ai candidati di prenotare colloqui</p>
        <div className="server-status">
          <span className={`server-status-indicator ${isServerAvailable ? 'online' : 'offline'}`}></span>
          {isServerAvailable ? 'Server Connesso' : 'Server Non Disponibile'}
          {!isServerAvailable && (
            <button 
              onClick={loadTemplates}
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
          error={error} 
          successMessage={successMessage} 
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <div>Caricamento in corso...</div>
          </div>
        )}

        {/* Form Section */}
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            {/* Interview Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="interviewName">
                Nome Colloquio
              </label>
              <input
                type="text"
                id="interviewName"
                className="form-input"
                placeholder="es. Colloquio Grafici, Colloquio Developer, ..."
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isLoading || !isServerAvailable}
                required
              />
            </div>

            {/* Template Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="templateSelect">
                Disponibilità Orari
              </label>
              <div className="template-selection">
                <select
                  id="templateSelect"
                  className="form-select"
                  value={formData.templateId}
                  onChange={(e) => handleInputChange('templateId', e.target.value)}
                  disabled={isLoading || !isServerAvailable}
                  required
                >
                  <option value="">Seleziona un template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <Link 
                  to="/admin/time-slots" 
                  className="manage-templates-link"
                  title="Gestisci template di orari"
                >
                  Gestisci Template
                </Link>
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label" htmlFor="duration">
                Durata Colloquio
              </label>
              <select
                id="duration"
                className="form-select"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                disabled={isLoading || !isServerAvailable}
              >
                <option value={30}>30 minuti</option>
              </select>
            </div>

            {/* Advance Booking Restriction */}
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.requireAdvanceBooking}
                    onChange={(e) => handleInputChange('requireAdvanceBooking', e.target.checked)}
                    disabled={isLoading || !isServerAvailable}
                  />
                  <span className="checkbox-text">
                    Richiedi preavviso minimo per la prenotazione
                  </span>
                </label>
              </div>
              
              {formData.requireAdvanceBooking && (
                <div className="advance-hours-selection">
                  <select
                    className="form-select small"
                    value={formData.advanceHours}
                    onChange={(e) => handleInputChange('advanceHours', parseInt(e.target.value))}
                    disabled={isLoading || !isServerAvailable}
                  >
                    <option value={6}>6 ore</option>
                    <option value={12}>12 ore</option>
                    <option value={24}>24 ore</option>
                    <option value={48}>48 ore</option>
                  </select>
                  <span className="hours-label">di preavviso</span>
                </div>
              )}
            </div>

            {/* URL Slug */}
            <div className="form-group">
              <label className="form-label" htmlFor="urlSlug">
                URL Personalizzato
              </label>
              <div className="url-preview">
                <span className="url-base">{window.location.origin}/book/</span>
                <input
                  type="text"
                  id="urlSlug"
                  className="url-input"
                  placeholder="nome-colloquio"
                  value={formData.urlSlug}
                  onChange={(e) => handleInputChange('urlSlug', e.target.value.toLowerCase())}
                  disabled={isLoading || !isServerAvailable}
                  required
                />
              </div>
              <div className="url-help">
                Solo lettere minuscole, numeri e trattini. Min 3, max 50 caratteri.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={resetForm}
                disabled={isLoading || !isServerAvailable}
              >
                Reset
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !isServerAvailable}
              >
                {isLoading ? 'Creazione...' : 'Genera Link'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3>Come funziona</h3>
          <ol>
            <li>Compila il form sopra con i dettagli del colloquio</li>
            <li>Seleziona un template di disponibilità esistente</li>
            <li>Il sistema genererà automaticamente gli slot da 30 minuti</li>
            <li>Condividi il link generato con i candidati</li>
            <li>I candidati potranno prenotare uno slot disponibile</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default BookingSetupPage;