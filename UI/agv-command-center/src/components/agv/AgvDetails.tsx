/**
 * AgvDetails Component - Detailed AGV information modal
 */

import React, { useState } from 'react';
import { AlertCircle, Zap, Navigation, Gauge, Wrench, Shield } from 'lucide-react';
import { AGV } from '../../services/telemetryService';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatRulHours } from '../../utils/formatRul';

interface DetailFieldProps {
  label: string;
  value: string | number;
  danger?: boolean;
  unit?: string;
}

const DetailField: React.FC<DetailFieldProps> = ({ label, value, danger, unit }) => (
  <div className="detail-field">
    <span className="field-label">{label}</span>
    <strong className={danger ? 'danger-text' : ''}>
      {value}
      {unit && <span className="field-unit">{unit}</span>}
    </strong>
  </div>
);

interface TelemetrySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const TelemetrySection: React.FC<TelemetrySectionProps> = ({ icon, title, children }) => (
  <div className="telemetry-section">
    <div className="section-header">
      {icon}
      <h4>{title}</h4>
    </div>
    <div className="section-grid">{children}</div>
  </div>
);

interface AgvDetailsProps {
  agv: AGV;
  onClose: () => void;
}

export const AgvDetails: React.FC<AgvDetailsProps> = ({ agv, onClose }) => {
  const [activeTab, setActiveTab] = useState<'health' | 'battery' | 'nav' | 'drive' | 'mech' | 'safety' | 'alerts'>('health');

  const criticalAlerts = agv.alerts?.filter(a => a.severity === 'critical') || [];
  const statusStyle =
    agv.status === 'Running'
      ? { background: '#10251d', color: '#55dba0', border: '1px solid #24523e' }
      : agv.status === 'Stopped'
        ? { background: '#23262d', color: '#dfe7f2', border: '1px solid #394861' }
        : { background: '#2a2114', color: '#efbf70', border: '1px solid #6f5320' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="agv-detail-modal large-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${agv.id} details`}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <span className="eyebrow">AGV DETAILS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>{agv.id}</h3>
              <span
                style={{
                  ...statusStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase'
                }}
              >
                {agv.status}
              </span>
            </div>
            {agv.timestamp && <span className="timestamp">{new Date(agv.timestamp).toLocaleTimeString()}</span>}
          </div>
          <div className="modal-actions">
            <SeverityBadge severity={agv.severity} />
            <button
              type="button"
              className="close-modal-btn"
              aria-label="Close AGV details"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <div className="critical-banner">
            <AlertCircle size={16} />
            <strong>Critical Issues Detected:</strong>
            <span>{criticalAlerts.map(a => a.parameter).join(', ')}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            Health
          </button>
          <button
            className={`tab-btn ${activeTab === 'battery' ? 'active' : ''}`}
            onClick={() => setActiveTab('battery')}
          >
            Battery
          </button>
          <button
            className={`tab-btn ${activeTab === 'nav' ? 'active' : ''}`}
            onClick={() => setActiveTab('nav')}
          >
            Navigation
          </button>
          <button
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
          >
            Drive
          </button>
          <button
            className={`tab-btn ${activeTab === 'mech' ? 'active' : ''}`}
            onClick={() => setActiveTab('mech')}
          >
            Mechanical
          </button>
          <button
            className={`tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            Safety
          </button>
          {agv.alerts && agv.alerts.length > 0 && (
            <button
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts ({agv.alerts.length})
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="modal-content">
          {/* Health Tab */}
          {activeTab === 'health' && (
            <div>
              <TelemetrySection icon={<AlertCircle size={16} />} title="System Health">
                <DetailField label="Severity" value={agv.severity} danger={agv.severity === 'Critical'} />
                <DetailField label="Overall RUL" value={formatRulHours(agv.rul)} danger={agv.rul <= 4} />
                {agv.rulBreakdown && agv.rulBreakdown.length > 0 && (
                  <div className="detail-field full-width">
                    <span className="field-label">Critical RUL Components</span>
                    <div className="rul-breakdown">
                      {agv.rulBreakdown.slice(0, 5).map((entry, idx) => {
                        const isCritical = entry.severity === 'critical' || entry.rul_hours <= 4;
                        return (
                          <div key={idx} className={`rul-item ${isCritical ? 'critical' : ''}`}>
                            <span className="rul-group">{entry.group}</span>
                            <span className="rul-value">{formatRulHours(entry.rul_hours)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TelemetrySection>

              {agv.diagnoses && agv.diagnoses.length > 0 && (
                <div className="diagnoses-section">
                  <h4>Diagnoses</h4>
                  {agv.diagnoses.slice(0, 3).map((diagnosis: any, idx: number) => {
                    const diag = diagnosis.diagnosis ?? diagnosis;
                    const severity = diag?.severity || diagnosis?.severity || 'info';
                    const parameter = diag?.parameter || diagnosis?.parameter || diagnosis?.parameter;
                    return (
                      <div key={idx} className={`diagnosis-card severity-${severity}`}>
                        <div className="diagnosis-header">
                          <strong>{parameter}</strong>
                          <span className={`severity-badge ${severity}`}>
                            {severity}
                          </span>
                        </div>
                        {diag?.root_cause && (
                          <p className="root-cause">
                            <strong>Root Cause:</strong> {diag.root_cause}
                          </p>
                        )}
                        {diag?.explanation && <p className="explanation">{diag.explanation}</p>}
                        {diag?.action && (
                          <p className="action">
                            <strong>Action:</strong> {diag.action}
                          </p>
                        )}
                        {diag?.repair_hours != null && (
                          <p className="repair-time">
                            <strong>Est. Repair Time:</strong> {diag.repair_hours}h
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Battery Tab */}
          {activeTab === 'battery' && (
            <TelemetrySection icon={<Zap size={16} />} title="Battery Metrics">
              <DetailField
                label="Voltage"
                value={agv.battery_voltage_v?.toFixed(2)}
                unit="V"
                danger={(agv.battery_voltage_v ?? 100) < 21.5}
              />
              <DetailField
                label="Current"
                value={agv.battery_current_a?.toFixed(2)}
                unit="A"
                danger={(agv.battery_current_a ?? 0) > 50}
              />
              <DetailField
                label="Temperature"
                value={agv.battery_temp_c?.toFixed(1)}
                unit="°C"
                danger={(agv.battery_temp_c ?? 0) > 50}
              />
              <DetailField
                label="State of Health"
                value={((agv.battery_soh ?? 1) * 100).toFixed(1)}
                unit="%"
                danger={(agv.battery_soh ?? 1) < 0.5}
              />
              <DetailField label="Charge Cycles" value={agv.battery_charge_cycles ?? 'N/A'} />
            </TelemetrySection>
          )}

          {/* Navigation Tab */}
          {activeTab === 'nav' && (
            <TelemetrySection icon={<Navigation size={16} />} title="Navigation Metrics">
              <DetailField label="Position X" value={agv.nav_position_x_m?.toFixed(2)} unit="m" />
              <DetailField label="Position Y" value={agv.nav_position_y_m?.toFixed(2)} unit="m" />
              <DetailField
                label="Heading Error"
                value={agv.nav_heading_error_deg?.toFixed(3)}
                unit="°"
                danger={Math.abs(agv.nav_heading_error_deg ?? 0) > 5}
              />
              <DetailField
                label="Localization Confidence"
                value={((agv.nav_localization_conf ?? 0) * 100).toFixed(1)}
                unit="%"
                danger={(agv.nav_localization_conf ?? 1) < 0.8}
              />
              <DetailField
                label="Path Deviation"
                value={agv.nav_path_deviation_m?.toFixed(4)}
                unit="m"
                danger={(agv.nav_path_deviation_m ?? 0) > 0.5}
              />
            </TelemetrySection>
          )}

          {/* Drive Tab */}
          {activeTab === 'drive' && (
            <TelemetrySection icon={<Gauge size={16} />} title="Drive Metrics">
              <DetailField
                label="Motor Current"
                value={agv.drive_motor_current_a?.toFixed(2)}
                unit="A"
                danger={(agv.drive_motor_current_a ?? 0) > 85}
              />
              <DetailField label="Speed" value={agv.drive_speed_ms?.toFixed(2)} unit="m/s" />
              <DetailField
                label="Vibration RMS"
                value={agv.drive_vib_rms_g?.toFixed(4)}
                unit="g"
                danger={(agv.drive_vib_rms_g ?? 0) > 0.3}
              />
              <DetailField label="Encoder Count" value={agv.drive_encoder_count?.toLocaleString() ?? 'N/A'} />
            </TelemetrySection>
          )}

          {/* Mechanical Tab */}
          {activeTab === 'mech' && (
            <TelemetrySection icon={<Wrench size={16} />} title="Mechanical Metrics">
              <DetailField
                label="Bearing Vibration"
                value={agv.mech_bearing_vib_g?.toFixed(3)}
                unit="g"
                danger={(agv.mech_bearing_vib_g ?? 0) > 0.5}
              />
              <DetailField
                label="Bearing Temperature"
                value={agv.mech_bearing_temp_c?.toFixed(1)}
                unit="°C"
                danger={(agv.mech_bearing_temp_c ?? 0) > 70}
              />
              <DetailField label="Brake Response" value={agv.mech_brake_resp_ms?.toFixed(1)} unit="ms" />
              <DetailField label="Wheel Diameter" value={agv.mech_wheel_diam_mm?.toFixed(2)} unit="mm" />
            </TelemetrySection>
          )}

          {/* Safety Tab */}
          {activeTab === 'safety' && (
            <TelemetrySection icon={<Shield size={16} />} title="Safety Metrics">
              <DetailField label="E-Stop Response" value={agv.safety_estop_resp_ms?.toFixed(1)} unit="ms" />
              <DetailField
                label="Lidar Return Rate"
                value={((agv.safety_lidar_return_rate ?? 0) * 100).toFixed(1)}
                unit="%"
                danger={(agv.safety_lidar_return_rate ?? 1) < 0.8}
              />
              <DetailField
                label="Camera FPS"
                value={agv.safety_camera_fps?.toFixed(1)}
                danger={(agv.safety_camera_fps ?? 30) < 20}
              />
              <DetailField label="Bumper Sensitivity" value={agv.safety_bumper_sens_n?.toFixed(2)} unit="N" />
            </TelemetrySection>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && agv.alerts && (
            <div className="alerts-list">
              {agv.alerts.length === 0 ? (
                <p className="no-alerts">No alerts at this time</p>
              ) : (
                agv.alerts.map((alert: any, idx: number) => (
                  <div key={idx} className={`alert-detail-card severity-${alert.severity}`}>
                    <div className="alert-detail-header">
                      <strong>{alert.parameter}</strong>
                      <span className={`severity-badge ${alert.severity}`}>{alert.severity}</span>
                    </div>
                    <div className="alert-detail-body">
                      <p>
                        <strong>Group:</strong> {alert.group}
                      </p>
                      <p>
                        <strong>Value:</strong> {alert.value?.toFixed(2)} {alert.direction === 'above' ? '>' : '<'} {alert.threshold?.toFixed(2)}
                      </p>
                      <p>
                        <strong>RUL Hours:</strong> <span className={alert.rul_hours <= 4 ? 'danger-text' : ''}>{alert.rul_hours?.toFixed(2)}h</span>
                      </p>
                      {alert.explanation && <p className="explanation">{alert.explanation}</p>}
                      {alert.confidence && <p className="confidence">Confidence: {(alert.confidence * 100).toFixed(0)}%</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

