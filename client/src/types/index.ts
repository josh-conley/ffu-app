// Re-export types from shared
export * from '../../../shared/types';

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

// Import the base types we need
import type { SeasonStandings, PlayoffResult, LeagueSeasonData, LeagueTier, UserInfo } from '../../../shared/types';