/**
 * Header Component - Top navigation and severity bar
 */

import React from 'react';
import { Factory, Radio, Sparkles } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  streaming: boolean;
  onToggleStream: () => void;
  onSimulateAnomaly: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connected,
  streaming,
  onToggleStream,
  onSimulateAnomaly
}) => {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          <Factory size={21} />
        </div>
        <div>
          <div className="eyebrow">INDUSTRIAL AI</div>
          <h1>AGV Command Center</h1>
        </div>
      </div>
      <div className="top-actions">
        <div className="connection">
          <span className={`live-dot ${connected ? '' : 'off'}`}></span>
          {connected ? 'Telemetry LIVE' : 'Disconnected'}
          <span className="separator">•</span> Omniverse <span className="mini-ok">●</span>
        </div>
        <button className="ghost-btn" onClick={onToggleStream}>
          <Radio size={16} />
          {streaming ? 'Pause stream' : 'Resume stream'}
        </button>
        <button className="ghost-btn" onClick={onSimulateAnomaly}>
          <Sparkles size={16} />
          Demo anomaly
        </button>
      </div>
    </header>
  );
};
