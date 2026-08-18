# AGV Command Center - TypeScript Component Architecture

## Project Structure

```
agv-command-center/
├── src/
│   ├── components/
│   │   ├── agv/
│   │   │   ├── AgvTable.tsx          # Fleet health table
│   │   │   ├── AgvRow.tsx            # Individual AGV row
│   │   │   └── AgvDetails.tsx        # AGV detail modal
│   │   │
│   │   ├── anomaly/
│   │   │   ├── AnomalyAlert.tsx      # Individual anomaly card
│   │   │   └── AnomalyList.tsx       # Anomaly alerts list
│   │   │
│   │   ├── maintenance/
│   │   │   ├── MaintenanceQueue.tsx  # Ranked work orders
│   │   │   ├── ApprovalPanel.tsx     # HITL approval table
│   │   │   └── ApprovalModal.tsx     # Approval detail modal
│   │   │
│   │   ├── omniverse/
│   │   │   └── OmniverseViewer.tsx   # Digital Twin WebRTC viewer
│   │   │
│   │   ├── dashboard/
│   │   │   ├── FleetOverview.tsx     # Top KPI metrics
│   │   │   └── HeroSection.tsx       # Page hero banner
│   │   │
│   │   └── common/
│   │       ├── Header.tsx            # Top navigation bar
│   │       ├── StatusBadge.tsx       # Status color badge
│   │       ├── SectionTitle.tsx      # Section header
│   │       ├── AuditTrail.tsx        # Event log
│   │       └── Toast.tsx             # Notification toast
│   │
│   ├── services/
│   │   ├── telemetryService.ts       # AGV telemetry fetching & mapping
│   │   └── anomalyService.ts         # Anomaly scoring & ranking
│   │
│   ├── hooks/
│   │   ├── useAgvTelemetry.ts        # Stream data hook
│   │   └── useAgvSelection.ts        # AGV selection state
│   │
│   ├── data/
│   │   └── mockData.ts               # Mock API responses (typed)
│   │
│   ├── utils/
│   │   └── formatTime.ts             # Time formatting helpers
│   │
│   ├── main.tsx                      # App entry point (TypeScript)
│   └── styles.css                    # Global styles
│
├── .env                              # Environment variables
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite config (TypeScript)
├── package.json                      # Dependencies
└── README.md                         # Project docs
```

## Key Differences from Previous Structure

### Services → TypeScript (.ts files)
- **telemetryService.ts**: Fetches from 3 API endpoints, maps to typed `AGV` interface
- **anomalyService.ts**: Anomaly scoring and ranking logic

