# Mid-Season Tournament Implementation Plan

## Overview
A single-elimination tournament that runs during the regular season (Weeks 4-9), featuring all 36 members across all 3 leagues (Premier, Masters, National). Tournament matchups are separate from regular season matchups, but use the same weekly fantasy scores from each team's respective league game.

## Tournament Structure

### Week 4 - Play-In Round
- **8 teams compete** in play-in games
- Selection criteria:
  1. All 0-3 teams automatically qualify
  2. If fewer than 8 teams are 0-3, fill remaining spots with lowest-scoring teams (by total points Weeks 1-4)
- Single elimination H2H using Week 4 scores
- **4 winners** advance to main bracket

### Week 5-9 - Main Bracket
- **32 teams total**:
  - 4 play-in winners
  - 28 auto-qualifiers (teams not in play-in)
- **Seeding**:
  1. Best record through Week 4 (wins-losses)
  2. Total points scored (Weeks 1-4) as tiebreaker
- **Bracket rounds**:
  - Week 5: Round of 32 (32 → 16)
  - Week 6: Round of 16 (16 → 8)
  - Week 7: Quarterfinals (8 → 4)
  - Week 8: Semifinals (4 → 2)
  - Week 9: Finals (2 → 1)

## Technical Implementation

### 1. Data Structure

#### File Location
```
/public/data/mid-season-tournament/
  └── 2025.json
  └── 2026.json (future)
```

#### JSON Schema
```json
{
  "year": "2025",
  "playInRound": {
    "week": 4,
    "isComplete": true,
    "matchups": [
      {
        "matchupId": 1,
        "team1": {
          "userId": "user_001",
          "ffuUserId": "user_001",
          "teamName": "Team Name",
          "score": 123.45,
          "record": "0-3",
          "totalPoints": 450.25,
          "seed": null,
          "league": "PREMIER"
        },
        "team2": {
          "userId": "user_002",
          "ffuUserId": "user_002",
          "teamName": "Another Team",
          "score": 115.20,
          "record": "0-3",
          "totalPoints": 425.10,
          "seed": null,
          "league": "MASTERS"
        },
        "winner": "user_001"
      }
      // 4 play-in matchups total
    ]
  },
  "rounds": [
    {
      "roundNumber": 1,
      "name": "Round of 32",
      "week": 5,
      "isComplete": true,
      "matchups": [
        {
          "matchupId": 1,
          "team1": {
            "userId": "user_003",
            "ffuUserId": "user_003",
            "teamName": "Top Seed",
            "score": 145.80,
            "record": "4-0",
            "totalPoints": 550.00,
            "seed": 1,
            "league": "PREMIER"
          },
          "team2": {
            "userId": "user_001",
            "ffuUserId": "user_001",
            "teamName": "Play-In Winner",
            "score": 132.40,
            "record": "1-3",
            "totalPoints": 573.70,
            "seed": 32,
            "league": "PREMIER",
            "isPlayInWinner": true
          },
          "winner": "user_003"
        }
        // 16 matchups for Round of 32
      ]
    },
    {
      "roundNumber": 2,
      "name": "Round of 16",
      "week": 6,
      "isComplete": true,
      "matchups": [
        // 8 matchups
      ]
    },
    {
      "roundNumber": 3,
      "name": "Quarterfinals",
      "week": 7,
      "isComplete": true,
      "matchups": [
        // 4 matchups
      ]
    },
    {
      "roundNumber": 4,
      "name": "Semifinals",
      "week": 8,
      "isComplete": true,
      "matchups": [
        // 2 matchups
      ]
    },
    {
      "roundNumber": 5,
      "name": "Finals",
      "week": 9,
      "isComplete": true,
      "matchups": [
        // 1 matchup
      ]
    }
  ],
  "champion": {
    "userId": "user_003",
    "ffuUserId": "user_003",
    "teamName": "Champion Team",
    "finalScore": 158.90
  }
}
```

### 2. Page Structure

#### Route
- Path: `/mid-season-tournament`
- Component: `MidSeasonTournament.tsx`

#### Components
```
src/pages/MidSeasonTournament.tsx          # Main page
src/components/Tournament/
  ├── BracketVisualization.tsx             # Full bracket tree display
  ├── PlayInRound.tsx                      # Play-in round display
  ├── TournamentMatchup.tsx                # Single matchup card
  └── TournamentLegend.tsx                 # Seed colors, icons legend
```

### 3. Service Layer

#### Data Service (`src/services/data.service.ts`)
```typescript
/**
 * Load mid-season tournament data for a given year
 * Returns complete data from JSON for historical years
 * For active year, merges JSON with live Sleeper data
 */
export async function loadMidSeasonTournamentData(year: string): Promise<MidSeasonTournamentData>

/**
 * Fetch live tournament scores for current week
 * Used when tournament is in progress
 */
export async function fetchLiveTournamentScores(year: string, week: number): Promise<TournamentMatchup[]>
```

