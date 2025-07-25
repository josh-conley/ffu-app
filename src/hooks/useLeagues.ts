import { useState, useEffect, useCallback } from 'react';
import { leagueApi } from '../services/api';
import type { 
  EnhancedLeagueSeasonData, 
  LeagueTier, 
  UseAllStandingsReturn,
  UseLeagueStandingsReturn,
  UseWeekMatchupsReturn,
  WeekMatchupsResponse,
  AllTimeRecords
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
    if (!league || !year || !week || week < 1 || week > 18) {
      setError('Valid league, year, and week (1-18) are required');
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