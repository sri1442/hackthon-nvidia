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

export const AgvStatus = {
  Running: 'Running',
  Stopped: 'Stopped',
  UnderMaintenance: 'Under Maintenance'
} as const;

export type AgvStatus = typeof AgvStatus[keyof typeof AgvStatus];

export interface AGV {
  id: string;
  status: AgvStatus;
  severity: 'Healthy' | 'Warning' | 'Critical';
  battery: number;
  motor: number;
  rul: number;
  rulBreakdown: Array<{
    group: string;
    parameter: string;
    rul_hours: number;
    severity: string;
  }>;
  navigation: string;
  issue: string | null;
  bearing_vibration: number;
  speed: number;
  x: number;
  y: number;
  // Full telemetry data
  timestamp?: string;
  battery_voltage_v?: number;
  battery_current_a?: number;
  battery_temp_c?: number;
  battery_soh?: number;
  battery_charge_cycles?: number;
  nav_position_x_m?: number;
  nav_position_y_m?: number;
  nav_heading_error_deg?: number;
  nav_localization_conf?: number;
  nav_path_deviation_m?: number;
  drive_motor_current_a?: number;
  drive_speed_ms?: number;
  drive_vib_rms_g?: number;
  drive_encoder_count?: number;
  mech_bearing_vib_g?: number;
  mech_bearing_temp_c?: number;
  mech_brake_resp_ms?: number;
  mech_wheel_diam_mm?: number;
  safety_estop_resp_ms?: number;
  safety_lidar_return_rate?: number;
  safety_camera_fps?: number;
  safety_bumper_sens_n?: number;
  alerts?: Array<Record<string, any>>;
  diagnoses?: Array<Record<string, any>>;
  rawState?: AgvState;
}

interface HealthSignal {
  group?: string;
  parameter?: string;
  severity?: string;
  rul_hours?: number;
  diagnosis?: {
    root_cause?: string;
    severity?: string;
    explanation?: string;
  };
  explanation?: string;
}

const API_BASE = 'https://api-service-up0n6ca21.apps.run.brev.nvidia.com';
const USE_MOCK = false;

const severityRank: Record<string, number> = {
  healthy: 0,
  info: 1,
  warning: 2,
  critical: 3
};

export function normalizeSeverity(severity?: string): 'Healthy' | 'Warning' | 'Critical' {
  const value = String(severity ?? 'healthy').toLowerCase();

  if (value === 'critical') return 'Critical';
  if (value === 'warning') return 'Warning';
  return 'Healthy';
}

export function getEffectiveRul(state: AgvState, signals: HealthSignal[] = normalizeHealthSignals(state)): number {
  const rulValues = signals
    .map(signal => Number(signal.rul_hours))
    .filter(value => Number.isFinite(value) && value >= 0);

  if (rulValues.length > 0) {
    return Math.round(Math.min(...rulValues));
  }

  const fallback = Number(state.rul_hours);
  return Number.isFinite(fallback) && fallback >= 0 ? Math.round(fallback) : 0;
}

export function isCriticalRulEntry(entry: { rul_hours: number; severity?: string }): boolean {
  const severity = String(entry.severity ?? 'healthy').toLowerCase();
  return severity === 'critical' || entry.rul_hours <= 4;
}

