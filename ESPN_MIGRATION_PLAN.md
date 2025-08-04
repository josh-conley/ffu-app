# ESPN Historical Data Migration - Comprehensive Implementation Plan

## Project Overview
**Objective**: Integrate 3 years (2018-2020) of ESPN fantasy football data into existing Sleeper-based FFU application, totaling 6 additional seasons (Premier & National leagues only).

**Current State**: Application has Sleeper data from 2021-2024 with Premier, Masters, and National leagues
**Target State**: Seamless integration of 2018-2020 ESPN data with proper team name mapping and historical context

---

## 1. Data Structure Analysis

### Current Sleeper System (2021+)
- **NFL Schedule**: 17 regular season weeks + 1 bye week = 18 total NFL weeks
- **Fantasy Usage**: Weeks 1-17, with playoffs weeks 15-17
- **Leagues**: Premier, Masters, National (3-tier system)
- **Data Format**: JSON files in `/public/data/{year}/{league}.json`
- **User Management**: Sleeper user IDs with consistent team names
- **Data Source**: Sleeper API + cached JSON

### Historical ESPN System (2018-2020)
- **NFL Schedule**: 16 total weeks (pre-expansion)
- **Fantasy Usage**: Weeks 1-16, with playoffs weeks 14-16
- **Leagues**: Premier, National only (2-tier system, no Masters)
- **Data Format**: CSV exports from ESPN
- **User Management**: ESPN usernames with changing team names
- **Data Source**: Manual CSV exports

### Key Structural Differences
| Aspect | ESPN Era (2018-2020) | Sleeper Era (2021+) |
|--------|---------------------|-------------------|
| NFL Weeks | 16 total | 17 regular + 1 bye |
| Fantasy Weeks | 1-16 | 1-17 |
| Regular Season | Weeks 1-13 | Weeks 1-14 |
| Playoffs | Weeks 14-16 | Weeks 15-17 |
| Leagues | Premier, National | Premier, Masters, National |
| Data Format | CSV | JSON |
| User IDs | ESPN usernames | Sleeper user IDs |

---

## 2. Source Data Analysis

### Available CSV Files (in `/public/old-league-data/`)

#### `ESPN Fantasy Scrapes - Team Name Mapping.csv`
```csv
current,past1,past2,past3
Act More Stupidly,Goat Emoji,Goat Emoji II,
Fort Wayne Banana Bread,Oklahoma Banana Bread,Wisconsin Banana Bread,
Raging Rhinos,Currier Island Raging Rhinos,,
```
**Purpose**: Maps current Sleeper team names to historical ESPN team names
**Structure**: Current name + up to 3 historical variations

#### `ESPN Fantasy Scrapes - Draft Results18.csv`
```csv
Pick,Player,Team,Keeper,Note,Misc,Manage
1.1 (1),Ezekiel Elliott · RB · (DAL),CreamOfTheCrop Macho Men,--,--,,Open options
```
**Purpose**: Draft pick data with ESPN format
**Key Fields**: Pick number, Player details, Team name (ESPN)

#### `ESPN Fantasy Scrapes - Teams18.csv`
```csv
Team/Member,Member,Rival,Record,Points Scored,Points Against,Inseason Rank,Final Rank,Misc,Manage
Goat Emoji,brando0040335,---,8-5,"1,428.50","1,374.45",5,1,,Open options
```
**Purpose**: Final standings and team records
**Key Fields**: Team name, ESPN username, W-L record, points, final ranking

#### `ESPN Fantasy Scrapes - Matchups18.csv`
```csv
Week,Team,Score,Opponent,Score,Misc,Manage
Week 16,Speedway's Ritual Cog,119.05,Team Painter Pick 6,94.4,,Open options
```
**Purpose**: Weekly matchup results
**Key Fields**: Week number, Team names, Scores

---

## 3. Target Data Structure

### JSON Output Format
Each historical year will generate files matching current structure:

```json
{
  "league": "PREMIER",
  "year": "2018",
  "leagueId": "espn-2018-premier",
  "standings": [
    {
      "userId": "historical-brando0040335",
      "wins": 8,
      "losses": 5,
      "pointsFor": 1428.50,
      "pointsAgainst": 1374.45,
      "rank": 1,
      "highGame": 147.95,
      "lowGame": 71.50
    }
  ],
  "playoffResults": [
    {
      "userId": "historical-brando0040335",
      "placement": 1,
      "placementName": "1st"
    }
  ],
  "promotions": [],
  "relegations": [],
  "matchupsByWeek": {
    "1": [...],
    "14": [...], // Playoff week 1
    "15": [...], // Playoff week 2  
    "16": [...]  // Championship
  },
  "memberGameStats": {...},
  "draftData": {
    "draftId": "espn-2018-premier-draft",
    "leagueId": "espn-2018-premier",
    "year": "2018",
    "league": "PREMIER",
    "picks": [...],
    "settings": {...}
  }
}
```

