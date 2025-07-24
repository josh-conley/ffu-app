import axios, { AxiosError } from 'axios';
import type { 
  LeagueTier,
  EnhancedLeagueSeasonData,
  WeekMatchupsResponse,
  MatchupWithUserInfo,
  RawLeagueSeasonData,
  RawWeekMatchupsResponse
} from '../types';

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = (error.response?.data as { error?: string })?.error || error.message || 'An error occurred';
    console.error('API Error:', message);
    throw new Error(message);
  }
);

// Transform raw API data to enhanced frontend types
const transformStandingsData = (data: RawLeagueSeasonData[]): EnhancedLeagueSeasonData[] => {
  return data.map(leagueData => ({
    ...leagueData,
    standings: leagueData.standings.map((standing) => ({
      ...standing,
      userInfo: standing.userInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: standing.userId }
    })),
    playoffResults: leagueData.playoffResults.map((result) => ({
      ...result,
      userInfo: result.userInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: result.userId }
    }))
  }));
};

const transformSingleStandingsData = (data: RawLeagueSeasonData): EnhancedLeagueSeasonData => {
  return {
    ...data,
    standings: data.standings.map((standing) => ({
      ...standing,
      userInfo: standing.userInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: standing.userId }
    })),
    playoffResults: data.playoffResults.map((result) => ({
      ...result,
      userInfo: result.userInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: result.userId }
    }))
  };
};

const transformMatchupsData = (data: RawWeekMatchupsResponse): WeekMatchupsResponse => {
  return {
    ...data,
    matchups: data.matchups.map((matchup): MatchupWithUserInfo => ({
      winner: matchup.winner,
      loser: matchup.loser,
      winnerScore: matchup.winnerScore,
      loserScore: matchup.loserScore,
      winnerInfo: matchup.winnerInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: matchup.winner },
      loserInfo: matchup.loserInfo || { teamName: 'Unknown Team', abbreviation: 'UNK', userId: matchup.loser }
    }))
  };
};

export const leagueApi = {
  // Get all league standings for all years
  getAllStandings: async (): Promise<EnhancedLeagueSeasonData[]> => {
    const response = await api.get('/leagues/standings');
    return transformStandingsData(response.data);
  },

  // Get complete league history organized by year
  getLeagueHistory: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/leagues/history');
    return response.data;
  },

  // Get standings for specific league and year
  getLeagueStandings: async (league: LeagueTier, year: string): Promise<EnhancedLeagueSeasonData> => {
    const response = await api.get(`/leagues/${league.toLowerCase()}/${year}`);
    return transformSingleStandingsData(response.data);
  },

  // Get matchups for specific week
  getWeekMatchups: async (league: LeagueTier, year: string, week: number): Promise<WeekMatchupsResponse> => {
    const response = await api.get(`/leagues/${league.toLowerCase()}/${year}/${week}`);
    return transformMatchupsData(response.data);
  },
};

export default api;