#### Types (`src/types/index.ts`)
```typescript
export interface TournamentTeam {
  userId: string;
  ffuUserId: string;
  teamName: string;
  score: number;
  record: string; // "4-0"
  totalPoints: number; // Weeks 1-4 cumulative
  seed: number | null; // null for play-in teams
  league: LeagueTier;
  isPlayInWinner?: boolean;
}

export interface TournamentMatchup {
  matchupId: number;
  team1: TournamentTeam;
  team2: TournamentTeam | null; // null for bye
  winner: string | null; // userId, null if incomplete
}

export interface TournamentRound {
  roundNumber: number;
  name: string; // "Round of 32", "Round of 16", etc.
  week: number;
  isComplete: boolean;
  matchups: TournamentMatchup[];
}

export interface PlayInRound {
  week: number;
  isComplete: boolean;
  matchups: TournamentMatchup[];
}

export interface MidSeasonTournamentData {
  year: string;
  playInRound: PlayInRound;
  rounds: TournamentRound[];
  champion?: {
    userId: string;
    ffuUserId: string;
    teamName: string;
    finalScore: number;
  };
}
```

### 4. Live Tournament Display (2026+)

For tournaments in progress:

1. **Load static bracket structure** from JSON (shows seeding, past rounds)
2. **Determine current week** using `getCurrentNFLWeek()`
3. **If current week is tournament week**:
   - Fetch live scores from Sleeper API for all 36 teams
   - Match team scores to tournament matchups
   - Display live scores with real-time updates
4. **Show completed rounds** from JSON
5. **Show upcoming rounds** with TBD placeholders

### 5. Bracket Visualization

#### Display Features
- **Single-elimination bracket tree** (traditional tournament bracket layout)
- **Color coding** by seed (1-8 seeds different color tiers)
- **Team logos** and abbreviations
- **Scores** for completed matchups
- **Live indicators** for in-progress matchups
- **Winner highlighting** with progression lines
- **Mobile responsive** (scrollable horizontal bracket on mobile)

#### Bracket Layout
```
Play-In Round (Week 4)
  [8 teams] → [4 winners]
         ↓
Round of 32 (Week 5)
  [32 teams] → [16 winners]
         ↓
Round of 16 (Week 6)
  [16 teams] → [8 winners]
         ↓
Quarterfinals (Week 7)
  [8 teams] → [4 winners]
         ↓
Semifinals (Week 8)
  [4 teams] → [2 winners]
         ↓
Finals (Week 9)
  [2 teams] → [1 CHAMPION]
```

## Data Generation

### Script: `scripts/generate-tournament-data.js`

Responsibilities:
1. Fetch all league standings through Week 4
2. Determine play-in teams (0-3 records + lowest scorers)
3. Generate play-in matchups
4. Fetch Week 4 scores for play-in teams
5. Determine play-in winners
6. Seed all 32 teams for main bracket
7. Generate bracket matchups for each round
8. Fetch scores for each completed tournament week
9. Determine winners and advance teams
10. Save to `/public/data/mid-season-tournament/{year}.json`

### Usage
```bash
# Generate complete tournament data for 2025
npm run generate-tournament-data

# For 2026+, run after each tournament week completes
npm run generate-tournament-data -- --week 5
```

## Navigation

### Header Link
Add "Mid-Season Tournament" link to main navigation header
- Display year-round (always accessible)
- Highlight/badge when tournament is active (Weeks 4-9)

### Homepage Promotion
During tournament weeks (4-9), show featured card on Overview page:
- Current round name
- Link to bracket
- Champion announcement (Week 9+)

## Future Enhancements

- Tournament statistics (highest score, upsets, Cinderella stories)
- Historical tournament data (2026, 2027, etc.)
- Printable bracket view
- Champion history page
- Tournament awards (MVP, Biggest Upset, etc.)

## Implementation Checklist

- [ ] Create tournament data types in `src/types/index.ts`
- [ ] Add data loading functions to `src/services/data.service.ts`
- [ ] Create `MidSeasonTournament.tsx` page component
- [ ] Create bracket visualization components
- [ ] Add route to `App.tsx`
- [ ] Add navigation link to Header
- [ ] Create data generation script
- [ ] Generate 2025 tournament data
- [ ] Test bracket display with 2025 data
- [ ] Plan live score integration for 2026

## Notes

- Tournament is completely separate from regular season standings
- A team can lose every regular season game but still win the tournament
- Tournament champion gets bragging rights but doesn't affect league standings
- Consider prizes/incentives for tournament champion vs regular season champion
