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
  alerts: Array<string | Record<string, any>>;
  diagnoses?: Array<Record<string, any>>;
  rul_hours?: number;
  // Extended telemetry fields
  timestamp?: string;
  battery_voltage_v?: number;
  battery_current_a?: number;
  battery_temp_c?: number;
  battery_charge_cycles?: number;
  nav_position_x_m?: number;
  nav_position_y_m?: number;
  nav_heading_error_deg?: number;
  nav_localization_conf?: number;
  nav_path_deviation_m?: number;
  drive_vib_rms_g?: number;
  drive_encoder_count?: number;
  mech_bearing_temp_c?: number;
  mech_brake_resp_ms?: number;
  mech_wheel_diam_mm?: number;
  safety_estop_resp_ms?: number;
  safety_lidar_return_rate?: number;
  safety_camera_fps?: number;
  safety_bumper_sens_n?: number;
}

export const mockFleetSummary: FleetSummary = {
  total_agvs: 4,
  severity_counts: {
    healthy: 0,
    warning: 3,
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
    agv_id: 'AGV-001',
    severity: 'warning',
    battery_soh: 0.9785,
    mech_bearing_vib_g: 0.5,
    drive_motor_current_a: 16.222,
    drive_speed_ms: 1.201,
    rul_hours: 0.02,
    timestamp: '2026-08-13T06:35:10',
    battery_voltage_v: 23.724,
    battery_current_a: 3.459,
    battery_temp_c: 23.96,
    battery_charge_cycles: 103,
    nav_position_x_m: 44.646,
    nav_position_y_m: 16.855,
    nav_heading_error_deg: -0.028,
    nav_localization_conf: 0.952,
    nav_path_deviation_m: 0.0132,
    drive_vib_rms_g: 0.1199,
    drive_encoder_count: 41830,
    mech_bearing_temp_c: 45.73,
    mech_brake_resp_ms: 94.9,
    mech_wheel_diam_mm: 201.222,
    safety_estop_resp_ms: 30.7,
    safety_lidar_return_rate: 0.979,
    safety_camera_fps: 30.8,
    safety_bumper_sens_n: 5.09,
    alerts: [
      {
        agv_id: 'AGV-001',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.5,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.02,
        explanation: 'mech_bearing_vib_g=0.500 above alert threshold 0.35. RUL=0.02h',
        timestamp: 1786984103.8042688,
        confidence: 0.96
      },
      {
        agv_id: 'AGV-001',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 21.324,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'info',
        rul_hours: 1.96,
        rul_model: 'linear',
        confidence: 0.3,
        explanation: 'battery_voltage_v=23.8160 (alert>21.5, failure=19.0). Slope=-0.00342/sample. RUL=2.0h to hard failure.'
      }
    ],
    diagnoses: [
      {
        agv_id: 'AGV-001',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 21.324,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'info',
        rul_hours: 99.0,
        diagnosis: {
          root_cause: 'Battery voltage is below the threshold and has been trending downward.',
          severity: 'critical',
          action: 'immediate',
          repair_hours: 0.5,
          explanation: 'The battery voltage is 21.324 volts, which is below the threshold of 21.5 volts. The trend shows a downward slope of 0.01446 volts per sample, indicating a potential battery failure.'
        }
      },
      {
        agv_id: 'AGV-001',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.3936,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.06,
        explanation: 'mech_bearing_vib_g=0.394 above alert threshold 0.35. RUL=0.06h',
        timestamp: 1786973312.1097143,
        diagnosis: {
          root_cause: 'Mechanical bearing vibration above the alert threshold',
          severity: 'warning',
          action: 'schedule',
          repair_hours: 1.0,
          explanation: 'The sensor value of mech_bearing_vib_g is 0.3936, which is above the alert threshold of 0.35.'
        }
      }
    ]
  },
  {
    agv_id: 'AGV-002',
    severity: 'warning',
    battery_soh: 0.7641,
    mech_bearing_vib_g: 0.5,
    drive_motor_current_a: 11.212,
    drive_speed_ms: 1.354,
    rul_hours: 0.16,
    timestamp: '2026-08-13T06:35:15',
    battery_voltage_v: 22.156,
    battery_current_a: 4.251,
    battery_temp_c: 28.34,
    battery_charge_cycles: 87,
    nav_position_x_m: 51.234,
    nav_position_y_m: 22.678,
    nav_heading_error_deg: 1.245,
    nav_localization_conf: 0.931,
    nav_path_deviation_m: 0.0456,
    drive_vib_rms_g: 0.1567,
    drive_encoder_count: 38234,
    mech_bearing_temp_c: 52.15,
    mech_brake_resp_ms: 98.2,
    mech_wheel_diam_mm: 201.018,
    safety_estop_resp_ms: 31.2,
    safety_lidar_return_rate: 0.965,
    safety_camera_fps: 29.8,
    safety_bumper_sens_n: 4.87,
    alerts: [
      {
        agv_id: 'AGV-002',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.4252,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.16,
        explanation: 'mech_bearing_vib_g=0.425 above alert threshold 0.35. RUL=0.16h',
        confidence: 0.94
      },
      {
        agv_id: 'AGV-002',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 20.205,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'info',
        rul_hours: 0.28,
        rul_model: 'linear',
        confidence: 0.3,
        explanation: 'battery_voltage_v=20.2050 (alert>21.5, failure=19.0). Slope=-0.00608/sample. RUL=0.3h to hard failure.'
      }
    ],
    diagnoses: [
      {
        agv_id: 'AGV-002',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 18.497,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'warning',
        rul_hours: 0.79,
        diagnosis: {
          root_cause: 'Battery voltage below the threshold',
          severity: 'warning',
          action: 'schedule',
          repair_hours: 0.79,
          explanation: 'Battery voltage is below the threshold, which may lead to hard failure in the near term.'
        }
      }
    ]
  },
  {
    agv_id: 'AGV-008',
    severity: 'critical',
    battery_soh: 0.8921,
    mech_bearing_vib_g: 0.5,
    drive_motor_current_a: 13.971,
    drive_speed_ms: 0.997,
    rul_hours: 0.01,
    timestamp: '2026-08-13T06:35:20',
    battery_voltage_v: 21.892,
    battery_current_a: 5.123,
    battery_temp_c: 31.67,
    battery_charge_cycles: 156,
    nav_position_x_m: 38.567,
    nav_position_y_m: 27.123,
    nav_heading_error_deg: 7.451,
    nav_localization_conf: 0.834,
    nav_path_deviation_m: 0.3715,
    drive_vib_rms_g: 0.2134,
    drive_encoder_count: 35678,
    mech_bearing_temp_c: 68.92,
    mech_brake_resp_ms: 102.5,
    mech_wheel_diam_mm: 200.892,
    safety_estop_resp_ms: 33.1,
    safety_lidar_return_rate: 0.854,
    safety_camera_fps: 27.2,
    safety_bumper_sens_n: 4.34,
    alerts: [
      {
        agv_id: 'AGV-008',
        group: 'navigation',
        parameter: 'nav_path_deviation_m',
        value: 0.3715,
        threshold: 0.3,
        hard_threshold: 0.5,
        direction: 'above',
        severity: 'critical',
        rul_hours: 99.0,
        explanation: 'Path deviation above threshold - requires navigation recalibration.',
        confidence: 0.89
      },
      {
        agv_id: 'AGV-008',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.5,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.02,
        explanation: 'mech_bearing_vib_g=0.500 above alert threshold 0.35. RUL=0.02h',
        confidence: 0.92
      },
      {
        agv_id: 'AGV-008',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 21.306,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'info',
        rul_hours: 2.38,
        explanation: 'battery_voltage_v=24.7190 (alert>21.5, failure=19.0). Slope=-0.00333/sample. RUL=2.4h to hard failure.',
        confidence: 0.87
      }
    ],
    diagnoses: [
      {
        agv_id: 'AGV-008',
        group: 'navigation',
        parameter: 'nav_heading_error_deg',
        value: 7.451,
        threshold: 5.0,
        hard_threshold: 12.0,
        direction: 'above',
        severity: 'critical',
        rul_hours: 0.92,
        diagnosis: {
          root_cause: 'Nav heading error is consistently above the threshold, indicating a misalignment in the AGV\'s navigation system.',
          severity: 'critical',
          action: 'schedule',
          repair_hours: 2.0,
          explanation: 'The nav_heading_error_deg value is 7.451 degrees, which exceeds the alert threshold of 5.0 degrees. This indicates a compass or IMU calibration issue.'
        }
      }
    ]
  },
  {
    agv_id: 'AGV-010',
    severity: 'warning',
    battery_soh: 0.9311,
    mech_bearing_vib_g: 0.0,
    drive_motor_current_a: 10.856,
    drive_speed_ms: 1.108,
    rul_hours: 0.12,
    timestamp: '2026-08-13T06:35:25',
    battery_voltage_v: 23.451,
    battery_current_a: 3.875,
    battery_temp_c: 26.23,
    battery_charge_cycles: 92,
    nav_position_x_m: 56.789,
    nav_position_y_m: 19.234,
    nav_heading_error_deg: 0.567,
    nav_localization_conf: 0.967,
    nav_path_deviation_m: 0.0198,
    drive_vib_rms_g: 0.1345,
    drive_encoder_count: 42156,
    mech_bearing_temp_c: 48.56,
    mech_brake_resp_ms: 96.3,
    mech_wheel_diam_mm: 201.456,
    safety_estop_resp_ms: 32.5,
    safety_lidar_return_rate: 0.987,
    safety_camera_fps: 30.5,
    safety_bumper_sens_n: 5.23,
    alerts: [
      {
        agv_id: 'AGV-010',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.4811,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.06,
        explanation: 'mech_bearing_vib_g=0.481 above alert threshold 0.35. RUL=0.06h',
        confidence: 0.91
      },
      {
        agv_id: 'AGV-010',
        group: 'battery',
        parameter: 'battery_voltage_v',
        value: 20.325,
        threshold: 21.5,
        hard_threshold: 19.0,
        direction: 'below',
        severity: 'info',
        rul_hours: 0.12,
        explanation: 'battery_voltage_v=20.3250 (alert>21.5, failure=19.0). Slope=-0.01555/sample. RUL=0.1h to hard failure.',
        confidence: 0.28
      },
      {
        agv_id: 'AGV-010',
        group: 'safety',
        parameter: 'safety_estop_resp_ms',
        value: 95.3,
        threshold: 80.0,
        hard_threshold: 200.0,
        direction: 'above',
        severity: 'warning',
        rul_hours: 99.0,
        explanation: 'safety_estop_resp_ms=75.1000 (alert>80.0, failure=200.0). Slope=-0.04255/sample. RUL=99.0h to hard failure.',
        confidence: 0.85
      }
    ],
    diagnoses: [
      {
        agv_id: 'AGV-010',
        group: 'mechanical',
        parameter: 'mech_bearing_vib_g',
        value: 0.5,
        threshold: 0.35,
        hard_threshold: 1.5,
        direction: 'above',
        severity: 'warning',
        rul_hours: 0.01,
        diagnosis: {
          root_cause: 'AGV-010 bearing is vibrating excessively, exceeding the threshold and RUL.',
          severity: 'warning',
          action: 'schedule',
          repair_hours: 1.0,
          explanation: 'The mech_bearing_vib_g value of 0.5 is above the alert threshold of 0.35, indicating bearing wear.'
        }
      }
    ]
  }
];
