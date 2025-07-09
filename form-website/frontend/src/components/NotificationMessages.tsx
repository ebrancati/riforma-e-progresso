import React from 'react';
import '../styles/components/NotificationMessages.css';

interface NotificationMessagesProps {
  error: string | null;
  successMessage: string | null;
}

const NotificationMessages: React.FC<NotificationMessagesProps> = ({ error, successMessage }) => {
  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="notification-error">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="notification-success">
          {successMessage}
        </div>
      )}
    </>
  );
};

export default NotificationMessages;