import { useState, useEffect, useCallback } from 'react';
import { leagueApi } from '../services/api';
import { getSeasonLength } from '../utils/era-detection';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchData = useCallback(async () => {
    if (!player1Id || !player2Id || player1Id === player2Id) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(undefined);
      
      // Fetch all season matchups for all leagues and years
      const allLeagues: LeagueTier[] = ['PREMIER', 'MASTERS', 'NATIONAL'];
      const allYears = ['2024', '2023', '2022', '2021'];
      
      const headToHeadMatchups: HeadToHeadMatchup[] = [];
      
      // Collect all matchups across leagues and years
      for (const league of allLeagues) {
        for (const year of allYears) {
          try {
            const seasonMatchups = await leagueApi.getAllSeasonMatchups(league, year);
            
            // Filter for matchups between the two selected players
            for (const weekData of seasonMatchups) {
              for (const matchup of weekData.matchups) {
                const isHeadToHead = 
                  (matchup.winner === player1Id && matchup.loser === player2Id) ||
                  (matchup.winner === player2Id && matchup.loser === player1Id);
                
                if (isHeadToHead) {
                  headToHeadMatchups.push({
                    year,
                    league,
                    week: weekData.week,
                    winner: matchup.winner,
                    loser: matchup.loser,
                    winnerScore: matchup.winnerScore,
                    loserScore: matchup.loserScore,
                    winnerInfo: matchup.winnerInfo,
                    loserInfo: matchup.loserInfo,
                    isPlayoff: weekData.week > 17,
                    placementType: matchup.placementType
                  });
                }
              }
            }
          } catch (err) {
            // Ignore individual league/year fetch errors
            console.warn(`Could not fetch matchups for ${league} ${year}:`, err);
          }
        }
      }

      // Calculate head-to-head stats
      const player1Wins = headToHeadMatchups.filter(m => m.winner === player1Id).length;
      const player2Wins = headToHeadMatchups.filter(m => m.winner === player2Id).length;
      const totalGames = headToHeadMatchups.length;
      
      const player1Scores = headToHeadMatchups.map(m => 
        m.winner === player1Id ? m.winnerScore : m.loserScore
      );
      const player2Scores = headToHeadMatchups.map(m => 
        m.winner === player2Id ? m.winnerScore : m.loserScore
      );
      
      const player1AvgScore = player1Scores.length > 0 
        ? player1Scores.reduce((sum, score) => sum + score, 0) / player1Scores.length 
        : 0;
      const player2AvgScore = player2Scores.length > 0 
        ? player2Scores.reduce((sum, score) => sum + score, 0) / player2Scores.length 
        : 0;

      // Sort matchups by year and week (most recent first)
      headToHeadMatchups.sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        return b.week - a.week;
      });

      setData({
        player1Wins,
        player2Wins,
        totalGames,
        player1AvgScore,
        player2AvgScore,
        matchups: headToHeadMatchups
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch head-to-head matchups';
      setError(errorMessage);
      console.error('Error fetching head-to-head matchups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [player1Id, player2Id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error };
};