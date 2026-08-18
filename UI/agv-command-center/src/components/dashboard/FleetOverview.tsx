/**
 * FleetOverview Component - Top metrics overview
 */

import React from 'react';
import { Bot, CheckCircle2, TriangleAlert, AlertTriangle, Clock3 } from 'lucide-react';
import { AGV } from '../../services/telemetryService';

interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone?: 'good' | 'warn' | 'bad';
}

const Metric: React.FC<MetricProps> = ({ icon, label, value, sub, tone }) => {
  return (
    <div className={`metric-card ${tone || ''}`}>
      <div className="metric-icon">
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
};

interface FleetOverviewProps {
  agvs: AGV[];
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({ agvs }) => {
  const critical = agvs.filter(a => a.status === 'Critical').length;
  const warnings = agvs.filter(a => a.status === 'Warning').length;
  const healthy = agvs.filter(a => a.status === 'Healthy').length;
  const queue = agvs.filter(a => a.issue).length;

  return (
    <section className="metrics-grid">
      <Metric icon={<Bot />} label="Total AGVs" value={agvs.length} sub="Fleet online" />
      <Metric icon={<CheckCircle2 />} label="Healthy" value={healthy} sub="Stable operation" tone="good" />
      <Metric icon={<TriangleAlert />} label="Warning" value={warnings} sub="Needs attention" tone="warn" />
      <Metric icon={<AlertTriangle />} label="Critical" value={critical} sub="Immediate action" tone="bad" />
      <Metric icon={<Clock3 />} label="Active alerts" value={queue} sub="AI-ranked" />
    </section>
  );
};