---

## 4. Configuration System Updates

### A. Historical Years Extension
**File**: `src/config/constants.ts`

```typescript
// Current
export const HISTORICAL_YEARS = ['2021', '2022', '2023', '2024'] as const;

// Updated  
export const HISTORICAL_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024'] as const;
```

### B. Era-Specific Utilities
**New Functions Needed**:

```typescript
// Detect which era a year belongs to
export const isEspnEra = (year: string): boolean => {
  const yearNum = parseInt(year);
  return yearNum >= 2018 && yearNum <= 2020;
};

export const isSleeperEra = (year: string): boolean => {
  const yearNum = parseInt(year);
  return yearNum >= 2021;
};

// Get playoff weeks based on era
export const getPlayoffWeeks = (year: string): number[] => {
  return isEspnEra(year) ? [14, 15, 16] : [15, 16, 17];
};

// Get total fantasy weeks for year
export const getSeasonLength = (year: string): number => {
  return isEspnEra(year) ? 16 : 17;
};

// Get available leagues for year
export const getAvailableLeagues = (year: string): LeagueTier[] => {
  return isEspnEra(year) ? ['PREMIER', 'NATIONAL'] : ['PREMIER', 'MASTERS', 'NATIONAL'];
};
```

### C. User Configuration Enhancement
**File**: `src/config/constants.ts`

Extend `UserConfig` interface:
```typescript
interface UserConfig {
  sleeperId: string;
  teamName: string;
  abbreviation: string;
  joinedYear: number;
  isActive: boolean;
  // New fields
  espnUsername?: string; // For historical mapping
  historicalTeamNames?: { [year: string]: string }; // Year -> team name
}
```

Example enhanced user:
```typescript
{
  sleeperId: '325766631336714240',
  teamName: 'Act More Stupidly',
  abbreviation: 'AMS',
  joinedYear: 2018, // Updated to reflect ESPN era
  isActive: true,
  espnUsername: 'brando0040335',
  historicalTeamNames: {
    '2018': 'Goat Emoji',
    '2019': 'Goat Emoji II',
    '2020': 'Act More Stupidly'
  }
}
```

---

## 5. Data Migration Scripts

### A. Team Name Mapping Builder
**Purpose**: Parse team name mapping CSV and build lookup tables

```typescript
interface TeamMapping {
  currentSleeperUserId: string;
  currentTeamName: string;
  historicalNames: { [year: string]: string };
  espnUsername?: string;
}

// Build mapping from CSV
function buildTeamMappings(csvData: string[][]): Map<string, TeamMapping> {
  // Parse CSV and create bidirectional lookups
  // ESPN team name -> Sleeper user ID
  // Year + ESPN team name -> current user info
}
```

### B. User ID Generation Strategy
**Challenge**: ESPN usernames need consistent mapping to user IDs

**Approach**: Create prefixed historical user IDs
- ESPN username `brando0040335` → `historical-brando0040335`
- Maintain consistency across all historical data
- Map to current Sleeper user IDs where possible

### C. Draft Data Converter
**Input**: ESPN draft format `"1.1 (1),Ezekiel Elliott · RB · (DAL),CreamOfTheCrop Macho Men"`

**Output**: Your `DraftPick` format
```typescript
{
  pickNumber: 1,
  round: 1,
  draftSlot: 1,
  playerId: "player-ezekiel-elliott",
  playerInfo: {
    name: "Ezekiel Elliott",
    position: "RB", 
    team: "DAL",
    // ... other fields
  },
  pickedBy: "historical-user-id",
  userInfo: { /* mapped user info */ },
  draftId: "espn-2018-premier-draft"
}
```

### D. Matchups Converter
**Input**: ESPN weekly results
**Output**: Your `matchupsByWeek` structure with playoff detection

```typescript
// ESPN Week 14-16 games get placementType tags
if (week >= 14 && week <= 16) {
  matchup.placementType = getPlacementType(week, matchupIndex);
  // Week 14: "Quarterfinal", Week 15: "Semifinal", Week 16: "Championship"
}
```

### E. Standings & Playoff Results Generator
**Logic**: 
1. Parse final rankings from Teams CSV
2. Generate `SeasonStandings` from regular season data
3. Derive `PlayoffResult` from final rankings
4. Calculate high/low games from matchup data

