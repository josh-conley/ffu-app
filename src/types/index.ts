// Core types
export interface LeagueInfo {
  id: string;
  name: string;
  year: string;
  season: string;
}

export interface UserInfo {
  userId: string;
  teamName: string;
  abbreviation: string;
  avatar?: string; // Sleeper avatar ID
}

export interface WeekMatchup {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}

export interface SeasonStandings {
  userId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

export interface PlayoffResult {
  userId: string;
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
  userId: string;
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
}

// Raw API data interfaces (before transformation)
export interface RawSeasonStandings {
  userId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
  userInfo?: UserInfo;
}

export interface RawPlayoffResult {
  userId: string;
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
}

