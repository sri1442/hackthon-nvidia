import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AGV Predictive Maintenance API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

r = redis.from_url("redis://localhost:6379", decode_responses=True)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/agv/current_state")
def current_state():
    keys   = r.keys("agv:*:latest")
    result = []
    for k in sorted(keys):
        raw = r.get(k)
        if raw:
            row = json.loads(raw)
            # Attach latest alert if exists
            agv_id = row.get("agv_id", k.split(":")[1])
            alert_keys = r.keys(f"alert:{agv_id}:*")
            alerts = []
            for ak in alert_keys:
                a = r.get(ak)
                if a:
                    alerts.append(json.loads(a))
            row["alerts"]   = alerts
            row["severity"] = max((a["severity"] for a in alerts),
                                  key=lambda s: {"info":0,"warning":1,"critical":2}.get(s,0),
                                  default="healthy") if alerts else "healthy"
            result.append(row)
    return result

@app.get("/alerts/recent")
def recent_alerts(n: int = 20):
    raws = r.lrange("alerts:all", -n, -1)
    return [json.loads(r) for r in reversed(raws)]

@app.get("/alerts/active")
def active_alerts():
    keys   = r.keys("alert:*:*")
    result = []
    for k in sorted(keys):
        raw = r.get(k)
        if raw:
            result.append(json.loads(raw))
    result.sort(key=lambda x: {"critical":0,"warning":1,"info":2}.get(x.get("severity","info"),2))
    return result

@app.get("/agv/{agv_id}/rul")
def get_rul(agv_id: str):
    keys   = r.keys(f"alert:{agv_id}:*")
    result = []
    for k in keys:
        raw = r.get(k)
        if raw:
            a = json.loads(raw)
            result.append({
                "parameter":  a.get("parameter"),
                "rul_hours":  a.get("rul_hours"),
                "severity":   a.get("severity"),
                "confidence": a.get("confidence"),
            })
    return {"agv_id": agv_id, "rul_estimates": result}

@app.get("/fleet/summary")
def fleet_summary():
    states  = current_state()
    total   = len(states)
    counts  = {"healthy":0, "warning":0, "critical":0}
    for s in states:
        counts[s.get("severity","healthy")] = counts.get(s.get("severity","healthy"),0) + 1
    return {"total_agvs": total, "severity_counts": counts,
            "tick": r.get("fleet:tick")}