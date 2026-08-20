import json
import logging
import os
import time
import uuid
from datetime import datetime

import redis
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [work_order] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("work_order")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

SEVERITY_ACTION = {
    "critical": "immediate",
    "warning":  "schedule",
    "info":     "monitor",
}

REPAIR_TEAM = {
    "battery":    "Electrical Team",
    "mechanical": "Mechanical Team",
    "drive":      "Drive Systems Team",
    "navigation": "Navigation Team",
    "safety":     "Safety Systems Team",
}


def _create_work_order(diagnosis):
    agv_id       = diagnosis.get("agv_id", "unknown")
    group        = diagnosis.get("group", "unknown")
    severity     = diagnosis.get("severity", "warning")
    root_cause   = diagnosis.get("root_cause", "Unknown fault")
    action       = diagnosis.get("action", "Inspect subsystem")
    repair_hours = diagnosis.get("repair_hours", 4.0)
    rul_minutes  = diagnosis.get("rul_minutes", None)

    action_type  = SEVERITY_ACTION.get(severity, "schedule")
    team         = REPAIR_TEAM.get(group, "Maintenance Team")

    if rul_minutes is not None:
        deadline_minutes = max(30, int(rul_minutes * 0.7))
    elif severity == "critical":
        deadline_minutes = 60
    else:
        deadline_minutes = 480

    wo = {
        "wo_id":            "WO-" + str(uuid.uuid4())[:8].upper(),
        "created_at":       datetime.utcnow().isoformat(),
        "agv_id":           agv_id,
        "group":            group,
        "severity":         severity,
        "action_type":      action_type,
        "root_cause":       root_cause,
        "recommended_action": action,
        "assigned_team":    team,
        "estimated_repair_hours": repair_hours,
        "deadline_minutes": deadline_minutes,
        "rul_minutes":      rul_minutes,
        "status":           "pending",
        "approved_by":      None,
        "approved_at":      None,
    }
    return wo


def run():
    r      = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe("diagnoses:trigger")

    log.info("Work Order Generator started - listening on diagnoses:trigger")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            raw = message.get("data", "")
            if not raw:
                continue

            diagnosis = json.loads(raw) if isinstance(raw, str) else raw
            severity  = diagnosis.get("severity", "info")

            if severity == "info":
                continue

            wo      = _create_work_order(diagnosis)
            payload = json.dumps(wo)

            r.rpush("workorders:pending", payload)
            r.ltrim("workorders:pending", -100, -1)

            r.set(
                "workorder:" + wo["agv_id"] + ":" + wo["group"],
                payload,
                ex=3600,
            )

            log.info(
                "WO created: %s  agv=%s  group=%s  action=%s  deadline=%d min",
                wo["wo_id"],
                wo["agv_id"],
                wo["group"],
                wo["action_type"],
                wo["deadline_minutes"],
            )

        except Exception as exc:
            log.error("Error creating work order: %s", exc, exc_info=True)


if __name__ == "__main__":
    run()
 