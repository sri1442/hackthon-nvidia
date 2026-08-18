/**
 * HeroSection Component - Hero banner with breadcrumbs
 */

import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  lastUpdate: Date;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ lastUpdate }) => {
  return (
    <section className="hero-row">
      <div>
        <div className="breadcrumb">
          <span>OPERATIONS</span>
          <ChevronRight size={14} />
          <span>FLEET MONITORING</span>
        </div>
        <h2>Predictive Maintenance Operations</h2>
        <p>Realtime fleet telemetry, AI prioritization and human-approved actions in one digital-twin workspace.</p>
      </div>
      <div className="stream-meta">
        <Activity size={16} />
        <span>Last update</span>
        <strong>{lastUpdate.toLocaleTimeString()}</strong>
        <span className="stream-pill">2.2s stream</span>
      </div>
    </section>
  );
};
