import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { InstagramIcon, FacebookIcon, YoutubeIcon, LinkedinIcon } from './icons/SocialIcons';
import '../styles/components/Footer.css';

const Footer: React.FC = () => {
  const location = useLocation();
  const hideAdminLink = location.pathname === '/login' || 
                        location.pathname.startsWith('/admin');

  const hidePrivacyPolicyLink = location.pathname === '/privacy-policy' || 
                                location.pathname.startsWith('/privacy-policy');

  return (
    <footer className="app-footer">
      <div className="footer-links">
        <div className="social-icons">
          <a href="https://www.instagram.com/riformaeprogresso" target="_blank" className="social-icon" aria-label="Instagram">
            <InstagramIcon size={20} />
          </a>
          <a href="https://www.facebook.com/riformaeprogresso" target="_blank" className="social-icon" aria-label="Facebook">
            <FacebookIcon size={20} />
          </a>
          <a href="https://www.youtube.com/channel/UCdd1qPvimYJPFHzegzRhrVw" target="_blank" className="social-icon" aria-label="YouTube">
            <YoutubeIcon size={20} />
          </a>
          <a href="https://www.linkedin.com/company/riforma-e-progresso/?viewAsMember=true" target="_blank" className="social-icon" aria-label="LinkedIn">
            <LinkedinIcon size={20} />
          </a>
        </div>

        <div className="footer-btn-container">
          {!hidePrivacyPolicyLink && (
            <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
          )}
          {!hideAdminLink && (
            <Link to="/login" className="footer-link">Area Amministratori</Link>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;