/**
 * MaintenanceQueue Component - Ranked maintenance work orders
 */

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';
import { calculateAnomalyScore } from '../../services/anomalyService';
import { formatRulHours } from '../../utils/formatRul';

interface MaintenanceQueueProps {
  agvs: AGV[];
  onSelectAgv: (id: string) => void;
}

export const MaintenanceQueue: React.FC<MaintenanceQueueProps> = ({ agvs, onSelectAgv }) => {
  const getRecommendedAction = (agv: AGV): string => {
    const raw = (agv as any).diagnosis || (agv as any).diagnoses || (agv as any).rawState?.diagnosis || (agv as any).rawState?.diagnoses || null;
    if (!raw) return agv.issue || 'Schedule maintenance';

    const normalizeArray = (d: any): any[] => {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      return [d];
    };

    const entries = normalizeArray(raw).flatMap((item: any) => {
      if (!item) return [];
      if (item.diagnosis) return normalizeArray(item.diagnosis);
      return [item];
    });

    const rawActions = entries.map((e: any) => e?.action || e?.diagnosis?.action || e?.recommendation || e?.diagnosis?.recommendation).filter(Boolean);
    const mapAction = (a: string) => {
      const token = String(a).toLowerCase();
      if (token === 'immediate' || token.includes('remove')) return 'Remove from service';
      if (token.includes('charge') || token.includes('charging') || token.includes('route')) return 'Route to charging';
      if (token.includes('inspect') || token.includes('review')) return 'Inspect next shift';
      if (token.includes('schedule')) return 'Schedule maintenance';
      return a;
    };

    const actions = rawActions.map(mapAction);
    if (actions.length) return [...new Set(actions)].join(', ');

    const fallbacks = entries.map((e: any) => e?.root_cause).filter(Boolean);
    if (fallbacks.length) return fallbacks.join(', ');

    return agv.issue || 'Schedule maintenance';
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
            <span>
              {agv.rulBreakdown && agv.rulBreakdown.length > 0 ? (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  {agv.rulBreakdown.slice(0, 3).map((entry, index) => {
                    const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
                    return (
                      <span
                        key={`${agv.id}-queue-rul-${index}`}
                        className={isCritical ? 'danger-text' : ''}
                        style={{ lineHeight: 1.2 }}
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
            <span className="action-text">{getRecommendedAction(agv)}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
