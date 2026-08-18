/**
 * MaintenanceQueue Component - Ranked maintenance work orders
 */

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';
import { calculateAnomalyScore } from '../../services/anomalyService';

interface MaintenanceQueueProps {
  agvs: AGV[];
  onSelectAgv: (id: string) => void;
}

export const MaintenanceQueue: React.FC<MaintenanceQueueProps> = ({ agvs, onSelectAgv }) => {
  const getRecommendedAction = (id: string): string => {
    const actions: Record<string, string> = {
      'AGV-11': 'Remove from service',
      'AGV-04': 'Route to charging',
      'AGV-02': 'Inspect next shift'
    };
    return actions[id] || 'Schedule maintenance';
  };

  const queue = agvs
    .filter(a => a.issue)
    .sort((a, b) => calculateAnomalyScore(b) - calculateAnomalyScore(a));

  return (
    <section className="panel queue-panel">
      <SectionTitle icon={<ShieldCheck />} title="Ranked Maintenance Queue" badge="AI PRIORITIZED" />
      <div className="queue-table">
        <div className="q-head">
          <span>RANK</span>
          <span>AGV</span>
          <span>ISSUE</span>
          <span>IMPACT</span>
          <span>RUL</span>
          <span>ACTION</span>
        </div>
        {queue.map((agv, i) => (
          <button className="q-row" key={agv.id} onClick={() => onSelectAgv(agv.id)}>
            <span className={`priority ${i === 0 ? 'p1' : ''}`}>#{i + 1}</span>
            <strong>{agv.id}</strong>
            <span>{agv.issue}</span>
            <strong>{calculateAnomalyScore(agv).toFixed(1)}</strong>
            <span className={agv.rul <= 4 ? 'danger-text' : ''}>{agv.rul}h</span>
            <span className="action-text">{getRecommendedAction(agv.id)}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
