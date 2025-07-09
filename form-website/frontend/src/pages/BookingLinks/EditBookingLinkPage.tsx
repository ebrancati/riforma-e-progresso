import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { templatesApi, bookingLinksApi, healthApi, ApiError, type UpdateBookingLinkRequest } from '../../services/api';
import type { Template } from '../../types/schedule';
import type { ApiBookingLink } from '../../services/api';
import NotificationMessages from '../../components/NotificationMessages';

import '../../styles/pages/EditBookingLinkPage.css';

const EditBookingLinkPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    requireAdvanceBooking: false,
    advanceHours: 24,
    isActive: true
  });

  // Original booking link data (for read-only fields)
  const [originalBookingLink, setOriginalBookingLink] = useState<ApiBookingLink | null>(null);

  // App state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadPageData();
  }, [id]);

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load booking link and templates
  const loadPageData = async () => {
    try {
      setIsLoadingData(true);
      await healthApi.checkHealth();
      setIsServerAvailable(true);

      if (!id) {
        setError('ID booking link mancante');
        return;
      }

      // Load booking link and templates in parallel
      const [bookingLink, loadedTemplates] = await Promise.all([
        bookingLinksApi.getBookingLink(id),
        templatesApi.getTemplates()
      ]);

      setOriginalBookingLink(bookingLink);
      setTemplates(loadedTemplates);

      // Populate form with current data
      setFormData({
        name: bookingLink.name,
        templateId: bookingLink.templateId,
        requireAdvanceBooking: bookingLink.requireAdvanceBooking,
        advanceHours: bookingLink.advanceHours,
        isActive: bookingLink.isActive
      });

      setError(null);
    } catch (error) {
      console.error('Failed to load page data:', error);
      setIsServerAvailable(false);

      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          setError('Booking link non trovato');
        } else if (error.isNetworkError()) {
          setError('Server non raggiungibile. Controlla la connessione.');
        } else {
          setError('Errore durante il caricamento dei dati.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento.');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'requireAdvanceBooking') {
        if (value === true && prev.advanceHours === 0) {
          newData.advanceHours = 6;
        } else if (value === false) {
          newData.advanceHours = 0;
        }
      }
      
      return newData;
    });
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Il nome del colloquio è obbligatorio';
    if (!formData.templateId) return 'Seleziona un template di disponibilità';
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isServerAvailable || !id) {
      setError('Impossibile aggiornare: server non disponibile o ID mancante.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Prepare update data
      const updateData: UpdateBookingLinkRequest = {
        name: formData.name.trim(),
        templateId: formData.templateId,
        requireAdvanceBooking: formData.requireAdvanceBooking,
        advanceHours: formData.requireAdvanceBooking ? formData.advanceHours : 0,
        isActive: formData.isActive
      };

      // Call API
      const response = await bookingLinksApi.updateBookingLink(id, updateData);

      setSuccessMessage(
        `✅ ${response.bookingLink.name} aggiornato con successo!\n\n` +
        `Le prenotazioni esistenti rimangono valide, le nuove seguiranno le impostazioni aggiornate.`
      );

      // Navigate back to list after short delay
      setTimeout(() => {
        navigate('/admin/booking-links');
      }, 2000);

    } catch (error) {
      console.error('Failed to update booking link:', error);

      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          setError('Esiste già un colloquio con questo nome. Scegli un nome diverso.');
        } else if (error.statusCode === 400) {
          setError('Errore di validazione: ' + error.message);
        } else if (error.statusCode === 404) {
          setError('Booking link non trovato.');
        } else if (error.isNetworkError()) {
          setError('Errore di connessione. Riprova tra qualche istante.');
        } else {
          setError('Errore del server. Riprova più tardi.');
        }
      } else {
        setError('Errore imprevisto durante l\'aggiornamento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingData) {
    return (
      <div className="container">
        <div className="header">
          <h1>Caricamento...</h1>
          <p>Sto caricando i dati del booking link</p>
        </div>
        <div className="main-content">
          <div className="loading-indicator">
            <div>Caricamento in corso...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!originalBookingLink) {
    return (
      <div className="container">
        <div className="header">
          <h1>Errore</h1>
          <p>Impossibile caricare il booking link</p>
        </div>
        <div className="main-content">
          <div className="error-state">
            <h3>😞 Booking link non trovato</h3>
            <p>Il booking link richiesto non esiste o non è accessibile.</p>
            <Link to="/admin/booking-links" className="btn btn-primary">
              ← Torna alla Lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-navigation">
          <Link to="/admin/booking-links" className="nav-link">
            ← Torna ai Link Colloqui
          </Link>
        </div>

        <h1>Modifica Link Colloquio</h1>
        <p>Aggiorna le impostazioni del tuo link di prenotazione</p>
        <div className="server-status">
          <span className={`server-status-indicator ${isServerAvailable ? 'online' : 'offline'}`}></span>
          {isServerAvailable ? 'Server Connesso' : 'Server Non Disponibile'}
        </div>
      </div>

      <div className="main-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        {/* Form Section */}
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            
            {/* Modifiable Fields */}
            <div className="modifiable-fields">
              <h3>Campi Modificabili</h3>
              
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
                  onChange={(e) => handleInputChange('name', e.target.value)}
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

              {/* Active Status */}
              <div className="form-group">
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      disabled={isLoading || !isServerAvailable}
                    />
                    <span className="checkbox-text">
                      Link attivo (i candidati possono prenotare)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Non-Modifiable Fields */}
            <div className="readonly-fields">
              <h3>Campi Non Modificabili</h3>
              
              {/* URL Slug - Read Only */}
              <div className="form-group">
                <label className="form-label" htmlFor="urlSlug">
                  URL Personalizzato
                </label>
                <div className="url-preview disabled">
                  <span className="url-base">{window.location.origin}/book/</span>
                  <input
                    type="text"
                    id="urlSlug"
                    className="url-input disabled"
                    value={originalBookingLink.urlSlug}
                    disabled
                    readOnly
                  />
                </div>
                <div className="field-help">
                  💡 L'URL non può essere modificato per mantenere funzionanti i link già condivisi
                </div>
              </div>

              {/* Duration - Read Only */}
              <div className="form-group">
                <label className="form-label" htmlFor="duration">
                  Durata Colloquio
                </label>
                <input
                  type="text"
                  id="duration"
                  className="form-input disabled"
                  value={`${originalBookingLink.duration} minuti`}
                  disabled
                  readOnly
                />
                <div className="field-help">
                  💡 La durata non può essere modificata per mantenere la coerenza con le prenotazioni esistenti
                </div>
              </div>

              {/* Creation Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="created">
                  Data Creazione
                </label>
                <input
                  type="text"
                  id="created"
                  className="form-input disabled"
                  value={originalBookingLink.created}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <Link 
                to="/admin/booking-links"
                className="btn btn-secondary"
              >
                Annulla
              </Link>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !isServerAvailable}
              >
                {isLoading ? 'Aggiornamento...' : 'Aggiorna Link Colloquio'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="info-section">
          <h3>Cosa Puoi Modificare</h3>
          <ul>
            <li><strong>Nome Colloquio:</strong> Puoi cambiarlo liberamente</li>
            <li><strong>Template Orari:</strong> Le nuove prenotazioni seguiranno il nuovo template</li>
            <li><strong>Preavviso:</strong> Cambierà solo per le future prenotazioni</li>
            <li><strong>Stato Attivo:</strong> Disattiva per impedire nuove prenotazioni</li>
          </ul>

          <h3>Cosa NON Puoi Modificare</h3>
          <ul>
            <li><strong>URL:</strong> Per non rompere i link già condivisi</li>
            <li><strong>Durata:</strong> Per mantenere coerenza con prenotazioni esistenti</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EditBookingLinkPage;