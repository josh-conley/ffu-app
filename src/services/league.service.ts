import { SleeperService } from './sleeper.service';
import { dataService } from './data.service';
import { getAllLeagueConfigs, validateLeagueAndYear, getUserInfoBySleeperId, getUserInfoByFFUId, getFFUIdBySleeperId, getLeagueConfig } from '../config/constants';
import { getCurrentNFLWeek, getNFLScheduleDebugInfo, isNFLWeekComplete } from '../utils/nfl-schedule';
import type { 
  LeagueSeasonData, 
  WeekMatchup,
  LeagueTier,
  UserInfo,
  AllTimeRecords,
  GameRecord,
  SeasonRecord
} from '../types';

export class LeagueService {
  private sleeperService: SleeperService;

  constructor(sleeperService: SleeperService) {
    this.sleeperService = sleeperService;
  }

  async getLeagueStandings(league: LeagueTier, year: string): Promise<LeagueSeasonData> {
    if (!validateLeagueAndYear(league, year)) {
      throw new Error(`League ${league} for year ${year} not found`);
    }

    // Always try to use static data first (for both historical and current years)
    const historicalData = await dataService.loadHistoricalLeagueData(league, year);
    if (historicalData) {
      return dataService.convertHistoricalToEnhanced(historicalData);
    }

    // If no static data available, throw error instead of using live API
    throw new Error(`No static data found for ${league} ${year}. Please run the data generation script.`);
  }

  async getAllLeagueStandings(): Promise<LeagueSeasonData[]> {
    const allStandings: LeagueSeasonData[] = [];
    
    const allLeagues = getAllLeagueConfigs();
    
    for (const league of allLeagues) {
      try {
        const standings = await this.getLeagueStandings(league.tier, league.year);
        allStandings.push(standings);
      } catch (error) {
        console.error(`Error fetching standings for ${league.tier} ${league.year}:`, error);
      }
    }

    return allStandings; // Already sorted by getAllLeagueConfigs
  }

  async getWeekMatchups(league: LeagueTier, year: string, week: number): Promise<WeekMatchup[]> {
    if (!validateLeagueAndYear(league, year)) {
      throw new Error(`League ${league} for year ${year} not found`);
    }

    // Always try to use static data first (for both historical and current years)
    const historicalData = await dataService.loadHistoricalLeagueData(league, year);
    if (historicalData) {
      const weekMatchups = historicalData.matchupsByWeek[week];
      if (weekMatchups) {
        // Both ESPN era (2018-2020) and Sleeper era (2021+) data are already in WeekMatchup[] format
        return weekMatchups;
      }
    }

    // If no static data available, throw error instead of using live API
    throw new Error(`No static matchup data found for ${league} ${year} week ${week}. Please run the data generation script.`);
  }

  // Method to neutralize winner/loser roles for active weeks
  private neutralizeActiveWeekMatchups(matchups: WeekMatchup[], year: string, week: number): WeekMatchup[] {
    // Only neutralize for 2025 season during incomplete weeks
    if (year !== '2025' || isNFLWeekComplete(week)) {
      return matchups;
    }

    return matchups.map(matchup => {
      const neutralizedMatchup = { ...matchup };
      
      // Keep the records since they represent cumulative season record, not just current week
      // neutralizedMatchup.winnerRecord = undefined;
      // neutralizedMatchup.loserRecord = undefined;
      
      // Ensure teams are ordered by higher score first
      const shouldSwap = matchup.loserScore > matchup.winnerScore;
      
      if (shouldSwap) {
        // Swap the teams so higher scoring team is listed first
        neutralizedMatchup.winner = matchup.loser;
        neutralizedMatchup.loser = matchup.winner;
        neutralizedMatchup.winnerScore = matchup.loserScore;
        neutralizedMatchup.loserScore = matchup.winnerScore;
        // Records are already cleared above
      }
      
      return neutralizedMatchup;
    });
  }

