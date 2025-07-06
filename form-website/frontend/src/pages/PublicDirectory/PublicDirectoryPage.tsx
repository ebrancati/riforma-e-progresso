import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicDirectoryApi, ApiError } from '../../services/api';
import type { PublicBookingLinkInfo } from '../../services/api/public/types';
import NotificationMessages from '../../components/NotificationMessages';
import { SearchX, RefreshCw, Clock, Clipboard } from "lucide-react";
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

  return (
    <div className="directory-container">
      {/* Header */}
      <div className="directory-header">
        <h1>Riforma e Progresso</h1>
        <p className="directory-subtitle">
          Lorem ipsum dolor sit amet consectetur adipisicing elit
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
            <SearchX size={60} className="empty-icon" />
            <h3>Nessuna posizione aperta al momento</h3>
            <p>
              Non ci sono colloqui disponibili in questo momento.<br />
              Torna a trovarci presto per nuove opportunità!
            </p>
            <button 
              onClick={loadActiveBookingLinks}
              className="btn btn-secondary"
            >
              <RefreshCw size={20} className="refresh-icon" /> Controlla di nuovo
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
                      <Clock className="info-icon" size={20} />
                      <span className="info-text">Durata prevista: {link.duration} minuti</span>
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="card-actions">
                    <Link 
                      to={`/book/${link.urlSlug}`}
                      className="btn btn-primary btn-cta"
                    >
                      Prenota Colloquio
                    </Link>
                    
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(link.bookingUrl);
                        // Temporary feedback - could be improved with toast
                        alert('Link copiato negli appunti!');
                      }}
                      className="btn-copy"
                      title="Copia link"
                    >
                      <Clipboard size={18} />
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="card-footer">
                  <small className="footer-text">
                    Creato: {link.created}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="directory-footer">
          <p>Contattaci per assistenza: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso</Link></p>
        </div>
      </div>
    </div>
  );
};

export default PublicDirectoryPage;