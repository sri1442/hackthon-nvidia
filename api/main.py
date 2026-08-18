import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AGV Predictive Maintenance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # React Vite dev server
        "http://localhost:5174",   # React CRA dev server (fallback)
        "http://localhost:8501",   # Streamlit
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

r = redis.from_url("redis://localhost:6379", decode_responses=True)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ── Fleet current state ───────────────────────────────────────────────────────
@app.get("/agv/current_state")
def current_state():
    keys   = r.keys("agv:*:latest")
    result = []
    for k in sorted(keys):
        raw = r.get(k)
        if not raw:
            continue
        row    = json.loads(raw)
        agv_id = row.get("agv_id", k.split(":")[1])

        # Attach latest alerts per group
        alert_keys = r.keys(f"alert:{agv_id}:*")
        alerts = []
        for ak in alert_keys:
            a = r.get(ak)
            if a:
                alerts.append(json.loads(a))

        row["alerts"]   = alerts
        row["severity"] = max(
            (a["severity"] for a in alerts),
            key=lambda s: {"info": 0, "warning": 1, "critical": 2}.get(s, 0),
            default="healthy"
        ) if alerts else "healthy"

        # Attach latest diagnosis if exists
        diag_keys = r.keys(f"diagnosis:{agv_id}:*")
        diagnoses = []
        for dk in diag_keys:
            d = r.get(dk)
            if d:
                diagnoses.append(json.loads(d))
        row["diagnoses"] = diagnoses

        result.append(row)
    return result

# ── Alerts ────────────────────────────────────────────────────────────────────
@app.get("/alerts/recent")
def recent_alerts(n: int = 20):
    raws = r.lrange("alerts:all", -n, -1)
    return [json.loads(x) for x in reversed(raws)]

@app.get("/alerts/active")
def active_alerts():
    keys   = r.keys("alert:*:*")
    result = []
    for k in sorted(keys):
        raw = r.get(k)
        if raw:
            result.append(json.loads(raw))
    result.sort(
        key=lambda x: {"critical": 0, "warning": 1, "info": 2}.get(x.get("severity", "info"), 2)
    )
    return result

# ── RUL per AGV ───────────────────────────────────────────────────────────────
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
                "group":      a.get("group"),
                "rul_hours":  a.get("rul_hours"),
                "rul_model":  a.get("rul_model"),
                "severity":   a.get("severity"),
                "confidence": a.get("confidence"),
            })
    return {"agv_id": agv_id, "rul_estimates": result}

# ── Fleet summary ─────────────────────────────────────────────────────────────
@app.get("/fleet/summary")
def fleet_summary():
    states = current_state()
    total  = len(states)
    counts = {"healthy": 0, "warning": 0, "critical": 0}
    for s in states:
        sev = s.get("severity", "healthy")
        counts[sev] = counts.get(sev, 0) + 1
    return {
        "total_agvs":      total,
        "severity_counts": counts,
        "tick":            r.get("fleet:tick"),
    }

# ── Priority queue ────────────────────────────────────────────────────────────
@app.get("/priority/queue")
def priority_queue(n: int = 10):
    raws = r.lrange("priority:queue", 0, n - 1)
    return [json.loads(x) for x in raws]

# ── Diagnoses ─────────────────────────────────────────────────────────────────
@app.get("/diagnoses/recent")
def recent_diagnoses(n: int = 20):
    raws = r.lrange("diagnoses:all", -n, -1)
    return [json.loads(x) for x in reversed(raws)]

# ── Work orders ───────────────────────────────────────────────────────────────
@app.get("/workorders/pending")
def get_pending_workorders(n: int = 20):
    raws = r.lrange("workorders:pending", 0, n - 1)
    return [json.loads(x) for x in raws]

@app.get("/workorders/approved")
def get_approved_workorders(n: int = 20):
    raws = r.lrange("workorders:approved", 0, n - 1)
    return [json.loads(x) for x in raws]

@app.post("/workorders/{work_order_id}/approve")
def approve_work_order(work_order_id: str):
    raws = r.lrange("workorders:pending", 0, -1)
    for item in raws:
        wo = json.loads(item)
        if wo["work_order_id"] == work_order_id:
            wo["status"]      = "approved"
            wo["approved_at"] = time.time()
            r.rpush("workorders:approved", json.dumps(wo))
            r.lrem("workorders:pending", 1, item)
            return {"status": "approved", "work_order_id": work_order_id}
    return {"status": "not_found"}

@app.post("/workorders/{work_order_id}/reject")
def reject_work_order(work_order_id: str):
    raws = r.lrange("workorders:pending", 0, -1)
    for item in raws:
        wo = json.loads(item)
        if wo["work_order_id"] == work_order_id:
            wo["status"]      = "rejected"
            wo["rejected_at"] = time.time()
            r.lrem("workorders:pending", 1, item)
            return {"status": "rejected", "work_order_id": work_order_id}
    return {"status": "not_found"}