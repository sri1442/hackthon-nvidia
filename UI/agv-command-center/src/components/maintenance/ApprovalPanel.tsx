/**
 * ApprovalPanel Component - Human-in-the-loop approval gate
 */

import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';
import { formatRulHours } from '../../utils/formatRul';

interface ApprovalPanelProps {
  agvs: AGV[];
  onOpenDetails: (id: string) => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ agvs, onOpenDetails }) => {
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

  const approvalQueue = agvs
    .filter(a => a.issue)
    .sort((a, b) => a.rul - b.rul);

  return (
    <div className="panel approval-panel">
      <SectionTitle icon={<ShieldCheck />} title="Human Approval Gate" badge="HITL" />
      <div className="approval-table-head">
        <span>FLEET NAME</span>
        <span>RECOMMENDED ACTION</span>
        <span>RUL</span>
        <span>AI CONFIDENCE</span>
        <span>DETAILS</span>
      </div>
      <div className="approval-table">
        {approvalQueue.map(agv => (
          <div className="approval-row" key={agv.id}>
            <span className="agv-name">
              <span className={`severity-dot ${agv.severity.toLowerCase()}`}></span>
              <strong>{agv.id}</strong>
            </span>
            <span className="action-text">{getRecommendedAction(agv)}</span>
            <span>
              {agv.rulBreakdown && agv.rulBreakdown.length > 0 ? (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  {agv.rulBreakdown.slice(0, 3).map((entry, index) => {
                    const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
                    return (
                      <span
                        key={`${agv.id}-approval-rul-${index}`}
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
            <span>{agv.id === 'AGV-11' ? '96%' : '89%'}</span>
            <span className="detail-action-wrap">
              <button
                type="button"
                className="fleet-detail-btn"
                aria-label={`Open approval details for ${agv.id}`}
                onClick={() => onOpenDetails(agv.id)}
              >
                <ChevronRight size={15} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
