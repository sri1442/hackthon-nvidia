import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json, time, redis

REDIS_URL      = "redis://localhost:6379"
SEVERITY_SCORE = {"critical": 100, "warning": 50, "info": 10}
GROUP_WEIGHT   = {"safety": 1.5, "battery": 1.3, "mechanical": 1.2,
                  "drive": 1.0, "navigation": 0.9}

def priority_score(alert: dict) -> float:
    sev        = SEVERITY_SCORE.get(alert.get("severity", "info"), 10)
    weight     = GROUP_WEIGHT.get(alert.get("group", "drive"), 1.0)
    rul        = float(alert.get("rul_hours") or 99.0)
    rul_factor = max(0.1, 1.0 - (rul / 99.0))
    repair     = float(alert.get("diagnosis", {}).get("repair_hours") or 2.0)
    return round(sev * weight * (1 + rul_factor) * (1 + repair / 10), 2)

def run():
    r = redis.from_url(REDIS_URL, decode_responses=True)
    print("[prioritizer] running — rebuilding queue every 5s ...")
    while True:
        keys   = r.keys("diagnosis:*:*")
        ranked = []
        for k in keys:
            raw = r.get(k)
            if raw:
                alert = json.loads(raw)
                alert["priority_score"] = priority_score(alert)
                ranked.append(alert)

        ranked.sort(key=lambda x: x["priority_score"], reverse=True)
        r.delete("priority:queue")
        for item in ranked:
            r.rpush("priority:queue", json.dumps(item))

        if ranked:
            top = ranked[0]
            print(f"[prioritizer] TOP → {top['agv_id']} | "
                  f"{top['group']} | score={top['priority_score']} | "
                  f"action={top.get('diagnosis',{}).get('action','?')}")
        time.sleep(5)

if __name__ == "__main__":
    run()