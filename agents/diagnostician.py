# agents/diagnostician.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json, redis, requests

# ── load .env ─────────────────────────────────────────────────────────────────
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

REDIS_URL = "redis://localhost:6379"
API_BASE  = "http://localhost:8001"
_NIM_BASE = os.getenv("NIM_BASE_URL",   "https://integrate.api.nvidia.com/v1")
NIM_URL   = f"{_NIM_BASE.rstrip('/')}/chat/completions"
NIM_MODEL = os.getenv("NIM_MODEL_NAME", "nvidia/nemotron-mini-4b-instruct")
NGC_KEY   = os.getenv("NGC_API_KEY",    "")
USE_NAT   = os.getenv("USE_NAT", "true").lower() == "true"

# ── Context fetchers — call FastAPI directly, no LLM tool-call loop ───────────
def _fetch_rul(agv_id: str) -> str:
    try:
        r = requests.get(f"{API_BASE}/agv/{agv_id}/rul", timeout=5)
        return json.dumps(r.json())
    except Exception:
        return "unavailable"

def _fetch_history(agv_id: str) -> str:
    try:
        r = requests.get(f"{API_BASE}/alerts/recent?n=50", timeout=5)
        agv_alerts = [a for a in r.json() if a.get("agv_id") == agv_id][-10:]
        return json.dumps(agv_alerts) if agv_alerts else "no recent alerts"
    except Exception:
        return "unavailable"

def _fetch_fleet() -> str:
    try:
        r = requests.get(f"{API_BASE}/fleet/summary", timeout=5)
        return json.dumps(r.json())
    except Exception:
        return "unavailable"

def _safe_repair_hours(value) -> float:
    """Always return a float — handles 'unknown', None, or numeric strings."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return 4.0

# ── NAT enriched diagnosis: pre-fetch all context → single LLM call ──────────
def diagnose_with_nat(alert: dict) -> dict:
    agv_id  = alert.get("agv_id")
    rul     = _fetch_rul(agv_id)
    history = _fetch_history(agv_id)
    fleet   = _fetch_fleet()

    enriched_prompt = f"""You are an expert AGV maintenance engineer. Diagnose the following fault.

ALERT:
  AGV        : {agv_id}
  Group      : {alert.get('group')}
  Parameter  : {alert.get('parameter')}
  Value      : {alert.get('value')}
  Threshold  : {alert.get('threshold')}
  RUL        : {alert.get('rul_hours')} hours
  Trend      : {alert.get('explanation', 'N/A')}

CONTEXT:
  RUL Estimates    : {rul}
  Recent Alerts    : {history}
  Fleet Summary    : {fleet}

Respond ONLY with valid JSON using exactly these keys:
  root_cause   (string — specific fault description)
  severity     (critical | warning | info)
  action       (immediate | schedule | monitor)
  repair_hours (number — estimated hours needed, e.g. 2.0)
  explanation  (one sentence citing the specific sensor values above)"""

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {NGC_KEY}",
    }
    resp = requests.post(NIM_URL, json={
        "model":       NIM_MODEL,
        "messages": [
            {"role": "system", "content": "You are an expert AGV maintenance engineer. Always respond with valid JSON only."},
            {"role": "user",   "content": enriched_prompt},
        ],
        "temperature": 0.1,
        "max_tokens":  400,
    }, headers=headers, timeout=20)

    content = resp.json()["choices"][0]["message"]["content"]
    start   = content.find("{")
    end     = content.rfind("}") + 1
    result  = json.loads(content[start:end])
    result["repair_hours"] = _safe_repair_hours(result.get("repair_hours"))
    return result

# ── Single-shot fallback — no context fetching ────────────────────────────────
def diagnose_single_shot(alert: dict) -> dict:
    user_msg = (
        f"AGV: {alert.get('agv_id')} | "
        f"Group: {alert.get('group')} | "
        f"Parameter: {alert.get('parameter')} | "
        f"Value: {alert.get('value')} | "
        f"Threshold: {alert.get('threshold')} | "
        f"RUL: {alert.get('rul_hours')} hours | "
        f"Trend: {alert.get('explanation', 'N/A')}"
    )
    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {NGC_KEY}",
    }
    resp = requests.post(NIM_URL, json={
        "model":       NIM_MODEL,
        "messages": [
            {"role": "system", "content": (
                "You are an expert AGV maintenance engineer. "
                "Given a fault alert, respond ONLY in valid JSON with these exact keys: "
                "root_cause, severity, action (one of: immediate/schedule/monitor), "
                "repair_hours (a number), explanation."
            )},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.1,
        "max_tokens":  300,
    }, headers=headers, timeout=15)

    content = resp.json()["choices"][0]["message"]["content"]
    start   = content.find("{")
    end     = content.rfind("}") + 1
    result  = json.loads(content[start:end])
    result["repair_hours"] = _safe_repair_hours(result.get("repair_hours"))
    return result

# ── Main diagnose: NAT enriched first, single-shot fallback ───────────────────
def diagnose(alert: dict) -> dict:
    if USE_NAT:
        try:
            result = diagnose_with_nat(alert)
            print(f"[diagnostician] NAT enriched diagnosis complete")
            return result
        except Exception as e:
            print(f"[diagnostician] NAT failed ({e}) — falling back to single-shot")

    try:
        return diagnose_single_shot(alert)
    except Exception as e:
        print(f"[diagnostician] NIM error: {e}")
        sev = alert.get("severity", "warning")
        return {
            "root_cause":   f"Anomaly detected in {alert.get('parameter')}",
            "severity":     sev,
            "action":       "immediate" if sev == "critical" else "schedule",
            "repair_hours": 4.0 if sev == "critical" else 8.0,
            "explanation":  f"Auto-diagnosis (NIM offline): {alert.get('explanation', '')}",
        }

# ── Redis listener loop ───────────────────────────────────────────────────────
def run():
    r      = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.psubscribe("alerts:*")
    mode = "NAT enriched (RUL+history+fleet context)" if USE_NAT else "single-shot NIM"
    print(f"[diagnostician] listening for alerts ... mode={mode} | endpoint={_NIM_BASE}")

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue
        alert     = json.loads(message["data"])
        diagnosis = diagnose(alert)
        alert["diagnosis"] = diagnosis

        agv_id = alert["agv_id"]
        group  = alert["group"]
        r.set(f"diagnosis:{agv_id}:{group}", json.dumps(alert))
        r.rpush("diagnoses:all", json.dumps(alert))
        r.ltrim("diagnoses:all", -200, -1)
        r.publish("diagnoses:trigger", json.dumps({"agv_id": agv_id}))

        print(f"[diagnostician] {agv_id} | {group} | "
              f"action={diagnosis.get('action')} | "
              f"repair={diagnosis.get('repair_hours')}h")

if __name__ == "__main__":
    run()