### Organized Components by Feature
- **agv/**: Fleet table and detail views
- **anomaly/**: Alert cards and lists
- **maintenance/**: Queue and approval workflows
- **omniverse/**: Digital Twin visualization
- **dashboard/**: Overview metrics
- **common/**: Reusable components (header, badges, modals, toast)

### Typed Interfaces
```typescript
// Example: AGV interface from telemetryService.ts
export interface AGV {
  id: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  battery: number;
  motor: number;
  rul: number;
  navigation: string;
  issue: string | null;
  bearing_vibration: number;
  speed: number;
  x: number;
  y: number;
}
```

### Custom Hooks
- **useAgvTelemetry**: Manages streaming data, initial load, and update intervals
- **useAgvSelection**: Centralized AGV selection state (selected, detail, approval)

### Main App Structure
The new `main.tsx` orchestrates all components:

```typescript
function App() {
  // Core state
  const [streaming, setStreaming] = useState(true);
  
  // Hooks
  const { agvs, lastUpdate } = useAgvTelemetry(streaming, uiPositionMap);
  const { selectedId, selectAgv, ... } = useAgvSelection('AGV-11');
  
  // Render
  return (
    <Header {...} />
    <HeroSection {...} />
    <FleetOverview {...} />
    <AgvTable {...} />
    <OmniverseViewer {...} />
    <AnomalyList {...} />
    <MaintenanceQueue {...} />
    <ApprovalPanel {...} />
    <AuditTrail {...} />
    {detailAgv && <AgvDetails {...} />}
    {approvalAgv && <ApprovalModal {...} />}
    {toast && <Toast {...} />}
  );
}
```

## Component Hierarchy

```
App
├── Header
├── HeroSection
├── FleetOverview (Metrics)
├── main-grid
│   ├── AgvTable
│   │   └── AgvRow (×12)
│   └── OmniverseViewer
├── AnomalyList
│   └── AnomalyAlert (×N)
├── MaintenanceQueue
├── bottom-grid
│   ├── ApprovalPanel
│   └── AuditTrail
├── AgvDetails (Modal)
├── ApprovalModal (Modal)
└── Toast (Notification)
```

## Data Flow

```
telemetryService.fetchStreamData()
    ↓
useAgvTelemetry hook
    ↓
App state (agvs array)
    ↓
Components (consume AGV data)
    ↓
UI rendering
```

## TypeScript Benefits

1. **Type Safety**: All interfaces defined (`AGV`, `Alert`, `AuditEntry`, etc.)
2. **Autocomplete**: IDE provides full IntelliSense for props
3. **Component Props**: Each component has typed `Props` interface
4. **Services**: Return types explicitly defined
5. **Hooks**: Typed state and return values

## Environment Setup

### Install Dependencies
```bash
npm install
```

### Environment Variables (.env)
```
VITE_API_URL=http://localhost:8001
VITE_USE_MOCK=true
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Component Communication

### Parent → Child (Props)
```typescript
<AgvTable
  agvs={agvs}
  selectedId={selectedId}
  onSelectAgv={handleSelectAgv}
  onOpenDetails={handleOpenAgvDetails}
/>
```

### Child → Parent (Callbacks)
```typescript
// In AgvRow component
onClick={() => onSelectAgv(agv.id)}
onClick={onDetailsClick}
```

### State Management
- **App-level state**: streaming, connected, approval, toast, audit
- **Selection state**: useAgvSelection hook
- **Telemetry state**: useAgvTelemetry hook

## Adding New Features

### 1. Create Component
```typescript
// src/components/feature/NewComponent.tsx
interface NewComponentProps {
  data: AGV[];
  onAction: (id: string) => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({ data, onAction }) => {
  return <div>...</div>;
};
```

### 2. Add Hook (if needed)
```typescript
// src/hooks/useNewFeature.ts
export function useNewFeature() {
  const [state, setState] = useState(...);
  useEffect(() => { ... }, []);
  return { state, ... };
}
```

### 3. Integrate in main.tsx
```typescript
import { NewComponent } from './components/feature/NewComponent';

function App() {
  // ...
  return (
    // ...
    <NewComponent data={agvs} onAction={handleAction} />
  );
}
```

## Styling

- Global styles in `src/styles.css`
- Uses CSS class names for Flexbox layouts
- Inline styles for dynamic values in TypeScript
- BEM-like naming for component-specific styles

### Key CSS Classes
- `.app-shell`: Main app container
- `.panel`: Section panel
- `.fleet-row`, `.alert-card`, `.q-row`: List item rows
- `.modal-backdrop`, `.agv-detail-modal`: Modals
- `.topbar`: Header bar
- `.twin-panel`: Omniverse viewer

## API Integration

### Mock Data Location
`src/data/mockData.ts` - All mock responses with TypeScript interfaces

### Service Functions
- `fetchStreamData()`: Main function called by `useAgvTelemetry`
- `mapStateToAgv()`: Transforms API → React object
- `calculateAnomalyScore()`: Scoring logic

### Switching to Real API
1. Set `VITE_USE_MOCK=false` in `.env`
2. Update `VITE_API_URL` to your backend
3. Services will automatically use real endpoints
4. Fallback to mock on errors

## Debugging

### Check Console
- Stream fetch errors logged
- Component warnings in dev mode

### React DevTools
- Inspect component tree
- Check hooks state
- Component props inspection

### Network Tab
- Monitor API calls to `/fleet/summary`, `/alerts/active`, `/agv/current_state`
- See response payloads and timing

## Next Steps

1. **Install deps**: `npm install`
2. **Start dev**: `npm run dev`
3. **Verify** each component renders
4. **Connect real API** when backend is ready
5. **Customize styles** as needed
6. **Add new features** using component template
