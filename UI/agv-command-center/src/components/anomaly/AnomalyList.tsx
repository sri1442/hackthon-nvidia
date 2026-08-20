/**
 * AnomalyList Component - List of active anomalies
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';
import { AnomalyAlert } from './AnomalyAlert';

interface AnomalyListProps {
  agvs: AGV[];
  onOpenDetails: (id: string, tab?: 'health' | 'battery' | 'nav' | 'drive' | 'mech' | 'safety' | 'alerts') => void;
}

export const AnomalyList: React.FC<AnomalyListProps> = ({ agvs, onOpenDetails }) => {
  const anomalies = agvs.filter(a => a.issue).sort((a, b) => b.rul - a.rul);

  return (
    <section className="panel alerts-panel">
      <SectionTitle icon={<AlertTriangle />} title="Active Anomaly Alerts" badge={`${anomalies.length} ACTIVE`} />
      <div className="alert-grid-scroll">
        <div className="alert-grid">
          {anomalies.map((agv, index) => (
            <AnomalyAlert
              key={agv.id}
              agv={agv}
              rank={index}
              onClick={() => onOpenDetails(agv.id, 'alerts')}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
