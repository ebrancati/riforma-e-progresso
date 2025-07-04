import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicDirectoryApi, ApiError } from '../../services/api';
import type { PublicBookingLinkInfo } from '../../services/api/public/types';
import NotificationMessages from '../../components/NotificationMessages';
import '../../styles/PublicDirectoryPage.css';

const PublicDirectoryPage: React.FC = () => {
  const [bookingLinks, setBookingLinks] = useState<PublicBookingLinkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveBookingLinks();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadActiveBookingLinks = async () => {
    try {
      setIsLoading(true);
      const response = await publicDirectoryApi.getActiveBookingLinks();
      setBookingLinks(response.bookingLinks);
      setError(null);
    } catch (error) {
      console.error('Failed to load booking links:', error);
      
      if (error instanceof ApiError) {
        if (error.isNetworkError()) {
          setError('Impossibile connettersi al server. Controlla la connessione.');
        } else {
          setError('Errore durante il caricamento delle opportunità.');
        }
      } else {
        setError('Errore imprevisto durante il caricamento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatAdvanceNotice = (requireAdvanceBooking: boolean, advanceHours: number): string => {
    if (!requireAdvanceBooking) {
      return 'Prenotazione immediata';
    }
    
    if (advanceHours < 24) {
      return `Preavviso ${advanceHours} ore`;
    } else {
      const days = Math.floor(advanceHours / 24);
      return `Preavviso ${days} ${days === 1 ? 'giorno' : 'giorni'}`;
    }
  };

  if (isLoading) {
    return (
      <div className="directory-container">
        <div className="directory-header">
          <h1>Riforma e Progresso</h1>
          <p>Caricamento...</p>
        </div>
        <div className="directory-content">
          <div className="loading-indicator">
            <div className="loading-spinner">⏳</div>
            <p>Caricamento in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="directory-container">
      {/* Header */}
      <div className="directory-header">
        <h1>Riforma e Progresso</h1>
        <p className="directory-subtitle">
          Lorem Ipsum
        </p>
        <div className="directory-stats">
          <span className="stats-item">
            <strong>{bookingLinks.length}</strong> {bookingLinks.length === 1 ? 'posizione aperta' : 'posizioni aperte'}
          </span>
        </div>
      </div>

      <div className="directory-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={null} 
        />

        {/* Retry button for errors */}
        {error && (
          <div className="error-actions">
            <button 
              onClick={loadActiveBookingLinks}
              className="btn btn-primary"
              disabled={isLoading}
            >
              🔄 Riprova
            </button>
          </div>
        )}

        {/* Booking Links Grid */}
        {bookingLinks.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">😔</div>
            <h3>Nessuna posizione aperta al momento</h3>
            <p>
              Non ci sono colloqui disponibili in questo momento.<br />
              Torna a trovarci presto per nuove opportunità!
            </p>
            <button 
              onClick={loadActiveBookingLinks}
              className="btn btn-secondary"
            >
              🔄 Controlla di nuovo
            </button>
          </div>
        ) : (
          <div className="opportunities-grid">
            {bookingLinks.map((link, index) => (
              <div 
                key={link.urlSlug} 
                className="opportunity-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Card Header */}
                <div className="card-header">
                  <h3 className="card-title">{link.name}</h3>
                  <div className="card-badge">
                    <span className="badge-text">Attivo</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="card-content">
                  <div className="card-info">
                    <div className="info-item">
                      <span className="info-icon">⏱️</span>
                      <span className="info-text">Durata: {link.duration} minuti</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">📅</span>
                      <span className="info-text">{formatAdvanceNotice(link.requireAdvanceBooking, link.advanceHours)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">🎯</span>
                      <span className="info-text">Colloquio individuale</span>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="card-actions">
                    <Link 
                      to={`/book/${link.urlSlug}`}
                      className="btn btn-primary btn-cta"
                    >
                      <span className="btn-icon">🚀</span>
                      Prenota Colloquio
                    </Link>
                    
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(link.bookingUrl);
                        // Temporary feedback - could be improved with toast
                        alert('Link copiato negli appunti!');
                      }}
                      className="btn btn-secondary btn-copy"
                      title="Copia link"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="card-footer">
                  <small className="footer-text">
                    Creato: {new Date(link.created).toLocaleDateString('it-IT')}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="directory-footer">
            <p>Contattaci per assistenza: sezione.colloqui@riformaeprogresso.it</p>
        </div>
      </div>
    </div>
  );
};

export default PublicDirectoryPage;