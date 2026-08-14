import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from dataclasses import dataclass

@dataclass
class RULResult:
    agv_id:      str
    parameter:   str
    model_type:  str
    rul_hours:   float
    confidence:  float
    threshold:   float
    current_val: float
    explanation: str

# (alert_threshold, hard_failure_limit, direction)
# RUL = time from NOW to hard_failure_limit using current trend
THRESHOLDS = {
    "battery_soh":              (0.75, 0.55,  "below"),
    "battery_temp_c":           (60.0, 85.0,  "above"),
    "battery_voltage_v":        (21.5, 19.0,  "below"),
    "drive_motor_current_a":    (30.0, 45.0,  "above"),
    "drive_vib_rms_g":          (1.0,  3.0,   "above"),
    "mech_bearing_temp_c":      (80.0, 110.0, "above"),
    "mech_bearing_vib_g":       (0.35, 1.5,   "above"),
    "mech_brake_resp_ms":       (150.0,250.0, "above"),
    "nav_heading_error_deg":    (5.0,  12.0,  "above"),
    "nav_localization_conf":    (0.80, 0.50,  "below"),
    "safety_estop_resp_ms":     (80.0, 200.0, "above"),
    "safety_lidar_return_rate": (0.80, 0.50,  "below"),
}

SAMPLE_RATE_S = 5   # each reading is 5 seconds apart

def estimate_rul(agv_id: str, parameter: str,
                 history: np.ndarray, current_age: float = 0.0) -> RULResult:

    entry = THRESHOLDS.get(parameter)
    if entry is None:
        return RULResult(agv_id=agv_id, parameter=parameter, model_type="unknown",
                         rul_hours=99.0, confidence=0.5, threshold=0.0,
                         current_val=float(history[-1]),
                         explanation="Parameter not in threshold table.")

    alert_thresh, failure_limit, direction = entry
    current = float(history[-1])

    # Fit linear trend on history
    n = len(history)
    if n >= 3:
        slope = float(np.polyfit(range(n), history, 1)[0])
        # R² for confidence
        fitted    = np.polyval(np.polyfit(range(n), history, 1), range(n))
        ss_res    = np.sum((history - fitted) ** 2)
        ss_tot    = np.sum((history - history.mean()) ** 2)
        r2        = 1 - ss_res / (ss_tot + 1e-9)
        confidence = float(np.clip(r2, 0.3, 0.95))
    else:
        slope      = 0.0
        confidence = 0.3

    # Calculate steps to reach HARD FAILURE LIMIT (not alert threshold)
    if abs(slope) < 1e-9:
        # Flat trend — check how far from failure limit
        gap = abs(current - failure_limit)
        # Assign conservative estimate based on proximity
        rul_hours = min(99.0, gap * 20.0)
    elif direction == "below":
        # Value falling — fails when < failure_limit
        if slope >= 0:
            rul_hours = 99.0    # trending upward, moving away from failure
        else:
            steps     = (current - failure_limit) / abs(slope)
            rul_hours = max(0.1, steps * SAMPLE_RATE_S / 3600.0)
    else:
        # Value rising — fails when > failure_limit
        if slope <= 0:
            rul_hours = 99.0    # trending downward, moving away from failure
        else:
            steps     = (failure_limit - current) / slope
            rul_hours = max(0.1, steps * SAMPLE_RATE_S / 3600.0)

    rul_hours = round(min(rul_hours, 999.0), 2)

    return RULResult(
        agv_id=agv_id, parameter=parameter, model_type="linear",
        rul_hours=rul_hours, confidence=round(confidence, 3),
        threshold=failure_limit, current_val=round(current, 4),
        explanation=(
            f"{parameter}={current:.4f} (alert>{alert_thresh}, "
            f"failure={failure_limit}). "
            f"Slope={slope:.5f}/sample. "
            f"RUL={rul_hours:.1f}h to hard failure."
        )
    )