---

## 6. UI Component Updates

### A. Era-Aware Components

#### Week Selection Components
**Files**: `src/pages/Matchups.tsx`, `src/pages/Draft.tsx`

**Changes Needed**:
- Update week arrays based on year
- Show weeks 1-16 for ESPN era, 1-17 for Sleeper era
- Update playoff indicators

```typescript
// In component
const weeks = useMemo(() => {
  const maxWeek = getSeasonLength(selectedYear);
  return Array.from({ length: maxWeek }, (_, i) => i + 1);
}, [selectedYear]);

const isPlayoffWeek = (week: number) => {
  return getPlayoffWeeks(selectedYear).includes(week);
};
```

#### League Selection Components
**Changes**: Hide Masters league for 2018-2020 years

```typescript
const availableLeagues = useMemo(() => {
  return getAvailableLeagues(selectedYear);
}, [selectedYear]);
```

### B. Historical Team Name Display
**New Component**: `HistoricalTeamName`

```typescript
interface Props {
  userId: string;
  year: string;
  showCurrent?: boolean;
}

// Shows appropriate name based on year and context
// 2018 data shows "Goat Emoji"  
// Current context shows "Act More Stupidly"
```

### C. Member Profile Enhancements
**File**: Create new member profile page

**Features**:
- Timeline of team name changes
- Historical performance across both eras
- Combined stats from ESPN + Sleeper years
- Era-specific record displays

---

## 7. Data Service Extensions

### A. Historical Data Loading
**File**: `src/services/data.service.ts`

**Updates**:
- Extend `loadHistoricalLeagueData` to handle ESPN years
- Add era detection in data loading logic
- Handle missing Masters league gracefully

### B. Era-Specific Utilities
```typescript
// Add to DataService
isEspnEra(year: string): boolean { /* ... */ }
getEraSpecificPlayoffWeeks(year: string): number[] { /* ... */ }
convertEspnMatchups(matchups: any[], year: string): WeekMatchup[] { /* ... */ }
```

---

## 8. Implementation Phases

### Phase 1: Foundation Setup (1-2 days)
1. **Update configuration system**
   - Add ESPN years to constants
   - Create era detection utilities
   - Extend user configuration structure

2. **Build team mapping system**
   - Parse team name mapping CSV
   - Create lookup tables and utilities
   - Test mapping accuracy

3. **Create base conversion utilities**
   - User ID generation strategy
   - Basic CSV parsing functions
   - Validation helpers

### Phase 2: Data Processing Scripts (2-3 days)
1. **Draft converter**
   - Parse ESPN draft format
   - Map to your DraftData structure
   - Handle player information extraction

2. **Standings/Teams converter**
   - Process final rankings
   - Generate SeasonStandings
   - Create PlayoffResult data

3. **Matchups converter**
   - Process weekly results
   - Detect playoff games (weeks 14-16)
   - Generate matchupsByWeek structure

4. **Integration script**
   - Combine all converters
   - Generate final JSON files
   - Validate output structure

### Phase 3: System Integration (1-2 days)
1. **Data service updates**
   - Extend historical data loading
   - Handle ESPN era years
   - Test data retrieval

2. **Component updates**
   - Update week selection logic
   - Modify league filtering
   - Test existing functionality

3. **Validation testing**
   - Test all existing features with new years
   - Verify playoff detection
   - Check data consistency

### Phase 4: Enhanced Features (2-3 days)
1. **Historical team name displays**
   - Create display components
   - Update existing components
   - Add context-aware naming

2. **Member profile enhancements**
   - Show historical team names
   - Display era-specific stats
   - Create timeline views

3. **Final testing & polishing**
   - Comprehensive testing across all years
   - Performance optimization
   - Bug fixes and refinements

---

## 9. Testing Strategy

### A. Data Validation
- **Mapping Accuracy**: Verify all ESPN team names map correctly
- **User Consistency**: Ensure user identity preserved across eras
- **Data Completeness**: Validate all required fields populated
- **Score Accuracy**: Cross-reference point totals and records

### B. Functionality Testing
- **Navigation**: Test year/league/week selection across all eras
- **Display Logic**: Verify correct team names shown by context
- **Playoff Detection**: Confirm playoff styling shows correctly
- **Backwards Compatibility**: Ensure existing features still work

### C. Performance Testing
- **Load Times**: Verify additional data doesn't impact performance
- **Memory Usage**: Check for any memory leaks with expanded data
- **Bundle Size**: Monitor for significant increases

