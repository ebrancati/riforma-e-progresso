import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingLinksApi, healthApi, type ApiBookingLink, ApiError } from '../../services/api';
import NotificationMessages from '../../components/NotificationMessages';
import '../../styles/BookingLinksListPage.css';

const BookingLinksListPage: React.FC = () => {
  const [bookingLinks, setBookingLinks] = useState<ApiBookingLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load booking links on component mount
  useEffect(() => {
    loadBookingLinks();
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

  // Load booking links from API
  const loadBookingLinks = async () => {
    try {
      setIsLoading(true);
      await healthApi.checkHealth();
      setIsServerAvailable(true);
      
      const links = await bookingLinksApi.getBookingLinks();
      setBookingLinks(links);
      setError(null);
    } catch (error) {
      console.error('Failed to load booking links:', error);
      setIsServerAvailable(false);
      
      if (error instanceof ApiError && error.isNetworkError()) {
        setError('Server non raggiungibile. Controlla la connessione.');
      } else {
        setError('Impossibile caricare i link di prenotazione. Verifica la connessione al server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Delete booking link
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il link "${name}"?\n\nQuesta azione non può essere annullata.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await bookingLinksApi.deleteBookingLink(id);
      
      // Remove from local state
      setBookingLinks(prev => prev.filter(link => link.id !== id));
      setSuccessMessage(`Link "${name}" eliminato con successo!`);
    } catch (error) {
      console.error('Failed to delete booking link:', error);
      
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          setError('Link non trovato. Potrebbe essere già stato eliminato.');
          // Remove from local state anyway
          setBookingLinks(prev => prev.filter(link => link.id !== id));
        } else if (error.isNetworkError()) {
          setError('Errore di connessione. Riprova tra qualche istante.');
        } else {
          setError('Errore durante l\'eliminazione del link. Riprova.');
        }
      } else {
        setError('Errore imprevisto durante l\'eliminazione. Riprova.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = async (urlSlug: string, name: string) => {
    const fullUrl = `${window.location.origin}/book/${urlSlug}`;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      setSuccessMessage(`URL di "${name}" copiato negli appunti!`);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setError('Impossibile copiare l\'URL. Prova a selezionarlo manualmente.');
    }
  };

  // Retry connection
  const retryConnection = () => {
    loadBookingLinks();
  };

  // Toggle active status (placeholder for future feature)
  const handleToggleActive = (id: string, currentStatus: boolean) => {
    console.log(`Toggle active status for ${id}: ${!currentStatus}`);
    // TODO: Implement when backend supports this feature
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>Link Colloqui</h1>
        <p>Gestisci tutti i link di prenotazione colloqui creati</p>
        <div className="server-status">
          <span className={`server-status-indicator ${isServerAvailable ? 'online' : 'offline'}`}></span>
          {isServerAvailable ? 'Server Connesso' : 'Server Non Disponibile'}
          {!isServerAvailable && (
            <button 
              onClick={retryConnection}
              className="retry-button"
              disabled={isLoading}
            >
              {isLoading ? 'Connessione...' : 'Riprova'}
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

        {/* Action Bar */}
        <div className="action-bar">
          <Link to="/admin/booking-setup" className="btn btn-primary">
            + Crea Nuovo Link
          </Link>
          <button 
            onClick={loadBookingLinks}
            className="btn btn-secondary"
            disabled={isLoading || !isServerAvailable}
          >
            {isLoading ? 'Caricamento...' : '🔄 Aggiorna'}
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <div>Caricamento link in corso...</div>
          </div>
        )}

        {/* Booking Links Grid */}
        <div className="booking-links-section">
          <div className="booking-links-grid">
            {bookingLinks.length === 0 && !isLoading ? (
              <div className="empty-state">
                <h3>Nessun link creato</h3>
                <p>
                  {isServerAvailable 
                    ? 'Non hai ancora creato nessun link di prenotazione. Inizia creando il tuo primo link!'
                    : 'Connetti il server per visualizzare e gestire i link di prenotazione'
                  }
                </p>
                {isServerAvailable && (
                  <Link to="/admin/booking-setup" className="btn btn-primary">
                    Crea il tuo primo link
                  </Link>
                )}
              </div>
            ) : (
              bookingLinks.map(link => (
                <div key={link.id} className="booking-link-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="card-title-section">
                      <h3 className="card-title">{link.name}</h3>
                      <div className="card-status">
                        <label className="status-toggle">
                          <input
                            type="checkbox"
                            checked={link.isActive}
                            onChange={() => handleToggleActive(link.id, link.isActive)}
                            disabled={true} // TODO: Enable when backend supports this
                          />
                          <span className={`toggle-slider ${link.isActive ? 'active' : 'inactive'}`}>
                            {link.isActive ? 'Prenotabile' : 'Non Prenotabile'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="card-content">
                    <div className="card-info">
                      <div className="info-item">
                        <strong>Durata:</strong> {link.duration} Min
                      </div>
                      {link.requireAdvanceBooking && (
                        <div className="info-item">
                          <strong>Preavviso:</strong> {link.advanceHours} ore
                        </div>
                      )}
                      <div className="info-item">
                        <strong>Creato:</strong> {link.created}
                      </div>
                    </div>

                    {/* URL Section */}
                    <div className="url-section">
                      <div className="url-display">
                        <span className="url-text">
                          {window.location.origin}/book/{link.urlSlug}
                        </span>
                        <button
                          onClick={() => handleCopyUrl(link.urlSlug, link.name)}
                          className="copy-url-btn"
                          title="Copia URL"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="card-actions">
                    <Link
                      to={`/admin/booking-links/${link.id}/edit`}
                      className="btn btn-secondary"
                      title="Modifica questo booking link"
                    >
                      Modifica
                    </Link>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(link.id, link.name)}
                      disabled={deletingId === link.id || !isServerAvailable}
                    >
                      {deletingId === link.id ? 'Eliminazione...' : 'Elimina'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info Section */}
        {bookingLinks.length > 0 && (
          <div className="info-section">
            <h3>Funzionalita' da implementare in fturo</h3>
            <ul>
              <li>Sezione per modificare una prenotazione</li>
              <li>Pulsante per attivare/disattivare le prenotazioni</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingLinksListPage;