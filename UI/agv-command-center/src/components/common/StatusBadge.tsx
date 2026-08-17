/**
 * StatusBadge Component - Displays status with styling
 */

import React from 'react';

interface StatusBadgeProps {
  status: 'Healthy' | 'Warning' | 'Critical';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<string, React.CSSProperties> = {
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
    <span className={`status-badge ${status.toLowerCase()}`}>
      {status}
    </span>
  );
};
