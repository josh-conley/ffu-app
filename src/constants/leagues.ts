import type { LeagueTier } from '../types';

// League configuration constants
export const LEAGUE_NAMES: Record<LeagueTier, string> = {
  PREMIER: 'Premier',
  MASTERS: 'Masters',
  NATIONAL: 'National'
} as const;

export const LEAGUE_HIERARCHY: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'] as const;

// Season and week configuration
export const AVAILABLE_YEARS = ['2024', '2023', '2022', '2021'] as const;
export const WEEKS_PER_SEASON = 18;
export const PLAYOFF_WEEKS = [15, 16, 17, 18];

// Utility functions
export const getLeagueName = (league: LeagueTier): string => {
  return LEAGUE_NAMES[league];
};

export const isPlayoffWeek = (week: number): boolean => {
  return PLAYOFF_WEEKS.includes(week);
};
