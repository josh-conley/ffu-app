# FFU App - Architecture Analysis & Rewrite Plan

**Date:** 2025-11-28
**Focus:** Long-term maintainability and feature extensibility

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Critical Issues by Impact on Maintainability](#critical-issues-by-impact-on-maintainability)
4. [Data Architecture for Maintainability](#data-architecture-for-maintainability)
5. [Service Layer Redesign](#service-layer-redesign)
6. [Component Architecture](#component-architecture)
7. [Type System & Domain Modeling](#type-system--domain-modeling)
8. [Feature Addition Scenarios](#feature-addition-scenarios)
9. [Rewrite Strategy](#rewrite-strategy)
10. [Migration Roadmap](#migration-roadmap)
11. [Reference Metrics](#reference-metrics)

---

## Executive Summary

The FFU app suffers from **architectural drift** that makes adding new features increasingly difficult. The primary issues are:

1. **Identity System Confusion** - Dual ID systems (userId vs ffuUserId) create friction at every layer
2. **Data Denormalization** - Duplicated information makes updates error-prone (change in 12+ places)
3. **Service Monoliths** - 763-line LeagueService mixes concerns, making changes risky
4. **Configuration as Code** - 406-line constants.ts requires redeployment for data changes
5. **Tight Coupling** - Components deeply tied to current data structure

**Impact on Feature Development:**

Adding a new feature like "head-to-head record badges" currently requires:
- Understanding 4 different services
- Navigating 6 different data structures
- Touching 8+ components
- Managing dual ID conversion in 3+ places
- Risk of breaking unrelated features due to tight coupling

**Vision for Rewrite:**

A maintainable architecture where adding features is:
- **Predictable** - Clear patterns for where new code goes
- **Isolated** - Changes don't ripple across the codebase
- **Type-Safe** - Compiler catches errors before runtime
- **Self-Documenting** - Structure reveals intent

---

## Current State Assessment

### Codebase Metrics

| Metric | Value | Implication |
|--------|-------|-------------|
| Total Lines of Code | ~20,000 | Medium-sized app |
| Largest Service | 763 lines (LeagueService) | God Object anti-pattern |
| Largest Component | 696 lines (AllTimeStats.tsx) | Too much responsibility |
| Average Page Component | 571 lines | Hard to understand/modify |
| Configuration File | 406 lines | Data mixed with logic |
| Type Definitions File | 800+ lines | Needs organization |
| Test Coverage | 0% | No safety net for refactoring |
| `any` Type Usage | 18 occurrences | Type safety holes |

### Maintainability Red Flags

**🚩 Identity Crisis (Severity: CRITICAL)**
- Two competing ID systems throughout codebase
- Every data structure carries both IDs (bloat)
- Conversion functions scattered across 10+ files
- Mental overhead: "Which ID should I use here?"

**🚩 Knowledge Silos (Severity: HIGH)**
- Era detection logic in 5 different files
- UPR calculation duplicated/referenced inconsistently
- User lookup patterns vary by file
- No single source of truth for business rules

**🚩 Data Mutation Paths (Severity: HIGH)**
- 12 places where user team names appear
- Changing a team name requires touching: constants.ts, all league JSONs, regeneration scripts
- No automated validation that all copies match

**🚩 Feature Coupling (Severity: HIGH)**
- Adding playoff bracket visualization requires understanding entire LeagueService
- Can't add new stat without touching 3+ calculators
- Components assume specific data shape (can't easily change schema)

---

## Critical Issues by Impact on Maintainability

### 1. Identity System Confusion 🔴 CRITICAL

**Current State:**
```typescript
// Every data structure has BOTH IDs
interface SeasonStandings {
  userId: string;        // Deprecated but still used
  ffuUserId: string;     // New standard but incomplete
  wins: number;
  // ...
}

// Conversion utilities everywhere
getFFUIdBySleeperId(sleeperId: string): string
convertSleeperIdToFFUId(sleeperId: string): string
getUserById(sleeperId: string): FFUUser
```

**Maintainability Impact:**

When adding a new feature (e.g., "Career Timeline" showing user's journey):
1. ❓ Which ID field to use for lookups?
2. ❓ Do I need to convert IDs?
3. ❓ Will this work with ESPN-era data (no ffuUserId)?
4. 🔧 Write defensive code handling both IDs
5. 🐛 Risk: ID mismatch bugs in edge cases

**Desired State:**
```typescript
// Single source of truth
interface User {
  id: string;  // Internal FFU ID (always present)
  teamName: string;
  // ...

  // Platform IDs are implementation details
  _platformIds?: {
    sleeper?: string;
    espn?: string;
  }
}

// Clean lookups
userService.getById(id: string): User
userService.findByPlatformId(platform: 'sleeper' | 'espn', id: string): User
```

**Feature Addition Becomes:**
1. ✅ Always use `user.id`
2. ✅ No conversion needed
3. ✅ Platform IDs hidden from application logic

---

### 2. Configuration as Code 🔴 CRITICAL

**Current State:**
```typescript
// constants.ts (406 lines)
export const USERS: UserConfig[] = [
  { ffuId: 'ffu-001', sleeperId: '331590801261883392', teamName: 'The Stallions', ... },
  // ... 55 more users (126 lines)
];

export const LEAGUES: LeagueConfig[] = [
  { sleeperId: '1256010768692805632', year: '2025', tier: 'PREMIER', ... },
  // ... 23 more leagues (54 lines)
];

// ALSO contains 35+ utility functions operating on these arrays
export function getLeagueId(tier: LeagueTier, year: string): string { ... }
export function getUserById(sleeperId: string): FFUUser | null { ... }
// ... 33 more functions
```

**Maintainability Impact:**

When adding a new user:
1. 🔧 Edit 406-line TypeScript file
2. 🔧 Rebuild application
3. 🔧 Redeploy
4. 🐛 Risk: Typo breaks production (no schema validation)
5. 🐛 Risk: Merge conflicts if multiple people add users

When adding a new feature that needs user metadata:
1. ❓ Search through 406 lines to find relevant config
2. ❓ Figure out which helper function to use (35 to choose from)
3. 🔧 Import specific functions (tight coupling)

**Desired State:**
```
/public/data/
├── config/
│   ├── users.json           # Pure data (schema-validated)
│   ├── leagues.json         # Pure data (schema-validated)
│   └── schemas/
│       ├── user.schema.json
│       └── league.schema.json

// services/config.service.ts (clean interface)
class ConfigService {
  async getUser(id: string): Promise<User>
  async getAllUsers(): Promise<User[]>
  async getLeague(tier: LeagueTier, year: string): Promise<LeagueConfig>
}
```

**Feature Addition Becomes:**
1. ✅ Add new user to JSON file (no rebuild needed)
2. ✅ Schema validates on save
3. ✅ Service provides clean, typed interface
4. ✅ Can add admin UI for managing config later

---

### 3. Service Layer Monoliths 🔴 CRITICAL

**Current State:**
```typescript
// league.service.ts (763 lines)
class LeagueService {
  // DATA FETCHING (should be separate)
  async getLeagueStandings(...) { }
  async getWeekMatchups(...) { }
  async getLiveWeekMatchups(...) { }

  // BUSINESS LOGIC (should be separate)
  async getAllTimeRecords(...) { }
  calculateRegularSeasonStats(...) { }

  // DATA TRANSFORMATION (should be separate)
  convertHistoricalToEnhanced(...) { }
  enrichWithUserInfo(...) { }

  // MERGING LOGIC (should be separate)
  async getWeekMatchupsWithUserInfo(...) {
    // Complex conditional: try live, fallback to static, merge, transform...
    if (year === '2025' && getCurrentNFLWeek() === week) {
      try {
        matchups = await this.getLiveWeekMatchups(...);
      } catch (liveError) {
        try {
          matchups = await this.getWeekMatchups(...);
        } catch (staticError) { ... }
      }
    } else { ... }
    // ... more nesting
  }
}
```

**Maintainability Impact:**

When adding "playoff prediction" feature:
1. ❓ Where does this logic go? (763 lines to understand first)
2. 🔧 Add method to already-massive service
3. 🐛 Risk: Changes affect unrelated features (tight coupling)
4. 🐛 Risk: Break existing calculations (no clear boundaries)
5. 🧪 Can't test in isolation (depends on entire service)

When debugging a standings issue:
1. 😰 Search through 763 lines
2. 😰 Follow complex conditional branches
3. 😰 Understand 4 different data sources (live API, static, historical, ESPN)
4. 😰 Track data transformations across multiple methods

**Desired State:**
```typescript
// Focused, single-responsibility services

// services/league-data.service.ts (~150 lines)
class LeagueDataService {
  async getStandings(league: LeagueTier, year: string): Promise<Standings>
  async getWeekMatchups(league: LeagueTier, year: string, week: number): Promise<Matchup[]>
}

// services/league-calculations.service.ts (~150 lines)
class LeagueCalculationService {
  calculateUPR(stats: SeasonStats): number
  calculateRankings(standings: Standings): RankedStandings
  getAllTimeRecords(): AllTimeRecords
}

// services/league-transform.service.ts (~100 lines)
class LeagueTransformService {
  enrichWithUserInfo<T>(data: T, userIds: string[]): EnrichedData<T>
  normalizeEspnEra(data: EspnLeagueData): LeagueData
}

// services/live-data.service.ts (~150 lines)
class LiveDataService {
  async getCurrentWeekMatchups(league: LeagueTier): Promise<Matchup[]>
  async mergeWithStatic(live: Matchup[], static: Matchup[]): Promise<Matchup[]>
}
```

**Feature Addition Becomes:**
1. ✅ Clear where playoff prediction goes (LeagueCalculationService)
2. ✅ Isolated testing (mock just the data service)
3. ✅ Easy to understand (150 lines vs 763)
4. ✅ Safe changes (single responsibility = less risk)

---

### 4. Data Denormalization 🟡 HIGH

**Current State:**
```json
// /public/data/2024/premier.json (121 KB)
{
  "draftData": {
    "picks": [
      {
        "playerId": "4034",
        "pickedBy": "508719015656099840",
        "playerInfo": {                    // ← DUPLICATED 180 times in THIS file
          "name": "Christian McCaffrey",
          "position": "RB",
          "team": "SF",
          "college": "Stanford"
        },
        "userInfo": {                      // ← DUPLICATED 180 times in THIS file
          "userId": "508719015656099840",
          "teamName": "Team Name",
          "abbreviation": "TN"
        }
      }
      // ... 179 more picks with embedded info
    ]
  }
}

// Same userInfo duplicated across:
// - 20 league files × 180 picks = 3,600 copies
// - 240 standings entries
// - 1,960 matchup entries
```

**Maintainability Impact:**

When user changes team name:
1. 🔧 Update constants.ts
2. 🔧 Regenerate ALL 20 league files (even historical ones)
3. 🔧 Run generate-historical-data.js (10+ minutes)
4. 🐛 Risk: Miss updating one file → inconsistent data
5. 🐛 Risk: Regeneration script fails → partial update

When adding new user metadata field (e.g., "primaryColor"):
1. 🔧 Add to UserConfig type
2. 🔧 Add to every embedded userInfo location (3+ places in types)
3. 🔧 Update generation scripts to populate field
4. 🔧 Regenerate all data
5. 🔧 Update all components reading userInfo

**Desired State:**
```json
// /public/data/core/users.json (7.7 KB)
{
  "user-001": {
    "teamName": "The Stallions",
    "abbreviation": "STA",
    "primaryColor": "#FF6B6B"  // ← Add new field HERE ONLY
  }
}

// /public/data/seasons/2024/premier/draft.json (23 KB)
{
  "picks": [
    {
      "playerId": "4034",              // ← Reference only
      "pickedBy": "user-001"           // ← Reference only
    }
  ]
}
```

**Feature Addition Becomes:**
1. ✅ Add "primaryColor" to users.json only
2. ✅ Update ConfigService to return new field
3. ✅ Components automatically get new field (TypeScript guides)
4. ✅ No regeneration needed for historical data

---

### 5. Era Detection Scattered 🟡 MEDIUM

**Current State:**

Era logic exists in 5+ files:
```typescript
// utils/era-detection.ts
export const isEspnEra = (year: string): boolean => { ... }
export const getSeasonLength = (year: string): number => { ... }

// services/data.service.ts
isLeagueAvailableInYear(league: LeagueTier, year: string): boolean {
  const yearNum = parseInt(year);
  if (league === 'MASTERS' && yearNum < 2022) return false;
  // ...
}

// services/league.service.ts
const regularSeasonRecord = calculateRegularSeasonRecord(
  matchups,
  year  // ← Year passed to determine playoff weeks
);

// utils/upr-calculator.ts
if (!isRegularSeasonWeek(week, year)) return;  // ← Era-aware

// config/constants.ts
export function getAvailableLeagues(year: string): LeagueTier[] {
  const yearNum = parseInt(year);
  if (yearNum < 2021) return ['PREMIER', 'NATIONAL'];
  // ...
}
```

**Maintainability Impact:**

When adding support for 2026 rule changes (e.g., 18-week season):
1. ❓ Where are all the era checks? (grep through codebase)
2. 🔧 Update `getSeasonLength()` in era-detection.ts
3. 🔧 Update playoff week calculations in 3 different files
4. 🔧 Update any hardcoded week checks
5. 🐛 Risk: Miss one location → calculation errors
6. 🐛 Risk: Inconsistent era boundaries across files

**Desired State:**
```typescript
// domain/era/era-config.ts
interface EraConfig {
  name: string;
  yearRange: [number, number];
  seasonWeeks: number;
  playoffWeeks: number[];
  availableLeagues: LeagueTier[];
  scoringRules?: object;
}

const ERAS: EraConfig[] = [
  {
    name: 'ESPN',
    yearRange: [2018, 2020],
    seasonWeeks: 16,
    playoffWeeks: [14, 15, 16],
    availableLeagues: ['PREMIER', 'NATIONAL']
  },
  {
    name: 'SLEEPER_V1',
    yearRange: [2021, 2021],
    seasonWeeks: 17,
    playoffWeeks: [15, 16, 17],
    availableLeagues: ['PREMIER', 'NATIONAL']
  },
  {
    name: 'SLEEPER_V2',
    yearRange: [2022, 2025],
    seasonWeeks: 17,
    playoffWeeks: [15, 16, 17],
    availableLeagues: ['PREMIER', 'MASTERS', 'NATIONAL']
  }
];

// domain/era/era.service.ts
class EraService {
  getEra(year: string): EraConfig {
    const yearNum = parseInt(year);
    return ERAS.find(era =>
      yearNum >= era.yearRange[0] && yearNum <= era.yearRange[1]
    )!;
  }

  isPlayoffWeek(year: string, week: number): boolean {
    return this.getEra(year).playoffWeeks.includes(week);
  }

  getAvailableLeagues(year: string): LeagueTier[] {
    return this.getEra(year).availableLeagues;
  }
}
```

**Feature Addition Becomes:**
1. ✅ Add 2026 era config to ERAS array (single location)
2. ✅ All calculations automatically use new config
3. ✅ Type-safe (can't forget required fields)
4. ✅ Testable (mock era service)

---

## Data Architecture for Maintainability

### Design Principles

**1. Normalize by Change Frequency**
- **Rarely changes** (users, leagues) → Core config
- **Changes weekly** (standings, matchups) → Separate files by week
- **Never changes** (completed drafts) → Immutable archives

**2. Single Source of Truth**
- User metadata exists in ONE place
- No embedded copies of reference data
- Changes propagate automatically

**3. Predictable Structure**
- Consistent naming patterns
- Clear hierarchy (core → seasons → weeks)
- Self-documenting paths (`/seasons/2024/premier/weeks/12.json`)

**4. Schema-Validated**
- JSON schemas for all data files
- Runtime validation on load
- TypeScript types generated from schemas

**5. Feature-Friendly**
- Easy to add new user properties (one file)
- Easy to add new calculated stats (clear service)
- Easy to query historical data (consistent structure)

### Proposed Structure

```
/public/data/
├── config/                          # Configuration (rarely changes)
│   ├── users.json                   # All users (single source of truth)
│   ├── leagues.json                 # League metadata
│   └── schemas/                     # JSON schemas for validation
│       ├── user.schema.json
│       ├── league.schema.json
│       ├── standings.schema.json
│       └── matchup.schema.json
│
├── core/                            # Shared reference data
│   ├── players-used.json            # Players drafted 2018-2025 (356 players)
│   └── historical-teams/            # NFL team mappings (existing)
│       └── ...
│
├── seasons/                         # Season data (organized by mutability)
│   └── {year}/
│       └── {league}/
│           ├── meta.json            # League metadata (set once)
│           ├── standings.json       # Current/final standings (updated weekly)
│           ├── draft.json           # Draft results (set once in August)
│           ├── playoff-results.json # Playoff placements (set once at season end)
│           ├── promotions.json      # Promo/relegation (set once at season end)
│           └── weeks/               # Matchups by week (immutable after completion)
│               ├── 1.json
│               ├── 2.json
│               └── ...
│
└── archives/                        # Optional: Pre-aggregated views for performance
    ├── all-time-records.json        # Cached calculations
    └── user-career-stats.json       # Cached aggregations
```

### Schema Design

**User Schema (Extensible):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string", "pattern": "^user-[0-9]{3}$" },
    "teamName": { "type": "string" },
    "abbreviation": { "type": "string", "maxLength": 3 },
    "joinedYear": { "type": "number", "minimum": 2018 },
    "isActive": { "type": "boolean" },

    "platformIds": {
      "type": "object",
      "properties": {
        "sleeper": { "type": "string" },
        "espn": { "type": "string" }
      }
    },

    "metadata": {
      "type": "object",
      "description": "Extensible metadata for future features",
      "additionalProperties": true
    }
  },
  "required": ["id", "teamName", "abbreviation", "joinedYear", "isActive"]
}
```

**Adding a new user property:**
```json
{
  "id": "user-001",
  "teamName": "The Stallions",
  "abbreviation": "STA",
  "joinedYear": 2020,
  "isActive": true,
  "metadata": {
    "primaryColor": "#FF6B6B",       // ← NEW: Added without schema change
    "secondaryColor": "#4ECDC4",     // ← NEW: Added without schema change
    "logoUrl": "/logos/stallions.png" // ← NEW: For future logo feature
  }
}
```

**Draft Schema (References only):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "draftId": { "type": "string" },
    "year": { "type": "string" },
    "picks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "pickNumber": { "type": "number" },
          "round": { "type": "number" },
          "draftSlot": { "type": "number" },
          "playerId": {
            "type": "string",
            "description": "Reference to /core/players-used.json"
          },
          "pickedBy": {
            "type": "string",
            "description": "Reference to /config/users.json (user.id)"
          }
        },
        "required": ["pickNumber", "playerId", "pickedBy"]
      }
    }
  }
}
```

### Data Access Patterns

**Pattern 1: Loading User Data**
```typescript
// OLD: Hunt through constants.ts
import { USERS, getUserById, getDisplayTeamName } from '@/config/constants';
const user = getUserById(sleeperId);
const teamName = getDisplayTeamName(user?.historicalNames, year);

// NEW: Clean service interface
const user = await configService.getUser(userId);
const teamName = user.getTeamName(year);  // Method on User domain model
```

**Pattern 2: Enriching Draft Data**
```typescript
// OLD: Embedded data already there (but duplicated)
const playerName = pick.playerInfo.name;
const teamName = pick.userInfo.teamName;

// NEW: Resolve references (normalized)
const player = await coreDataService.getPlayer(pick.playerId);
const user = await configService.getUser(pick.pickedBy);
const playerName = player.name;
const teamName = user.teamName;

// OPTIMIZED: Batch resolve (avoid N+1 queries)
const [players, users] = await Promise.all([
  coreDataService.getPlayers(picks.map(p => p.playerId)),
  configService.getUsers(picks.map(p => p.pickedBy))
]);
```

**Pattern 3: Adding New Week Data**
```typescript
// OLD: Regenerate entire file
npm run generate-current-season  // Rewrites 360 KB

// NEW: Append week file
npm run update-week --week=12    // Writes 2.7 KB (week file + standings)

// Script logic:
const matchups = await sleeperService.getWeekMatchups(leagueId, week);
await fs.writeFile(
  `/public/data/seasons/2025/premier/weeks/${week}.json`,
  JSON.stringify({ week, matchups })
);

const standings = await sleeperService.getStandings(leagueId);
await fs.writeFile(
  `/public/data/seasons/2025/premier/standings.json`,
  JSON.stringify({ lastUpdated: new Date(), standings })
);
```

### Feature Addition Examples

**Example 1: Adding "Career Timeline" Page**

Requirements:
- Show user's league placements by year
- Display team name changes over time
- Highlight promotions/relegations

```typescript
// services/user-history.service.ts (NEW SERVICE)
class UserHistoryService {
  async getCareerTimeline(userId: string): Promise<CareerEvent[]> {
    const user = await configService.getUser(userId);
    const events: CareerEvent[] = [];

    // Iterate through years user was active
    for (let year = user.joinedYear; year <= currentYear; year++) {
      // Load standings for all leagues
      const leagues = eraService.getAvailableLeagues(year.toString());

      for (const league of leagues) {
        const standings = await seasonDataService.loadStandings(league, year.toString());
        const userStanding = standings.find(s => s.userId === userId);

        if (userStanding) {
          events.push({
            year,
            league,
            placement: userStanding.rank,
            teamName: user.getTeamName(year.toString()),
            // Check for promotion/relegation
            promotion: await this.checkPromotion(league, year, userId),
            relegation: await this.checkRelegation(league, year, userId)
          });
        }
      }
    }

    return events;
  }
}

// pages/UserCareer.tsx (NEW PAGE)
export const UserCareer: React.FC<{ userId: string }> = ({ userId }) => {
  const timeline = useCareerTimeline(userId);

  return (
    <div>
      {timeline.map(event => (
        <TimelineEvent
          key={`${event.year}-${event.league}`}
          year={event.year}
          league={event.league}
          placement={event.placement}
          teamName={event.teamName}
          isPromotion={event.promotion}
          isRelegation={event.relegation}
        />
      ))}
    </div>
  );
};
```

**Changes Required:**
1. ✅ Create new service file (isolated)
2. ✅ Create new page component (isolated)
3. ✅ Add route to router
4. ✅ No changes to existing data or services

**Example 2: Adding "Dynasty Score" Metric**

Requirements:
- New calculated stat: weighted average of placements (recent years count more)
- Display on member profile
- Show leaderboard

```typescript
// services/dynasty-score.service.ts (NEW SERVICE)
class DynastyScoreService {
  calculate(timeline: CareerEvent[]): number {
    const weights = [1.0, 0.9, 0.8, 0.7, 0.6];  // Last 5 years

    const recentYears = timeline.slice(-5);
    const weightedSum = recentYears.reduce((sum, event, index) => {
      const weight = weights[weights.length - 1 - index];
      const score = this.placementToScore(event.placement);
      return sum + (score * weight);
    }, 0);

    return weightedSum / weights.slice(0, recentYears.length).reduce((a, b) => a + b);
  }

  private placementToScore(placement: number): number {
    // 1st = 100, 12th = 0 (linear scale)
    return Math.max(0, 100 - ((placement - 1) * 8.33));
  }
}

// Add to UserProfile component
const dynastyScore = dynastyScoreService.calculate(timeline);
```

**Changes Required:**
1. ✅ Create new service (isolated calculation)
2. ✅ Update UserProfile component (one line)
3. ✅ No changes to data structure
4. ✅ No changes to existing services

**Example 3: Adding Team Color Customization**

Requirements:
- Users can set primary/secondary colors
- Colors used in charts and badges
- Persist across seasons

```typescript
// 1. Update /config/users.json
{
  "user-001": {
    "id": "user-001",
    "teamName": "The Stallions",
    "metadata": {
      "primaryColor": "#FF6B6B",    // ← ADD
      "secondaryColor": "#4ECDC4"   // ← ADD
    }
  }
}

// 2. Update User type
interface User {
  id: string;
  teamName: string;
  metadata?: {
    primaryColor?: string;
    secondaryColor?: string;
    [key: string]: any;  // Extensible
  }
}

// 3. Use in components
const TeamBadge: React.FC<{ userId: string }> = ({ userId }) => {
  const user = useUser(userId);
  const primaryColor = user.metadata?.primaryColor ?? '#888888';

  return (
    <div style={{ backgroundColor: primaryColor }}>
      {user.teamName}
    </div>
  );
};
```

**Changes Required:**
1. ✅ Add colors to users.json (no rebuild needed)
2. ✅ Update User type (TypeScript guides)
3. ✅ Use in components (opt-in)
4. ✅ Backwards compatible (fallback colors)

---

## Service Layer Redesign

### Current Service Architecture Issues

**Problem: God Objects**
- `LeagueService`: 763 lines, 15+ responsibilities
- Hard to understand what each method does
- Difficult to test (must mock entire service)
- Changes cascade unpredictably

**Problem: Unclear Boundaries**
- When to use `DataService` vs `LeagueService`?
- When to use `SleeperService` directly?
- `api.ts` facade adds little value

**Problem: Mixed Concerns**
- I/O (fetching) mixed with calculations
- Business logic mixed with transformations
- Live data merging scattered

### Proposed Service Architecture

**Principle: Single Responsibility + Clear Dependencies**

```
┌─────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                  │
│  (React Components, Pages, Hooks)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   APPLICATION SERVICES                  │
│  Orchestrate domain logic for specific use cases        │
├─────────────────────────────────────────────────────────┤
│  • UserHistoryService    • DynastyScoreService          │
│  • RecordService         • PlayoffPredictionService     │
└──────┬──────────────────────────────────────────┬───────┘
       │                                          │
┌──────▼──────────────────┐       ┌──────────────▼────────┐
│   DOMAIN SERVICES       │       │   CALCULATION ENGINE  │
│  Business logic         │       │  Pure functions       │
├─────────────────────────┤       ├───────────────────────┤
│ • LeagueService         │       │ • UprCalculator       │
│ • SeasonService         │       │ • RankingCalculator   │
│ • UserService           │       │ • StatCalculator      │
└──────┬──────────────────┘       └───────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                    │
│  Load/save data from various sources                    │
├─────────────────────────────────────────────────────────┤
│  • ConfigDataSource      (loads /config/*.json)         │
│  • CoreDataSource        (loads /core/*.json)           │
│  • SeasonDataSource      (loads /seasons/**/*.json)     │
│  • SleeperApiDataSource  (fetches from Sleeper API)     │
└─────────────────────────────────────────────────────────┘
```

### Service Definitions

**Data Access Layer (No Business Logic)**

```typescript
// services/data-sources/config.data-source.ts
class ConfigDataSource {
  private cache = new Map<string, any>();

  async getUser(id: string): Promise<UserData> {
    const users = await this.loadUsers();
    return users[id];
  }

  async getAllUsers(): Promise<Record<string, UserData>> {
    if (this.cache.has('users')) {
      return this.cache.get('users')!;
    }

    const response = await fetch('/data/config/users.json');
    const data = await response.json();

    // Validate against schema
    this.validateUsers(data);

    this.cache.set('users', data.users);
    return data.users;
  }

  private validateUsers(data: any): void {
    // JSON schema validation
  }
}

// services/data-sources/season.data-source.ts
class SeasonDataSource {
  async getStandings(league: LeagueTier, year: string): Promise<StandingsData> {
    const response = await fetch(`/data/seasons/${year}/${league.toLowerCase()}/standings.json`);
    const data = await response.json();
    this.validateStandings(data);
    return data.standings;
  }

  async getWeekMatchups(league: LeagueTier, year: string, week: number): Promise<MatchupData[]> {
    const response = await fetch(`/data/seasons/${year}/${league.toLowerCase()}/weeks/${week}.json`);
    const data = await response.json();
    return data.matchups;
  }

  async getAllWeeks(league: LeagueTier, year: string): Promise<MatchupData[][]> {
    const era = eraService.getEra(year);
    const weekPromises = Array.from(
      { length: era.seasonWeeks },
      (_, i) => this.getWeekMatchups(league, year, i + 1)
    );
    return Promise.all(weekPromises);
  }
}

// services/data-sources/sleeper-api.data-source.ts
class SleeperApiDataSource {
  async getLiveMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    return this.fetchWithRetry(`/league/${leagueId}/matchups/${week}`);
  }

  async getLiveStandings(leagueId: string): Promise<SleeperRoster[]> {
    return this.fetchWithRetry(`/league/${leagueId}/rosters`);
  }

  private async fetchWithRetry(path: string, attempts = 3): Promise<any> {
    // Retry logic
  }
}
```

**Domain Services (Business Logic, No I/O)**

```typescript
// services/domain/user.service.ts
class UserService {
  constructor(
    private configDataSource: ConfigDataSource
  ) {}

  async getUser(id: string): Promise<User> {
    const userData = await this.configDataSource.getUser(id);
    return new User(userData);  // Map to domain model
  }

  async findByPlatformId(platform: 'sleeper' | 'espn', platformId: string): Promise<User | null> {
    const allUsers = await this.configDataSource.getAllUsers();

    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.platformIds?.[platform] === platformId) {
        return new User(userData);
      }
    }

    return null;
  }
}

// services/domain/season.service.ts
class SeasonService {
  constructor(
    private seasonDataSource: SeasonDataSource,
    private userService: UserService,
    private eraService: EraService
  ) {}

  async getStandings(league: LeagueTier, year: string): Promise<SeasonStanding[]> {
    const standingsData = await this.seasonDataSource.getStandings(league, year);

    // Enrich with user info
    const enriched = await Promise.all(
      standingsData.map(async (standing) => {
        const user = await this.userService.getUser(standing.userId);
        return new SeasonStanding({
          ...standing,
          user
        });
      })
    );

    return enriched;
  }

  async getWeekMatchups(league: LeagueTier, year: string, week: number): Promise<Matchup[]> {
    const matchupData = await this.seasonDataSource.getWeekMatchups(league, year, week);

    // Enrich with user info
    const enriched = await Promise.all(
      matchupData.map(async (matchup) => {
        const [winner, loser] = await Promise.all([
          this.userService.getUser(matchup.winner),
          this.userService.getUser(matchup.loser)
        ]);

        return new Matchup({
          ...matchup,
          winnerUser: winner,
          loserUser: loser
        });
      })
    );

    return enriched;
  }
}

// services/domain/league.service.ts
class LeagueService {
  constructor(
    private seasonService: SeasonService,
    private rankingCalculator: RankingCalculator,
    private eraService: EraService
  ) {}

  async getStandingsWithRankings(league: LeagueTier, year: string): Promise<RankedStanding[]> {
    const standings = await this.seasonService.getStandings(league, year);
    const allWeeks = await this.seasonService.getAllWeeks(league, year);

    return this.rankingCalculator.calculateRankings(standings, allWeeks, year);
  }
}
```

**Calculation Engine (Pure Functions)**

```typescript
// services/calculators/ranking.calculator.ts
class RankingCalculator {
  calculateRankings(
    standings: SeasonStanding[],
    allWeeks: Matchup[][],
    year: string
  ): RankedStanding[] {
    const era = eraService.getEra(year);

    // Calculate regular season record (exclude playoff weeks)
    const regularSeasonWeeks = allWeeks.filter((_, week) =>
      !era.playoffWeeks.includes(week + 1)
    );

    // Apply tiebreaker logic
    const sorted = this.applyTiebreakers(standings, regularSeasonWeeks);

    // Assign ranks
    return sorted.map((standing, index) => ({
      ...standing,
      rank: index + 1
    }));
  }

  private applyTiebreakers(standings: SeasonStanding[], weeks: Matchup[][]): SeasonStanding[] {
    // Tiebreaker logic (pure function)
  }
}

// services/calculators/upr.calculator.ts
class UprCalculator {
  calculate(stats: SeasonStats): number {
    const { avgScore, highGame, lowGame, winPct } = stats;
    return ((avgScore * 6) + ((highGame + lowGame) * 2) + (winPct * 400)) / 10;
  }

  calculateFromStanding(standing: SeasonStanding, weeks: Matchup[][]): number {
    const stats = this.extractStats(standing, weeks);
    return this.calculate(stats);
  }

  private extractStats(standing: SeasonStanding, weeks: Matchup[][]): SeasonStats {
    // Pure extraction logic
  }
}
```

**Application Services (Use Case Orchestration)**

```typescript
// services/application/user-history.service.ts
class UserHistoryService {
  constructor(
    private userService: UserService,
    private seasonService: SeasonService,
    private eraService: EraService
  ) {}

  async getCareerTimeline(userId: string): Promise<CareerEvent[]> {
    const user = await this.userService.getUser(userId);
    const events: CareerEvent[] = [];

    for (let year = user.joinedYear; year <= currentYear; year++) {
      const leagues = this.eraService.getAvailableLeagues(year.toString());

      const yearEvents = await Promise.all(
        leagues.map(league => this.getYearEvent(userId, league, year))
      );

      events.push(...yearEvents.filter(e => e !== null));
    }

    return events;
  }

  private async getYearEvent(
    userId: string,
    league: LeagueTier,
    year: number
  ): Promise<CareerEvent | null> {
    const standings = await this.seasonService.getStandings(league, year.toString());
    const userStanding = standings.find(s => s.user.id === userId);

    if (!userStanding) return null;

    return {
      year,
      league,
      placement: userStanding.rank,
      wins: userStanding.wins,
      losses: userStanding.losses,
      pointsFor: userStanding.pointsFor
    };
  }
}

// services/application/records.service.ts
class RecordsService {
  constructor(
    private seasonService: SeasonService,
    private eraService: EraService
  ) {}

  async getAllTimeRecords(league?: LeagueTier, year?: string): Promise<AllTimeRecords> {
    const seasons = await this.loadSeasons(league, year);

    return {
      highestScore: this.findHighestScore(seasons),
      lowestScore: this.findLowestScore(seasons),
      biggestBlowout: this.findBiggestBlowout(seasons),
      closestMatch: this.findClosestMatch(seasons),
      // ... more records
    };
  }

  private async loadSeasons(league?: LeagueTier, year?: string): Promise<Season[]> {
    // Load all relevant seasons based on filters
  }

  private findHighestScore(seasons: Season[]): RecordEntry {
    // Pure calculation
  }
}
```

### Dependency Injection Setup

```typescript
// services/service-container.ts
class ServiceContainer {
  // Data Sources (singleton, cached)
  private configDataSource = new ConfigDataSource();
  private coreDataSource = new CoreDataSource();
  private seasonDataSource = new SeasonDataSource();
  private sleeperApiDataSource = new SleeperApiDataSource();

  // Domain Services
  private eraService = new EraService();
  private userService = new UserService(this.configDataSource);
  private seasonService = new SeasonService(
    this.seasonDataSource,
    this.userService,
    this.eraService
  );
  private leagueService = new LeagueService(
    this.seasonService,
    new RankingCalculator(),
    this.eraService
  );

  // Application Services
  private userHistoryService = new UserHistoryService(
    this.userService,
    this.seasonService,
    this.eraService
  );
  private recordsService = new RecordsService(
    this.seasonService,
    this.eraService
  );

  // Public API
  get users() { return this.userService; }
  get seasons() { return this.seasonService; }
  get leagues() { return this.leagueService; }
  get userHistory() { return this.userHistoryService; }
  get records() { return this.recordsService; }
}

export const services = new ServiceContainer();
```

**Usage in Components:**

```typescript
// hooks/useCareerTimeline.ts
export const useCareerTimeline = (userId: string) => {
  return useQuery({
    queryKey: ['career-timeline', userId],
    queryFn: () => services.userHistory.getCareerTimeline(userId)
  });
};

// pages/UserCareer.tsx
export const UserCareer: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: timeline, isLoading } = useCareerTimeline(userId);

  if (isLoading) return <LoadingSpinner />;

  return <CareerTimeline events={timeline} />;
};
```

### Benefits for Feature Development

**Adding "Playoff Predictor" Feature:**

1. Create new application service:
```typescript
// services/application/playoff-predictor.service.ts
class PlayoffPredictorService {
  constructor(
    private seasonService: SeasonService,
    private rankingCalculator: RankingCalculator
  ) {}

  async predictPlayoffOdds(league: LeagueTier, year: string): Promise<PlayoffOdds[]> {
    const currentStandings = await this.seasonService.getStandings(league, year);
    const remainingWeeks = this.calculateRemainingWeeks(year);

    // Run simulations
    const simulations = this.runSimulations(currentStandings, remainingWeeks, 10000);

    return this.calculateOdds(simulations);
  }
}
```

2. Register in service container
3. Create hook and component
4. Add route

**No changes to existing services or data structure.**

---

## Component Architecture

### Current Component Issues

**Problem: Page Components Too Large (571 lines avg)**
- Mix business logic with presentation
- Hard to test UI separately from logic
- Difficult to reuse parts

**Problem: Prop Drilling**
- `league` and `year` passed through 3+ levels
- Changes to data shape cascade through components

**Problem: Inconsistent Organization**
- "Common" folder is dumping ground (11 components)
- Single-component folders exist
- No clear feature grouping

### Proposed Component Architecture

**Principle: Feature-Based Organization + Composition**

```
components/
├── ui/                          # Generic, reusable UI components
│   ├── Button/
│   ├── Card/
│   ├── LoadingSpinner/
│   ├── Modal/
│   └── Tooltip/
│
├── domain/                      # Domain-specific components (reusable)
│   ├── team/
│   │   ├── TeamLogo/
│   │   ├── TeamBadge/
│   │   └── TeamSelector/
│   ├── league/
│   │   ├── LeagueBadge/
│   │   └── LeagueSelector/
│   └── player/
│       ├── PlayerCard/
│       └── PlayerAvatar/
│
├── features/                    # Feature-specific components (composition)
│   ├── standings/
│   │   ├── StandingsTable/
│   │   ├── StandingsRow/
│   │   ├── UPRHorserace/
│   │   └── index.ts             # Public API
│   ├── matchups/
│   │   ├── MatchupCard/
│   │   ├── MatchupList/
│   │   ├── WeekSelector/
│   │   └── index.ts
│   ├── draft/
│   │   ├── DraftBoard/
│   │   ├── DraftPick/
│   │   ├── DraftControls/
│   │   └── index.ts
│   └── user-profile/
│       ├── ProfileCard/
│       ├── CareerTimeline/
│       ├── StatsSummary/
│       └── index.ts
│
└── layout/
    ├── AppLayout/
    ├── Header/
    └── Sidebar/
```

### Component Patterns

**Pattern 1: Container/Presenter Split**

```typescript
// features/standings/StandingsTable/StandingsTableContainer.tsx
// (Business logic, data fetching)
export const StandingsTableContainer: React.FC<Props> = ({ league, year }) => {
  const { data: standings, isLoading } = useStandings(league, year);
  const { data: rankings } = useRankings(league, year);

  if (isLoading) return <LoadingSpinner />;

  return (
    <StandingsTablePresenter
      standings={standings}
      rankings={rankings}
      onTeamClick={handleTeamClick}
    />
  );
};

// features/standings/StandingsTable/StandingsTablePresenter.tsx
// (Pure presentation, no hooks)
export const StandingsTablePresenter: React.FC<PresenterProps> = ({
  standings,
  rankings,
  onTeamClick
}) => {
  return (
    <table>
      {standings.map(standing => (
        <StandingsRow
          key={standing.user.id}
          standing={standing}
          rank={rankings.find(r => r.userId === standing.user.id)?.rank}
          onClick={() => onTeamClick(standing.user.id)}
        />
      ))}
    </table>
  );
};
```

**Benefits:**
- ✅ Easy to test presenter (snapshot tests)
- ✅ Easy to test container (mock hooks)
- ✅ Easy to reuse presenter with different data
- ✅ Clear separation of concerns

**Pattern 2: Compound Components**

```typescript
// features/standings/StandingsTable/index.tsx
export const StandingsTable = {
  Root: StandingsTableRoot,
  Header: StandingsTableHeader,
  Row: StandingsTableRow,
  Footer: StandingsTableFooter
};

// Usage (flexible composition)
<StandingsTable.Root>
  <StandingsTable.Header
    sortBy={sortBy}
    onSort={handleSort}
  />
  {standings.map(standing => (
    <StandingsTable.Row
      key={standing.user.id}
      standing={standing}
      highlighted={standing.rank === 1}
    />
  ))}
  <StandingsTable.Footer
    totalTeams={standings.length}
    lastUpdated={lastUpdated}
  />
</StandingsTable.Root>
```

**Benefits:**
- ✅ Flexible composition
- ✅ Clear API surface
- ✅ Easy to extend (add new sub-components)

**Pattern 3: Render Props for Flexibility**

```typescript
// features/user-profile/UserProfileCard/index.tsx
export const UserProfileCard: React.FC<Props> = ({
  userId,
  renderActions
}) => {
  const user = useUser(userId);
  const stats = useUserStats(userId);

  return (
    <Card>
      <UserAvatar user={user} />
      <UserStats stats={stats} />
      {renderActions?.({ user, stats })}
    </Card>
  );
};

// Usage (customizable actions)
<UserProfileCard
  userId="user-001"
  renderActions={({ user }) => (
    <>
      <Button onClick={() => viewCareer(user.id)}>View Career</Button>
      <Button onClick={() => compare(user.id)}>Compare</Button>
    </>
  )}
/>
```

### Page Component Structure

**Before (407 lines):**
```typescript
// pages/Standings.tsx
export const Standings = () => {
  // 50 lines of state management
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedLeague, setSelectedLeague] = useState('PREMIER');
  // ...

  // 100 lines of data fetching
  const { data: standings } = useStandings(selectedLeague, selectedYear);
  const { data: matchups } = useMatchups(selectedLeague, selectedYear);
  // ...

  // 50 lines of calculations
  const rankedStandings = useMemo(() => {
    // Complex ranking logic
  }, [standings, matchups]);

  // 200 lines of JSX
  return (
    <div>
      {/* Complex nested structure */}
    </div>
  );
};
```

**After (<100 lines):**
```typescript
// pages/Standings.tsx
export const Standings = () => {
  const { league, year } = useLeagueParams();

  return (
    <PageLayout>
      <PageHeader>
        <LeagueSelector value={league} onChange={updateLeague} />
        <YearSelector value={year} onChange={updateYear} />
      </PageHeader>

      <PageContent>
        <StandingsOverview league={league} year={year} />
        <StandingsTable league={league} year={year} />
      </PageContent>
    </PageLayout>
  );
};

// features/standings/StandingsOverview/index.tsx (~100 lines)
export const StandingsOverview: React.FC<Props> = ({ league, year }) => {
  const standings = useStandings(league, year);
  const champion = standings.find(s => s.rank === 1);

  return (
    <OverviewCards>
      <ChampionCard user={champion.user} stats={champion} />
      <TopScorerCard standings={standings} />
      <ClosestRaceCard standings={standings} />
    </OverviewCards>
  );
};

// features/standings/StandingsTable/index.tsx (~150 lines)
// Isolated, focused component
```

**Benefits:**
- ✅ Page is just layout and composition
- ✅ Features are self-contained
- ✅ Easy to test each piece
- ✅ Easy to reuse components

### Hook Organization

**Before (scattered patterns):**
```typescript
// Some components use custom hooks
const { data } = useLeagueStandings(league, year);

// Others fetch directly
const [data, setData] = useState(null);
useEffect(() => {
  leagueApi.getStandings(league, year).then(setData);
}, [league, year]);
```

**After (consistent patterns):**
```typescript
// hooks/data/useUser.ts
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => services.users.getUser(userId),
    staleTime: 1000 * 60 * 60 // 1 hour (rarely changes)
  });
};

// hooks/data/useStandings.ts
export const useStandings = (league: LeagueTier, year: string) => {
  return useQuery({
    queryKey: ['standings', league, year],
    queryFn: () => services.seasons.getStandings(league, year),
    staleTime: year === currentYear ? 1000 * 60 * 5 : Infinity  // 5 min if active, forever if historical
  });
};

// hooks/data/useWeekMatchups.ts
export const useWeekMatchups = (league: LeagueTier, year: string, week: number) => {
  return useQuery({
    queryKey: ['matchups', league, year, week],
    queryFn: () => services.seasons.getWeekMatchups(league, year, week)
  });
};

// hooks/computed/useRankings.ts
export const useRankings = (league: LeagueTier, year: string) => {
  return useQuery({
    queryKey: ['rankings', league, year],
    queryFn: () => services.leagues.getStandingsWithRankings(league, year)
  });
};
```

**Benefits:**
- ✅ Consistent caching strategy (React Query)
- ✅ Easy to mock in tests
- ✅ Automatic loading/error states
- ✅ Shared cache across components

---

## Type System & Domain Modeling

### Current Type System Issues

**Problem: Flat, Anemic Types**
```typescript
// Just data bags, no behavior
interface UserInfo {
  userId: string;
  ffuUserId: string;
  teamName: string;
  abbreviation: string;
}

// Usage: scattered logic
const teamName = user.historicalTeamNames?.[year] ?? user.teamName;
const displayName = `${user.teamName} (${user.abbreviation})`;
```

**Problem: Type Duplication**
```typescript
// Multiple interfaces for same concept
UserInfo
FFUUser
LegacyUserInfo
EnhancedUserInfo
UserConfig
SeasonStandings  // Contains user data
```

**Problem: `any` Escape Hatches**
```typescript
// Type safety defeated
matchups: any[]
(standing as any).userInfo
history: Record<string, unknown>
(history[year] as any)[league] = data
```

### Proposed Domain Modeling

**Principle: Rich Domain Models with Behavior**

```typescript
// domain/user/user.model.ts
export class User {
  readonly id: string;
  readonly teamName: string;
  readonly abbreviation: string;
  readonly joinedYear: number;
  readonly isActive: boolean;
  readonly metadata?: Record<string, any>;

  private historicalNames?: Record<string, string>;
  private platformIds?: {
    sleeper?: string;
    espn?: string;
  };

  constructor(data: UserData) {
    this.id = data.id;
    this.teamName = data.teamName;
    this.abbreviation = data.abbreviation;
    this.joinedYear = data.joinedYear;
    this.isActive = data.isActive;
    this.metadata = data.metadata;
    this.historicalNames = data.historicalNames;
    this.platformIds = data.platformIds;
  }

  // Behavior encapsulated
  getTeamName(year?: string): string {
    if (!year) return this.teamName;
    return this.historicalNames?.[year] ?? this.teamName;
  }

  getDisplayName(year?: string): string {
    return `${this.getTeamName(year)} (${this.abbreviation})`;
  }

  getPlatformId(platform: 'sleeper' | 'espn'): string | undefined {
    return this.platformIds?.[platform];
  }

  hasMetadata(key: string): boolean {
    return this.metadata?.[key] !== undefined;
  }

  getMetadata<T>(key: string, defaultValue?: T): T | undefined {
    return this.metadata?.[key] ?? defaultValue;
  }

  // Type guards
  isActiveInYear(year: number): boolean {
    return year >= this.joinedYear && this.isActive;
  }
}

// Usage in components
const user = await userService.getUser('user-001');
const displayName = user.getDisplayName('2024');  // Clean!
const primaryColor = user.getMetadata<string>('primaryColor', '#888888');
```

**Principle: Value Objects for Validation**

```typescript
// domain/league/league-tier.value-object.ts
export class LeagueTier {
  private static readonly VALID_TIERS = ['PREMIER', 'MASTERS', 'NATIONAL'] as const;

  private constructor(private readonly value: typeof LeagueTier.VALID_TIERS[number]) {}

  static create(value: string): LeagueTier {
    const upper = value.toUpperCase();
    if (!LeagueTier.VALID_TIERS.includes(upper as any)) {
      throw new Error(`Invalid league tier: ${value}`);
    }
    return new LeagueTier(upper as any);
  }

  toString(): string {
    return this.value;
  }

  equals(other: LeagueTier): boolean {
    return this.value === other.value;
  }

  isPremier(): boolean {
    return this.value === 'PREMIER';
  }
}

// Usage
const tier = LeagueTier.create('premier');  // ✅ Validated
const badTier = LeagueTier.create('invalid');  // ❌ Throws error
```

**Principle: Aggregate Roots for Complex Entities**

```typescript
// domain/season/season.aggregate.ts
export class Season {
  readonly league: LeagueTier;
  readonly year: string;

  private standings: SeasonStanding[];
  private weeks: WeekMatchups[];
  private draft: Draft;
  private playoffResults?: PlayoffResults;

  constructor(data: SeasonData) {
    this.league = LeagueTier.create(data.league);
    this.year = data.year;
    this.standings = data.standings.map(s => new SeasonStanding(s));
    this.weeks = data.weeks.map(w => new WeekMatchups(w));
    this.draft = new Draft(data.draft);
    this.playoffResults = data.playoffResults ? new PlayoffResults(data.playoffResults) : undefined;
  }

  // Business logic
  getChampion(): SeasonStanding {
    return this.standings.find(s => s.rank === 1)!;
  }

  getRegularSeasonWeeks(): WeekMatchups[] {
    const era = eraService.getEra(this.year);
    return this.weeks.filter(w => !era.playoffWeeks.includes(w.weekNumber));
  }

  getUserStanding(userId: string): SeasonStanding | undefined {
    return this.standings.find(s => s.user.id === userId);
  }

  getHeadToHeadRecord(userId1: string, userId2: string): HeadToHeadRecord {
    const matchups = this.weeks.flatMap(w => w.matchups).filter(m =>
      (m.winnerId === userId1 && m.loserId === userId2) ||
      (m.winnerId === userId2 && m.loserId === userId1)
    );

    const user1Wins = matchups.filter(m => m.winnerId === userId1).length;
    const user2Wins = matchups.filter(m => m.winnerId === userId2).length;

    return new HeadToHeadRecord(userId1, userId2, user1Wins, user2Wins);
  }

  // Computed properties
  get isComplete(): boolean {
    return this.playoffResults !== undefined;
  }

  get totalWeeks(): number {
    return this.weeks.length;
  }
}

// Usage
const season = await seasonService.getSeason('PREMIER', '2024');
const champion = season.getChampion();
const h2h = season.getHeadToHeadRecord('user-001', 'user-002');
```

### Type Organization

```
types/
├── domain/                      # Rich domain models
│   ├── user/
│   │   ├── user.model.ts
│   │   └── user.types.ts        # Data interfaces
│   ├── season/
│   │   ├── season.aggregate.ts
│   │   ├── season-standing.model.ts
│   │   └── season.types.ts
│   ├── league/
│   │   ├── league-tier.value-object.ts
│   │   └── league.types.ts
│   └── matchup/
│       ├── matchup.model.ts
│       └── matchup.types.ts
│
├── data/                        # Data transfer objects (from APIs/files)
│   ├── sleeper.types.ts
│   ├── espn.types.ts
│   └── json-schemas.types.ts    # Generated from JSON schemas
│
├── view/                        # View models (for components)
│   ├── standings-view.types.ts
│   ├── matchup-view.types.ts
│   └── draft-view.types.ts
│
└── index.ts                     # Public exports
```

**Benefits:**
- ✅ Clear separation: domain vs data vs view
- ✅ Behavior encapsulated in models
- ✅ Type-safe, no `any` needed
- ✅ Easy to add new properties (extend classes)

---

## Feature Addition Scenarios

### Scenario 1: Adding "Rivalry Tracker"

**Requirements:**
- Show head-to-head records between users
- Display recent matchup results
- Highlight most-played opponents

**Changes Required (Current Architecture):**
1. 🔧 Update LeagueService (add rivalry calculation method) +50 lines to 763-line file
2. 🔧 Add new hook `useRivalries` (create file)
3. 🔧 Create RivalryCard component
4. 🔧 Update Members page to show rivalries
5. 🐛 Risk: Breaking existing LeagueService methods (tight coupling)

**Changes Required (Proposed Architecture):**
1. ✅ Create `RivalryService` in `/services/application/` (~100 lines, isolated)
2. ✅ Create `useRivalries` hook (10 lines)
3. ✅ Create `RivalryCard` component in `/features/user-profile/`
4. ✅ Add `<RivalryCard>` to UserProfile page
5. ✅ No risk to existing features (isolated changes)

```typescript
// services/application/rivalry.service.ts (NEW FILE)
class RivalryService {
  constructor(
    private seasonService: SeasonService
  ) {}

  async getUserRivalries(userId: string): Promise<Rivalry[]> {
    const allSeasons = await this.loadUserSeasons(userId);
    const opponents = this.collectOpponents(allSeasons, userId);

    return opponents.map(opponentId => {
      const h2hRecord = this.calculateHeadToHead(allSeasons, userId, opponentId);
      const recentMatchups = this.getRecentMatchups(allSeasons, userId, opponentId, 5);

      return {
        opponentId,
        totalGames: h2hRecord.wins + h2hRecord.losses,
        wins: h2hRecord.wins,
        losses: h2hRecord.losses,
        recentMatchups
      };
    }).sort((a, b) => b.totalGames - a.totalGames);
  }
}

// Register in service container
// services/service-container.ts
private rivalryService = new RivalryService(this.seasonService);
get rivalries() { return this.rivalryService; }

// Create hook
// hooks/data/useRivalries.ts
export const useRivalries = (userId: string) => {
  return useQuery({
    queryKey: ['rivalries', userId],
    queryFn: () => services.rivalries.getUserRivalries(userId)
  });
};

// Create component
// features/user-profile/RivalryCard/index.tsx
export const RivalryCard: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: rivalries } = useRivalries(userId);

  return (
    <Card>
      <CardHeader>Rivalries</CardHeader>
      {rivalries?.map(rivalry => (
        <RivalryRow key={rivalry.opponentId} rivalry={rivalry} />
      ))}
    </Card>
  );
};

// Add to page
// pages/UserProfile.tsx
<UserProfile userId={userId}>
  <StatsSummary userId={userId} />
  <CareerTimeline userId={userId} />
  <RivalryCard userId={userId} />  {/* ← ONE LINE ADDED */}
</UserProfile>
```

**Time Estimate:**
- Current: 4-6 hours (understand LeagueService, careful integration, testing)
- Proposed: 2-3 hours (isolated service, straightforward composition)

---

### Scenario 2: Adding "Power Rankings"

**Requirements:**
- Weekly power rankings (not just standings)
- Consider strength of schedule, recent performance, point differential
- Historical power ranking progression

**Changes Required (Current Architecture):**
1. 🔧 Add calculation to LeagueService (or new file?) +100 lines
2. 🔧 Fetch additional data (opponent records)
3. 🔧 Create PowerRankings component
4. 🔧 Add to Standings page or new page?
5. ❓ Where does strength-of-schedule calculation go?
6. 🐛 Risk: Conflict with existing ranking logic

**Changes Required (Proposed Architecture):**
1. ✅ Create `PowerRankingCalculator` in `/services/calculators/` (pure functions)
2. ✅ Create `PowerRankingService` in `/services/application/` (orchestration)
3. ✅ Create `usePowerRankings` hook
4. ✅ Create feature components in `/features/power-rankings/`
5. ✅ Add new page or extend Standings page (composition)

```typescript
// services/calculators/power-ranking.calculator.ts (NEW FILE)
class PowerRankingCalculator {
  calculate(
    standing: SeasonStanding,
    recentMatchups: Matchup[],
    opponentRecords: Record<string, number>
  ): number {
    const winPct = standing.wins / (standing.wins + standing.losses);
    const pointDiff = standing.pointsFor - standing.pointsAgainst;
    const sosRating = this.calculateStrengthOfSchedule(standing.userId, opponentRecords);
    const momentumScore = this.calculateMomentum(recentMatchups);

    // Weighted formula
    return (
      winPct * 40 +
      (pointDiff / 10) +
      sosRating * 20 +
      momentumScore * 10
    );
  }

  private calculateStrengthOfSchedule(
    userId: string,
    opponentRecords: Record<string, number>
  ): number {
    // Pure calculation
  }

  private calculateMomentum(recentMatchups: Matchup[]): number {
    // Pure calculation (last 3 weeks performance)
  }
}

// services/application/power-ranking.service.ts (NEW FILE)
class PowerRankingService {
  constructor(
    private seasonService: SeasonService,
    private calculator: PowerRankingCalculator
  ) {}

  async getPowerRankings(league: LeagueTier, year: string): Promise<PowerRanking[]> {
    const standings = await this.seasonService.getStandings(league, year);
    const allWeeks = await this.seasonService.getAllWeeks(league, year);

    const rankings = await Promise.all(
      standings.map(async standing => {
        const recentMatchups = this.getRecentMatchups(allWeeks, standing.userId, 3);
        const opponentRecords = this.getOpponentRecords(allWeeks, standing.userId, standings);

        const score = this.calculator.calculate(standing, recentMatchups, opponentRecords);

        return {
          user: standing.user,
          score,
          standing: standing.rank,
          trend: this.calculateTrend(standing.userId, allWeeks)
        };
      })
    );

    // Sort by power ranking score
    return rankings.sort((a, b) => b.score - a.score).map((r, index) => ({
      ...r,
      powerRank: index + 1
    }));
  }
}

// Create dedicated page
// pages/PowerRankings.tsx
export const PowerRankings = () => {
  const { league, year } = useLeagueParams();
  const { data: rankings } = usePowerRankings(league, year);

  return (
    <PageLayout>
      <PageHeader>Power Rankings</PageHeader>
      <PowerRankingsTable rankings={rankings} />
      <PowerRankingsChart rankings={rankings} />
    </PageLayout>
  );
};
```

**Benefits:**
- ✅ Calculations isolated and testable
- ✅ No impact on existing standings logic
- ✅ Easy to adjust formula (pure calculator)
- ✅ Can add historical tracking later (just query past weeks)

---

### Scenario 3: Adding User Preferences

**Requirements:**
- Users can customize dashboard
- Save favorite leagues, default year, theme
- Persist across sessions

**Changes Required (Current Architecture):**
1. 🔧 Add preferences to UserConfig in constants.ts
2. 🔧 Rebuild and redeploy to change preferences
3. ❌ Can't save at runtime (static config)
4. ❌ No per-user preferences (same for everyone)

**Changes Required (Proposed Architecture):**
1. ✅ Add `UserPreferencesService` (uses localStorage)
2. ✅ Create `useUserPreferences` hook
3. ✅ Add preferences UI components
4. ✅ No backend changes needed (client-side only)

```typescript
// services/application/user-preferences.service.ts (NEW FILE)
interface UserPreferences {
  favoriteLeagues: LeagueTier[];
  defaultYear: string;
  theme: 'light' | 'dark';
  dashboardLayout: 'compact' | 'detailed';
}

class UserPreferencesService {
  private readonly STORAGE_KEY = 'ffu-user-preferences';

  getPreferences(): UserPreferences {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return this.getDefaults();

    try {
      return JSON.parse(stored);
    } catch {
      return this.getDefaults();
    }
  }

  savePreferences(preferences: Partial<UserPreferences>): void {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  private getDefaults(): UserPreferences {
    return {
      favoriteLeagues: ['PREMIER'],
      defaultYear: currentYear.toString(),
      theme: 'dark',
      dashboardLayout: 'detailed'
    };
  }
}

// Hook
// hooks/useUserPreferences.ts
export const useUserPreferences = () => {
  const [prefs, setPrefs] = useState(() =>
    services.userPreferences.getPreferences()
  );

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    services.userPreferences.savePreferences(updates);
    setPrefs(prev => ({ ...prev, ...updates }));
  };

  return { preferences: prefs, updatePreferences };
};

// Use in components
// pages/Overview.tsx
export const Overview = () => {
  const { preferences } = useUserPreferences();
  const defaultLeague = preferences.favoriteLeagues[0];

  return <StandingsOverview league={defaultLeague} />;
};

// components/PreferencesModal.tsx
export const PreferencesModal = () => {
  const { preferences, updatePreferences } = useUserPreferences();

  return (
    <Modal>
      <Select
        value={preferences.defaultYear}
        onChange={year => updatePreferences({ defaultYear: year })}
      />
      <MultiSelect
        value={preferences.favoriteLeagues}
        onChange={leagues => updatePreferences({ favoriteLeagues: leagues })}
      />
    </Modal>
  );
};
```

**Benefits:**
- ✅ No backend/deployment needed
- ✅ User-specific (stored locally)
- ✅ Easy to extend (add new preferences)
- ✅ Can migrate to backend later (same interface)

---

## Rewrite Strategy

### Guiding Principles

**1. Incremental, Not Big Bang**
- Rewrite in phases, not all at once
- Keep app working at every step
- Deploy frequently to validate

**2. Strangler Fig Pattern**
- New architecture grows alongside old
- Gradually replace old code
- Eventually old code is unused and deleted

**3. Data-First**
- Start with data normalization
- Services adapt to new structure
- Components last (depend on services)

**4. Test-Driven Migration**
- Add tests for existing behavior
- Refactor with safety net
- Maintain or improve test coverage

**5. Feature Freeze During Migration**
- Pause new features during active rewrite phases
- Focus on structural improvements
- Resume features once foundation is solid

### Rewrite Phases

#### Phase 0: Preparation (Week 1-2)
**Goal:** Set up safety nets and tooling

**Tasks:**
- [ ] Add TypeScript strict mode
- [ ] Set up test framework (Vitest + React Testing Library)
- [ ] Write integration tests for critical paths:
  - [ ] Standings display
  - [ ] Matchup display
  - [ ] Draft board
  - [ ] Records calculation
- [ ] Document current behavior (screenshots, expected outputs)
- [ ] Set up feature flags for gradual rollout
- [ ] Create rollback plan

**Success Criteria:**
- Tests pass for all existing functionality
- Can run new/old code side-by-side with flag

---

#### Phase 1: Data Normalization (Week 3-4)
**Goal:** Establish single source of truth for core data

**Tasks:**

**Week 3: Core Data Extraction**
- [ ] Create `/public/data/config/` structure
- [ ] Write migration script: `scripts/migrate-to-normalized-data.js`
  - [ ] Extract users from constants.ts → `/config/users.json`
  - [ ] Extract leagues from constants.ts → `/config/leagues.json`
  - [ ] Validate with JSON schemas
- [ ] Create `ConfigDataSource` service
- [ ] Update types (remove dual ID fields)
- [ ] Create User domain model

**Week 4: Player Data Optimization**
- [ ] Create `/public/data/core/players-used.json` (356 players only)
- [ ] Update data generation scripts to use normalized players
- [ ] Remove embedded playerInfo from draft data
- [ ] Update DraftBoard components to resolve player references

**Validation:**
- [ ] All pages render correctly
- [ ] No duplicate user/player data
- [ ] Data size reduced by ~18 MB
- [ ] Tests still pass

---

#### Phase 2: Service Layer Refactor (Week 5-7)
**Goal:** Break monoliths into focused services

**Week 5: Data Access Layer**
- [ ] Create data source interfaces
- [ ] Implement `ConfigDataSource`
- [ ] Implement `CoreDataSource`
- [ ] Implement `SeasonDataSource`
- [ ] Keep `SleeperApiDataSource` (minimal changes)

**Week 6: Domain Services**
- [ ] Create `UserService` (use ConfigDataSource)
- [ ] Create `SeasonService` (use SeasonDataSource)
- [ ] Create focused calculators (UPR, Rankings)
- [ ] Create `EraService` (consolidate era logic)

**Week 7: Application Services**
- [ ] Create `RecordsService`
- [ ] Migrate LeagueService logic to appropriate services
- [ ] Set up ServiceContainer for DI
- [ ] Deprecate old LeagueService (mark as legacy)

**Validation:**
- [ ] All existing features work via new services
- [ ] Tests pass
- [ ] Can delete old LeagueService without breaking app

---

#### Phase 3: Component Refactor (Week 8-10)
**Goal:** Extract logic from components, improve composition

**Week 8: Feature Extraction (Standings)**
- [ ] Create `/components/features/standings/` structure
- [ ] Extract StandingsTable logic → hooks
- [ ] Split into Container/Presenter
- [ ] Replace in Standings page
- [ ] Verify functionality identical

**Week 9: Feature Extraction (Matchups, Draft)**
- [ ] Create `/components/features/matchups/`
- [ ] Refactor Matchups page components
- [ ] Create `/components/features/draft/`
- [ ] Refactor Draft components

**Week 10: Feature Extraction (Records, Stats)**
- [ ] Create remaining feature folders
- [ ] Refactor AllTimeStats page (696 lines → <200)
- [ ] Update all pages to use new components

**Validation:**
- [ ] All pages look and behave identically
- [ ] Component average size <200 lines
- [ ] Easy to test individual features

---

#### Phase 4: Weekly Data Split (Week 11-12)
**Goal:** Enable incremental weekly updates

**Week 11: Data Structure**
- [ ] Create `/public/data/seasons/` structure
- [ ] Write script to split league files into weeks
- [ ] Migrate 2025 data (active season)
- [ ] Update generation scripts for new structure

**Week 12: Service Integration**
- [ ] Update SeasonDataSource to load from weeks
- [ ] Update components to use new data
- [ ] Create `update-week` script
- [ ] Test weekly update workflow

**Validation:**
- [ ] All historical data accessible
- [ ] Active season updates in <10 KB writes
- [ ] No functionality regressions

---

#### Phase 5: Type System & Domain Models (Week 13-14)
**Goal:** Rich domain models with behavior

**Week 13: Domain Models**
- [ ] Create User class with methods
- [ ] Create Season aggregate
- [ ] Create value objects (LeagueTier, etc.)
- [ ] Update services to return models

**Week 14: View Models**
- [ ] Create view-specific types
- [ ] Update components to use view models
- [ ] Remove `any` types
- [ ] Enable strict TypeScript mode

**Validation:**
- [ ] Zero `any` types
- [ ] Strict mode enabled
- [ ] All tests pass

---

#### Phase 6: Polish & Optimization (Week 15-16)
**Goal:** Performance, testing, documentation

**Week 15: Testing & Performance**
- [ ] Add unit tests for all services (80%+ coverage)
- [ ] Add component tests (70%+ coverage)
- [ ] Implement caching strategy (React Query)
- [ ] Add lazy loading for routes
- [ ] Optimize bundle size

**Week 16: Documentation & Cleanup**
- [ ] Update README with new architecture
- [ ] Document service APIs
- [ ] Create contribution guide
- [ ] Delete old/deprecated code
- [ ] Final QA pass

**Success Criteria:**
- [ ] 80%+ test coverage
- [ ] <100ms page transitions
- [ ] <5 MB initial bundle
- [ ] Zero TypeScript errors
- [ ] All documentation current

---

### Migration Risks & Mitigation

**Risk 1: Data Migration Bugs**
- **Impact:** Users see wrong data
- **Mitigation:**
  - Comprehensive validation scripts
  - Side-by-side comparison (old vs new)
  - Gradual rollout with feature flags
  - Keep backups of original data

**Risk 2: Breaking Changes During Migration**
- **Impact:** Features stop working mid-migration
- **Mitigation:**
  - Maintain old and new code paths simultaneously
  - Use adapter pattern for compatibility
  - Extensive integration tests
  - Roll back capability at every phase

**Risk 3: Scope Creep**
- **Impact:** Rewrite takes 6 months instead of 4
- **Mitigation:**
  - Strict phase boundaries
  - No new features during rewrite
  - Weekly progress reviews
  - Can pause between phases if needed

**Risk 4: Loss of Domain Knowledge**
- **Impact:** New implementation missing edge cases
- **Mitigation:**
  - Document all business rules before refactoring
  - Test-driven approach (capture existing behavior)
  - Keep original code for reference
  - Incremental changes (easy to compare)

---

### Success Metrics

**Code Quality:**
- [ ] Average component size <200 lines (current: 571)
- [ ] Largest service <200 lines (current: 763)
- [ ] Zero `any` types (current: 18)
- [ ] 80%+ test coverage (current: 0%)

**Maintainability:**
- [ ] Adding new user: 2 minutes (vs 30 minutes + deploy)
- [ ] Adding new feature: <4 hours (vs 8+ hours)
- [ ] Weekly update: <5 seconds (vs 30 seconds)

**Performance:**
- [ ] Initial load: <100 KB (vs 17.3 MB)
- [ ] Total data: <5 MB (vs 35 MB)
- [ ] Page transitions: <100ms

**Developer Experience:**
- [ ] Clear where new code goes
- [ ] Can test features in isolation
- [ ] Changes don't break unrelated features
- [ ] TypeScript catches errors before runtime

---

## Migration Roadmap

### Timeline Overview

```
Week 1-2:   Preparation (tests, tooling)
Week 3-4:   Data normalization
Week 5-7:   Service layer refactor
Week 8-10:  Component refactor
Week 11-12: Weekly data split
Week 13-14: Type system & domain models
Week 15-16: Polish & optimization

Total: 16 weeks (~4 months)
```

### Checkpoints

**Checkpoint 1 (End of Week 4):**
- ✅ Data normalized, 18 MB savings
- ✅ ConfigService working
- ✅ All tests passing
- **Decision:** Continue to services or pause?

**Checkpoint 2 (End of Week 7):**
- ✅ New service layer complete
- ✅ Old LeagueService deprecated
- ✅ No regressions
- **Decision:** Continue to components or pause?

**Checkpoint 3 (End of Week 10):**
- ✅ Components refactored
- ✅ Feature-based organization
- ✅ All pages working
- **Decision:** Continue to weekly split or pause?

**Checkpoint 4 (End of Week 12):**
- ✅ Weekly update workflow optimized
- ✅ Active season using new structure
- **Decision:** Continue to domain models or pause?

**Checkpoint 5 (End of Week 14):**
- ✅ Rich domain models
- ✅ Strict TypeScript
- ✅ Zero `any` types
- **Decision:** Polish or ship?

**Final (End of Week 16):**
- ✅ All success criteria met
- ✅ Documentation complete
- ✅ Ready for feature development

---

### Rollback Points

Each phase has a rollback point:

**Phase 1 Rollback:**
- Revert to old constants.ts
- Keep normalized data as backup
- Minimal user impact (old code still works)

**Phase 2 Rollback:**
- Feature flag: use old LeagueService
- New services disabled
- No data changes needed

**Phase 3 Rollback:**
- Feature flag: use old components
- Services stay (backwards compatible)
- No data changes needed

**Phase 4 Rollback:**
- Keep weekly split for 2025 only
- Historical data stays old format
- Adapter layer for compatibility

---

## Reference Metrics

### Current Architecture

**File Sizes:**
- `league.service.ts`: 763 lines
- `constants.ts`: 406 lines
- `AllTimeStats.tsx`: 696 lines
- `Standings.tsx`: 407 lines
- Average page component: 571 lines

**Data Sizes:**
- Total: 34.95 MB
- Player data: 17.3 MB (96.8% waste)
- League files: 121 KB each (75% draft data)
- User duplication: 2,160 copies

**Issues:**
- Dual ID systems (userId + ffuUserId)
- 18 `any` type usages
- 0% test coverage
- Era logic in 5+ files
- 763-line God Object (LeagueService)

### Target Architecture

**File Sizes:**
- Largest service: <200 lines
- Average page: <100 lines
- Average component: <150 lines

**Data Sizes:**
- Total: <5 MB (85% reduction)
- Player data: 39 KB (99.8% reduction)
- League files: split into 2-23 KB pieces
- User duplication: 0 (normalized)

**Improvements:**
- Single ID system (user.id)
- 0 `any` types (strict mode)
- 80%+ test coverage
- Era config centralized
- Services <200 lines each

---

## Conclusion

The FFU app needs a **maintainability-focused rewrite** to support long-term feature development. The current architecture has accumulated technical debt through:

1. **Identity confusion** (dual ID systems)
2. **Data denormalization** (duplication everywhere)
3. **Service monoliths** (763-line God Objects)
4. **Configuration as code** (requires rebuild for data changes)
5. **Scattered logic** (era detection in 5+ files)

**The proposed rewrite:**

- **Normalizes data** (single source of truth)
- **Splits services** (focused, <200 lines each)
- **Extracts components** (composition over monoliths)
- **Enriches types** (domain models with behavior)
- **Enables features** (clear patterns, isolated changes)

**Timeline:** 16 weeks with incremental delivery and rollback points

**ROI:** Features that currently take 8 hours will take 2-3 hours. Adding data (users, weeks) becomes trivial. Changes are isolated and safe.

**Next Steps:**
1. Review this plan
2. Decide on timeline (all phases or pause between?)
3. Start Phase 0 (preparation, tests)
4. Execute incrementally

This rewrite positions the FFU app for **sustainable growth** with a maintainable foundation that makes features easy to add and safe to change.
