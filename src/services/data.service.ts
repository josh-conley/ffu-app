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
  memberGameStats?: Record<string, { highGame: number; lowGame: number; games: number[] }>; // High/low game stats per member
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
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`No historical data found for ${league} ${year}`);
        return null;
      }
      const data = await response.json();
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

  /**
   * Calculate high/low game stats for each member from matchup data
   */
  calculateMemberGameStats(matchupsByWeek: Record<number, any[]>): Record<string, { highGame: number; lowGame: number; games: number[] }> {
    const memberStats: Record<string, { highGame: number; lowGame: number; games: number[] }> = {};

    // Process all weeks of matchups
    Object.values(matchupsByWeek).forEach(weekMatchups => {
      weekMatchups.forEach(matchup => {
        // Track winner's score
        if (!memberStats[matchup.winner]) {
          memberStats[matchup.winner] = {
            highGame: matchup.winnerScore,
            lowGame: matchup.winnerScore,
            games: []
          };
        }
        const winnerStats = memberStats[matchup.winner];
        winnerStats.games.push(matchup.winnerScore);
        winnerStats.highGame = Math.max(winnerStats.highGame, matchup.winnerScore);
        winnerStats.lowGame = Math.min(winnerStats.lowGame, matchup.winnerScore);

        // Track loser's score
        if (!memberStats[matchup.loser]) {
          memberStats[matchup.loser] = {
            highGame: matchup.loserScore,
            lowGame: matchup.loserScore,
            games: []
          };
        }
        const loserStats = memberStats[matchup.loser];
        loserStats.games.push(matchup.loserScore);
        loserStats.highGame = Math.max(loserStats.highGame, matchup.loserScore);
        loserStats.lowGame = Math.min(loserStats.lowGame, matchup.loserScore);
      });
    });

    return memberStats;
  }
}

export const dataService = new DataService();