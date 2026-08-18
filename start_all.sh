#!/bin/bash
cd /home/ubuntu/ntt
source .venv/bin/activate          # ← activate venv first

PYTHON=$(which python)
echo "Using Python: $PYTHON"

mkdir -p logs pids

$PYTHON ingestion/streamer.py              > logs/streamer.log 2>&1 & echo $! > pids/streamer.pid
$PYTHON agents/watcher_battery.py          > logs/watcher_bat.log 2>&1 & echo $! > pids/watcher_bat.pid
$PYTHON agents/watcher_mechanical.py       > logs/watcher_mec.log 2>&1 & echo $! > pids/watcher_mec.pid
$PYTHON agents/watcher_navigation.py       > logs/watcher_nav.log 2>&1 & echo $! > pids/watcher_nav.pid
$PYTHON agents/watcher_drive.py            > logs/watcher_drv.log 2>&1 & echo $! > pids/watcher_drv.pid
$PYTHON agents/watcher_safety.py           > logs/watcher_saf.log 2>&1 & echo $! > pids/watcher_saf.pid
$PYTHON agents/diagnostician.py            > logs/diagnostician.log 2>&1 & echo $! > pids/diagnostician.pid
$PYTHON agents/prioritizer.py              > logs/prioritizer.log 2>&1 & echo $! > pids/prioritizer.pid
$PYTHON agents/orchestrator.py             > logs/orchestrator.log 2>&1 & echo $! > pids/orchestrator.pid
$PYTHON agents/work_order_generator.py     > logs/workorder.log 2>&1 & echo $! > pids/workorder.pid
uvicorn api.main:app --host 0.0.0.0 --port 8001 > logs/fastapi.log 2>&1 & echo $! > pids/fastapi.pid
streamlit run dashboard/app.py --server.port 8501 --server.address 0.0.0.0 > logs/streamlit.log 2>&1 & echo $! > pids/streamlit.pid

echo "All services started."
echo "Logs: tail -f logs/<name>.log"