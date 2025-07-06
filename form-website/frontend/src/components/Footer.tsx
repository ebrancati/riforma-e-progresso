import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Footer.css';

const Footer: React.FC = () => {
  const location = useLocation();
  const hideAdminLink = location.pathname === '/login' || 
                       location.pathname.startsWith('/admin');

  return (
    <footer className="app-footer">
      <p>
        <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
        {!hideAdminLink && (
          <Link to="/login" className="footer-link">Area Amministratori</Link>
        )}
      </p>
    </footer>
  );
};

export default Footer;