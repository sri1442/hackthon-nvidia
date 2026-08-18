/**
 * SeverityBadge Component - Displays severity with styling
 */

import React from 'react';

interface SeverityBadgeProps {
  severity: 'Healthy' | 'Warning' | 'Critical';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const severityStyles: Record<string, React.CSSProperties> = {
    Healthy: { 
      padding: '4px 8px', 
      borderRadius: '4px', 
      fontSize: '12px', 
      fontWeight: 'bold',
      backgroundColor: '#44ff44',
      color: 'black'
    },
    Warning: { 
      padding: '4px 8px', 
      borderRadius: '4px', 
      fontSize: '12px', 
      fontWeight: 'bold',
      backgroundColor: '#ffaa00',
      color: 'black'
    },
    Critical: { 
      padding: '4px 8px', 
      borderRadius: '4px', 
      fontSize: '12px', 
      fontWeight: 'bold',
      backgroundColor: '#ff4444',
      color: 'white'
    }
  };

  return (
    <span className={`severity-badge ${severity.toLowerCase()}`}>
      {severity}
    </span>
  );
};
