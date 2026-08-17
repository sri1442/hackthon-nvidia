# AGV Command Center - API Integration Guide

## Overview
Your React app now uses a service-based architecture that mirrors the Python `bind.py` API calls. The mock data is structured exactly like the responses from the backend APIs, and the React components consume this data through service functions.

## Architecture

### 1. **Mock Data** (`src/services/mockData.js`)
Simulates WebRTC stream responses from three backend endpoints:

- **`/fleet/summary`** → `mockFleetSummary`
  - Contains KPI metrics: total AGVs, severity counts
  - Used for top-level metrics display

- **`/alerts/active`** → `mockActiveAlerts`
  - Contains active alert data: agv_id, group, parameter, value, threshold, severity, rul_hours, confidence
  - Used for alerts table and ranking
  - Data format matches Python response exactly

- **`/agv/current_state`** → `mockCurrentState`
  - Contains telemetry per AGV: agv_id, severity, battery_soh, mech_bearing_vib_g, drive_motor_current_a, drive_speed_ms, alerts
  - Used for fleet state and streaming updates
  - Real-world data from WebRTC streams

### 2. **API Service** (`src/services/api.js`)
Provides functions to fetch and map API data:

```javascript
// Core fetchers (mirror Python endpoints)
fetchFleetSummary()      // GET /fleet/summary
fetchActiveAlerts()      // GET /alerts/active
fetchCurrentState()      // GET /agv/current_state

// Mappers (transform API → React structure)
mapStateToAgv()          // Convert telemetry to AGV object
mapAlertToRow()          // Convert alert to table row

// Stream handler
fetchStreamData()        // Unified fetch for all endpoints
```

**Key feature**: Falls back to mock data if API is unavailable.

### 3. **Integration in main.jsx**
- **Initialization**: AGVs loaded from `mockCurrentState` (API structure)
- **Position data**: Stored separately in `uiPositionMap` (not from API)
- **Streaming**: Fetches fresh data every 2.2 seconds via `fetchStreamData()`
- **Issue detection**: Derived from API alerts array
- **Status mapping**: Comes directly from severity field in API

## Data Flow

```
Backend API (WebRTC) 
    ↓
mockData.js (simulates responses)
    ↓
api.js (fetch + transform)
    ↓
main.jsx state (agvs array)
    ↓
React components (tables, charts, visualizations)
```

## Column Intersection (API ↔ React Table)

The tables now use an intersection of Python and React columns:

| Column | Source | Used In |
|--------|--------|---------|
| `agv_id` / `id` | API | All tables |
| `severity` / `status` | API | Fleet state, badges |
| `battery_soh` / `battery` | API (converted %) | Fleet state |
| `drive_motor_current_a` / `motor` | API | Fleet state, alerts |
| `rul_hours` / `rul` | API | Maintenance queue |
| `alerts` / `issue` | API (mapped to string) | Anomaly alerts |
| `navigation` | Derived from API (fault check) | Fleet state |
| `x`, `y` (position) | NOT from API | Digital twin (UI-only) |

**Key principle**: If data isn't coming from the API (like x, y), it's preserved from `uiPositionMap`.

## Using with Real Backend

To connect to your actual backend:

1. **Update environment**:
   ```bash
   # .env
   REACT_APP_API=http://localhost:8001
   REACT_APP_USE_MOCK=false
   ```

2. **The service will**:
   - Try real endpoints first
   - Fallback to mock data if timeout/error
   - Keep streaming alive with WebRTC data

3. **Stream handling**:
   - `fetchStreamData()` runs every 2.2s
   - Handles both success and error cases
   - Preserves UI-only data (positions)

## Mock Data Structure Reference

### Fleet Summary
```json
{
  "total_agvs": 12,
  "severity_counts": {
    "healthy": 9,
    "warning": 2,
    "critical": 1
  }
}
```

### Active Alerts
```json
[
  {
    "agv_id": "AGV-11",
    "group": "drivetrain",
    "parameter": "drive_motor_current_a",
    "value": 94,
    "threshold": 85,
    "severity": "critical",
    "rul_hours": 1,
    "confidence": 0.96
  }
]
```

### Current State (per AGV)
```json
{
  "agv_id": "AGV-11",
  "severity": "critical",
  "battery_soh": 0.58,
  "mech_bearing_vib_g": 0.8,
  "drive_motor_current_a": 94,
  "drive_speed_ms": 0.2,
  "alerts": ["motor_overheating", "navigation_fault"]
}
```

## React AGV Object (After Mapping)
```javascript
{
  // From API
  id: "AGV-11",
  status: "Critical",
  battery: 58,        // battery_soh * 100
  motor: 94,          // drive_motor_current_a
  rul: 1,             // rul_hours
  bearing_vibration: 0.8,
  speed: 0.2,
  
  // Derived from API
  navigation: "FAULT", // from alerts array
  issue: "Motor overheating + navigation fault",
  
  // UI-only (not from API)
  x: 72,
  y: 38
}
```

## Updating Mock Data

To modify test scenarios, edit [src/services/mockData.js](src/services/mockData.js):

```javascript
export const mockCurrentState = [
  {
    agv_id: 'AGV-11',
    severity: 'critical',
    battery_soh: 0.58,        // ← Change battery
    drive_motor_current_a: 94, // ← Change motor temp
    // ...more fields
  }
];
```

Then reload the page. The UI will update on next stream refresh (2.2s).

## API Endpoints Summary

| Endpoint | Python bind.py | React Service | Returns |
|----------|---|---|---|
| `/fleet/summary` | ✓ | `fetchFleetSummary()` | KPI object |
| `/alerts/active` | ✓ | `fetchActiveAlerts()` | Alert[] |
| `/agv/current_state` | ✓ | `fetchCurrentState()` | State[] |

All three are fetched by `fetchStreamData()` with proper error handling.

## Next Steps

1. **Test mock data**: Modify values in [src/services/mockData.js](src/services/mockData.js) and observe UI changes
2. **Connect real API**: Set `REACT_APP_USE_MOCK=false` and provide `REACT_APP_API` URL
3. **Monitor stream**: Watch console for any fetch errors (fallback to mock is automatic)
4. **Add more fields**: If backend adds fields, they'll appear in API responses and can be added to `mapStateToAgv()`

## Troubleshooting

**Q: Why is my data not updating?**
- Check if `streaming` is enabled (top-right toggle)
- Check console for fetch errors
- Verify API endpoint is correct

**Q: How do I add a new field to the table?**
- Add it to the API response in `mockCurrentState`
- Map it in `mapStateToAgv()` function
- Use it in your React component

**Q: Can I use different RUL values per AGV?**
- Yes! Add `rul_hours` to each state object in `mockCurrentState`
- Update [src/services/mockData.js](src/services/mockData.js) line ~50
