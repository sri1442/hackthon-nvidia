import json
import logging
import os
import re
import time
from datetime import datetime
from typing import Optional

import redis
import requests
from dotenv import load_dotenv

load_dotenv()

# RAG knowledge-base retriever (optional falls back gracefully if the
# langchain/FAISS deps or KB index aren't set up yet) 
try:
    from models.rag_retriever import retrieve_context
    _RAG_AVAILABLE = True
except Exception:
    _RAG_AVAILABLE = False
    def retrieve_context(query):
        return []

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [diagnostician] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("diagnostician")

REDIS_URL    = os.getenv("REDIS_URL",      "redis://localhost:6379")
NIM_BASE_URL = os.getenv("NIM_BASE_URL",   "https://integrate.api.nvidia.com/v1")
NIM_MODEL    = os.getenv("NIM_MODEL_NAME", "nvidia/nemotron-mini-4b-instruct")
NAT_MODEL    = os.getenv("NAT_MODEL_NAME", "meta/llama-3.1-8b-instruct")
NGC_API_KEY  = os.getenv("NGC_API_KEY",    "")
USE_NAT      = os.getenv("USE_NAT", "true").lower() == "true"
API_BASE     = "http://localhost:8001"

TIMEOUT_NAT    = (5, 30)
TIMEOUT_SINGLE = (5, 10)
MAX_RETRIES    = 2
RETRY_SLEEP    = 1.0

CB_THRESHOLD   = 3
CB_COOLDOWN    = 60

_RULE_TABLE = {
    "battery": {
        "battery_soh": {
            "root_cause":  "Progressive battery cell capacity fade - SoH below safe threshold",
            "action":      "Schedule battery pack replacement within 24h; avoid deep discharge cycles",
            "repair_hours": 3.0,
            "severity":    "critical",
        },
        "battery_temp_c": {
            "root_cause":  "Battery thermal runaway risk - pack temperature exceeds safe operating limit",
            "action":      "Immediately return AGV to charging station; inspect cooling fans",
            "repair_hours": 2.0,
            "severity":    "critical",
        },
        "battery_voltage_v": {
            "root_cause":  "Pack voltage sag - possible cell imbalance or high internal resistance",
            "action":      "Run cell-balancing cycle; replace pack if voltage does not recover",
            "repair_hours": 2.5,
            "severity":    "warning",
        },
        "battery_current_a": {
            "root_cause":  "Sustained over-current draw - potential motor controller fault",
            "action":      "Reduce payload; inspect motor controller and wiring harness",
            "repair_hours": 3.0,
            "severity":    "warning",
        },
        "_default": {
            "root_cause":  "Battery subsystem anomaly",
            "action":      "Inspect battery pack and charging circuit",
            "repair_hours": 2.0,
            "severity":    "warning",
        },
    },
    "mechanical": {
        "mech_bearing_vib_g": {
            "root_cause":  "Bearing outer-race spall - elevated vibration signature detected",
            "action":      "Immediate bearing replacement; perform vibration spectrum analysis",
            "repair_hours": 4.0,
            "severity":    "critical",
        },
        "mech_bearing_temp_c": {
            "root_cause":  "Bearing overheating - lubrication failure or early spall generating friction",
            "action":      "Re-lubricate bearings; check for misalignment; schedule bearing inspection",
            "repair_hours": 2.0,
            "severity":    "warning",
        },
        "mech_brake_resp_ms": {
            "root_cause":  "Brake response degradation - worn brake pads or hydraulic pressure loss",
            "action":      "Inspect and replace brake pads; check hydraulic lines",
            "repair_hours": 3.0,
            "severity":    "critical",
        },
        "_default": {
            "root_cause":  "Mechanical drivetrain anomaly",
            "action":      "Full drivetrain inspection during next maintenance window",
            "repair_hours": 3.0,
            "severity":    "warning",
        },
    },
    "drive": {
        "drive_motor_current_a": {
            "root_cause":  "Motor winding resistance increase - early motor wear or partial short",
            "action":      "Measure winding resistance; replace motor if current continues to rise",
            "repair_hours": 5.0,
            "severity":    "critical",
        },
        "drive_vib_rms_g": {
            "root_cause":  "Drive-train vibration - wheel imbalance or coupling wear",
            "action":      "Balance wheels; inspect coupling and gearbox",
            "repair_hours": 3.0,
            "severity":    "warning",
        },
        "drive_speed_ms": {
            "root_cause":  "Over-speed condition - motor controller limit exceeded",
            "action":      "Check motor controller speed PID parameters; inspect encoder feedback",
            "repair_hours": 1.5,
            "severity":    "warning",
        },
        "_default": {
            "root_cause":  "Drive subsystem anomaly",
            "action":      "Inspect motor, encoder, and motor controller",
            "repair_hours": 3.0,
            "severity":    "warning",
        },
    },
    "navigation": {
        "nav_heading_error_deg": {
            "root_cause":  "Heading drift - IMU calibration error or wheel odometry mismatch",
            "action":      "Re-calibrate IMU; check encoder counts for left/right wheel symmetry",
            "repair_hours": 1.5,
            "severity":    "warning",
        },
        "nav_localization_conf": {
            "root_cause":  "LiDAR localization failure - partial sensor blockage or map mismatch",
            "action":      "Clean LiDAR lens; verify environment map is up to date",
            "repair_hours": 1.0,
            "severity":    "warning",
        },
        "nav_path_deviation_m": {
            "root_cause":  "Path deviation beyond tolerance - wheel slip or floor contamination",
            "action":      "Inspect drive wheels for wear; clean floor track; recalibrate odometry",
            "repair_hours": 2.0,
            "severity":    "warning",
        },
        "_default": {
            "root_cause":  "Navigation subsystem anomaly",
            "action":      "Re-calibrate navigation system and validate waypoints",
            "repair_hours": 1.5,
            "severity":    "warning",
        },
    },
    "safety": {
        "safety_estop_resp_ms": {
            "root_cause":  "E-stop response time degradation - relay contact wear or control latency",
            "action":      "Test and replace e-stop relay; reduce polling cycle time",
            "repair_hours": 2.0,
            "severity":    "critical",
        },
        "safety_lidar_return_rate": {
            "root_cause":  "LiDAR return rate drop - lens contamination or hardware fault",
            "action":      "Clean LiDAR optics; run self-test; replace unit if fault persists",
            "repair_hours": 2.0,
            "severity":    "critical",
        },
        "safety_camera_fps": {
            "root_cause":  "Camera frame rate below minimum - USB bandwidth saturation or overheating",
            "action":      "Check USB connection and camera mounting; reduce resolution if needed",
            "repair_hours": 1.5,
            "severity":    "warning",
        },
        "_default": {
            "root_cause":  "Safety subsystem anomaly",
            "action":      "Full safety system inspection and re-certification before returning to service",
            "repair_hours": 4.0,
            "severity":    "critical",
        },
    },
}

def _rule_diagnosis(alert):
    group    = alert.get("group", "unknown")
    sensor   = alert.get("sensor_key", "")
    agv_id   = alert.get("agv_id", "?")
    value    = alert.get("value", "?")
    rul_info = alert.get("rul_minutes", "?")

    group_rules = _RULE_TABLE.get(group, {})
    rule = group_rules.get(sensor, group_rules.get("_default", {
        "root_cause":  f"Anomaly in {group} subsystem",
        "action":      "Inspect affected subsystem",
        "repair_hours": 4.0,
        "severity":    "warning",
    }))

    return {
        "root_cause":   rule["root_cause"],
        "severity":     rule["severity"],
        "action":       rule["action"],
        "repair_hours": rule["repair_hours"],
        "explanation":  (
            f"Rule-based diagnosis for {agv_id} {group}/{sensor}. "
            f"Current value: {value}. "
            f"Estimated RUL: {rul_info} min. "
            f"NIM inference was unavailable at diagnosis time."
        ),
        "method": "rule_based",
    }


