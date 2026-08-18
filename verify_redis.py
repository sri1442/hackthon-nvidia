# verify_redis.py  — run from /home/ubuntu/ntt/
import redis, json

r = redis.from_url("redis://localhost:6379", decode_responses=True)

# ── 1. Fleet latest readings ──────────────────────────────────────────────────
print("\n" + "="*60)
print("FLEET LATEST READINGS")
print("="*60)
for agv_id in [f"AGV-{i:03d}" for i in range(1, 11)]:
    raw = r.get(f"agv:{agv_id}:latest")
    if raw:
        d = json.loads(raw)
        print(f"{agv_id} | battery_soh={d.get('battery_soh','--'):.2f} | "
              f"bearing_vib={d.get('mech_bearing_vib_g','--'):.3f} | "
              f"motor_cur={d.get('drive_motor_current_a','--'):.1f}")
    else:
        print(f"{agv_id} | no data yet")

# ── 2. Recent alerts ──────────────────────────────────────────────────────────
print("\n" + "="*60)
print("LAST 5 ALERTS")
print("="*60)
alerts = r.lrange("alerts:all", -5, -1)
for raw in alerts:
    a = json.loads(raw)
    print(f"{a.get('agv_id')} | {a.get('group')} | {a.get('parameter')} | "
          f"value={a.get('value')} | severity={a.get('severity')}")

# ── 3. NIM diagnoses ──────────────────────────────────────────────────────────
print("\n" + "="*60)
print("LAST 5 NIM DIAGNOSES")
print("="*60)
diagnoses = r.lrange("diagnoses:all", -5, -1)
for raw in diagnoses:
    d = json.loads(raw)
    diag = d.get("diagnosis", {})
    print(f"{d.get('agv_id')} | {d.get('group')}")
    print(f"  root_cause  : {diag.get('root_cause')}")
    print(f"  action      : {diag.get('action')}  | repair={diag.get('repair_hours')}h")
    print(f"  explanation : {diag.get('explanation','')[:100]}")
    print()

# ── 4. Priority queue ─────────────────────────────────────────────────────────
print("="*60)
print("TOP 5 PRIORITY QUEUE")
print("="*60)
queue = r.lrange("priority:queue", 0, 4)
for i, raw in enumerate(queue, 1):
    p = json.loads(raw)
    diag = p.get("diagnosis", {})
    print(f"#{i} | {p.get('agv_id')} | {p.get('group')} | "
          f"score={p.get('priority_score','--')} | "
          f"action={diag.get('action')} | repair={diag.get('repair_hours')}h")

# ── 5. Fleet summary counts ───────────────────────────────────────────────────
print("\n" + "="*60)
print("FLEET HEALTH SUMMARY")
print("="*60)
healthy = warning = critical = 0
for agv_id in [f"AGV-{i:03d}" for i in range(1, 11)]:
    raw = r.get(f"agv:{agv_id}:latest")
    if raw:
        sev = json.loads(raw).get("severity", "healthy")
        if sev == "critical":   critical += 1
        elif sev == "warning":  warning  += 1
        else:                   healthy  += 1
print(f"Healthy={healthy}  Warning={warning}  Critical={critical}")