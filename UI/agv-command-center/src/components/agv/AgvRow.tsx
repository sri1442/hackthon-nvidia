/**
 * AgvRow Component - Individual AGV row in the fleet table
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatRulHours } from '../../utils/formatRul';

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
        <span className={`status-dot ${agv.status.replace(/\s+/g, '').toLowerCase()}`}></span>
        <strong>{agv.id}</strong>
      </span>
      <span>
        <span className={`status-badge ${agv.status.replace(/\s+/g, '').toLowerCase()}`}>{agv.status}</span>
      </span>
      <span>
        <SeverityBadge severity={agv.severity} />
      </span>
      <span className="bar-value">
        <span className="tiny-bar">
          <i style={{ width: `${agv.battery}%` }}></i>
        </span>
        {agv.battery}%
      </span>
      <span className={agv.motor >= 85 ? 'danger-text' : ''}>{agv.motor}°C</span>
      <span>
        {agv.rulBreakdown && agv.rulBreakdown.length > 0 ? (
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            {agv.rulBreakdown.slice(0, 3).map((entry, index) => {
              const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
              return (
                <span
                  key={`${agv.id}-${entry.group}-${index}`}
                  className={isCritical ? 'danger-text' : ''}
                  style={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}
                >
                  <span style={{ textTransform: 'uppercase' }}>{entry.group}</span>
                  {' · '}
                  <span style={{ textTransform: 'none' }}>{formatRulHours(entry.rul_hours)}</span>
                </span>
              );
            })}
          </span>
        ) : (
          <span className={agv.rul <= 4 ? 'danger-text' : ''}>{formatRulHours(agv.rul)}</span>
        )}
      </span>
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
