import type { LeagueTier } from '../types';

// Era detection utilities for distinguishing between ESPN (2018-2020) and Sleeper (2021+) eras

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

// Get regular season weeks (excludes playoffs)
export const getRegularSeasonWeeks = (year: string): number[] => {
  const playoffWeeks = getPlayoffWeeks(year);
  const regularSeasonLength = Math.min(...playoffWeeks) - 1;
  
  return Array.from({ length: regularSeasonLength }, (_, i) => i + 1);
};

// Get available leagues for year (ESPN era had no Masters league, Masters started in 2022)
export const getAvailableLeagues = (year: string): LeagueTier[] => {
  const yearNum = parseInt(year);
  
  if (isEspnEra(year)) {
    // ESPN era: only Premier and National
    return ['PREMIER', 'NATIONAL'];
  } else if (yearNum === 2021) {
    // 2021: Sleeper era but Masters not yet introduced
    return ['PREMIER', 'NATIONAL'];
  } else {
    // 2022+: All three leagues
    return ['PREMIER', 'MASTERS', 'NATIONAL'];
  }
};

// Check if a specific league existed in a given year
export const isLeagueAvailableInYear = (league: LeagueTier, year: string): boolean => {
  const availableLeagues = getAvailableLeagues(year);
  return availableLeagues.includes(league);
};

// Get era-specific league configuration
export const getEraInfo = (year: string) => {
  const era = isEspnEra(year) ? 'ESPN' : 'Sleeper';
  
  return {
    era,
    isEspnEra: isEspnEra(year),
    isSleeperEra: isSleeperEra(year),
    totalWeeks: getSeasonLength(year),
    regularSeasonWeeks: getRegularSeasonWeeks(year),
    playoffWeeks: getPlayoffWeeks(year),
    availableLeagues: getAvailableLeagues(year),
    dataFormat: isEspnEra(year) ? 'CSV' : 'JSON',
    hasRealTimeData: isSleeperEra(year)
  };
};

// Helper to determine if a week is a playoff week
export const isPlayoffWeek = (week: number, year: string): boolean => {
  return getPlayoffWeeks(year).includes(week);
};

// Helper to determine if a week is a regular season week
export const isRegularSeasonWeek = (week: number, year: string): boolean => {
  return getRegularSeasonWeeks(year).includes(week);
};

// Get playoff round name based on week and era
export const getPlayoffRoundName = (week: number, year: string): string | null => {
  const playoffWeeks = getPlayoffWeeks(year);
  
  if (!playoffWeeks.includes(week)) {
    return null;
  }
  
  const playoffIndex = playoffWeeks.indexOf(week);
  const roundNames = ['Quarterfinal', 'Semifinal', 'Championship'];
  
  return roundNames[playoffIndex] || null;
};