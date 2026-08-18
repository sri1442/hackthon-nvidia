/**
 * AnomalyAlert Component - Individual anomaly card
 */

import React from 'react';
import { ArrowUpRight, Bot } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { StatusBadge } from '../common/StatusBadge';
import { calculateAnomalyScore } from '../../services/anomalyService';

interface AnomalyAlertProps {
  agv: AGV;
  rank: number;
  onClick: () => void;
}

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ agv, rank, onClick }) => {
  const timeAgo = `${rank + 1}m ago`;
  const confidence = agv.id === 'AGV-11' ? '96%' : '89%';

  return (
    <button className={`alert-card ${agv.status.toLowerCase()}`} onClick={onClick}>
      <div className="alert-top">
        <span className="rank">#{rank + 1}</span>
        <StatusBadge status={agv.status} />
        <span className="alert-time">{rank === 0 ? 'just now' : timeAgo}</span>
      </div>
      <h3>
        {agv.id} <ArrowUpRight size={15} />
      </h3>
      <p>{agv.issue}</p>
      <div className="alert-stats">
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <strong>RUL</strong>
          {agv.rulBreakdown && agv.rulBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.2, textTransform: 'uppercase', paddingLeft: '8px' }}>
              {agv.rulBreakdown.slice(0, 3).map((entry, index) => {
                const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
                return (
                  <div
                    key={`${agv.id}-alert-rul-${index}`}
                    className={isCritical ? 'danger-text' : ''}
                  >
                    {entry.group} · {entry.rul_hours}h
                  </div>
                );
              })}
            </div>
          ) : (
            <span className={agv.rul <= 4 ? 'danger-text' : ''}>{agv.rul}h</span>
          )}
        </span>
        <span>
          <strong>Motor</strong>
          {agv.motor}°C
        </span>
        <span>
          <strong>Impact</strong>
          {calculateAnomalyScore(agv).toFixed(1)}/10
        </span>
      </div>
      <div className="ai-line">
        <Bot size={14} /> Watcher Agent · {confidence} confidence
      </div>
    </button>
  );
};
