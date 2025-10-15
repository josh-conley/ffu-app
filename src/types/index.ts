// Core types
export interface LeagueInfo {
  id: string;
  name: string;
  year: string;
  season: string;
}

export interface UserInfo {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  teamName: string;
  abbreviation: string;
}

// New unified user interface for the FFU system
export interface FFUUser {
  ffuId: string;          // Primary ID: "ffu-001", "ffu-002", etc.
  sleeperId?: string;     // Optional: exists for Sleeper era users
  espnId?: string;        // Optional: exists for ESPN era users  
  teamName: string;
  abbreviation: string;
  joinedYear: number;
  isActive: boolean;
  historicalNames?: { [year: string]: string };
}

// Helper types for unified user system
export type FFUUserId = string; // FFU ID format: "ffu-001", "ffu-002", etc.

// Backward compatibility types
export interface LegacyUserInfo {
  userId: string; // Sleeper ID
  teamName: string;
  abbreviation: string;
}

// Enhanced UserInfo with both old and new IDs for transition period
export interface EnhancedUserInfo extends UserInfo {
  sleeperId?: string; // For backward compatibility
}

export interface WeekMatchup {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerRecord?: string;
  loserRecord?: string;
  placementType?: string;
}

export interface SeasonStandings {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  highGame?: number;
  lowGame?: number;
  unionPowerRating?: number;
}

export interface PlayoffResult {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  placement: number;
  placementName: string; // '1st', '2nd', '3rd', etc.
}

export interface LeagueSeasonData {
  league: string;
  year: string;
  leagueId: string;
  standings: SeasonStandings[];
  playoffResults: PlayoffResult[];
  promotions: string[]; // User IDs promoted to higher league
  relegations: string[]; // User IDs relegated to lower league
}

export interface MemberHistory {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  userInfo: UserInfo;
  seasons: {
    year: string;
    league: string;
    standing: SeasonStandings;
    playoffResult?: PlayoffResult;
    promoted?: boolean;
    relegated?: boolean;
  }[];
}

export type LeagueTier = 'PREMIER' | 'MASTERS' | 'NATIONAL';

// Sleeper API types
export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  total_rosters: number;
  settings: {
    playoff_week_start: number;
    league_average_match: number;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players?: string[]; // All rostered player IDs
  starters?: string[]; // Starting lineup player IDs (may not be set for roster endpoint)
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_against?: number;
    fpts_decimal?: number;
    fpts_against_decimal?: number;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players_points: Record<string, number>;
  starters?: string[]; // Starting lineup player IDs for this matchup
  players?: string[]; // All players on roster for this matchup
}

export interface SleeperDraft {
  draft_id: string;
  created: number;
  draft_order: Record<string, number> | null;
  league_id: string;
  metadata: {
    scoring_type: string;
    name: string;
    description: string;
  };
  settings: {
    teams: number;
    slots_qb: number;
    slots_rb: number;
    slots_wr: number;
    slots_te: number;
    slots_k: number;
    slots_def: number;
    slots_bn: number;
    rounds: number;
    draft_type: number;
    cpu_autopick?: boolean;
  };
  sport: string;
  start_time: number;
  status: string;
  type: number;
  season: string;
  season_type: string;
}

export interface SleeperDraftPick {
  draft_id: string;
  draft_slot: number;
  pick_no: number;
  player_id: string;
  picked_by: string;
  roster_id: number;
  round: number;
  metadata: {
    years_exp: string;
    team: string;
    status: string;
    sport: string;
    position: string;
    player_id: string;
    number: string;
    news_updated: string;
    last_name: string;
    injury_status: string;
    first_name: string;
  };
}

export interface SleeperPlayer {
  player_id: string;
  active: boolean;
  age: number;
  birth_date: string;
  college: string;
  depth_chart_order: number | null;
  depth_chart_position: string | null;
  fantasy_data_id: number;
  fantasy_positions: string[];
  first_name: string;
  full_name: string;
  gsis_id: string | null;
  height: string;
  high_school: string;
  injury_body_part: string | null;
  injury_notes: string | null;
  injury_start_date: string | null;
  injury_status: string | null;
  last_name: string;
  metadata: Record<string, any>;
  number: number;
  oddsjam_id: string | null;
  position: string;
  practice_participation: string | null;
  rotowire_id: number | null;
  rotoworld_id: number | null;
  search_first_name: string;
  search_full_name: string;
  search_last_name: string;
  search_rank: number;
  sport: string;
  sportradar_id: string | null;
  stats_id: number | null;
  status: string;
  swish_id: number | null;
  team: string | null;
  weight: string;
  yahoo_id: number | null;
  years_exp: number;
}

// Raw API data interfaces (before transformation)
export interface RawSeasonStandings {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  highGame?: number;
  lowGame?: number;
  userInfo?: UserInfo;
}

export interface RawPlayoffResult {
  userId: string; // Deprecated: use ffuUserId instead
  ffuUserId: string; // Primary identifier
  placement: number;
  placementName: string;
  userInfo?: UserInfo;
}

export interface RawLeagueSeasonData {
  league: LeagueTier;
  year: string;
  leagueId: string;
  standings: RawSeasonStandings[];
  playoffResults: RawPlayoffResult[];
  promotions: string[];
  relegations: string[];
}

export interface RawMatchup {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerRecord?: string;
  loserRecord?: string;
  placementType?: string;
  winnerInfo?: UserInfo;
  loserInfo?: UserInfo;
}

export interface RawWeekMatchupsResponse {
  league: LeagueTier;
  year: string;
  week: number;
  matchups: RawMatchup[];
}

