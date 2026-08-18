import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import requests
import pandas as pd
import time

API = "http://localhost:8001"

st.set_page_config(page_title="AGV Predictive Maintenance",
                   layout="wide", page_icon="")
st.title("AGV Predictive Maintenance — Live Dashboard")

# Auto-refresh every 3 seconds
refresh = st.empty()

def fetch(endpoint):
    try:
        return requests.get(f"{API}{endpoint}", timeout=3).json()
    except:
        return None

# ── Top KPIs ─────────────────────────────────────────────────────────────────
summary = fetch("/fleet/summary") or {}
c1, c2, c3, c4 = st.columns(4)
c1.metric("Total AGVs",    summary.get("total_agvs", 0))
c2.metric("Healthy",   summary.get("severity_counts",{}).get("healthy",  0))
c3.metric("Warning",   summary.get("severity_counts",{}).get("warning",  0))
c4.metric("Critical",  summary.get("severity_counts",{}).get("critical", 0))

st.divider()

# ── Active alerts table ───────────────────────────────────────────────────────
st.subheader(" Active Alerts — Priority Queue")
alerts = fetch("/alerts/active") or []
if alerts:
    df_alerts = pd.DataFrame(alerts)[
        ["agv_id","group","parameter","value","threshold",
         "severity","rul_hours","confidence"]
    ].rename(columns={"rul_hours":"RUL (h)"})

    def color_severity(val):
        colors = {"critical":"background-color:#ff4444;color:white",
                  "warning": "background-color:#ffaa00;color:black",
                  "info":    "background-color:#aaaaaa"}
        return colors.get(val, "")

    st.dataframe(
        df_alerts.style.applymap(color_severity, subset=["severity"]),
        use_container_width=True, height=300
    )
else:
    st.success("No active alerts — all AGVs healthy")

st.divider()

# ── RUL bar chart ─────────────────────────────────────────────────────────────
st.subheader(" Remaining Useful Life by AGV")
if alerts:
    df_rul = pd.DataFrame(alerts)[["agv_id","parameter","rul_hours","severity"]].dropna()
    if not df_rul.empty:
        color_map = {"critical":"red","warning":"orange","info":"gray"}
        fig = px.bar(df_rul, x="agv_id", y="rul_hours",
                     color="severity", color_discrete_map=color_map,
                     hover_data=["parameter"],
                     labels={"rul_hours":"RUL (hours)"},
                     title="Estimated Remaining Useful Life per AGV")
        fig.add_hline(y=8, line_dash="dash", line_color="red",
                      annotation_text="8h maintenance threshold")
        st.plotly_chart(fig, use_container_width=True)

st.divider()

# ── Fleet state table ─────────────────────────────────────────────────────────
st.subheader("Fleet Live State")
states = fetch("/agv/current_state") or []
if states:
    df_fleet = pd.DataFrame([{
        "AGV":          s.get("agv_id"),
        "Severity":     s.get("severity","healthy"),
        "Battery SoH":  round(s.get("battery_soh",1.0), 3),
        "Bearing Vib":  round(s.get("mech_bearing_vib_g",0.0), 4),
        "Motor A":      round(s.get("drive_motor_current_a",0.0), 2),
        "Speed m/s":    round(s.get("drive_speed_ms",0.0), 2),
        "Active Faults":len(s.get("alerts",[]))
    } for s in states])
    st.dataframe(df_fleet, use_container_width=True)

# Auto-refresh
time.sleep(3)
st.rerun()