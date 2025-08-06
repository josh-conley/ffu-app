import type { LeagueTier } from '../types';
import { getAllYears, getAvailableLeagues } from '../config/constants';
import { getSeasonLength, getPlayoffWeeks, isPlayoffWeek as isPlayoffWeekUtil } from '../utils/era-detection';

// League configuration constants
export const LEAGUE_NAMES: Record<LeagueTier, string> = {
  PREMIER: 'Premier',
  MASTERS: 'Masters',
  NATIONAL: 'National'
} as const;

export const LEAGUE_HIERARCHY: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'] as const;

// Era-aware season and week configuration
export const AVAILABLE_YEARS = getAllYears();

// Utility functions
export const getLeagueName = (league: LeagueTier): string => {
  return LEAGUE_NAMES[league];
};

// Era-aware utility functions
export const getAvailableLeaguesForYear = (year: string): LeagueTier[] => {
  return getAvailableLeagues(year);
};

export const getWeeksPerSeason = (year: string): number => {
  return getSeasonLength(year);
};

export const getPlayoffWeeksForYear = (year: string): number[] => {
  return getPlayoffWeeks(year);
};

export const isPlayoffWeek = (week: number, year: string): boolean => {
  return isPlayoffWeekUtil(week, year);
};
