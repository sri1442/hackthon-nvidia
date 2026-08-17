/**
 * Telemetry Service - Handles AGV telemetry data
 */

import {
  mockCurrentState,
  mockFleetSummary,
  mockActiveAlerts,
  AgvState,
  FleetSummary,
  Alert
} from '../data/mockData';

export interface AGV {
  id: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  battery: number;
  motor: number;
  rul: number;
  navigation: string;
  issue: string | null;
  bearing_vibration: number;
  speed: number;
  x: number;
  y: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export async function fetchFleetSummary(): Promise<FleetSummary> {
  try {
    if (USE_MOCK) return mockFleetSummary;
    const response = await fetch(`${API_BASE}/fleet/summary`, { signal: AbortSignal.timeout(3000) });
    return await response.json();
  } catch (error) {
    console.warn('fetchFleetSummary error, using mock:', error);
    return mockFleetSummary;
  }
}

export async function fetchActiveAlerts(): Promise<Alert[]> {
  try {
    if (USE_MOCK) return mockActiveAlerts;
    const response = await fetch(`${API_BASE}/alerts/active`, { signal: AbortSignal.timeout(3000) });
    return await response.json();
  } catch (error) {
    console.warn('fetchActiveAlerts error, using mock:', error);
    return mockActiveAlerts;
  }
}

export async function fetchCurrentState(): Promise<AgvState[]> {
  try {
    if (USE_MOCK) return mockCurrentState;
    const response = await fetch(`${API_BASE}/agv/current_state`, { signal: AbortSignal.timeout(3000) });
    return await response.json();
  } catch (error) {
    console.warn('fetchCurrentState error, using mock:', error);
    return mockCurrentState;
  }
}

export function mapStateToAgv(state: AgvState, uiOverrides: Partial<AGV> = {}): AGV {
  return {
    id: state.agv_id,
    status: (state.severity.charAt(0).toUpperCase() + state.severity.slice(1)) as 'Healthy' | 'Warning' | 'Critical',
    battery: Math.round(state.battery_soh * 100),
    motor: Math.round(state.drive_motor_current_a),
    rul: Math.round(state.rul_hours || 0),
    bearing_vibration: state.mech_bearing_vib_g,
    speed: state.drive_speed_ms,
    navigation: state.alerts.includes('navigation_fault') ? 'FAULT' : 'Healthy',
    issue: state.alerts.length > 0 ? generateIssueMessage(state) : null,
    ...uiOverrides
  } as AGV;
}

function generateIssueMessage(state: AgvState): string {
  const alertMap: Record<string, string> = {
    motor_overheating: 'Motor overheating',
    navigation_fault: 'Navigation fault',
    battery_degradation: 'Battery degradation',
    localization_drift: 'Navigation drift'
  };

  return state.alerts
    .map(alert => alertMap[alert] || alert)
    .join(' + ');
}

export async function fetchStreamData(uiPositionMap: Record<string, { x: number; y: number }>): Promise<AGV[]> {
  try {
    const states = await fetchCurrentState();
    return states.map(state =>
      mapStateToAgv(state, {
        x: uiPositionMap[state.agv_id]?.x || Math.random() * 100,
        y: uiPositionMap[state.agv_id]?.y || Math.random() * 100
      })
    );
  } catch (error) {
    console.error('fetchStreamData error:', error);
    return [];
  }
}
