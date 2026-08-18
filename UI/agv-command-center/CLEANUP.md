# Cleanup Instructions - Old JavaScript Files

## Files to Delete

The following old JavaScript files should be **removed** since they've been replaced with TypeScript versions:

```
src/services/api.js        ← DELETE (use telemetryService.ts instead)
src/services/mockData.js   ← DELETE (use data/mockData.ts instead)
```

## Why Delete Them?

- They are no longer used in the project
- All imports now reference the TypeScript files
- Keeping them causes confusion and wastes space
- The project is now fully TypeScript-based

## How to Delete

### Option 1: VS Code
1. Right-click on `src/services/api.js`
2. Select **Delete**
3. Right-click on `src/services/mockData.js`
4. Select **Delete**

### Option 2: Terminal
```bash
rm src/services/api.js
rm src/services/mockData.js
```

### Option 3: File Explorer
1. Navigate to `src/services/`
2. Delete `api.js` and `mockData.js`

## After Cleanup

Your `src/services/` directory should contain **only**:
```
src/services/
├── telemetryService.ts  ✅
└── anomalyService.ts    ✅
```

And your mock data is now in:
```
src/data/
└── mockData.ts          ✅
```

## Verification

To verify everything is working after cleanup:

1. Run `npm install` (to install TypeScript dependencies)
2. Run `npm run dev` (to start dev server)
3. Open browser to `http://localhost:5173`
4. App should load with all components rendering

If you see the AGV dashboard with data, you're good! ✅
