/**
 * AgvRow Component - Individual AGV row in the fleet table
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { StatusBadge } from '../common/StatusBadge';

interface AgvRowProps {
  agv: AGV;
  isSelected: boolean;
  onClick: () => void;
  onDetailsClick: (e: React.MouseEvent) => void;
}

export const AgvRow: React.FC<AgvRowProps> = ({ agv, isSelected, onClick, onDetailsClick }) => {
  return (
    <div
      className={`fleet-row ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="agv-name">
        <span className={`status-dot ${agv.status.toLowerCase()}`}></span>
        <strong>{agv.id}</strong>
      </span>
      <span>
        <StatusBadge status={agv.status} />
      </span>
      <span className="bar-value">
        <span className="tiny-bar">
          <i style={{ width: `${agv.battery}%` }}></i>
        </span>
        {agv.battery}%
      </span>
      <span className={agv.motor >= 85 ? 'danger-text' : ''}>{agv.motor}°C</span>
      <span className={agv.rul <= 4 ? 'danger-text' : ''}>{agv.rul}h</span>
      <span className="detail-action-wrap">
        <button
          type="button"
          className="fleet-detail-btn"
          aria-label={`View details for ${agv.id}`}
          onClick={onDetailsClick}
        >
          <ChevronRight size={15} />
        </button>
      </span>
    </div>
  );
};