export function getEffectiveAgvSeverity(state: AgvState, signals: HealthSignal[] = normalizeHealthSignals(state)): 'Healthy' | 'Warning' | 'Critical' {
  const maxRank = signals.reduce((highest, signal) => {
    const current = severityRank[String(signal.severity ?? state.severity ?? 'healthy').toLowerCase()] ?? 0;
    return Math.max(highest, current);
  }, severityRank[String(state.severity ?? 'healthy').toLowerCase()] ?? 0);

  const hasCriticalSignal = signals.some((signal) => {
    const severity = String(signal.severity ?? state.severity ?? 'healthy').toLowerCase();
    const rulHours = Number(signal.rul_hours);
    return severity === 'critical' || (Number.isFinite(rulHours) && rulHours <= 4 && severity !== 'healthy');
  });

  const validRuls = signals
    .map(signal => Number(signal.rul_hours))
    .filter(value => Number.isFinite(value) && value >= 0);

  const minRul = validRuls.length > 0
    ? validRuls.reduce((min, current) => Math.min(min, current), Number.POSITIVE_INFINITY)
    : Number.isFinite(Number(state.rul_hours)) && Number(state.rul_hours) >= 0
      ? Number(state.rul_hours)
      : Number.POSITIVE_INFINITY;

  if (hasCriticalSignal || maxRank >= severityRank.critical || (Number.isFinite(minRul) && minRul <= 4)) {
    return 'Critical';
  }

  if (maxRank >= severityRank.warning || (Number.isFinite(minRul) && minRul <= 12)) {
    return 'Warning';
  }

  return 'Healthy';
}

export function getRulBreakdown(state: AgvState): AGV['rulBreakdown'] {
  const signals = normalizeHealthSignals(state);

  const deduped = new Map<string, AGV['rulBreakdown'][number]>();

  signals.forEach((signal) => {
    const group = (signal.group || 'system').replace(/_/g, ' ');
    const parameter = (signal.parameter || group).replace(/_/g, ' ');
    const rul_hours = Number(signal.rul_hours);

    if (!Number.isFinite(rul_hours) || rul_hours < 0) {
      return;
    }

    const key = `${group}|${parameter}`;
    const current = deduped.get(key);

    if (!current || rul_hours < current.rul_hours) {
      deduped.set(key, {
        group,
        parameter,
        rul_hours,
        severity: String(signal.severity ?? state.severity ?? 'healthy').toLowerCase()
      });
    }
  });

  return Array.from(deduped.values()).sort((a, b) => a.rul_hours - b.rul_hours);
}

/**
 * Compute average RUL from alert signals on the state.
 * Falls back to undefined when no alert RULs are present.
 */
export function computeAverageAlertRul(state: AgvState): number | undefined {
  const alerts = Array.isArray(state.alerts) ? state.alerts : [];
  const rulValues = alerts
    .map((a: any) => Number(a?.rul_hours))
    .filter((v: number) => Number.isFinite(v) && v >= 0);

  if (rulValues.length === 0) return undefined;
  const sum = rulValues.reduce((s: number, v: number) => s + v, 0);
  return sum / rulValues.length;
}

function normalizeHealthSignals(state: AgvState): HealthSignal[] {
  const alertSignals = Array.isArray(state.alerts) ? state.alerts : [];
  const diagnosisSignals = Array.isArray(state.diagnoses) ? state.diagnoses : [];

  const normalized = [...alertSignals, ...diagnosisSignals].map((signal) => {
    if (typeof signal === 'string') {
      return {
        parameter: signal,
        group: 'system',
        severity: state.severity,
        rul_hours: Number.isFinite(Number(state.rul_hours)) ? Number(state.rul_hours) : undefined
      };
    }

    if (signal && typeof signal === 'object') {
      const fallbackRul = Number.isFinite(Number(state.rul_hours)) ? Number(state.rul_hours) : undefined;
      return {
        ...signal,
        severity: signal.severity ?? signal.diagnosis?.severity ?? state.severity,
        rul_hours: signal.rul_hours ?? fallbackRul
      } as HealthSignal;
    }

    return null;
  }).filter((signal): signal is HealthSignal => Boolean(signal));

  return normalized;
}

function summarizeSignal(signal: HealthSignal): string {
  if (typeof signal === 'string') {
    return signal;
  }

  const rootCause = signal.diagnosis?.root_cause;
  if (rootCause) return rootCause;

  const parameter = signal.parameter?.replace(/_/g, ' ');
  if (parameter) {
    return parameter
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      .join(' ');
  }

  return signal.group?.replace(/_/g, ' ') || 'System concern';
}

function generateIssueMessage(state: AgvState): string {
  const signals = normalizeHealthSignals(state);
  const issues = signals
    .map(summarizeSignal)
    .filter(Boolean);

  if (issues.length === 0) {
    return 'System concern';
  }

  return [...new Set(issues)].slice(0, 2).join(' + ');
}

