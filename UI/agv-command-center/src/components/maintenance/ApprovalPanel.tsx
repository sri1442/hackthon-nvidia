/**
 * ApprovalPanel Component - Human-in-the-loop approval gate
 */

import React from 'react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';

interface ApprovalPanelProps {
  agvs: AGV[];
  onOpenDetails: (id: string) => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ agvs, onOpenDetails }) => {
  const getRecommendedAction = (id: string): string => {
    const actions: Record<string, string> = {
      'AGV-11': 'Remove from service',
      'AGV-04': 'Route to charging',
      'AGV-02': 'Inspect next shift'
    };
    return actions[id] || 'Schedule maintenance';
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
              <span className={`status-dot ${agv.status.toLowerCase()}`}></span>
              <strong>{agv.id}</strong>
            </span>
            <span className="action-text">{getRecommendedAction(agv.id)}</span>
            <span className={agv.rul <= 4 ? 'danger-text' : ''}>{agv.rul}h</span>
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
