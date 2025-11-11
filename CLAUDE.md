# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Documentation

@.clinerules

## Common Commands

### Development
```bash
npm run dev                      # Start Vite dev server on localhost:5173
npm run build                    # TypeScript compile + production build
npm run lint                     # Run ESLint
npm run preview                  # Preview production build locally
```

### Data Generation
```bash
npm run generate-current-season  # Update current season data only (fast)
npm run generate-data            # Regenerate all historical data (slow)
npm run fetch-players            # Update NFL player roster data
npm run generate-espn-data       # Convert ESPN CSV to JSON format
```

## Architecture Overview

**Fantasy Football Union** is a static React + TypeScript + Vite application that displays historical fantasy football league data across a three-tier system (Premier, Masters, National) from 2018-present.

### Key Architecture Patterns

1. **Static-First Data Strategy**: Pre-generated JSON files in `/public/data/{year}/{league}.json` minimize API calls
2. **Era Separation**: ESPN era (2018-2020) vs Sleeper era (2021+) handled via `era-detection.ts`
3. **Service Layer Pattern**:
   - `SleeperService` - Sleeper API wrapper with retry logic
   - `DataService` - Static file loading
   - `LeagueService` - Business logic layer
   - `api.ts` - Facade aggregating services
4. **Custom Hooks Pattern**: React Query-like data fetching (`useLeagues.ts`)
5. **Type-First Design**: Extensive TypeScript interfaces in `src/types/`

### Data Flow

```
Static JSON (primary) → DataService → LeagueService → useLeagues hooks → Components
Sleeper API (fallback) → SleeperService → LeagueService → useLeagues hooks → Components
```

### Critical Configuration Files

- `src/config/constants.ts` - **SINGLE SOURCE OF TRUTH** for:
  - `LEAGUES[]` - All 24+ league configurations (sleeperId, year, tier)
  - `USERS[]` - All 56 users with ffuId, sleeperId, teamName, historicalNames
  - Helper functions: `getLeagueId()`, `getUserById()`, `getFFUIdBySleeperId()`

### User ID System

- `ffuUserId` - Primary unified ID (e.g., "user_001")
- `sleeperId` - Sleeper platform ID
- `espnId` - ESPN platform ID (legacy)
- `userId` - Generic/legacy reference (avoid in new code)

### UPR Metric

Union Power Rating formula (in `upr-calculator.ts`):
```
UPR = ((avgScore × 6) + ((highGame + lowGame) × 2) + (winPct × 400)) / 10
```

### Routing

- **HashRouter** used for GitHub Pages compatibility
- URL params sync state: `?year=2025&league=PREMIER`
- Routes defined in `src/App.tsx`
