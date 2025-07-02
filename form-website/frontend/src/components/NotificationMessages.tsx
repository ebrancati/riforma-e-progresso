import React from 'react';

interface NotificationMessagesProps {
  error: string | null;
  successMessage: string | null;
}

const NotificationMessages: React.FC<NotificationMessagesProps> = ({ error, successMessage }) => {
  return (
    <>
      {/* Error Message */}
      {error && (
        <div style={{ 
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#fed7d7', 
          color: '#c53030',
          padding: '15px 25px', 
          borderRadius: '8px',
          border: '1px solid #feb2b2',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          maxWidth: '90vw',
          minWidth: '300px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          animation: 'slideDown 0.3s ease-out'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{ 
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#c6f6d5', 
          color: '#22543d',
          padding: '15px 25px', 
          borderRadius: '8px',
          border: '1px solid #9ae6b4',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          maxWidth: '90vw',
          minWidth: '300px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          animation: 'slideDown 0.3s ease-out'
        }}>
          ✅ {successMessage}
        </div>
      )}
    </>
  );
};

export default NotificationMessages;