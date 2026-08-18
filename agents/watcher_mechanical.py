"""
AGV Telemetry Ingestion Layer
Reads fleet_all.parquet and streams rows into Redis at real-time cadence.
Watcher agents subscribe to Redis channels.
"""
import time
import json
import redis
import pandas as pd
import numpy as np
from datetime import datetime

REDIS_URL     = "redis://localhost:6379"
PARQUET_PATH  = "data/synthetic/output/fleet_all.parquet"
STREAM_INTERVAL_S = 2      # publish every 2s (fast for demo, set to 5 for realistic)
LOOP          = True       # loop dataset forever (continuous demo)

def _serialize(row: dict) -> str:
    """Convert numpy types to JSON-serializable Python types."""
    clean = {}
    for k, v in row.items():
        if isinstance(v, (np.integer,)):
            clean[k] = int(v)
        elif isinstance(v, (np.floating,)):
            clean[k] = float(v)
        elif isinstance(v, pd.Timestamp):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    return json.dumps(clean)


def stream_fleet(redis_url: str = REDIS_URL, parquet_path: str = PARQUET_PATH):
    r   = redis.from_url(redis_url, decode_responses=True)
    df  = pd.read_parquet(parquet_path)

    # Group by timestamp — each tick = one snapshot of all AGVs
    ticks = sorted(df["timestamp"].unique())
    print(f"[ingestion] Loaded {len(df)} rows, {len(ticks)} ticks, "
          f"{df['agv_id'].nunique()} AGVs")
    print(f"[ingestion] Streaming to Redis at {STREAM_INTERVAL_S}s intervals ...")

    tick_num = 0
    while True:
        for tick in ticks:
            snapshot = df[df["timestamp"] == tick]
            tick_num += 1

            for _, row in snapshot.iterrows():
                agv_id  = row["agv_id"]
                payload = _serialize(row.to_dict())

                # 1. Publish to pub/sub channel → watcher agents subscribe here
                r.publish(f"agv:{agv_id}:telemetry", payload)

                # 2. Store latest reading → FastAPI reads this for /agv/current_state
                r.set(f"agv:{agv_id}:latest", payload)

                # 3. Append to time-series list (keep last 120 readings = 10 min)
                key = f"agv:{agv_id}:history"
                r.rpush(key, payload)
                r.ltrim(key, -120, -1)

            # 4. Publish fleet heartbeat (dashboard uses this)
            r.set("fleet:tick", tick_num)
            r.publish("fleet:heartbeat", json.dumps({"tick": tick_num,
                                                      "ts": datetime.utcnow().isoformat()}))

            if tick_num % 50 == 0:
                print(f"[ingestion] tick {tick_num} published")

            time.sleep(STREAM_INTERVAL_S)

        if not LOOP:
            break
        print("[ingestion] Dataset complete — looping from start")


if __name__ == "__main__":
    stream_fleet()