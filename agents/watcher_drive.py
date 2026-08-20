"""
Watcher Agent — Drive / Motion Group
"""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import redis
import numpy as np
from ingestion.history_reader import get_history
from models.rul_estimator import estimate_rul

def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

THRESHOLDS = {
    "drive_motor_current_a": ("above", 30.0),
    "drive_vib_rms_g":       ("above", 1.0),
    "drive_speed_ms":        ("above", 2.3),
}

_HARD = {
    "drive_motor_current_a": 45.0,
    "drive_vib_rms_g":       3.0,
    "drive_speed_ms":        2.5,
}

def _severity(val, threshold, direction):
    ratio = abs(val - threshold) / (abs(threshold) + 1e-9)
    if ratio > 0.20:
        return "critical"
    elif ratio > 0.08:
        return "warning"
    return "info"

def check_anomaly(row: dict) -> list[dict]:
    alerts = []
    for param, (direction, threshold) in THRESHOLDS.items():
        val = row.get(param)
        if val is None:
            continue
        triggered = val < threshold if direction == "below" else val > threshold
        if triggered:
            alerts.append({
                "agv_id":         row["agv_id"],
                "group":          "drive",
                "parameter":      param,
                "value":          round(float(val), 4),
                "threshold":      threshold,
                "hard_threshold": _HARD[param],
                "direction":      direction,
                "severity":       _severity(val, threshold, direction),
                "timestamp":      time.time(),
            })
    return alerts

def run():
    r      = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.psubscribe("agv:*:telemetry")
    print("[watcher_drive] subscribed — listening ...")

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue

        row    = json.loads(message["data"])
        alerts = check_anomaly(row)

        for alert in alerts:
            agv_id  = alert["agv_id"]
            history = np.array(
                get_history(agv_id, alert["parameter"], n=60), dtype=float
            )

            if len(history) >= 5:
                rul = estimate_rul(agv_id, alert["parameter"], history)
                alert["rul_hours"]   = rul.rul_hours
                alert["rul_model"]   = rul.model_type
                alert["confidence"]  = rul.confidence
                alert["explanation"] = rul.explanation
            else:
                alert["rul_hours"]   = 99.0
                alert["rul_model"]   = "none"
                alert["confidence"]  = 0.0
                alert["explanation"] = "Insufficient history for RUL estimation"

            r.publish("alerts:drive", json.dumps(alert))
            r.set(f"alert:{agv_id}:drive", json.dumps(alert))
            r.rpush("alerts:all", json.dumps(alert))
            r.ltrim("alerts:all", -500, -1)

            print(f"[watcher_drive] ALERT {agv_id} | "
                  f"{alert['parameter']}={alert['value']} | "
                  f"RUL={alert['rul_hours']}h ({alert['rul_model']}) | "
                  f"{alert['severity'].upper()}")

if __name__ == "__main__":
    run()