import { SleeperService } from './sleeper.service';
import { LeagueService } from './league.service';
import type { 
  LeagueTier,
  EnhancedLeagueSeasonData,
  WeekMatchupsResponse
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
};

export { sleeperService, leagueService };