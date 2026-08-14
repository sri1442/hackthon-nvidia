import json
import redis
import numpy as np
from ingestion.history_reader import get_history
from models.rul_estimator import estimate_rul

REDIS_URL = "redis://localhost:6379"

# Thresholds from parameter group definition
THRESHOLDS = {
    "safety_estop_resp_ms":      ("above", 80.0),
    "safety_lidar_return_rate":  ("below", 0.80),
    "safety_camera_fps":         ("below", 20.0),
}

def check_anomaly(row: dict) -> list[dict]:
    alerts = []
    for param, (direction, threshold) in THRESHOLDS.items():
        val = row.get(param)
        if val is None:
            continue
        triggered = val < threshold if direction == "below" else val > threshold
        if triggered:
            alerts.append({
                "agv_id":    row["agv_id"],
                "group":     "safety",
                "parameter": param,
                "value":     round(float(val), 4),
                "threshold": threshold,
                "direction": direction,
                "severity":  _severity(val, threshold, direction),
            })
    return alerts

def _severity(val, threshold, direction):
    ratio = abs(val - threshold) / (abs(threshold) + 1e-9)
    if ratio > 0.20:
        return "critical"
    elif ratio > 0.08:
        return "warning"
    return "info"

def run():
    r      = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()

    # Subscribe to all AGV battery channels
    pubsub.psubscribe("agv:*:telemetry")
    print("[watcher_battery] subscribed — listening ...")

    alert_pipe = r   # reuse connection for publishing alerts

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue

        row     = json.loads(message["data"])
        alerts  = check_anomaly(row)

        for alert in alerts:
            agv_id = alert["agv_id"]

            # Get sensor history for RUL estimation
            history = get_history(agv_id, alert["parameter"], n=60)

            if len(history) >= 5:
                rul = estimate_rul(agv_id, alert["parameter"], history)
                alert["rul_hours"]    = rul.rul_hours
                alert["rul_model"]    = rul.model_type
                alert["confidence"]   = rul.confidence
                alert["explanation"]  = rul.explanation
            else:
                alert["rul_hours"]   = None
                alert["explanation"] = "Insufficient history for RUL"

            # Publish alert to diagnostician
            alert_pipe.publish("alerts:battery", json.dumps(alert))

            # Store latest alert in Redis for FastAPI
            alert_pipe.set(f"alert:{agv_id}:battery", json.dumps(alert))
            alert_pipe.rpush("alerts:all", json.dumps(alert))
            alert_pipe.ltrim("alerts:all", -500, -1)

            print(f"[watcher_battery] ALERT {agv_id} | "
                  f"{alert['parameter']}={alert['value']} | "
                  f"RUL={alert.get('rul_hours','?')}h | "
                  f"{alert['severity'].upper()}")

if __name__ == "__main__":
    run()