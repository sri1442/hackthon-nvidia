/**
 * AgvTable Component - Fleet health table
 */

import React from 'react';
import { Gauge } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { AgvRow } from './AgvRow';
import { SectionTitle } from '../common/SectionTitle';

interface AgvTableProps {
  agvs: AGV[];
  selectedId: string;
  onSelectAgv: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export const AgvTable: React.FC<AgvTableProps> = ({ agvs, selectedId, onSelectAgv, onOpenDetails }) => {
  return (
    <div className="panel fleet-panel">
      <SectionTitle icon={<Gauge />} title="Fleet Health" badge="LIVE" />
      <div className="table-head">
        <span>AGV</span>
        <span>STATUS</span>
        <span>SEVERITY</span>
        <span>BATTERY</span>
        <span>MOTOR</span>
        <span>RUL</span>
        <span>DETAILS</span>
      </div>
      <div className="fleet-list">
        {agvs.map(agv => (
          <AgvRow
            key={agv.id}
            agv={agv}
            isSelected={selectedId === agv.id}
            onClick={() => onSelectAgv(agv.id)}
            onDetailsClick={(e) => {
              e.stopPropagation();
              onOpenDetails(agv.id);
            }}
          />
        ))}
      </div>
    </div>
  );
};
