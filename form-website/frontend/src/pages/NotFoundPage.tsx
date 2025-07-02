import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFoundPage.css';

const NotFoundPage: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page not Found</h2>
        <p>The page you are looking for does not exist.</p>
        
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