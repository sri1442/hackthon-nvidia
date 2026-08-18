/**
 * Anomaly Service - Handles alert and anomaly detection data
 */

import { Alert, mockActiveAlerts } from '../data/mockData';
import { AGV } from './telemetryService';

export interface AnomalyData {
  rank: number;
  agv: AGV;
  confidence: number;
  score: number;
  timestamp: string;
}

export function calculateAnomalyScore(agv: AGV): number {
  let score = 0;
  const severity = String((agv.rawState?.severity ?? agv.severity)).toLowerCase();

  if (severity === 'critical') score += 10;
  if (severity === 'warning') score += 5;

  if (agv.rul <= 4) score += 5;
  if (agv.motor >= 85) score += 3;
  if (agv.battery <= 40) score += 2;

  return Math.min(score, 10);
}

export function rankAnomalies(agvs: AGV[]): AnomalyData[] {
  return agvs
    .filter(a => a.issue)
    .map((agv, index) => ({
      rank: index + 1,
      agv,
      confidence: 0.89 + Math.random() * 0.1,
      score: calculateAnomalyScore(agv),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }))
    .sort((a, b) => b.score - a.score);
}

export function getAnomalyColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'background-color:#ff4444;color:white',
    warning: 'background-color:#ffaa00;color:black',
    info: 'background-color:#aaaaaa'
  };
  return colors[severity] || '';
}
