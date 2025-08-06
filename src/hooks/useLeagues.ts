import { useState, useEffect, useCallback } from 'react';
import { leagueApi } from '../services/api';
import { getSeasonLength } from '../utils/era-detection';
import { useMatchupCache } from './useMatchupCache';
import { getHeadToHeadMatchups, calculateHeadToHeadStats } from '../utils/matchup-indexer';
import type { 
  EnhancedLeagueSeasonData, 
  LeagueTier, 
  UseAllStandingsReturn,
  UseLeagueStandingsReturn,
  UseWeekMatchupsReturn,
  WeekMatchupsResponse,
  AllTimeRecords,
  UseHeadToHeadReturn,
  HeadToHeadStats,
  HeadToHeadMatchup
} from '../types';

export const useAllStandings = (): UseAllStandingsReturn => {
  const [data, setData] = useState<EnhancedLeagueSeasonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const standings = await leagueApi.getAllStandings();
      setData(standings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch standings';
      setError(errorMessage);
      console.error('Error fetching all standings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useLeagueHistory = () => {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const history = await leagueApi.getLeagueHistory();
      setData(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch league history';
      setError(errorMessage);
      console.error('Error fetching league history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useLeagueStandings = (league: LeagueTier, year: string): UseLeagueStandingsReturn => {
  const [data, setData] = useState<EnhancedLeagueSeasonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    if (!league || !year) {
      setError('League and year are required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      const standings = await leagueApi.getLeagueStandings(league, year);
      setData(standings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch league standings';
      setError(errorMessage);
      console.error('Error fetching league standings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [league, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useWeekMatchups = (league: LeagueTier, year: string, week: number): UseWeekMatchupsReturn => {
  const [data, setData] = useState<WeekMatchupsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    // Get era-aware season length for validation
    const seasonLength = getSeasonLength(year);
    
    if (!league || !year || !week || week < 1 || week > seasonLength) {
      setError(`Valid league, year, and week (1-${seasonLength}) are required`);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      const matchups = await leagueApi.getWeekMatchups(league, year, week);
      setData(matchups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch week matchups';
      setError(errorMessage);
      console.error('Error fetching week matchups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [league, year, week]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useAllSeasonMatchups = (league: LeagueTier, year: string) => {
  const [data, setData] = useState<WeekMatchupsResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    if (!league || !year) {
      setError('League and year are required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      const allMatchups = await leagueApi.getAllSeasonMatchups(league, year);
      setData(allMatchups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch season matchups';
      setError(errorMessage);
      console.error('Error fetching all season matchups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [league, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useAllTimeRecords = (league?: LeagueTier, year?: string) => {
  const [data, setData] = useState<AllTimeRecords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const records = await leagueApi.getAllTimeRecords(league, year);
      setData(records);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch records';
      setError(errorMessage);
      console.error('Error fetching all-time records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [league, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};

export const useHeadToHeadMatchups = (player1Id: string, player2Id: string): UseHeadToHeadReturn => {
  const [data, setData] = useState<HeadToHeadStats | null>(null);
  const [error, setError] = useState<string>();
  const { index, isLoading: cacheLoading, error: cacheError } = useMatchupCache();

  const calculateHeadToHead = useCallback(() => {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setData(null);
      setError(undefined);
      return;
    }

    if (!index) {
      // Cache not loaded yet
      setData(null);
      setError(cacheError || undefined);
      return;
    }

    try {
      setError(undefined);
      
      // Get head-to-head matchups from index (instant lookup!)
      const matchups = getHeadToHeadMatchups(index, player1Id, player2Id);
      
      // Calculate stats using the utility function
      const stats = calculateHeadToHeadStats(matchups, player1Id, player2Id);
      
      // Convert indexed matchups to the expected format
      const headToHeadMatchups: HeadToHeadMatchup[] = matchups.map(matchup => ({
        year: matchup.year,
        league: matchup.league,
        week: matchup.week,
        winner: matchup.winner,
        loser: matchup.loser,
        winnerScore: matchup.winnerScore,
        loserScore: matchup.loserScore,
        winnerInfo: matchup.winnerInfo,
        loserInfo: matchup.loserInfo,
        isPlayoff: matchup.isPlayoff,
        placementType: matchup.placementType
      }));

      setData({
        ...stats,
        matchups: headToHeadMatchups
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate head-to-head matchups';
      setError(errorMessage);
      console.error('Error calculating head-to-head matchups:', err);
    }
  }, [player1Id, player2Id, index, cacheError]);

  useEffect(() => {
    calculateHeadToHead();
  }, [calculateHeadToHead]);

  return { 
    data, 
    isLoading: cacheLoading, 
    error: error || cacheError || undefined
  };
};