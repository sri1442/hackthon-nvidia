import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json, time, redis
from typing import TypedDict
from langgraph.graph import StateGraph, END
from agents.diagnostician import diagnose
from agents.prioritizer    import priority_score

REDIS_URL = "redis://localhost:6379"

class AgentState(TypedDict):
    alerts:    list
    diagnoses: list
    queue:     list
    tick:      int

def fetch_alerts(state: AgentState) -> AgentState:
    r      = redis.from_url(REDIS_URL, decode_responses=True)
    keys   = r.keys("alert:*:*")
    alerts = [json.loads(r.get(k)) for k in keys if r.get(k)]
    print(f"[orchestrator] tick={state['tick']} | {len(alerts)} active alerts")
    return {**state, "alerts": alerts}

def run_diagnostician(state: AgentState) -> AgentState:
    diagnoses = []
    for alert in state["alerts"]:
        if alert.get("severity") in ("critical", "warning"):
            alert["diagnosis"] = diagnose(alert)
            diagnoses.append(alert)
    return {**state, "diagnoses": diagnoses}

def run_prioritizer(state: AgentState) -> AgentState:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    for d in state["diagnoses"]:
        d["priority_score"] = priority_score(d)
    queue = sorted(state["diagnoses"],
                   key=lambda x: x["priority_score"], reverse=True)
    r.delete("priority:queue")
    for item in queue:
        r.rpush("priority:queue", json.dumps(item))
    if queue:
        top = queue[0]
        print(f"[orchestrator] TOP PRIORITY → {top['agv_id']} | "
              f"score={top['priority_score']} | "
              f"action={top.get('diagnosis',{}).get('action','?')}")
    return {**state, "queue": queue}

def build_graph():
    g = StateGraph(AgentState)
    g.add_node("fetch_alerts",      fetch_alerts)
    g.add_node("run_diagnostician", run_diagnostician)
    g.add_node("run_prioritizer",   run_prioritizer)
    g.set_entry_point("fetch_alerts")
    g.add_edge("fetch_alerts",      "run_diagnostician")
    g.add_edge("run_diagnostician", "run_prioritizer")
    g.add_edge("run_prioritizer",   END)
    return g.compile()

def run():
    graph = build_graph()
    tick  = 0
    print("[orchestrator] LangGraph supervisor running — every 10s")
    while True:
        graph.invoke({"alerts":[], "diagnoses":[], "queue":[], "tick": tick})
        tick += 1
        time.sleep(10)

if __name__ == "__main__":
    run()