---

## 10. Risk Mitigation

### A. Data Quality Risks
- **Incomplete Mapping**: Some ESPN teams may not map to current users
  - *Mitigation*: Create fallback display logic, manual verification
- **Missing Data**: CSV exports may have gaps
  - *Mitigation*: Add data validation, handle missing gracefully

### B. Technical Risks  
- **Breaking Changes**: Updates might break existing functionality
  - *Mitigation*: Comprehensive testing, gradual rollout
- **Performance Impact**: Additional data might slow application
  - *Mitigation*: Performance monitoring, optimization

### C. User Experience Risks
- **Confusion**: Multiple team names might confuse users
  - *Mitigation*: Clear historical context, consistent naming patterns
- **Missing Features**: ESPN era might have different feature availability
  - *Mitigation*: Graceful degradation, clear era indicators

---

## 11. File Structure Changes

### New Files to Create
```
src/
├── services/
│   ├── espn-migration.service.ts     # Main migration logic
│   └── team-mapping.service.ts       # Team name mapping utilities
├── utils/
│   ├── era-detection.ts              # Era-specific utilities
│   └── csv-parser.ts                 # CSV processing helpers
├── types/
│   └── espn-types.ts                 # ESPN-specific type definitions
└── scripts/
    └── migrate-espn-data.ts          # Main migration script
```

### Files to Modify
```
src/
├── config/
│   └── constants.ts                  # Add ESPN years, extend UserConfig
├── constants/
│   └── leagues.ts                    # Update playoff weeks, available years
├── services/
│   └── data.service.ts               # Extend for ESPN data loading
├── types/
│   └── index.ts                      # Add ESPN-related types
└── pages/
    ├── Draft.tsx                     # Era-aware week selection
    ├── Matchups.tsx                  # Era-aware week/league selection
    └── [create member profile pages] # Historical team name displays
```

### Data Files to Generate
```
public/data/
├── 2018/
│   ├── premier.json
│   └── national.json
├── 2019/
│   ├── premier.json
│   └── national.json
└── 2020/
    ├── premier.json
    └── national.json
```

---

## 12. Success Criteria

### Data Migration Success
- [ ] All 6 ESPN seasons (2018-2020 Premier & National) converted to JSON
- [ ] 100% team name mapping accuracy
- [ ] All historical users properly identified and mapped
- [ ] Draft data fully converted with player information
- [ ] All matchup results properly categorized (regular season vs playoffs)

### System Integration Success
- [ ] All existing functionality works with expanded year range
- [ ] Era-specific features work correctly (playoff detection, week ranges)
- [ ] League selection properly filters by era
- [ ] Performance remains acceptable with additional data

### User Experience Success
- [ ] Historical team names display appropriately in all contexts
- [ ] Navigation works seamlessly across ESPN and Sleeper eras
- [ ] Member profiles show complete historical context
- [ ] No confusion about data sources or era differences

---

## 13. Implementation Attempt Debrief (January 2025)

### What Was Attempted
A comprehensive script-based approach was implemented to migrate ESPN CSV data to JSON format matching the existing Sleeper data structure. The approach included:

- **Data Generation Script**: Created `generate-espn-data-v2.js` to parse CSV files and generate JSON
- **Team Name Mapping**: Utilized existing Team Name Mapping CSV for historical name resolution
- **User ID Generation**: Created anonymized historical user IDs (`espn-historical-001`, etc.)
- **JSON Structure**: Generated proper data structure matching existing Sleeper format
- **PII Handling**: Processed anonymized CSV usernames (`user001`, `user032`, etc.)

### Technical Achievements
✅ **Successful Data Generation**: Generated all 6 ESPN league files (2018-2020 Premier/National)
✅ **Proper CSV Parsing**: Handled complex CSV structure with quoted fields and team names
✅ **Team Name Mapping**: Successfully mapped some teams using existing mapping CSV
✅ **UserInfo Preservation**: Fixed critical bug in `getAllLeagueStandingsWithUserInfo()` to preserve existing userInfo
✅ **Data Structure Compliance**: Generated JSON files matching exact Sleeper format requirements
✅ **Build Integration**: TypeScript compilation successful, no breaking changes

### Core Problems Identified

#### 1. User Configuration Misalignment
**Issue**: The USERS array in `constants.ts` shows all users as `joinedYear: 2021`, but many actually participated in ESPN era (2018-2020).

**Evidence**: CSV data shows team names like "The Minutemen", "Act More Stupidly" that correspond to current Sleeper users, but configuration doesn't reflect their ESPN participation.

