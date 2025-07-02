// src/components/EditModal.tsx
import React from 'react';

interface EditModalProps {
  isOpen: boolean;
  onCreateCopy: () => void;
  onEditOriginal: () => void;
  onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onCreateCopy,
  onEditOriginal,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>
          Cosa vuoi fare?
        </h3>
        <p style={{ marginBottom: '25px', color: '#666', lineHeight: '1.5' }}>
          Vuoi modificare il template esistente o creare una nuova copia?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={onCreateCopy}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Crea Copia
          </button>
          <button
            onClick={onEditOriginal}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Modifica Originale
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;