export async function fetchFleetSummary(): Promise<FleetSummary> {
  try {
    if (USE_MOCK) {
      const currentState = mockCurrentState.map((state) => {
        const signals = normalizeHealthSignals(state);
        return {
          ...state,
          severity: normalizeSeverity(state.severity),
          rul_hours: getEffectiveRul(state, signals)
        };
      });

      const healthy = currentState.filter(s => normalizeSeverity(s.severity) === 'Healthy').length;
      const warning = currentState.filter(s => normalizeSeverity(s.severity) === 'Warning').length;
      const critical = currentState.filter(s => normalizeSeverity(s.severity) === 'Critical').length;

      return {
        total_agvs: currentState.length,
        severity_counts: {
          healthy,
          warning,
          critical
        }
      };
    }

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
  const signals = normalizeHealthSignals(state);
  const severity = normalizeSeverity(state.severity);
  const effectiveRul = getEffectiveRul(state, signals);
  const navigationFault = signals.some((signal) => {
    const group = (signal.group ?? '').toLowerCase();
    const parameter = (signal.parameter ?? '').toLowerCase();
    return group.includes('navigation') || parameter.includes('nav_') || parameter.includes('navigation') || parameter.includes('localization') || parameter.includes('heading');
  });

  // Extract telemetry data from state (use any to access unknown fields)
  const rawState = state as any;

  return {
    id: state.agv_id,
    status: uiOverrides.status ?? AgvStatus.Running,
    severity,
    battery: ((state.battery_soh || 0) * 100).toFixed(2) as unknown as number,
    motor: Math.round(state.drive_motor_current_a),
    // RUL: prefer average of alert rul_hours when available, otherwise fallback to effectiveRul
    rul: (() => {
      const avg = computeAverageAlertRul(state);
      if (typeof avg === 'number' && Number.isFinite(avg)) return Math.round(avg);
      return effectiveRul;
    })(),
    rulBreakdown: getRulBreakdown(state),
    bearing_vibration: state.mech_bearing_vib_g,
    speed: state.drive_speed_ms,
    navigation: navigationFault ? 'FAULT' : 'Healthy',
    issue: signals.length > 0 ? generateIssueMessage(state) : null,
    // Full telemetry fields
    timestamp: rawState.timestamp,
    battery_voltage_v: rawState.battery_voltage_v,
    battery_current_a: rawState.battery_current_a,
    battery_temp_c: rawState.battery_temp_c,
    battery_soh: rawState.battery_soh,
    battery_charge_cycles: rawState.battery_charge_cycles,
    nav_position_x_m: rawState.nav_position_x_m,
    nav_position_y_m: rawState.nav_position_y_m,
    nav_heading_error_deg: rawState.nav_heading_error_deg,
    nav_localization_conf: rawState.nav_localization_conf,
    nav_path_deviation_m: rawState.nav_path_deviation_m,
    drive_motor_current_a: rawState.drive_motor_current_a,
    drive_speed_ms: rawState.drive_speed_ms,
    drive_vib_rms_g: rawState.drive_vib_rms_g,
    drive_encoder_count: rawState.drive_encoder_count,
    mech_bearing_vib_g: rawState.mech_bearing_vib_g,
    mech_bearing_temp_c: rawState.mech_bearing_temp_c,
    mech_brake_resp_ms: rawState.mech_brake_resp_ms,
    mech_wheel_diam_mm: rawState.mech_wheel_diam_mm,
    safety_estop_resp_ms: rawState.safety_estop_resp_ms,
    safety_lidar_return_rate: rawState.safety_lidar_return_rate,
    safety_camera_fps: rawState.safety_camera_fps,
    safety_bumper_sens_n: rawState.safety_bumper_sens_n,
    alerts: Array.isArray(state.alerts) ? state.alerts.filter(a => typeof a === 'object') : [],
    diagnoses: state.diagnoses,
    rawState: state,
    ...uiOverrides
  } as AGV;
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