  // Method to update static matchups with live Sleeper API data for active week
  private async updateWithLiveData(matchups: WeekMatchup[], league: LeagueTier, year: string, week: number): Promise<WeekMatchup[]> {
    // Only update live data for 2025 season and current active NFL week
    if (year !== '2025') {
      return matchups;
    }

    const currentNFLWeek = getCurrentNFLWeek();
    const debugInfo = getNFLScheduleDebugInfo();
    
    console.log(`Live data check for ${league} ${year} week ${week}:`, {
      requestedWeek: week,
      currentNFLWeek,
      debugInfo,
      shouldUpdate: currentNFLWeek === week
    });
    
    if (currentNFLWeek !== week) {
      return matchups;
    }

    try {
      // Get league config for Sleeper ID
      const leagueConfig = getLeagueConfig(league, year);
      if (!leagueConfig) {
        console.warn(`No league config found for ${league} ${year}`);
        return matchups;
      }

      // Fetch live data from Sleeper API
      const [liveMatchups, rosters] = await Promise.all([
        this.sleeperService.getMatchupsForWeek(leagueConfig.sleeperId, week),
        this.sleeperService.getLeagueRosters(leagueConfig.sleeperId)
      ]);
      
      // Create mapping from user_id to roster_id
      const userToRosterMap = new Map<string, number>();
      rosters.forEach(roster => {
        if (roster.owner_id && roster.roster_id) {
          userToRosterMap.set(roster.owner_id, roster.roster_id);
        }
      });

      // Create a map of roster_id to live points
      const rosterToPointsMap = new Map<number, number>();
      liveMatchups.forEach(matchup => {
        if (matchup.roster_id && typeof matchup.points === 'number') {
          rosterToPointsMap.set(matchup.roster_id, matchup.points);
        }
      });

      // Update static matchups with live scores
      const updatedMatchups = matchups.map(matchup => {
        const updatedMatchup = { ...matchup };
        
        // Map user IDs to roster IDs, then get live scores
        const winnerRosterId = userToRosterMap.get(matchup.winner);
        const loserRosterId = userToRosterMap.get(matchup.loser);
        
        if (winnerRosterId && rosterToPointsMap.has(winnerRosterId)) {
          updatedMatchup.winnerScore = rosterToPointsMap.get(winnerRosterId)!;
        }
        if (loserRosterId && rosterToPointsMap.has(loserRosterId)) {
          updatedMatchup.loserScore = rosterToPointsMap.get(loserRosterId)!;
        }

        return updatedMatchup;
      });

      console.log(`Updated ${league} week ${week} matchups with live Sleeper data for ${updatedMatchups.length} matchups`);
      return updatedMatchups;

    } catch (error) {
      console.warn(`Failed to update with live data for ${league} week ${week}:`, error);
      return matchups; // Fall back to static data
    }
  }

  // Enhanced method to get matchups with user info
  async getWeekMatchupsWithUserInfo(league: LeagueTier, year: string, week: number) {
    let matchups = await this.getWeekMatchups(league, year, week);
    
    // Update with live data if this is the active week of 2025 season
    matchups = await this.updateWithLiveData(matchups, league, year, week);
    
    // Neutralize winner/loser assignments for active weeks
    matchups = this.neutralizeActiveWeekMatchups(matchups, year, week);
    
    return {
      league,
      year,
      week,
      matchups: matchups.map(matchup => ({
        ...matchup,
        winnerInfo: this.getUserInfo(matchup.winner),
        loserInfo: this.getUserInfo(matchup.loser)
      }))
    };
  }

  // Enhanced method to get standings with user info
  async getLeagueStandingsWithUserInfo(league: LeagueTier, year: string) {
    const leagueData = await this.getLeagueStandings(league, year);
    
    return {
      ...leagueData,
      standings: leagueData.standings.map(standing => ({
        ...standing,
        userInfo: this.getUserInfo(standing.userId)
      })),
      playoffResults: leagueData.playoffResults.map(result => ({
        ...result,
        userInfo: this.getUserInfo(result.userId)
      }))
    };
  }

  async getAllLeagueStandingsWithUserInfo() {
    const allStandings = await this.getAllLeagueStandings();
    
    return allStandings.map(leagueData => ({
      ...leagueData,
      standings: leagueData.standings.map(standing => ({
        ...standing,
        userInfo: (standing as any).userInfo || this.getUserInfo(standing.userId)
      })),
      playoffResults: leagueData.playoffResults.map(result => ({
        ...result,
        userInfo: (result as any).userInfo || this.getUserInfo(result.userId)
      }))
    }));
  }

  private getUserInfo(userId: string): UserInfo {
    // Try to get user info by Sleeper ID first (backward compatibility)
    const userInfo = getUserInfoBySleeperId(userId);
    if (userInfo) {
      const ffuUserId = getFFUIdBySleeperId(userId) || 'unknown';
      return { 
        userId, // Legacy Sleeper ID
        ffuUserId, // New FFU ID
        teamName: userInfo.teamName, 
        abbreviation: userInfo.abbreviation 
      };
    }
    
    // Try to get user info by FFU ID (new system)
    const ffuUserInfo = getUserInfoByFFUId(userId);
    if (ffuUserInfo) {
      return { 
        userId: 'legacy-unknown', // No legacy ID available
        ffuUserId: userId, // This IS the FFU ID
        teamName: ffuUserInfo.teamName, 
        abbreviation: ffuUserInfo.abbreviation 
      };
    }
    
    // Fallback for unknown users
    return { 
      userId, 
      ffuUserId: 'unknown', 
      teamName: 'Unknown Team', 
      abbreviation: 'UNK' 
    };
  }







