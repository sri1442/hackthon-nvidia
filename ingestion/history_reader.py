"""
Helper used by watcher agents to read recent history from Redis.
"""
import json
import numpy as np
import redis

_r: redis.Redis | None = None

def get_redis(url: str = "redis://localhost:6379") -> redis.Redis:
    global _r
    if _r is None:
        _r = redis.from_url(url, decode_responses=True)
    return _r

def get_latest(agv_id: str) -> dict | None:
    """Get the most recent telemetry row for one AGV."""
    raw = get_redis().get(f"agv:{agv_id}:latest")
    return json.loads(raw) if raw else None

def get_history(agv_id: str, parameter: str, n: int = 60) -> np.ndarray:
    """
    Get last N values of a single parameter for one AGV.
    Used by RUL estimator as input history.
    """
    r    = get_redis()
    raws = r.lrange(f"agv:{agv_id}:history", -n, -1)
    vals = []
    for raw in raws:
        row = json.loads(raw)
        if parameter in row:
            vals.append(float(row[parameter]))
    return np.array(vals) if vals else np.array([0.0])

def get_all_latest() -> list[dict]:
    """Get latest reading for all AGVs (used by FastAPI /agv/current_state)."""
    r      = get_redis()
    keys   = r.keys("agv:*:latest")
    result = []
    for k in sorted(keys):
        raw = r.get(k)
        if raw:
            result.append(json.loads(raw))
    return result