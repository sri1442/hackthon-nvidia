import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Services
import { useAgvTelemetry } from './hooks/useAgvTelemetry';
import { useAgvSelection } from './hooks/useAgvSelection';
import { fetchStreamData, AGV } from './services/telemetryService';
import { AuditEntry } from './components/common/AuditTrail';

// Components
import { Header } from './components/common/Header';
import { HeroSection } from './components/dashboard/HeroSection';
import { FleetOverview } from './components/dashboard/FleetOverview';
import { AgvTable } from './components/agv/AgvTable';
import { AgvDetails } from './components/agv/AgvDetails';
import { OmniverseViewer } from './components/omniverse/OmniverseViewer';
import { AnomalyList } from './components/anomaly/AnomalyList';
import { MaintenanceQueue } from './components/maintenance/MaintenanceQueue';
import { ApprovalPanel } from './components/maintenance/ApprovalPanel';
import { ApprovalModal } from './components/maintenance/ApprovalModal';
import { AuditTrail } from './components/common/AuditTrail';
import { Toast } from './components/common/Toast';

import './styles.css';

// UI position map for digital twin visualization
const uiPositionMap = {
  'AGV-01': { x: 18, y: 28 },
  'AGV-02': { x: 62, y: 22 },
  'AGV-03': { x: 35, y: 68 },
  'AGV-04': { x: 77, y: 62 },
  'AGV-05': { x: 54, y: 48 },
  'AGV-06': { x: 88, y: 30 },
  'AGV-07': { x: 22, y: 78 },
  'AGV-08': { x: 67, y: 79 },
  'AGV-09': { x: 45, y: 18 },
  'AGV-10': { x: 10, y: 52 },
  'AGV-11': { x: 72, y: 38 },
  'AGV-12': { x: 51, y: 87 }
};

const initialAudit: AuditEntry[] = [
  {
    timestamp: '08:42:17',
    message: 'Telemetry stream updated',
    actor: 'SYSTEM',
    level: 'info'
  },
  {
    timestamp: '08:41:54',
    message: 'AGV-11 escalated to CRITICAL',
    actor: 'WATCHER AGENT',
    level: 'critical'
  },
  {
    timestamp: '08:40:31',
    message: 'Maintenance recommendation generated',
    actor: 'DIAGNOSTIC AGENT',
    level: 'warning'
  },
  {
    timestamp: '08:37:12',
    message: 'Motor anomaly detected on AGV-11',
    actor: 'WATCHER AGENT',
    level: 'warning'
  },
  {
    timestamp: '08:31:48',
    message: 'Fleet session connected',
    actor: 'SYSTEM',
    level: 'info'
  }
];

function App() {
  // Core state management
  const [streaming, setStreaming] = useState(true);
  const [connected, setConnected] = useState(true);
  const [approval, setApproval] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);

  // Telemetry hook
  const { agvs, lastUpdate } = useAgvTelemetry(streaming, uiPositionMap);

  // Selection management
  const {
    selectedId,
    detailAgvId,
    approvalAgvId,
    selectAgv,
    openAgvDetails,
    closeAgvDetails,
    openApprovalDetails,
    closeApprovalDetails
  } = useAgvSelection('AGV-11');

  // Derived state
  const selected = agvs.find(a => a.id === selectedId) || agvs[0];
  const detailAgv = agvs.find(a => a.id === detailAgvId) || null;
  const approvalAgv = approvalAgvId ? agvs.find(a => a.id === approvalAgvId) || null : null;

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Event handlers
  const handleToggleStream = () => {
    setStreaming(v => !v);
    addAudit(
      streaming ? 'Stream paused by operator' : 'Stream resumed by operator',
      'OPERATOR',
      'info'
    );
  };

  const handleSimulateAnomaly = () => {
    // In real app, would trigger anomaly injection
    addAudit('Synthetic anomaly injected into AGV-02', 'DEMO CONTROL', 'critical');
    setToast('Demo anomaly injected: AGV-02');
  };

  const handleSelectAgv = (id: string) => {
    selectAgv(id);
    setApproval('pending');
    addAudit(`${id} selected; camera focus requested`, 'OPERATOR', 'info');
    setToast(`Focus command sent to Omniverse: ${id}`);
  };

  const handleOpenAgvDetails = (id: string) => {
    openAgvDetails(id);
    addAudit(`${id} details opened`, 'OPERATOR', 'info');
    setToast(`AGV details opened for ${id}`);
  };

  const handleOpenApprovalDetails = (id: string) => {
    openApprovalDetails(id);
    addAudit(`${id} approval review opened`, 'OPERATOR', 'info');
    setToast(`Approval review opened for ${id}`);
  };

  const handleApprove = () => {
    setApproval('approved');
    addAudit(`${selected.id} work order APPROVED`, 'OPERATOR', 'success');
    setToast(`${selected.id} maintenance work order approved`);
  };

  const handleReject = () => {
    setApproval('rejected');
    addAudit(`${selected.id} recommendation rejected / re-diagnosis requested`, 'OPERATOR', 'warning');
    setToast(`Re-diagnosis requested for ${selected.id}`);
  };

  const addAudit = (message: string, actor: string, level: AuditEntry['level']) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setAudit(prev => [{ timestamp, message, actor, level }, ...prev].slice(0, 8));
  };

  return (
    <div className="app-shell">
      <Header
        connected={connected}
        streaming={streaming}
        onToggleStream={handleToggleStream}
        onSimulateAnomaly={handleSimulateAnomaly}
      />

      <main>
        <HeroSection lastUpdate={lastUpdate} />

        <FleetOverview agvs={agvs} />

        <section className="main-grid">
          <AgvTable
            agvs={agvs}
            selectedId={selectedId}
            onSelectAgv={handleSelectAgv}
            onOpenDetails={handleOpenAgvDetails}
          />

          {selected && (
            <OmniverseViewer
              agvs={agvs}
              selectedAgv={selected}
              onSelectAgv={handleSelectAgv}
              onFocusCamera={() => setToast(`Camera focused on ${selected.id}`)}
              onHighlightAnomaly={() => setToast('Omniverse highlight command sent')}
            />
          )}
        </section>

        <AnomalyList agvs={agvs} onSelectAgv={handleSelectAgv} />

        <MaintenanceQueue agvs={agvs} onSelectAgv={handleSelectAgv} />

        <section className="bottom-grid">
          <ApprovalPanel agvs={agvs} onOpenDetails={handleOpenApprovalDetails} />
          <AuditTrail entries={audit} />
        </section>
      </main>

      {detailAgv && <AgvDetails agv={detailAgv} onClose={closeAgvDetails} />}

      {approvalAgv && (
        <ApprovalModal
          agv={approvalAgv}
          onClose={closeApprovalDetails}
          onApprove={handleApprove}
          onReject={handleReject}
          approval={approval}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

// Mount app
const root = createRoot(document.getElementById('app')!);
root.render(<App />);
