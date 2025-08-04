import { SleeperService } from './sleeper.service';
import { LeagueService } from './league.service';
import { getSeasonLength } from '../utils/era-detection';
import type { 
  LeagueTier,
  EnhancedLeagueSeasonData,
  WeekMatchupsResponse,
  AllTimeRecords
} from '../types';

// Initialize services
const sleeperService = new SleeperService();
const leagueService = new LeagueService(sleeperService);

export const leagueApi = {
  // Get all league standings for all years
  getAllStandings: async (): Promise<EnhancedLeagueSeasonData[]> => {
    const data = await leagueService.getAllLeagueStandingsWithUserInfo();
    return data;
  },

  // Get complete league history organized by year
  getLeagueHistory: async (): Promise<Record<string, unknown>> => {
    const data = await leagueService.getAllLeagueStandingsWithUserInfo();
    // Transform to match the expected history format
    const history: Record<string, unknown> = {};
    data.forEach(leagueData => {
      if (!history[leagueData.year]) {
        history[leagueData.year] = {};
      }
      (history[leagueData.year] as any)[leagueData.league] = leagueData;
    });
    return history;
  },

  // Get standings for specific league and year
  getLeagueStandings: async (league: LeagueTier, year: string): Promise<EnhancedLeagueSeasonData> => {
    const data = await leagueService.getLeagueStandingsWithUserInfo(league, year);
    return data;
  },

  // Get matchups for specific week
  getWeekMatchups: async (league: LeagueTier, year: string, week: number): Promise<WeekMatchupsResponse> => {
    const data = await leagueService.getWeekMatchupsWithUserInfo(league, year, week);
    return data;
  },

  // Get all matchups for entire season
  getAllSeasonMatchups: async (league: LeagueTier, year: string): Promise<WeekMatchupsResponse[]> => {
    const allWeekMatchups: WeekMatchupsResponse[] = [];
    
    // Get era-aware season length (16 for ESPN era, 17 for Sleeper era)
    const seasonLength = getSeasonLength(year);
    
    // Fetch matchups for all weeks in the season
    for (let week = 1; week <= seasonLength; week++) {
      try {
        const weekData = await leagueService.getWeekMatchupsWithUserInfo(league, year, week);
        if (weekData.matchups && weekData.matchups.length > 0) {
          allWeekMatchups.push(weekData);
        }
      } catch (error) {
        // Skip weeks that don't have data or cause errors
        console.warn(`No matchups found for week ${week}:`, error);
      }
    }
    
    return allWeekMatchups;
  },

  // Get all-time records with optional filtering
  getAllTimeRecords: async (league?: LeagueTier, year?: string): Promise<AllTimeRecords> => {
    const data = await leagueService.getAllTimeRecords(league, year);
    return data;
  },

  // Bulk load all matchup data for efficient head-to-head comparisons
  getAllMatchupsForComparison: async () => {
    return await leagueService.getAllMatchupsForComparison();
  },
};

export { sleeperService, leagueService };