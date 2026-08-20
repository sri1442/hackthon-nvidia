import json
import logging
import os
import sys
import time

import numpy as np
import redis
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ingestion.history_reader import get_history
from models.rul_estimator import estimate_rul

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [watcher_mechanical] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("watcher_mechanical")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
GROUP = "mechanical"

THRESHOLDS = {
    "mech_bearing_vib_g":  ("above", 0.35),
    "mech_bearing_temp_c": ("above", 80.0),
    "mech_brake_resp_ms":  ("above", 150.0),
}

_HARD = {
    "mech_bearing_vib_g":  1.50,
    "mech_bearing_temp_c": 110.0,
    "mech_brake_resp_ms":  250.0,
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
                "group":          GROUP,
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
    r = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.psubscribe("agv:*:telemetry")
    log.info("Watcher [mechanical] started - monitoring: %s", ", ".join(THRESHOLDS.keys()))

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue

        try:
            row = json.loads(message["data"])
        except json.JSONDecodeError:
            continue

        alerts = check_anomaly(row)

        for alert in alerts:
            agv_id = alert["agv_id"]

            history = np.array(
                get_history(agv_id, alert["parameter"], n=60),
                dtype=float,
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

            r.publish(f"alerts:{GROUP}", json.dumps(alert))
            r.set(f"alert:{agv_id}:{GROUP}", json.dumps(alert))
            r.rpush("alerts:all", json.dumps(alert))
            r.ltrim("alerts:all", -500, -1)

            log.info(
                "ALERT %s | %s=%.4f | RUL=%.1fh (%s) | %s",
                agv_id,
                alert["parameter"],
                alert["value"],
                alert["rul_hours"],
                alert["rul_model"],
                alert["severity"].upper(),
            )


if __name__ == "__main__":
    run()