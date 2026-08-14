"""
Synthetic AGV Telemetry Generator
Seeded from NASA Battery + PHM Bearing real datasets.

5 parameter groups × N AGVs × T timesteps
Fault injection: degradation | spike | drift
"""
import numpy as np
import pandas as pd
import json, os
from datetime import datetime, timedelta

# ── Load seed params (falls back to defaults if extractor not yet run) ──────
def _load_seeds():
    path = os.path.join(os.path.dirname(__file__), "../seed_params.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {
        "battery": {"voltage_mean": 3.7,  "voltage_std": 0.15,
                    "temp_mean":    35.0,  "temp_std":    4.0,
                    "current_mean": 2.0},
        "bearing": {"vib_mean": 0.02, "vib_std": 0.01, "vib_healthy_max": 0.08}
    }

SEEDS = _load_seeds()

# ── Group 1: Battery / Power ─────────────────────────────────────────────────
def _gen_battery(n: int, fault: str | None, rng: np.random.Generator) -> dict:
    """
    Fault modes:
      'degradation' – SoH exponential decay, voltage sag
      'thermal'     – temperature runaway spike
      None          – healthy
    """
    # Scale NASA cell values (3.7 V nominal) → AGV pack (24 V = 7S)
    scale = 24.0 / 3.7
    v_mean = SEEDS["battery"]["voltage_mean"] * scale
    v_std  = SEEDS["battery"]["voltage_std"]  * scale
    t_mean = SEEDS["battery"]["temp_mean"]
    t_std  = SEEDS["battery"]["temp_std"]

    voltage     = rng.normal(v_mean, v_std, n).clip(20.0, 29.4)
    temperature = rng.normal(t_mean, t_std, n).clip(15.0, 85.0)
    current     = rng.normal(SEEDS["battery"]["current_mean"] * scale * 0.4,
                             1.5, n).clip(0.0, 60.0)
    soh         = np.ones(n) * rng.uniform(0.88, 1.0)   # per-AGV baseline
    charge_cycles = int(rng.uniform(10, 400))

    if fault == "degradation":
        decay   = np.linspace(0, 0.25, n)              # SoH drops 25 % over window
        soh     = (soh - decay).clip(0.5, 1.0)
        voltage = voltage * soh / soh[0]               # voltage sags with SoH
    elif fault == "thermal":
        spike_start = rng.integers(n // 2, n)
        temperature[spike_start:] += np.linspace(0, 45, n - spike_start)
        temperature = temperature.clip(15.0, 120.0)

    return {
        "battery_voltage_v":    voltage.round(3),
        "battery_current_a":    current.round(3),
        "battery_temp_c":       temperature.round(2),
        "battery_soh":          soh.round(4),
        "battery_charge_cycles": np.full(n, charge_cycles),
    }

# ── Group 2: Navigation / Localization ──────────────────────────────────────
def _gen_navigation(n: int, fault: str | None, rng: np.random.Generator) -> dict:
    """
    Fault modes:
      'drift'     – heading error grows over time (encoder slip)
      'lidar_fog' – localization confidence drops
    """
    heading_error         = rng.normal(0.0, 0.5, n).clip(-5.0, 5.0)
    localization_conf     = rng.normal(0.95, 0.02, n).clip(0.6, 1.0)
    path_deviation_m      = rng.normal(0.02, 0.01, n).clip(0.0, 0.5)
    position_x            = np.cumsum(rng.normal(0.05, 0.01, n))  # random walk
    position_y            = np.cumsum(rng.normal(0.05, 0.01, n))

    if fault == "drift":
        heading_error += np.linspace(0, 8.0, n)
        path_deviation_m += np.linspace(0, 0.4, n)
    elif fault == "lidar_fog":
        drop_start = rng.integers(n // 3, n // 2)
        localization_conf[drop_start:] -= np.linspace(0, 0.4, n - drop_start)
        localization_conf = localization_conf.clip(0.0, 1.0)

    return {
        "nav_position_x_m":         position_x.round(3),
        "nav_position_y_m":         position_y.round(3),
        "nav_heading_error_deg":    heading_error.round(3),
        "nav_localization_conf":    localization_conf.round(4),
        "nav_path_deviation_m":     path_deviation_m.round(4),
    }

# ── Group 3: Drive / Motion ──────────────────────────────────────────────────
def _gen_drive(n: int, fault: str | None, rng: np.random.Generator) -> dict:
    """
    Fault modes:
      'motor_wear'   – motor current increases (higher friction)
      'imbalance'    – vibration RMS increases
    """
    motor_current_a   = rng.normal(12.0, 1.5, n).clip(0.0, 40.0)
    speed_ms          = rng.normal(1.2, 0.1, n).clip(0.0, 2.5)
    vib_rms_g         = rng.normal(0.15, 0.03, n).clip(0.0, 3.0)
    encoder_count     = np.cumsum(rng.integers(80, 120, n))

    if fault == "motor_wear":
        motor_current_a += np.linspace(0, 10.0, n)
        motor_current_a  = motor_current_a.clip(0.0, 45.0)
    elif fault == "imbalance":
        vib_rms_g += np.linspace(0, 2.0, n) + rng.normal(0, 0.05, n)
        vib_rms_g  = vib_rms_g.clip(0.0, 5.0)

    return {
        "drive_motor_current_a": motor_current_a.round(3),
        "drive_speed_ms":        speed_ms.round(3),
        "drive_vib_rms_g":       vib_rms_g.round(4),
        "drive_encoder_count":   encoder_count,
    }

# ── Group 4: Mechanical Components ───────────────────────────────────────────
def _gen_mechanical(n: int, fault: str | None, rng: np.random.Generator) -> dict:
    """
    Fault modes:
      'bearing_spall' – vibration step-change (PHM2012 pattern)
      'bearing_wear'  – gradual temperature rise + vibration increase
    Seeded from PHM Bearing dataset statistics.
    """
    vib_m  = SEEDS["bearing"]["vib_mean"]
    vib_s  = SEEDS["bearing"]["vib_std"]
    vib_hx = SEEDS["bearing"]["vib_healthy_max"]

    bearing_vib_g    = rng.normal(vib_m, vib_s, n).clip(0.0, 0.5)
    bearing_temp_c   = rng.normal(45.0, 3.0, n).clip(20.0, 120.0)
    brake_resp_ms    = rng.normal(100.0, 8.0, n).clip(60.0, 300.0)
    wheel_diam_mm    = rng.normal(200.0, 0.5, n).clip(195.0, 205.0)

    if fault == "bearing_spall":
        # Sudden step change at random point — replicates PHM run-to-failure pattern
        spall_point = rng.integers(n // 2, int(n * 0.8))
        bearing_vib_g[spall_point:] += rng.normal(0.4, 0.05, n - spall_point)
        bearing_temp_c[spall_point:] += np.linspace(0, 25, n - spall_point)
    elif fault == "bearing_wear":
        bearing_vib_g  += np.linspace(0, vib_hx * 4, n)
        bearing_temp_c += np.linspace(0, 30.0, n)

    return {
        "mech_bearing_vib_g":    bearing_vib_g.clip(0.0, 5.0).round(5),
        "mech_bearing_temp_c":   bearing_temp_c.clip(20.0, 130.0).round(2),
        "mech_brake_resp_ms":    brake_resp_ms.round(1),
        "mech_wheel_diam_mm":    wheel_diam_mm.round(3),
    }

# ── Group 5: Safety / Sensing ────────────────────────────────────────────────
def _gen_safety(n: int, fault: str | None, rng: np.random.Generator) -> dict:
    """
    Fault modes:
      'sensor_drift' – estop response time degrades
      'lidar_blind'  – lidar return rate drops
    """
    estop_resp_ms      = rng.normal(30.0, 3.0, n).clip(10.0, 200.0)
    lidar_return_rate  = rng.normal(0.97, 0.01, n).clip(0.5, 1.0)
    camera_fps         = rng.normal(30.0, 0.5, n).clip(15.0, 60.0)
    bumper_sens_n      = rng.normal(5.0, 0.3, n).clip(2.0, 20.0)

    if fault == "sensor_drift":
        estop_resp_ms += np.linspace(0, 80.0, n)
        estop_resp_ms  = estop_resp_ms.clip(10.0, 300.0)
    elif fault == "lidar_blind":
        blind_start = rng.integers(n // 3, n // 2)
        lidar_return_rate[blind_start:] -= np.linspace(0, 0.5, n - blind_start)
        lidar_return_rate = lidar_return_rate.clip(0.0, 1.0)

    return {
        "safety_estop_resp_ms":     estop_resp_ms.round(1),
        "safety_lidar_return_rate": lidar_return_rate.round(4),
        "safety_camera_fps":        camera_fps.round(1),
        "safety_bumper_sens_n":     bumper_sens_n.round(2),
    }

# ── Fault schedule ────────────────────────────────────────────────────────────
FAULT_PROFILES = {
    # agv_id: {group: fault_mode}
    "AGV-002": {"battery":    "degradation"},
    "AGV-004": {"mechanical": "bearing_spall"},
    "AGV-006": {"drive":      "motor_wear"},
    "AGV-008": {"navigation": "drift"},
    "AGV-010": {"safety":     "sensor_drift"},
    # All others → healthy (None)
}

# ── Master generator ──────────────────────────────────────────────────────────
def generate_agv_fleet(
    n_agvs: int = 10,
    n_timesteps: int = 500,
    freq_seconds: int = 5,
    seed: int = 42,
    out_dir: str = "data/synthetic/output",
) -> pd.DataFrame:
    """
    Returns a single DataFrame with all AGVs × all timesteps × all parameters.
    Also saves per-AGV CSVs to out_dir/.
    """
    os.makedirs(out_dir, exist_ok=True)
    rng     = np.random.default_rng(seed)
    t_start = datetime(2026, 8, 13, 6, 0, 0)
    frames  = []

    for i in range(1, n_agvs + 1):
        agv_id  = f"AGV-{i:03d}"
        profile = FAULT_PROFILES.get(agv_id, {})

        timestamps = [t_start + timedelta(seconds=k * freq_seconds)
                      for k in range(n_timesteps)]

        row = {"timestamp": timestamps, "agv_id": agv_id}
        row.update(_gen_battery   (n_timesteps, profile.get("battery"),    rng))
        row.update(_gen_navigation(n_timesteps, profile.get("navigation"),  rng))
        row.update(_gen_drive     (n_timesteps, profile.get("drive"),       rng))
        row.update(_gen_mechanical(n_timesteps, profile.get("mechanical"),  rng))
        row.update(_gen_safety    (n_timesteps, profile.get("safety"),      rng))

        df_agv = pd.DataFrame(row)
        df_agv.to_csv(f"{out_dir}/{agv_id}.csv", index=False)
        frames.append(df_agv)
        print(f"  generated {agv_id}  fault={profile or 'healthy'}")

    fleet_df = pd.concat(frames, ignore_index=True)
    fleet_df.to_parquet(f"{out_dir}/fleet_all.parquet", index=False)
    print(f"\nFleet dataset: {fleet_df.shape}  →  {out_dir}/fleet_all.parquet")
    return fleet_df

if __name__ == "__main__":
    df = generate_agv_fleet(n_agvs=10, n_timesteps=500)
    print(df.head())
    print("\nColumns:", list(df.columns))