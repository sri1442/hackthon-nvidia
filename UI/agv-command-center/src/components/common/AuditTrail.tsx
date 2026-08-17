/**
 * AuditTrail Component - Immutable event log
 */

import React from 'react';
import { History } from 'lucide-react';
import { SectionTitle } from '../common/SectionTitle';

export type AuditLevel = 'info' | 'warning' | 'critical' | 'success';

export interface AuditEntry {
  timestamp: string;
  message: string;
  actor: string;
  level: AuditLevel;
}

interface AuditTrailProps {
  entries: AuditEntry[];
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ entries }) => {
  return (
    <div className="panel audit-panel">
      <SectionTitle icon={<History />} title="Audit Trail" badge="IMMUTABLE LOG" />
      <div className="timeline">
        {entries.map((entry, i) => (
          <div className="timeline-item" key={`${entry.timestamp}-${i}`}>
            <span className={`timeline-dot ${entry.level}`}></span>
            <div>
              <div className="timeline-top">
                <strong>{entry.timestamp}</strong>
                <span>{entry.actor}</span>
              </div>
              <p>{entry.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
