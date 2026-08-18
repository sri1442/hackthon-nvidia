/**
 * ApprovalModal Component - Work order approval modal
 */

import React, { useState } from 'react';
import { Bot, CheckCircle2, XCircle } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatRulHours } from '../../utils/formatRul';

interface ApprovalModalProps {
  agv: AGV;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  approval: 'pending' | 'approved' | 'rejected';
}

interface EvidenceProps {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
}

const Evidence: React.FC<EvidenceProps> = ({ label, value, danger }) => (
  <div className="evidence">
    <span>{label}</span>
    <strong className={danger ? 'danger-text' : ''}>{value}</strong>
  </div>
);

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ agv, onClose, onApprove, onReject, approval }) => {
  const getRecommendedAction = (id: string): string => {
    const actions: Record<string, string> = {
      'AGV-11': 'Remove from service',
      'AGV-04': 'Route to charging',
      'AGV-02': 'Inspect next shift'
    };
    return actions[id] || 'Schedule maintenance';
  };

  const getDiagnosticSummary = (id: string): string => {
    const summaries: Record<string, string> = {
      'AGV-11': 'Motor temperature has risen across consecutive telemetry windows while navigation is in FAULT state. Immediate removal minimizes failure and production risk.',
      'AGV-04': 'Battery health has degraded beyond operational threshold. Recommend charging cycle and capacity assessment.',
      'AGV-02': 'The current anomaly requires operator review before a maintenance action is executed.'
    };
    return summaries[id] || 'The vehicle requires inspection and maintenance.';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="agv-detail-modal approval-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${agv.id} approval details`}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">RECOMMENDED ACTION</span>
            <h3>
              {agv.id} · {getRecommendedAction(agv.id)}
            </h3>
          </div>
          <div className="modal-actions">
            <SeverityBadge severity={agv.severity} />
            <button
              type="button"
              className="close-modal-btn"
              aria-label="Close approval details"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        <div className="approval-modal-body">
          <div className="evidence-grid approval-grid">
            <Evidence label="Root cause" value={agv.issue || 'No active anomaly'} />
            <div className="evidence">
              <span>RUL</span>
              <strong style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                {agv.rulBreakdown && agv.rulBreakdown.length > 0 ? (
                  agv.rulBreakdown.map((entry, index) => {
                    const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
                    return (
                      <span
                        key={`${agv.id}-modal-rul-${index}`}
                        className={isCritical ? 'danger-text' : ''}
                        style={{
                          lineHeight: 1.2,
                          color: isCritical ? '#f2787e' : '#cbd3df',
                          display: 'inline-flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ textTransform: 'uppercase', color: isCritical ? '#f2787e' : '#cbd3df' }}>{entry.group}</span>
                        <span style={{ color: isCritical ? '#f2787e' : '#cbd3df' }}>·</span>
                        <span style={{ textTransform: 'none', color: isCritical ? '#f2787e' : '#cbd3df' }}>{formatRulHours(entry.rul_hours)}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className={agv.rul <= 4 ? 'danger-text' : ''} style={{ color: agv.rul <= 4 ? '#f2787e' : '#cbd3df' }}>
                    {formatRulHours(agv.rul)}
                  </span>
                )}
              </strong>
            </div>
            <Evidence label="Motor temp" value={`${agv.motor}°C`} danger={agv.motor >= 85} />
            <Evidence label="AI confidence" value={agv.id === 'AGV-11' ? '96%' : '89%'} />
          </div>
          <div className="ai-summary">
            <Bot size={17} />
            <div style={{ marginTop: '-5px' }}>
              <strong>Diagnostic Agent recommendation</strong>
              <p>{getDiagnosticSummary(agv.id)}</p>
            </div>
          </div>
          <div className="approval-actions modal-actions-row">
            <button
              className={`approve-btn ${approval === 'approved' ? 'done' : ''}`}
              onClick={onApprove}
            >
              <CheckCircle2 size={17} />
              {approval === 'approved' ? 'Approved' : 'Approve work order'}
            </button>
            <button
              className={`reject-btn ${approval === 'rejected' ? 'done' : ''}`}
              onClick={onReject}
            >
              <XCircle size={17} />
              {approval === 'rejected' ? 'Re-diagnosis requested' : 'Reject / Re-diagnose'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
