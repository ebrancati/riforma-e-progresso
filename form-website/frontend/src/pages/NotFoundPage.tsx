import React from 'react';
import { Link } from 'react-router-dom';

import '../styles/pages/NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>Errore 404</h1>
        <h2>Pagina non trovata</h2>
        <p>Contattaci per assistenza: <Link to="/contattaci" className="contact-link">sezione.colloqui@riformaeprogresso.it</Link></p>

        <Link to="/colloqui" className="btn btn-secondary back-to-public">
          Torna alla Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;