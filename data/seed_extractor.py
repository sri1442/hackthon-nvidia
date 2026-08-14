"""
Reads NASA Battery + PHM Bearing datasets and extracts
the statistical parameters used to seed the synthetic generator.
"""
import pandas as pd
import numpy as np
import json, os, glob

# ── NASA Battery ────────────────────────────────────────────────────────────
def extract_battery_params(nasa_dir: str) -> dict:
    records = []
    for f in glob.glob(os.path.join(nasa_dir, "**/*.csv"), recursive=True):
        try:
            df = pd.read_csv(f)
            if "Voltage_measured" in df.columns:
                records.append({
                    "voltage_mean": df["Voltage_measured"].mean(),
                    "voltage_std":  df["Voltage_measured"].std(),
                    "temp_mean":    df["Temperature_measured"].mean() if "Temperature_measured" in df.columns else 35.0,
                    "temp_std":     df["Temperature_measured"].std()  if "Temperature_measured" in df.columns else 3.0,
                    "current_mean": abs(df["Current_measured"].mean()) if "Current_measured" in df.columns else 2.0,
                })
        except Exception:
            pass
    if not records:
        # fallback defaults from NASA B0005-B0007 paper values
        return {"voltage_mean": 3.7, "voltage_std": 0.15,
                "temp_mean": 35.0,   "temp_std": 4.0,
                "current_mean": 2.0}
    r = pd.DataFrame(records).mean().to_dict()
    print(f"[battery] extracted from {len(records)} files: {r}")
    return r

# ── PHM Bearing ─────────────────────────────────────────────────────────────
def extract_bearing_params(phm_dir: str) -> dict:
    records = []
    for f in glob.glob(os.path.join(phm_dir, "**/acc_*.csv"), recursive=True):
        try:
            df = pd.read_csv(f, header=None, names=["hour","min","sec","us","h_acc","v_acc"])
            records.append({
                "vib_mean": df["h_acc"].abs().mean(),
                "vib_std":  df["h_acc"].std(),
                "vib_healthy_max": df["h_acc"].abs().quantile(0.95),
            })
        except Exception:
            pass
    if not records:
        return {"vib_mean": 0.02, "vib_std": 0.01, "vib_healthy_max": 0.08}
    r = pd.DataFrame(records).mean().to_dict()
    print(f"[bearing] extracted from {len(records)} files: {r}")
    return r

if __name__ == "__main__":
    battery = extract_battery_params("data/nasa_battery")
    bearing = extract_bearing_params("data/phm_bearing")
    seeds   = {"battery": battery, "bearing": bearing}
    with open("data/seed_params.json", "w") as f:
        json.dump(seeds, f, indent=2)
    print("Saved → data/seed_params.json")