  async getAllTimeRecords(league?: LeagueTier, year?: string): Promise<AllTimeRecords> {
    const allLeagues = getAllLeagueConfigs();
    
    // Filter leagues based on parameters, excluding active seasons for meaningful records
    const filteredLeagues = allLeagues.filter(config => {
      if (league && league !== config.tier) return false;
      if (year && year !== config.year) return false;
      // Exclude active seasons (status: 'active') for records calculation
      // as they have no meaningful scores yet
      if (config.status === 'active') return false;
      return true;
    });

    let allGameRecords: (GameRecord & { isWin: boolean, isLoss: boolean })[] = [];
    let allSeasonRecords: SeasonRecord[] = [];
    let allMatchups: (WeekMatchup & { 
      week: number, 
      year: string, 
      league: LeagueTier,
      margin: number,
      winnerInfo: UserInfo,
      loserInfo: UserInfo 
    })[] = [];

    // Collect all data
    for (const leagueConfig of filteredLeagues) {
      try {
        // Get season standings for season records
        const leagueData = await this.getLeagueStandings(leagueConfig.tier, leagueConfig.year);
        
        // Add season records
        leagueData.standings.forEach(standing => {
          allSeasonRecords.push({
            userInfo: this.getUserInfo(standing.userId),
            points: standing.pointsFor,
            year: leagueConfig.year,
            league: leagueConfig.tier,
            wins: standing.wins,
            losses: standing.losses
          });
        });

        // Get all season matchup data - always use static data
        try {
          const historicalData = await dataService.loadHistoricalLeagueData(leagueConfig.tier, leagueConfig.year);
          if (historicalData) {
            const allWeekData = dataService.getAllHistoricalMatchups(historicalData);
            
            allWeekData.forEach(({ week, matchups }) => {
              matchups.forEach(matchup => {
                const winnerInfo = this.getUserInfo(matchup.winner);
                const loserInfo = this.getUserInfo(matchup.loser);
                const margin = matchup.winnerScore - matchup.loserScore;

                // Add to matchups for closest game calculation
                allMatchups.push({
                  ...matchup,
                  week,
                  year: leagueConfig.year,
                  league: leagueConfig.tier,
                  margin,
                  winnerInfo,
                  loserInfo
                });

                // Add winner game record
                allGameRecords.push({
                  userInfo: winnerInfo,
                  score: matchup.winnerScore,
                  opponent: loserInfo,
                  opponentScore: matchup.loserScore,
                  week,
                  year: leagueConfig.year,
                  league: leagueConfig.tier,
                  isWin: true,
                  isLoss: false
                });

                // Add loser game record
                allGameRecords.push({
                  userInfo: loserInfo,
                  score: matchup.loserScore,
                  opponent: winnerInfo,
                  opponentScore: matchup.winnerScore,
                  week,
                  year: leagueConfig.year,
                  league: leagueConfig.tier,
                  isWin: false,
                  isLoss: true
                });
              });
            });
          } else {
            console.warn(`Static data not found for ${leagueConfig.tier} ${leagueConfig.year}, skipping matchup data for records`);
          }
        } catch (error) {
          console.warn(`Could not load static matchup data for ${leagueConfig.tier} ${leagueConfig.year}:`, error);
        }
      } catch (error) {
        console.error(`Error processing ${leagueConfig.tier} ${leagueConfig.year}:`, error);
      }
    }

    // Calculate records
    const records: AllTimeRecords = {
      highestSingleGame: this.findHighestScore(allGameRecords),
      lowestSingleGame: this.findLowestScore(allGameRecords),
      mostPointsSeason: this.findMostPointsSeason(allSeasonRecords),
      leastPointsSeason: this.findLeastPointsSeason(allSeasonRecords),
      mostPointsInLoss: this.findMostPointsInLoss(allGameRecords),
      fewestPointsInWin: this.findFewestPointsInWin(allGameRecords),
      closestGame: this.findClosestGame(allMatchups),
      biggestBlowout: this.findBiggestBlowout(allMatchups)
    };

    return records;
  }

  private findHighestScore(gameRecords: GameRecord[]): GameRecord {
    if (gameRecords.length === 0) {
      throw new Error('No game records available for highest score calculation');
    }
    return gameRecords.reduce((highest, current) => 
      current.score > highest.score ? current : highest
    );
  }

  private findLowestScore(gameRecords: GameRecord[]): GameRecord {
    if (gameRecords.length === 0) {
      throw new Error('No game records available for lowest score calculation');
    }
    return gameRecords.reduce((lowest, current) => 
      current.score < lowest.score ? current : lowest
    );
  }

