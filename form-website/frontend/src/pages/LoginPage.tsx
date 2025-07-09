import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, MoveLeft } from 'lucide-react';

import '../styles/pages/LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Get the return URL from location state
  const from = (location.state as any)?.from?.pathname || '/admin/booking-links';

  // Clear error when user types
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // If already authenticated, redirect to intended destination
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Inserisci username e password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await login(username.trim(), password);

      if (!success) setError('Username o password non corretti');
      // If success, user will be redirected by the Navigate above
    } catch (error) {
      setError('Errore durante il login. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Accesso Amministratore</h1>
          <p>Inserisci le credenziali per accedere al pannello di controllo</p>
        </div>

        {error && (<div className="login-error">{error}</div>)}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="Inserisci username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Inserisci password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"><Loader2 size={20} /></span>
                Accesso in corso...
              </>
            ) : (
              <>
                Accedi
              </>
            )}
          </button>

          <Link to="/colloqui" className="btn btn-secondary back-to-public">
            <MoveLeft className='move-left-icon' size={20} /> Torna alle Opportunità
          </Link>
        </form>


        <div className="login-footer">
          <div className="login-info">
            <p>Questa è un'area riservata per amministratori</p>
          </div>
          <p className="contact-with-email">Contattaci per assistenza: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link></p>
          <Link to="/contattaci" className="contact-link-mobile">
            Contattaci per assistenza
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;