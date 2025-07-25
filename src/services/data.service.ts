import type { LeagueTier, EnhancedLeagueSeasonData, WeekMatchupsResponse } from '../types';
import { isHistoricalYear, isCurrentYear } from '../config/constants';

export interface HistoricalLeagueData {
  league: LeagueTier;
  year: string;
  leagueId: string;
  standings: any[];
  playoffResults: any[];
  promotions: string[];
  relegations: string[];
  matchupsByWeek: Record<number, any[]>; // All matchups for each week
}

export class DataService {
  private baseUrl = import.meta.env.MODE === 'production' ? '/ffu-app' : '';

  /**
   * Load historical league data from JSON file
   */
  async loadHistoricalLeagueData(league: LeagueTier, year: string): Promise<HistoricalLeagueData | null> {
    if (!isHistoricalYear(year)) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/data/${year}/${league.toLowerCase()}.json`;
      console.log(`🗂️ Loading historical data from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`No historical data found for ${league} ${year}`);
        return null;
      }
      const data = await response.json();
      console.log(`✅ Loaded historical data for ${league} ${year} (${Object.keys(data.matchupsByWeek).length} weeks of matchups)`);
      return data;
    } catch (error) {
      console.error(`Failed to load historical data for ${league} ${year}:`, error);
      return null;
    }
  }

  /**
   * Save historical league data to JSON format (for generation script)
   */
  generateHistoricalDataJSON(
    league: LeagueTier,
    year: string,
    standings: any[],
    playoffResults: any[],
    promotions: string[],
    relegations: string[],
    leagueId: string,
    matchupsByWeek: Record<number, any[]>
  ): HistoricalLeagueData {
    return {
      league,
      year,
      leagueId,
      standings,
      playoffResults,
      promotions,
      relegations,
      matchupsByWeek
    };
  }

  /**
   * Check if data should come from historical cache or live API
   */
  shouldUseHistoricalData(year: string): boolean {
    return isHistoricalYear(year);
  }

  /**
   * Check if data should come from live API
   */
  shouldUseLiveData(year: string): boolean {
    return isCurrentYear(year) || !isHistoricalYear(year);
  }

  /**
   * Convert historical data to the format expected by the application
   */
  convertHistoricalToEnhanced(historicalData: HistoricalLeagueData): EnhancedLeagueSeasonData {
    return {
      league: historicalData.league,
      year: historicalData.year,
      leagueId: historicalData.leagueId,
      standings: historicalData.standings,
      playoffResults: historicalData.playoffResults,
      promotions: historicalData.promotions,
      relegations: historicalData.relegations
    };
  }

  /**
   * Convert historical matchup data to week matchups format
   */
  convertHistoricalMatchups(
    historicalData: HistoricalLeagueData,
    week: number
  ): WeekMatchupsResponse | null {
    const weekMatchups = historicalData.matchupsByWeek[week];
    if (!weekMatchups) {
      return null;
    }

    return {
      league: historicalData.league,
      year: historicalData.year,
      week: week,
      matchups: weekMatchups
    };
  }

  /**
   * Get all week matchups from historical data
   */
  getAllHistoricalMatchups(historicalData: HistoricalLeagueData): {week: number, matchups: any[]}[] {
    return Object.entries(historicalData.matchupsByWeek)
      .map(([week, matchups]) => ({
        week: parseInt(week),
        matchups
      }))
      .sort((a, b) => a.week - b.week);
  }
}

export const dataService = new DataService();