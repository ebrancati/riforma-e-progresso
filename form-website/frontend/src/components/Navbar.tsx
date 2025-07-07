import React, { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-branding">
          <a href="/" className="navbar-logo-link">
            <img 
              src="/logo.jpg" 
              alt="Riforma e Progresso" 
              className="navbar-logo"
            />
          </a>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-menu">
          <ul className="navbar-menu-list">
            <li className="navbar-menu-item navbar-dropdown">
              <a href="https://riformaeprogresso.it/chi-siamo" target="_blank" className="navbar-menu-link">
                <span>Chi siamo</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </a>
              <ul className="navbar-submenu">
                <li><a href="https://riformaeprogresso.it/il-nostro-team" target="_blank">Il nostro team</a></li>
                <li><a href="https://riformaeprogresso.it/statuto" target="_blank">Statuto</a></li>
                <li><a href="https://riformaeprogresso.it/carta-dei-valori" target="_blank">Carta dei valori</a></li>
              </ul>
            </li>

            <li className="navbar-menu-item">
              <a href="https://riformaeprogresso.it/programma" target="_blank" className="navbar-menu-link">
                <span>Programma</span>
              </a>
            </li>

            <li className="navbar-menu-item">
              <a href="https://riformaeprogresso.it/politiche" target="_blank" className="navbar-menu-link">
                <span>Posizioni</span>
              </a>
            </li>

            <li className="navbar-menu-item navbar-dropdown">
              <button className="navbar-menu-link dropdown-toggle">
                <span>Cosa facciamo</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </button>
              <ul className="navbar-submenu">
                <li><a href="https://riformaeprogresso.it/collaborazioni" target="_blank">Collaborazioni</a></li>
                <li><a href="https://riformaeprogresso.it/i-nostri-eventi" target="_blank">Eventi</a></li>
              </ul>
            </li>

            <li className="navbar-menu-item navbar-dropdown">
              <button className="navbar-menu-link dropdown-toggle">
                <span>Trasparenza</span>
                <ChevronDown size={16} className="dropdown-icon" />
              </button>
              <ul className="navbar-submenu">
                <li><a href="https://riformaeprogresso.it/rendicontazione" target="_blank">Rendicontazione</a></li>
                <li><a href="https://riformaeprogresso.it/5x1000" target="_blank">5×1000</a></li>
              </ul>
            </li>

            <li className="navbar-menu-item">
              <a href="https://riformaeprogresso.it/contatti" target="_blank" className="navbar-menu-link">
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
            {isMobileMenuOpen ? (
              <X size={24} className="mobile-menu-icon" />
            ) : (
              <Menu size={24} className="mobile-menu-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-menu-list">
          <li className="mobile-menu-item">
            <a href="https://riformaeprogresso.it/chi-siamo" target="_blank">Chi siamo</a>
            <ul className="mobile-submenu">
              <li><a href="https://riformaeprogresso.it/il-nostro-team" target="_blank">Il nostro team</a></li>
              <li><a href="https://riformaeprogresso.it/statuto" target="_blank">Statuto</a></li>
              <li><a href="https://riformaeprogresso.it/carta-dei-valori" target="_blank">Carta dei valori</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <a href="https://riformaeprogresso.it/programma" target="_blank">Programma</a>
          </li>
          <li className="mobile-menu-item">
            <a href="https://riformaeprogresso.it/politiche" target="_blank">Posizioni</a>
          </li>
          <li className="mobile-menu-item">
            <span>Cosa facciamo</span>
            <ul className="mobile-submenu">
              <li><a href="https://riformaeprogresso.it/collaborazioni" target="_blank">Collaborazioni</a></li>
              <li><a href="https://riformaeprogresso.it/i-nostri-eventi" target="_blank">Eventi</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <span>Trasparenza</span>
            <ul className="mobile-submenu">
              <li><a href="https://riformaeprogresso.it/rendicontazione" target="_blank">Rendicontazione</a></li>
              <li><a href="https://riformaeprogresso.it/5x1000" target="_blank">5×1000</a></li>
            </ul>
          </li>
          <li className="mobile-menu-item">
            <a href="https://riformaeprogresso.it/contatti" target="_blank" className="navbar-menu-link">Contatti</a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;