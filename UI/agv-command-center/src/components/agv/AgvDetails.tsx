/**
 * AgvDetails Component - Detailed AGV information modal
 */

import React from 'react';
import { AGV } from '../../services/telemetryService';
import { StatusBadge } from '../common/StatusBadge';

interface DetailFieldProps {
  label: string;
  value: string;
  danger?: boolean;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, value, danger }) => (
  <div className="detail-field">
    <span>{label}</span>
    <strong className={danger ? 'danger-text' : ''}>{value}</strong>
  </div>
);

interface AgvDetailsProps {
  agv: AGV;
  onClose: () => void;
}

export const AgvDetails: React.FC<AgvDetailsProps> = ({ agv, onClose }) => {
  const getAgvRoute = (id: string) => {
    const routes: Record<string, string> = {
      'AGV-01': 'Route A → Assembly',
      'AGV-02': 'Route B → Charging',
      'AGV-11': 'Route C → Maintenance'
    };
    return routes[id] || 'Standard delivery route';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="agv-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${agv.id} details`}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">AGV DETAILS</span>
            <h3>{agv.id}</h3>
          </div>
          <div className="modal-actions">
            <StatusBadge status={agv.status} />
            <button
              type="button"
              className="close-modal-btn"
              aria-label="Close AGV details"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        <div className="detail-grid">
          <DetailField label="Type" value="Automated Guided Vehicle" />
          <DetailField label="Location" value={`${agv.x.toFixed(0)}% / ${agv.y.toFixed(0)}%`} />
          <DetailField label="Current route" value={getAgvRoute(agv.id)} />
          <DetailField label="Battery" value={`${agv.battery}%`} />
          <DetailField label="Motor temp" value={`${agv.motor}°C`} danger={agv.motor >= 85} />
          <DetailField label="RUL" value={`${agv.rul} hours`} danger={agv.rul <= 4} />
        </div>
        <div className="detail-summary">
          <span className="summary-tag">Operational summary</span>
          <p>
            {agv.issue
              ? `Current issue: ${agv.issue}. The vehicle is operating under watch and should be reviewed by maintenance before the next load cycle.`
              : 'No active anomaly detected. The AGV is operating within expected navigation and thermal tolerances for its assigned route.'}
          </p>
        </div>
      </div>
    </div>
  );
};