**Impact**: Script couldn't properly map ESPN participants to current users (only 9/12 mapped in 2018).

#### 2. Incomplete Historical Context
**Issue**: No systematic tracking of which users were active in which specific years across the ESPN era.

**Evidence**: Script results showed "0 current users, 12 historical users" for 2019-2020, indicating complete mapping failure for those years.

**Impact**: Most users defaulted to anonymized historical IDs instead of proper current user mapping.

#### 3. PII Anonymization Challenges
**Issue**: CSV files contain pre-anonymized usernames (`user001`, `user032`) making original user identification difficult.

**Evidence**: Team CSV shows anonymized Member column but preserves Team/Member names.

**Impact**: Had to rely solely on team name matching, which was incomplete.

#### 4. Team Name Evolution Complexity
**Issue**: Users changed team names across years, and the mapping CSV doesn't cover all variations.

**Evidence**: Team Name Mapping CSV has only 13 entries but CSV data shows many more unique team names.

**Impact**: Many teams couldn't be mapped to current users.

### Root Cause Analysis

**Primary Root Cause**: Insufficient foundational user data configuration
- USERS array doesn't reflect actual historical participation patterns
- Missing systematic approach to track user evolution across platforms
- No comprehensive audit of who participated when

**Secondary Issues**: 
- Team name mapping CSV incomplete for full participant roster
- Anonymous CSV usernames eliminate direct user identification path
- No systematic PII handling strategy from source data

**Systemic Issue**: Attempting data migration without complete user participation audit

### What Worked vs. What Didn't

#### ✅ What Worked
- **Technical Infrastructure**: Script successfully parsed CSV and generated proper JSON
- **Data Structure**: Output perfectly matched existing Sleeper format requirements
- **Service Layer**: Fixed critical userInfo preservation bug in league service
- **Build System**: No breaking changes, TypeScript compilation successful
- **Some User Mapping**: Current users with team name matches worked correctly

#### ❌ What Didn't Work
- **Comprehensive User Mapping**: Only partial success in mapping ESPN users to current accounts
- **Historical User Identification**: Most users defaulted to anonymous historical IDs
- **Complete Data Integration**: Generated data but with insufficient real user connections
- **PII Resolution**: Couldn't overcome pre-anonymized source data limitations

### Lessons Learned

1. **User Audit First**: Must complete comprehensive user participation audit before data migration
2. **Manual Verification Required**: Automated mapping insufficient; needs human verification
3. **Source Data Limitations**: Pre-anonymized data requires alternative identification strategies
4. **Configuration Foundation**: User configuration must accurately reflect historical reality
5. **Incremental Validation**: Need step-by-step validation rather than full migration attempt

### Next Approach Strategy

#### Phase 1: Comprehensive User Audit (CRITICAL)
- **Manual Review**: Go through each CSV file and identify which teams correspond to current users
- **Historical Participation Mapping**: Document exactly who played in which years (2018-2020)
- **Team Name Timeline**: Create complete timeline of team name changes per user
- **ESPN Username Recovery**: Where possible, map anonymized IDs to known users

#### Phase 2: Enhanced Configuration System
- **Update USERS Array**: Correct joinedYear values to reflect actual ESPN era participation
- **Add Historical Fields**: Include ESPN participation years and historical team names
- **Create Master Mapping**: Build definitive ESPN team name → current user mapping
- **PII Strategy**: Develop systematic approach for handling remaining anonymous users

#### Phase 3: Verified Data Generation
- **Clean Script Approach**: Rebuild generation script with verified user mappings
- **Manual Verification Points**: Add validation steps for each league/year
- **Data Quality Checks**: Ensure no "Unknown Users" before integration
- **Incremental Testing**: Test one league/year at a time

#### Phase 4: Integration and Validation
- **Controlled Rollout**: Enable one historical year at a time
- **User Experience Testing**: Verify member pages show proper historical data
- **Cross-Era Consistency**: Ensure users show complete 2018-2024 timeline
- **Performance Validation**: Monitor application performance with full dataset

### Key Takeaways

The technical implementation was largely successful - the script worked, the data structure was correct, and the integration didn't break existing functionality. However, the fundamental challenge is **data preparation**: we need to solve the user identification and mapping problem before attempting another migration.

The next attempt should focus heavily on Phase 1 (user audit) rather than jumping to technical implementation. Only with complete user participation data can we achieve the seamless integration goal.

---

This comprehensive plan provides complete implementation guidance for integrating ESPN historical data while maintaining full compatibility with the existing Sleeper-based system.