// Frontend-specific types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// Enhanced types with frontend-specific fields
export interface EnhancedSeasonStandings extends SeasonStandings {
  userInfo: UserInfo;
}

export interface EnhancedPlayoffResult extends PlayoffResult {
  userInfo: UserInfo;
}

export interface EnhancedLeagueSeasonData extends Omit<LeagueSeasonData, 'standings' | 'playoffResults'> {
  standings: EnhancedSeasonStandings[];
  playoffResults: EnhancedPlayoffResult[];
}

export interface MatchupWithUserInfo {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerRecord?: string;
  loserRecord?: string;
  placementType?: string;
  winnerInfo: UserInfo;
  loserInfo: UserInfo;
}

export interface WeekMatchupsResponse {
  league: LeagueTier;
  year: string;
  week: number;
  matchups: MatchupWithUserInfo[];
}

// Hook return types for better type safety
export interface UseLeagueStandingsReturn {
  data: EnhancedLeagueSeasonData | null;
  isLoading: boolean;
  error?: string;
}

export interface UseAllStandingsReturn {
  data: EnhancedLeagueSeasonData[];
  isLoading: boolean;
  error?: string;
}

export interface UseWeekMatchupsReturn {
  data: WeekMatchupsResponse | null;
  isLoading: boolean;
  error?: string;
}

// Head-to-head comparison types
export interface HeadToHeadMatchup {
  year: string;
  league: LeagueTier;
  week: number;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  winnerInfo: UserInfo;
  loserInfo: UserInfo;
  isPlayoff?: boolean;
  placementType?: string;
}

export interface HeadToHeadStats {
  player1Wins: number;
  player2Wins: number;
  totalGames: number;
  player1AvgScore: number;
  player2AvgScore: number;
  matchups: HeadToHeadMatchup[];
}

export interface UseHeadToHeadReturn {
  data: HeadToHeadStats | null;
  isLoading: boolean;
  error?: string;
}

// Records types
export interface GameRecord {
  userInfo: UserInfo;
  score: number;
  opponent?: UserInfo;
  opponentScore?: number;
  week: number;
  year: string;
  league: LeagueTier;
}

export interface SeasonRecord {
  userInfo: UserInfo;
  points: number;
  year: string;
  league: LeagueTier;
  wins?: number;
  losses?: number;
  ties?: number;
}

export interface AllTimeRecords {
  highestSingleGame: GameRecord;
  lowestSingleGame: GameRecord;
  mostPointsSeason: SeasonRecord;
  leastPointsSeason: SeasonRecord;
  mostPointsInLoss: GameRecord;
  fewestPointsInWin: GameRecord;
  closestGame: {
    winner: UserInfo;
    loser: UserInfo;
    winnerScore: number;
    loserScore: number;
    margin: number;
    week: number;
    year: string;
    league: LeagueTier;
  };
  biggestBlowout: {
    winner: UserInfo;
    loser: UserInfo;
    winnerScore: number;
    loserScore: number;
    margin: number;
    week: number;
    year: string;
    league: LeagueTier;
  };
}

// Draft-related application types
export interface DraftPick {
  pickNumber: number;
  round: number;
  draftSlot: number;
  playerId: string;
  playerInfo: {
    name: string;
    position: string;
    team: string | null;
    historicalTeam?: string | null; // Team the player was on during the draft year
    college?: string;
    age?: number;
  };
  pickedBy: string;
  userInfo: UserInfo;
  draftId: string;
}

export interface DraftData {
  draftId: string;
  leagueId: string;
  year: string;
  league: LeagueTier;
  draftOrder: Record<string, number>;
  picks: DraftPick[];
  settings: {
    teams: number;
    rounds: number;
    draftType: string;
  };
  metadata: {
    name: string;
    description: string;
    scoringType: string;
  };
  startTime: number;
  status: string;
}

export interface HistoricalLeagueDataWithDrafts {
  league: LeagueTier;
  year: string;
  leagueId: string;
  standings: SeasonStandings[];
  playoffResults: PlayoffResult[];
  promotions: string[];
  relegations: string[];
  matchupsByWeek: Record<number, WeekMatchup[]>;
  memberGameStats?: Record<string, { highGame: number; lowGame: number; games: number[] }>;
  draftData?: DraftData;
}

export interface PlayerData {
  lastUpdated: string;
  totalPlayers: number;
  players: Record<string, SleeperPlayer>;
}

export interface UseDraftDataReturn {
  data: DraftData | null;
  isLoading: boolean;
  error?: string;
}

// NFLverse historical data types
export interface NFLverseRosterEntry {
  season: number;
  team: string;
  position: string;
  depth_chart_position?: string;
  jersey_number?: number;
  status: string;
  full_name: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  height?: string;
  weight?: string;
  college?: string;
  gsis_id?: string;
  espn_id?: number;
  sportradar_id?: string;
  yahoo_id?: number;
  rotowire_id?: number;
  pff_id?: number;
  pfr_id?: string;
  fantasy_data_id?: number;
  sleeper_id?: string;
  years: number;
  games: number;
  starts: number;
  av: number;
}

export interface HistoricalTeamData {
  [playerKey: string]: {
    [season: number]: {
      team: string;
      full_name: string;
      position: string;
      games: number;
      starts: number;
    };
  };
}

export interface PlayerTeamMapping {
  sleeperId: string;
  nflverseKey: string;
  confidence: 'high' | 'medium' | 'low';
  matchedOn: 'exact_name' | 'fuzzy_name' | 'manual';
}

