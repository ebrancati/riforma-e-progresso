import React from 'react';
import type { Template, DaySchedule } from '../../../types/schedule';

interface TemplateCardProps {
  template: Template;
  isLoading: boolean;
  isServerAvailable: boolean;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  generateSummary: (schedule: DaySchedule) => string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isLoading,
  isServerAvailable,
  onEdit,
  onDelete,
  generateSummary
}) => {
  return (
    <div className="template-card">
      <div className="template-header">
        <div className="template-name">{template.name}</div>
        <div className="template-actions">
          <button
            className="btn-icon"
            onClick={() => onEdit(template.id)}
            title="Carica/Modifica"
            disabled={isLoading || !isServerAvailable}
          >
            📝
          </button>
          <button
            className="btn-icon"
            onClick={() => onDelete(template.id)}
            title="Elimina"
            style={{ background: '#e53e3e' }}
            disabled={isLoading || !isServerAvailable}
          >
            🗑️
          </button>
        </div>
      </div>
      <div className="template-summary">
        {generateSummary(template.schedule)}
        <br />
        <small>Creato: {template.created}</small>
      </div>
    </div>
  );
};

export default TemplateCard;