class _CircuitBreaker:
    def __init__(self, threshold: int, cooldown: float):
        self._threshold  = threshold
        self._cooldown   = cooldown
        self._failures   = 0
        self._opened_at  = 0.0

    def is_open(self) -> bool:
        if self._failures < self._threshold:
            return False
        if time.time() - self._opened_at > self._cooldown:
            log.info("Circuit breaker reset after cooldown")
            self._failures  = 0
            self._opened_at = 0.0
            return False
        return True

    def record_failure(self):
        self._failures += 1
        if self._failures == self._threshold:
            self._opened_at = time.time()
            log.warning(
                "Circuit breaker OPEN after %d consecutive NIM failures. "
                "Switching to rule-based for %d s.",
                self._threshold, self._cooldown,
            )

    def record_success(self):
        if self._failures > 0:
            log.info("NIM call succeeded - circuit breaker reset")
        self._failures  = 0
        self._opened_at = 0.0


_cb = _CircuitBreaker(CB_THRESHOLD, CB_COOLDOWN)


def _nim_post(model, messages, max_tokens, timeout):
    headers = {
        "Authorization": "Bearer " + NGC_API_KEY,
        "Content-Type":  "application/json",
    }
    payload = {
        "model":      model,
        "messages":   messages,
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "stream":     False,
    }
    url = NIM_BASE_URL + "/chat/completions"

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.post(url, headers=headers, json=payload,
                                 timeout=timeout)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except requests.exceptions.Timeout as exc:
            log.warning("NIM timeout (attempt %d/%d): %s",
                        attempt + 1, MAX_RETRIES + 1, exc)
        except requests.exceptions.RequestException as exc:
            log.warning("NIM request error (attempt %d/%d): %s",
                        attempt + 1, MAX_RETRIES + 1, exc)
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_SLEEP)

    return None


def _parse_json_from_text(text):
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return None


def _fetch_rul(agv_id):
    try:
        r = requests.get(API_BASE + "/agv/" + agv_id + "/rul", timeout=(3, 5))
        if r.ok:
            return r.json()
    except Exception:
        pass
    return {}


def _fetch_recent_alerts(agv_id):
    try:
        r = requests.get(API_BASE + "/alerts/recent?n=10", timeout=(3, 5))
        if r.ok:
            alerts = r.json()
            return [a for a in alerts if a.get("agv_id") == agv_id][:5]
    except Exception:
        pass
    return []


def _fetch_fleet():
    try:
        r = requests.get(API_BASE + "/fleet/summary", timeout=(3, 5))
        if r.ok:
            return r.json()
    except Exception:
        pass
    return {}


def _fetch_kb_context(group, sensor):
    """Retrieve relevant maintenance SOP snippets for this alert's fault type."""
    if not _RAG_AVAILABLE:
        return []
    query = f"{group} {sensor} fault diagnosis root cause maintenance procedure repair"
    try:
        return retrieve_context(query)
    except Exception:
        return []


_JSON_SCHEMA = (
    '{"root_cause":"<str>","severity":"critical|warning|info",'
    '"action":"<str>","repair_hours":<float>,"explanation":"<str>"}'
)

