# AGV Command Center — React frontend prototype

A hackathon-ready frontend prototype for the AGV predictive-maintenance flow discussed:

- Realtime fleet-health view
- Live anomaly alerts
- AI-ranked maintenance queue
- Human-in-the-loop approval gate
- Immutable-style audit trail
- Omniverse digital-twin viewport concept
- AGV selection/focus interaction
- Demo realtime telemetry stream simulator
- Demo anomaly injection

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Where to integrate the real streams

`src/main.jsx` currently contains a small interval-based simulator. Replace that `useEffect` with your real WebSocket/SSE telemetry subscription.

The Omniverse controls are intentionally represented as a browser-side adapter boundary. The `selectAgv()` flow is where you can send a WebRTC/DataChannel or Omniverse Web SDK message such as:

```js
{
  type: 'FOCUS_AGV',
  agvId: 'AGV-11',
  usdPrim: '/Factory/AGVs/AGV_11'
}
```

The visual prototype already demonstrates the intended UX: selecting an AGV in the table, alert, queue, or 3D viewport synchronizes the selected AGV and camera focus state.

## Recommended production architecture

React UI -> realtime gateway/WebSocket -> telemetry/event stream
React UI -> Omniverse Web SDK/WebRTC -> streamed Kit application
Backend -> AI watcher/diagnostic/prioritization agents
Backend -> audit/event store
Human approval -> backend command -> Omniverse/AGV action
