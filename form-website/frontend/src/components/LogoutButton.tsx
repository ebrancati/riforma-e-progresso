import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/LogoutButton.css';

interface LogoutButtonProps {
  className?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className = '' }) => {
  const { logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    if (window.confirm('Sei sicuro di voler uscire?')) {
      logout();
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className={`logout-button ${className}`}
      title="Esci dal pannello amministratore"
    >
      <span className="logout-icon">🚪</span>
      <span className="logout-text">Esci</span>
    </button>
  );
};

export default LogoutButton;