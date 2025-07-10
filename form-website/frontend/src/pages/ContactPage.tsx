import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationMessages from '../components/NotificationMessages';
import { Home, Loader2, Send } from 'lucide-react';
import '../styles/pages/ContactPage.css';

const ContactPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages after timeout
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const validateForm = (): string | null => {
    if (!email.trim()) return 'L\'email è obbligatoria';
    if (!message.trim()) return 'Il messaggio è obbligatorio';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return 'Formato email non valido';
    
    // Message validation
    if (message.trim().length < 10)
      return 'Il messaggio deve essere di almeno 10 caratteri';
    
    if (message.trim().length > 1000)
      return 'Il messaggio non può superare i 1000 caratteri';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Errore durante l\'invio');
      }

      setSuccessMessage('Messaggio inviato con successo! Ti risponderemo al più presto.');
      
      // Reset form
      setEmail('');
      setMessage('');
      
    } catch (error) {
      console.error('Failed to send contact form:', error);
      setError('Errore durante l\'invio: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      {/* Header */}
      <div className="contact-breadcrumb">
        <Link to="/" className="breadcrumb-link">
          <Home size={16} />
          Torna alla Home
        </Link>
      </div>
      <div className="contact-header">
        <h1>Contattaci</h1>
        <p>Hai domande o vuoi saperne di più? Scrivici!</p>
      </div>

      <div className="contact-content">
        {/* Notifications */}
        <NotificationMessages 
          error={error} 
          successMessage={successMessage} 
        />

        {/* Contact Form */}
        <div className="contact-form-section">
          <form onSubmit={handleSubmit} className="contact-form">
            
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="la-tua-email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Message Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="message">
                Messaggio
              </label>
              <textarea
                id="message"
                className="form-textarea"
                placeholder="Scrivi il tuo messaggio qui..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <div className="character-count">
                {message.length}/1000 caratteri
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-loading-spinner-container">
                      <Loader2 size={20} />
                    </span>
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Invia Messaggio
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;