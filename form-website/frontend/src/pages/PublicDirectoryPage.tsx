import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { publicDirectoryApi, ApiError } from '../services/api';
import type { PublicBookingLinkInfo }   from '../services/api/public/types';

import NotificationMessages from '../components/NotificationMessages';

import { SearchX, Loader2, RefreshCw, Clock, Clipboard, Check } from "lucide-react";
import '../styles/pages/PublicDirectoryPage.css';

const PublicDirectoryPage: React.FC = () => {
  const location = useLocation();
  const [bookingLinks, setBookingLinks] = useState<PublicBookingLinkInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveBookingLinks();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
  if (location.state?.successMessage) {
    setSuccessMessage(location.state.successMessage);
    }
  }, [location.state]);

  const loadActiveBookingLinks = async (isRefresh = false) => {
    try {
      setIsLoading(true);
      const response = await publicDirectoryApi.getActiveBookingLinks();

      // Check for changes on manual refresh
      if (isRefresh) {
        const currentUrls = bookingLinks.map(link => link.urlSlug).sort();
        const newUrls = response.bookingLinks.map(link => link.urlSlug).sort();
        const hasChanges = JSON.stringify(currentUrls) !== JSON.stringify(newUrls);

        if (response.bookingLinks.length === 0) {
          setSuccessMessage('Controllo completato: nessuna opportunità disponibile.');
        } else if (hasChanges) {
          setSuccessMessage('Nuove opportunità trovate! La pagina è stata aggiornata.');
        } else {
          setSuccessMessage('Nessun aggiornamento: le opportunità mostrate sono le più recenti.');
        }
      }

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

  const handleCopyUrl = async (urlSlug: string) => {
    const fullUrl = `${window.location.origin}/book/${urlSlug}`;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      setSuccessMessage(`Link copiato negli appunti!`);
      
      setCopiedLinkId(urlSlug);
      setTimeout(() => setCopiedLinkId(null), 1000);
      
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <div className="directory-container">
      <div className="directory-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        <div className="opportunities-section-header">
          <h2 className="opportunities-title">Posizioni Aperte ({bookingLinks.length})</h2>
          <button 
            onClick={() => loadActiveBookingLinks(true)}
            className="refresh-button"
            disabled={isLoading}
            title="Aggiorna opportunità"
          >
            <RefreshCw size={20} className={isLoading ? 'spinning' : ''} />
            Aggiorna
          </button>
        </div>

        {/* Show loading indicator when loading */}
        {isLoading && (
          <div className="loading-indicator">
            <Loader2 size={40} className="loading-spinner" />
            <p>Caricamento opportunità in corso...</p>
          </div>
        )}

        {/* Booking Links Grid */}
        {!isLoading && (
          <div className="opportunities-grid">
            {bookingLinks.length === 0 && !isLoading ? (
              <div className="empty-state">
                <SearchX size={60} className="empty-icon" />
                <h3>Nessuna posizione aperta al momento</h3>
                <p>
                  Non ci sono colloqui disponibili in questo momento.<br />
                  Torna a trovarci presto per nuove opportunità!
                </p>
                <button 
                  onClick={() => loadActiveBookingLinks(true)}
                  className="btn btn-secondary"
                >
                  <RefreshCw size={20} className="refresh-icon" /> Controlla di nuovo
                </button>
              </div>
            ) : (
            bookingLinks.map((link, index) => (
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
                      onClick={
                        () => handleCopyUrl(link.urlSlug)
                      }
                      className="btn-copy"
                      title="Copia link">
                      {copiedLinkId === link.urlSlug ? <Check size={18} /> : <Clipboard size={18} />}
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
            ))
          )}
        </div>
        )}

        <div className="contact-footer">
          <span className="contact-with-email">
            Contattaci per assistenza: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link>
          </span>
          <Link to="/contattaci" className="contact-link-mobile">
            Contattaci per assistenza
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicDirectoryPage;