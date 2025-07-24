import type { LeagueTier } from '../types';

// League configuration constants
export const LEAGUE_NAMES: Record<LeagueTier, string> = {
  PREMIER: 'Premier',
  MASTERS: 'Masters',
  NATIONAL: 'National'
} as const;

export const LEAGUE_HIERARCHY: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'] as const;

export const LEAGUE_COLORS = {
  PREMIER: {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    border: 'border-yellow-200 dark:border-yellow-700'
  },
  MASTERS: {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-200 dark:border-blue-700'
  },
  NATIONAL: {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-200 dark:border-green-700'
  }
} as const;

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

export const getLeagueColor = (league: LeagueTier) => {
  return LEAGUE_COLORS[league];
};