  private findMostPointsSeason(seasonRecords: SeasonRecord[]): SeasonRecord {
    if (seasonRecords.length === 0) {
      throw new Error('No season records available for most points calculation');
    }
    return seasonRecords.reduce((highest, current) => 
      current.points > highest.points ? current : highest
    );
  }

  private findLeastPointsSeason(seasonRecords: SeasonRecord[]): SeasonRecord {
    if (seasonRecords.length === 0) {
      throw new Error('No season records available for least points calculation');
    }
    return seasonRecords.reduce((lowest, current) => 
      current.points < lowest.points ? current : lowest
    );
  }

  private findMostPointsInLoss(gameRecords: (GameRecord & { isLoss: boolean })[]): GameRecord {
    const losses = gameRecords.filter(record => record.isLoss);
    if (losses.length === 0) {
      throw new Error('No loss records available for most points in loss calculation');
    }
    return losses.reduce((highest, current) => 
      current.score > highest.score ? current : highest
    );
  }

  private findFewestPointsInWin(gameRecords: (GameRecord & { isWin: boolean })[]): GameRecord {
    const wins = gameRecords.filter(record => record.isWin);
    if (wins.length === 0) {
      throw new Error('No win records available for fewest points in win calculation');
    }
    return wins.reduce((lowest, current) => 
      current.score < lowest.score ? current : lowest
    );
  }

  private findClosestGame(matchups: (WeekMatchup & { 
    week: number, 
    year: string, 
    league: LeagueTier,
    margin: number,
    winnerInfo: UserInfo,
    loserInfo: UserInfo 
  })[]): AllTimeRecords['closestGame'] {
    if (matchups.length === 0) {
      throw new Error('No matchup records available for closest game calculation');
    }
    const closest = matchups.reduce((closest, current) => 
      current.margin < closest.margin ? current : closest
    );

    return {
      winner: closest.winnerInfo,
      loser: closest.loserInfo,
      winnerScore: closest.winnerScore,
      loserScore: closest.loserScore,
      margin: closest.margin,
      week: closest.week,
      year: closest.year,
      league: closest.league
    };
  }

  private findBiggestBlowout(matchups: (WeekMatchup & { 
    week: number, 
    year: string, 
    league: LeagueTier,
    margin: number,
    winnerInfo: UserInfo,
    loserInfo: UserInfo 
  })[]): AllTimeRecords['biggestBlowout'] {
    if (matchups.length === 0) {
      throw new Error('No matchup records available for biggest blowout calculation');
    }
    const biggest = matchups.reduce((biggest, current) => 
      current.margin > biggest.margin ? current : biggest
    );

    return {
      winner: biggest.winnerInfo,
      loser: biggest.loserInfo,
      winnerScore: biggest.winnerScore,
      loserScore: biggest.loserScore,
      margin: biggest.margin,
      week: biggest.week,
      year: biggest.year,
      league: biggest.league
    };
  }



  /**
   * Bulk load all matchup data for head-to-head comparisons
   * This is much more efficient than loading week-by-week
   */
  async getAllMatchupsForComparison(): Promise<{
    year: string;
    league: LeagueTier;
    week: number;
    matchups: any[];
  }[]> {
    const allLeagues = getAllLeagueConfigs();
    const allMatchupData: {
      year: string;
      league: LeagueTier;
      week: number;
      matchups: any[];
    }[] = [];

    // Load all historical data in parallel for better performance
    const dataLoadPromises = allLeagues.map(async (leagueConfig) => {
      try {
        // Always try to load static data (for both historical and current years)
        const historicalData = await dataService.loadHistoricalLeagueData(leagueConfig.tier, leagueConfig.year);
        if (historicalData) {
          const allWeekData = dataService.getAllHistoricalMatchups(historicalData);
          
          return allWeekData.map(({ week, matchups }) => ({
            year: leagueConfig.year,
            league: leagueConfig.tier,
            week,
            matchups: matchups.map(matchup => ({
              ...matchup,
              winnerInfo: this.getUserInfo(matchup.winner),
              loserInfo: this.getUserInfo(matchup.loser)
            }))
          }));
        } else {
          // No static data available - skip this league
          console.log(`No static data available for ${leagueConfig.tier} ${leagueConfig.year} - skipping`);
        }
        return [];
      } catch (error) {
        console.warn(`Failed to load matchups for ${leagueConfig.tier} ${leagueConfig.year}:`, error);
        return [];
      }
    });

    // Wait for all data to load and flatten results
    const results = await Promise.all(dataLoadPromises);
    results.forEach(leagueMatchups => {
      if (leagueMatchups) {
        allMatchupData.push(...leagueMatchups);
      }
    });

    return allMatchupData;
  }
}