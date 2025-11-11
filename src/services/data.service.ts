import type { LeagueTier, EnhancedLeagueSeasonData, WeekMatchupsResponse } from '../types';
import { isHistoricalYear, isCurrentYear, getAvailableLeagues, isEspnEra } from '../config/constants';
import { calculateUPR, getRegularSeasonUPRData, calculateRegularSeasonRecord } from '../utils/upr-calculator';

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
  draftData?: import('../types').DraftData; // Draft data if available
  divisionNames?: Record<number, string>; // Division number to name mapping (Sleeper era only)
}

export class DataService {
  private baseUrl = import.meta.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash

  /**
   * Load league data from static JSON file (works for all years - no live API calls)
   */
  async loadHistoricalLeagueData(league: LeagueTier, year: string): Promise<HistoricalLeagueData | null> {
    console.log(`📊 DataService: Loading data for ${league} ${year}`);

    // Check if league existed in the given year (ESPN era had no Masters)
    if (!this.isLeagueAvailableInYear(league, year)) {
      console.warn(`📊 DataService: ${league} league did not exist in ${year}`);
      return null;
    }

    try {
      const url = `${this.baseUrl}/data/${year}/${league.toLowerCase()}.json`;
      console.log(`📊 DataService: Fetching ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`📊 DataService: HTTP ${response.status} - No data found for ${league} ${year}`);
        return null;
      }
      const data = await response.json();
      console.log(`📊 DataService: Successfully loaded ${league} ${year} with ${data.standings?.length || 0} teams`);
      return data;
    } catch (error) {
      console.error(`📊 DataService: Failed to load data for ${league} ${year}:`, error);
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
   * Convert historical data to the format expected by the application
   */
  convertHistoricalToEnhanced(historicalData: HistoricalLeagueData): EnhancedLeagueSeasonData {
    // Calculate UPR for each team using historical matchup data
    const standingsWithUPR = historicalData.standings.map(standing => {
      const userId = standing.userId || standing.ffuUserId;
      
      // If we have matchup data, calculate regular season stats and UPR
      if (historicalData.matchupsByWeek) {
        // Get regular season record from matchup data (more accurate)
        const regularSeasonRecord = calculateRegularSeasonRecord(
          userId,
          historicalData.matchupsByWeek,
          historicalData.year
        );
        
        // Get high/low games from regular season only
        const uprGameData = getRegularSeasonUPRData(
          userId,
          historicalData.matchupsByWeek,
          historicalData.year
        );
        
        // Calculate UPR using regular season data
        const unionPowerRating = calculateUPR({
          wins: regularSeasonRecord.wins,
          losses: regularSeasonRecord.losses,
          ties: regularSeasonRecord.ties,
          averageScore: uprGameData.averageScore,
          highGame: uprGameData.highGame,
          lowGame: uprGameData.lowGame
        });
        
        return {
          ...standing,
          unionPowerRating,
          highGame: uprGameData.highGame,
          lowGame: uprGameData.lowGame
        };
      } else {
        // Fallback: use standing data if no matchup data available
        // Calculate average from total points and games played
        const totalGames = (standing.wins || 0) + (standing.losses || 0) + (standing.ties || 0);
        const averageScore = totalGames > 0 ? (standing.pointsFor || 0) / totalGames : 0;
        
        const unionPowerRating = calculateUPR({
          wins: standing.wins || 0,
          losses: standing.losses || 0,
          ties: standing.ties || 0,
          averageScore,
          highGame: standing.highGame || 0,
          lowGame: standing.lowGame || 0
        });
        
        return {
          ...standing,
          unionPowerRating
        };
      }
    });

    return {
      league: historicalData.league,
      year: historicalData.year,
      leagueId: historicalData.leagueId,
      standings: standingsWithUPR,
      playoffResults: historicalData.playoffResults,
      promotions: historicalData.promotions,
      relegations: historicalData.relegations,
      matchupsByWeek: historicalData.matchupsByWeek, // Preserve matchups for tiebreaker logic
      divisionNames: historicalData.divisionNames // Preserve division names for UI display
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

  /**
   * Load cached NFL player data
   */
  async loadPlayerData(): Promise<import('../types').PlayerData | null> {
    try {
      const url = `${this.baseUrl}/data/players/nfl-players.json`;
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('No cached player data found');
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to load player data:', error);
      return null;
    }
  }

  /**
   * Get player information by ID
   */
  getPlayerById(playerId: string, playerData: import('../types').PlayerData | null): import('../types').SleeperPlayer | null {
    if (!playerData || !playerData.players) return null;
    return playerData.players[playerId] || null;
  }

  /**
   * Get draft data from historical league data
   */
  getDraftData(historicalData: HistoricalLeagueData): import('../types').DraftData | null {
    return historicalData.draftData || null;
  }

  /**
   * Check if draft data is available for a league/year
   */
  hasDraftData(historicalData: HistoricalLeagueData): boolean {
    return !!(historicalData.draftData && historicalData.draftData.picks.length > 0);
  }

  /**
   * Era-specific helper methods
   */

  /**
   * Check if a league was available in a given year
   */
  isLeagueAvailableInYear(league: LeagueTier, year: string): boolean {
    const availableLeagues = getAvailableLeagues(year);
    return availableLeagues.includes(league);
  }

  /**
   * Get all available leagues for a given year
   */
  getAvailableLeaguesForYear(year: string): LeagueTier[] {
    return getAvailableLeagues(year);
  }

  /**
   * Check if year is from ESPN era
   */
  isEspnEraYear(year: string): boolean {
    return isEspnEra(year);
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
   * Check if year is from Sleeper era
   */
  isSleeperEraYear(year: string): boolean {
    return !isEspnEra(year) && isHistoricalYear(year);
  }

  /**
   * Get era information for a year
   */
  getEraInfo(year: string): {
    era: 'ESPN' | 'Sleeper' | 'Current';
    totalWeeks: number;
    playoffWeeks: number[];
    availableLeagues: LeagueTier[];
  } {
    if (isEspnEra(year)) {
      return {
        era: 'ESPN',
        totalWeeks: 16,
        playoffWeeks: [14, 15, 16],
        availableLeagues: ['PREMIER', 'NATIONAL']
      };
    } else if (isHistoricalYear(year)) {
      return {
        era: 'Sleeper',
        totalWeeks: 17,
        playoffWeeks: [15, 16, 17],
        availableLeagues: ['PREMIER', 'MASTERS', 'NATIONAL']
      };
    } else {
      return {
        era: 'Current',
        totalWeeks: 17,
        playoffWeeks: [15, 16, 17],
        availableLeagues: ['PREMIER', 'MASTERS', 'NATIONAL']
      };
    }
  }

  /**
   * Validate historical data structure based on era
   */
  validateHistoricalData(data: HistoricalLeagueData): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic structure validation
    if (!data.league || !data.year || !data.leagueId) {
      errors.push('Missing required fields: league, year, or leagueId');
    }

    // Era-specific validation
    const eraInfo = this.getEraInfo(data.year);
    
    // Check if league should exist in this era
    if (!eraInfo.availableLeagues.includes(data.league)) {
      errors.push(`${data.league} league did not exist in ${data.year} (${eraInfo.era} era)`);
    }

    // Check playoff weeks
    const playoffWeeks = Object.keys(data.matchupsByWeek || {})
      .map(Number)
      .filter(week => eraInfo.playoffWeeks.includes(week));

    if (playoffWeeks.length === 0 && Object.keys(data.matchupsByWeek || {}).length > 0) {
      warnings.push(`No playoff weeks found for ${eraInfo.era} era`);
    }

    // Check week range
    const weeks = Object.keys(data.matchupsByWeek || {}).map(Number);
    const maxWeek = Math.max(...weeks);
    if (maxWeek > eraInfo.totalWeeks) {
      warnings.push(`Week ${maxWeek} exceeds expected ${eraInfo.totalWeeks} for ${eraInfo.era} era`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

export const dataService = new DataService();