/**
 * Mock API responses for AGV Command Center
 * Simulates WebRTC stream data from backend
 */

export interface FleetSummary {
  total_agvs: number;
  severity_counts: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

export interface Alert {
  agv_id: string;
  group: string;
  parameter: string;
  value: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  rul_hours: number;
  confidence: number;
}

export interface AgvState {
  agv_id: string;
  severity: 'healthy' | 'warning' | 'critical';
  battery_soh: number;
  mech_bearing_vib_g: number;
  drive_motor_current_a: number;
  drive_speed_ms: number;
  alerts: string[];
  rul_hours?: number;
}

export const mockFleetSummary: FleetSummary = {
  total_agvs: 12,
  severity_counts: {
    healthy: 9,
    warning: 2,
    critical: 1
  }
};

export const mockActiveAlerts: Alert[] = [
  {
    agv_id: 'AGV-11',
    group: 'drivetrain',
    parameter: 'drive_motor_current_a',
    value: 94,
    threshold: 85,
    severity: 'critical',
    rul_hours: 1,
    confidence: 0.96
  },
  {
    agv_id: 'AGV-04',
    group: 'battery',
    parameter: 'battery_soh',
    value: 0.41,
    threshold: 0.5,
    severity: 'warning',
    rul_hours: 4,
    confidence: 0.89
  },
  {
    agv_id: 'AGV-02',
    group: 'navigation',
    parameter: 'localization_drift',
    value: 0.85,
    threshold: 0.5,
    severity: 'warning',
    rul_hours: 22,
    confidence: 0.87
  }
];

export const mockCurrentState: AgvState[] = [
  {
    agv_id: 'AGV-01',
    severity: 'healthy',
    battery_soh: 0.87,
    mech_bearing_vib_g: 0.2,
    drive_motor_current_a: 52,
    drive_speed_ms: 1.2,
    alerts: [],
    rul_hours: 48
  },
  {
    agv_id: 'AGV-02',
    severity: 'warning',
    battery_soh: 0.76,
    mech_bearing_vib_g: 0.4,
    drive_motor_current_a: 58,
    drive_speed_ms: 0.9,
    alerts: ['localization_drift'],
    rul_hours: 22
  },
  {
    agv_id: 'AGV-03',
    severity: 'healthy',
    battery_soh: 0.91,
    mech_bearing_vib_g: 0.15,
    drive_motor_current_a: 49,
    drive_speed_ms: 1.4,
    alerts: [],
    rul_hours: 61
  },
  {
    agv_id: 'AGV-04',
    severity: 'warning',
    battery_soh: 0.41,
    mech_bearing_vib_g: 0.22,
    drive_motor_current_a: 64,
    drive_speed_ms: 0.5,
    alerts: ['battery_degradation'],
    rul_hours: 4
  },
  {
    agv_id: 'AGV-05',
    severity: 'healthy',
    battery_soh: 0.68,
    mech_bearing_vib_g: 0.18,
    drive_motor_current_a: 55,
    drive_speed_ms: 1.3,
    alerts: [],
    rul_hours: 37
  },
  {
    agv_id: 'AGV-06',
    severity: 'healthy',
    battery_soh: 0.82,
    mech_bearing_vib_g: 0.16,
    drive_motor_current_a: 61,
    drive_speed_ms: 1.2,
    alerts: [],
    rul_hours: 43
  },
  {
    agv_id: 'AGV-07',
    severity: 'healthy',
    battery_soh: 0.79,
    mech_bearing_vib_g: 0.19,
    drive_motor_current_a: 57,
    drive_speed_ms: 1.1,
    alerts: [],
    rul_hours: 31
  },
  {
    agv_id: 'AGV-08',
    severity: 'healthy',
    battery_soh: 0.73,
    mech_bearing_vib_g: 0.21,
    drive_motor_current_a: 59,
    drive_speed_ms: 1.0,
    alerts: [],
    rul_hours: 28
  },
  {
    agv_id: 'AGV-09',
    severity: 'healthy',
    battery_soh: 0.64,
    mech_bearing_vib_g: 0.25,
    drive_motor_current_a: 63,
    drive_speed_ms: 0.8,
    alerts: [],
    rul_hours: 26
  },
  {
    agv_id: 'AGV-10',
    severity: 'healthy',
    battery_soh: 0.93,
    mech_bearing_vib_g: 0.12,
    drive_motor_current_a: 54,
    drive_speed_ms: 1.5,
    alerts: [],
    rul_hours: 56
  },
  {
    agv_id: 'AGV-11',
    severity: 'critical',
    battery_soh: 0.58,
    mech_bearing_vib_g: 0.8,
    drive_motor_current_a: 94,
    drive_speed_ms: 0.2,
    alerts: ['motor_overheating', 'navigation_fault'],
    rul_hours: 1
  },
  {
    agv_id: 'AGV-12',
    severity: 'healthy',
    battery_soh: 0.88,
    mech_bearing_vib_g: 0.14,
    drive_motor_current_a: 51,
    drive_speed_ms: 1.3,
    alerts: [],
    rul_hours: 52
  }
];
