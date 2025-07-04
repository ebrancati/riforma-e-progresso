import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>Errore 404</h1>
        <h2>Pagina non trovata</h2>
        <p>Contattaci per assistenza: sezione.colloqui@riformaeprogresso.it</p>
        
        <div className="not-found-links">
          <Link to="/" className="btn btn-primary">
            Return to the Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;