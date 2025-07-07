import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLinkClick = (href: string) => {
    // In a real app, you would use React Router's navigate here
    console.log(`Navigating to: ${href}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Branding Section */}
        <div className="navbar-branding">
          <a href="/" className="navbar-logo-link">
            <img 
              src="https://riformaeprogresso.it/wp-content/uploads/2025/06/Variante-Web.png" 
              alt="Riforma e Progresso" 
              className="navbar-logo"
            />
          </a>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-menu">
          <ul className="navbar-menu-list">
            {/* Chi siamo with dropdown */}
            <li className="navbar-menu-item navbar-dropdown">
              <a href="/chi-siamo" className="navbar-menu-link">
                <span>Chi siamo</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </a>
              <ul className="navbar-submenu">
                <li><a href="/il-nostro-team">Il nostro team</a></li>
                <li><a href="/statuto">Statuto</a></li>
                <li><a href="/carta-dei-valori">Carta dei valori</a></li>
              </ul>
            </li>

            {/* Programma */}
            <li className="navbar-menu-item">
              <a href="/programma" className="navbar-menu-link">
                <span>Programma</span>
              </a>
            </li>

            {/* Posizioni */}
            <li className="navbar-menu-item">
              <a href="/politiche" className="navbar-menu-link">
                <span>Posizioni</span>
              </a>
            </li>

            {/* Cosa facciamo with dropdown */}
            <li className="navbar-menu-item navbar-dropdown">
              <button className="navbar-menu-link dropdown-toggle">
                <span>Cosa facciamo</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </button>
              <ul className="navbar-submenu">
                <li><a href="/collaborazioni">Collaborazioni</a></li>
                <li><a href="/i-nostri-eventi">Eventi</a></li>
              </ul>
            </li>

            {/* Trasparenza with dropdown */}
            <li className="navbar-menu-item navbar-dropdown">
              <button className="navbar-menu-link dropdown-toggle">
                <span>Trasparenza</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </button>
              <ul className="navbar-submenu">
                <li><a href="/rendicontazione">Rendicontazione</a></li>
                <li><a href="/5x1000">5×1000</a></li>
              </ul>
            </li>

            {/* Contatti */}
            <li className="navbar-menu-item">
              <a href="/contatti" className="navbar-menu-link">
                <span>Contatti</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Mobile Toggle */}
        <div className="navbar-extras">
          <button 
            className={`navbar-mobile-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-menu-list">
          <li className="mobile-menu-item">
            <a href="/chi-siamo" onClick={() => handleLinkClick('/chi-siamo')}>Chi siamo</a>
            <ul className="mobile-submenu">
              <li><a href="/il-nostro-team" onClick={() => handleLinkClick('/il-nostro-team')}>Il nostro team</a></li>
              <li><a href="/statuto" onClick={() => handleLinkClick('/statuto')}>Statuto</a></li>
              <li><a href="/carta-dei-valori" onClick={() => handleLinkClick('/carta-dei-valori')}>Carta dei valori</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <a href="/programma" onClick={() => handleLinkClick('/programma')}>Programma</a>
          </li>
          <li className="mobile-menu-item">
            <a href="/politiche" onClick={() => handleLinkClick('/politiche')}>Posizioni</a>
          </li>
          <li className="mobile-menu-item">
            <span>Cosa facciamo</span>
            <ul className="mobile-submenu">
              <li><a href="/collaborazioni" onClick={() => handleLinkClick('/collaborazioni')}>Collaborazioni</a></li>
              <li><a href="/i-nostri-eventi" onClick={() => handleLinkClick('/i-nostri-eventi')}>Eventi</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <span>Trasparenza</span>
            <ul className="mobile-submenu">
              <li><a href="/rendicontazione" onClick={() => handleLinkClick('/rendicontazione')}>Rendicontazione</a></li>
              <li><a href="/5x1000" onClick={() => handleLinkClick('/5x1000')}>5×1000</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <a href="/contatti" onClick={() => handleLinkClick('/contatti')}>Contatti</a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;