// ESPN-specific type definitions for data migration

import type { LeagueTier, SeasonStandings, PlayoffResult, WeekMatchup, DraftData } from './index';

// ESPN User ID format
export type EspnUserId = `historical-${string}`;

// ESPN League ID format  
export type EspnLeagueId = `espn-${string}-${LeagueTier}`;

// ESPN Draft ID format
export type EspnDraftId = `espn-${string}-${LeagueTier}-draft`;

// ESPN era league data structure (matches existing HistoricalLeagueDataWithDrafts)
export interface EspnLeagueData {
  league: LeagueTier;
  year: string;
  leagueId: EspnLeagueId;
  standings: SeasonStandings[];
  playoffResults: PlayoffResult[];
  promotions: string[]; // Always empty for ESPN era
  relegations: string[]; // Always empty for ESPN era
  matchupsByWeek: Record<number, WeekMatchup[]>;
  memberGameStats?: Record<string, { highGame: number; lowGame: number; games: number[] }>;
  draftData?: DraftData;
}

// Raw ESPN CSV data interfaces
export interface RawEspnTeamData {
  teamName: string;
  espnUsername: string;
  record: string; // "8-5" format
  pointsScored: string; // "1,428.50" format
  pointsAgainst: string; // "1,374.45" format
  finalRank: string; // "1" format
}

export interface RawEspnMatchupData {
  week: string; // "Week 16" format
  team: string;
  score: string; // "119.05" format
  opponent: string;
  opponentScore: string; // "94.4" format
}

export interface RawEspnDraftData {
  pick: string; // "1.1 (1)" format
  player: string; // "Ezekiel Elliott · RB · (DAL)" format
  team: string; // ESPN team name
}

// Parsed ESPN data interfaces (after initial processing)
export interface ParsedEspnTeam {
  teamName: string;
  espnUsername: string;
  wins: number;
  losses: number;
  pointsScored: number;
  pointsAgainst: number;
  finalRank: number;
}

export interface ParsedEspnMatchup {
  week: number;
  team: string;
  score: number;
  opponent: string;
  opponentScore: number;
  isPlayoff: boolean;
}

export interface ParsedEspnDraftPick {
  pickNumber: number;
  round: number;
  draftSlot: number;
  playerName: string;
  position: string;
  nflTeam: string;
  espnTeamName: string;
}

// Conversion context for maintaining state during migration
export interface EspnConversionContext {
  year: string;
  league: LeagueTier;
  teamMappings: Map<string, string>; // ESPN team name -> Sleeper user ID
  userMappings: Map<string, string>; // ESPN username -> Sleeper user ID
  availableWeeks: number[]; // [1, 2, ..., 16] for ESPN era
  playoffWeeks: number[]; // [14, 15, 16] for ESPN era
}

// Validation results
export interface EspnDataValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    teamsCount: number;
    matchupsCount: number;
    draftPicksCount: number;
    weeksWithData: number[];
  };
}

// File processing results
export interface EspnFileProcessingResult {
  success: boolean;
  filePath: string;
  recordsProcessed: number;
  errors: string[];
  data: any; // Specific to file type
}

// Migration summary
export interface EspnMigrationSummary {
  year: string;
  league: LeagueTier;
  success: boolean;
  filesProcessed: {
    teams: EspnFileProcessingResult;
    matchups: EspnFileProcessingResult;
    draft: EspnFileProcessingResult;
  };
  dataGenerated: {
    outputPath: string;
    fileSize: number;
    recordsCount: {
      standings: number;
      matchups: number;
      draftPicks: number;
    };
  };
  validation: EspnDataValidation;
  processingTimeMs: number;
}

// Utility types for data transformation
export type EspnToSleeperUserIdMap = Map<string, string>;
export type EspnTeamNameToSleeperUserIdMap = Map<string, string>;
export type YearSpecificTeamMapping = Map<string, EspnTeamNameToSleeperUserIdMap>;

// Error interfaces (not classes for browser compatibility)
export interface EspnMigrationError {
  name: 'EspnMigrationError';
  message: string;
  context: {
    year?: string;
    league?: LeagueTier;
    file?: string;
    record?: any;
  };
}

export interface EspnValidationError {
  name: 'EspnValidationError';
  message: string;
  validationResults: EspnDataValidation;
}

// Helper type guards
export const isEspnUserId = (userId: string): userId is EspnUserId => {
  return userId.startsWith('historical-');
};

export const isEspnLeagueId = (leagueId: string): leagueId is EspnLeagueId => {
  return leagueId.startsWith('espn-') && !leagueId.endsWith('-draft');
};

export const isEspnDraftId = (draftId: string): draftId is EspnDraftId => {
  return draftId.startsWith('espn-') && draftId.endsWith('-draft');
};

// Helper functions for ID generation
export const generateEspnUserId = (espnUsername: string): EspnUserId => {
  return `historical-${espnUsername}`;
};

export const generateEspnLeagueId = (year: string, league: LeagueTier): EspnLeagueId => {
  return `espn-${year}-${league.toLowerCase()}` as EspnLeagueId;
};

export const generateEspnDraftId = (year: string, league: LeagueTier): EspnDraftId => {
  return `espn-${year}-${league.toLowerCase()}-draft` as EspnDraftId;
};