def _diagnose_with_nim(alert, use_nat):
    agv_id    = alert.get("agv_id", "?")
    group     = alert.get("group", "?")
    sensor    = alert.get("sensor_key", "?")
    value     = alert.get("value", "?")
    threshold = alert.get("threshold", "?")
    severity  = alert.get("severity", "warning")
    rul       = alert.get("rul_minutes", "?")

    context_parts = [
        f"AGV: {agv_id}",
        f"Sensor group: {group}",
        f"Sensor: {sensor}",
        f"Current value: {value}",
        f"Alert threshold: {threshold}",
        f"Severity: {severity}",
        f"Estimated RUL: {rul} minutes",
    ]

    if use_nat and USE_NAT:
        rul_data   = _fetch_rul(agv_id)
        hist       = _fetch_recent_alerts(agv_id)
        fleet      = _fetch_fleet()
        kb_hits    = _fetch_kb_context(group, sensor)
        if rul_data:
            context_parts.append("Full RUL data: " + json.dumps(rul_data)[:300])
        if hist:
            context_parts.append("Recent alerts for this AGV: " + json.dumps(hist)[:300])
        if fleet:
            context_parts.append("Fleet summary: " + json.dumps(fleet)[:200])
        if kb_hits:
            kb_text = "\n---\n".join(hit["content"] for hit in kb_hits)
            context_parts.append("Maintenance knowledge base (SOPs):\n" + kb_text[:1500])

    context = "\n".join(context_parts)
    prompt = (
        f"You are an AGV maintenance AI. Diagnose this alert and respond ONLY with "
        f"valid JSON matching exactly this schema:\n{_JSON_SCHEMA}\n\n"
        f"Alert data:\n{context}"
    )
    messages = [{"role": "user", "content": prompt}]

    if use_nat and USE_NAT:
        model   = NAT_MODEL
        timeout = TIMEOUT_NAT
    else:
        model   = NIM_MODEL
        timeout = TIMEOUT_SINGLE

    raw = _nim_post(model, messages, max_tokens=300, timeout=timeout)
    if raw is None:
        return None

    parsed = _parse_json_from_text(raw)
    if parsed is None:
        log.warning("Could not parse JSON from NIM response: %.200s", raw)
        return None

    parsed["method"] = "nim"
    return parsed


def diagnose(alert):
    if _cb.is_open():
        log.info("Circuit breaker open - using rule-based fallback")
        return _rule_diagnosis(alert)

    # Try NAT enriched first
    if USE_NAT:
        result = _diagnose_with_nim(alert, use_nat=True)
        if result is not None:
            _cb.record_success()
            return result
        log.warning("NAT failed - falling back to single-shot")
        _cb.record_failure()

    # Try single-shot (skip if circuit just opened)
    if not _cb.is_open():
        result = _diagnose_with_nim(alert, use_nat=False)
        if result is not None:
            _cb.record_success()
            return result
        log.warning("NIM error - using rule-based fallback")
        _cb.record_failure()

    return _rule_diagnosis(alert)


def _write_to_redis(r, alert, diag):
    agv_id    = alert.get("agv_id", "unknown")
    group     = alert.get("group", "unknown")
    ts        = datetime.utcnow().isoformat()

    record = {
        **alert,
        **diag,
        "diagnosed_at": ts,
    }
    payload = json.dumps(record)

    r.set("diagnosis:" + agv_id + ":" + group, payload, ex=600)
    r.rpush("diagnoses:all", payload)
    r.ltrim("diagnoses:all", -200, -1)
    r.publish("diagnoses:trigger", payload)


def run():
    r       = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub  = r.pubsub()
    pubsub.psubscribe("alerts:*")

    log.info("Diagnostician started - listening on alerts:*")
    log.info("NIM model=%s  USE_NAT=%s  timeout=connect%ss/read%ss  retries=%d",
             NIM_MODEL, USE_NAT, TIMEOUT_SINGLE[0], TIMEOUT_SINGLE[1], MAX_RETRIES)

    for message in pubsub.listen():
        if message["type"] not in ("message", "pmessage"):
            continue
        try:
            raw_alert = message.get("data", "")
            if not raw_alert:
                continue

            alert = json.loads(raw_alert) if isinstance(raw_alert, str) else raw_alert
            agv_id = alert.get("agv_id", "?")
            group  = alert.get("group", "?")

            log.info("Diagnosing %s / %s", agv_id, group)
            t0   = time.time()
            diag = diagnose(alert)
            dt   = time.time() - t0

            log.info(
                "%s/%s method=%s severity=%s repair_hours=%.1f  (%.1fs)",
                agv_id, group,
                diag.get("method", "?"),
                diag.get("severity", "?"),
                diag.get("repair_hours", 0),
                dt,
            )
            _write_to_redis(r, alert, diag)

        except Exception as exc:
            log.error("Unhandled error processing alert: %s", exc, exc_info=True)


if __name__ == "__main__":
    run()
 