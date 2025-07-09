import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';

import '../styles/components/Navbar.css';

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 918 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const navbar = document.querySelector('.navbar');
      if (navbar && !navbar.contains(event.target as Node) && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-branding">
          <Link to="/" className="navbar-logo-link">
            <img 
              src="/logo.jpg" 
              alt="Riforma e Progresso" 
              className="navbar-logo"
            />
          </Link>
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
            aria-expanded={isMobileMenuOpen}
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