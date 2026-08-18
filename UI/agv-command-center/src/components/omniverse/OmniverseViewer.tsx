/**
 * OmniverseViewer Component - Digital Twin visualization
 */

import React from 'react';
import { MapPin, Zap, CircleDot } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SectionTitle } from '../common/SectionTitle';

interface OmniverseViewerProps {
  agvs: AGV[];
  selectedAgv: AGV;
  onSelectAgv: (id: string) => void;
  onFocusCamera: () => void;
  onHighlightAnomaly: () => void;
}

export const OmniverseViewer: React.FC<OmniverseViewerProps> = ({
  agvs,
  selectedAgv,
  onSelectAgv,
  onFocusCamera,
  onHighlightAnomaly
}) => {
  return (
    <div className="panel twin-panel">
      <SectionTitle icon={<MapPin />} title="Omniverse Digital Twin" badge="WEBRTC" />
      <div className="viewport">
        <div className="viewport-top">
          <span>
            <span className="live-dot"></span> LIVE STREAM
          </span>
          <span>60 FPS · WebRTC</span>
        </div>
        <div className="factory-grid"></div>
        <div className="factory-label label-a">ASSEMBLY LINE A</div>
        <div className="factory-label label-b">CHARGING BAY</div>
        <div className="factory-label label-c">MAINTENANCE</div>
        <div className="road r1"></div>
        <div className="road r2"></div>
        <div className="road r3"></div>
        {agvs.map(agv => (
          <button
            key={agv.id}
            title={`${agv.id} · ${agv.status}`}
            onClick={() => onSelectAgv(agv.id)}
            className={`twin-agv ${agv.status.toLowerCase()} ${selectedAgv.id === agv.id ? 'focused' : ''}`}
            style={{ left: `${agv.x}%`, top: `${agv.y}%` }}
          >
            <span></span>
            <b>{agv.id}</b>
          </button>
        ))}
        <div className="camera-target">
          <div></div>
          <span>CAMERA FOCUS · {selectedAgv.id}</span>
        </div>
        <div className="viewport-bottom">
          <span>
            <CircleDot size={13} /> Selected: <strong>{selectedAgv.id}</strong>
          </span>
          <span>USD Prim: /Factory/AGVs/{selectedAgv.id.replace('-', '_')}</span>
        </div>
      </div>
      <div className="twin-actions">
        <button className="secondary-btn" onClick={onFocusCamera}>
          <MapPin size={15} />
          Focus selected
        </button>
        <button className="secondary-btn" onClick={onHighlightAnomaly}>
          <Zap size={15} />
          Highlight anomaly
        </button>
      </div>
    </div>
  );
};
