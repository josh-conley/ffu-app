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
  SeasonRecord,
  SleeperRoster
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
        // Also swap the records so they stay with the correct teams
        neutralizedMatchup.winnerRecord = matchup.loserRecord;
        neutralizedMatchup.loserRecord = matchup.winnerRecord;
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

  // Method to get live matchups directly from Sleeper API without static data
  private async getLiveWeekMatchups(league: LeagueTier, year: string, week: number): Promise<WeekMatchup[]> {
    const leagueConfig = getLeagueConfig(league, year);
    if (!leagueConfig) {
      throw new Error(`No league config found for ${league} ${year}`);
    }

    // Fetch live data from Sleeper API
    const [liveMatchups, rosters] = await Promise.all([
      this.sleeperService.getMatchupsForWeek(leagueConfig.sleeperId, week),
      this.sleeperService.getLeagueRosters(leagueConfig.sleeperId)
    ]);

    // Create mapping from user_id to roster_id and roster data
    const userToRosterMap = new Map<string, number>();
    const rosterIdToRosterMap = new Map<number, SleeperRoster>();
    rosters.forEach(roster => {
      if (roster.owner_id && roster.roster_id) {
        userToRosterMap.set(roster.owner_id, roster.roster_id);
        rosterIdToRosterMap.set(roster.roster_id, roster);
      }
    });

    // Group live matchups by matchup_id to pair opponents
    const matchupGroups = new Map<number, any[]>();
    liveMatchups.forEach(matchup => {
      if (!matchupGroups.has(matchup.matchup_id)) {
        matchupGroups.set(matchup.matchup_id, []);
      }
      matchupGroups.get(matchup.matchup_id)!.push(matchup);
    });

    // Convert to WeekMatchup format
    const weekMatchups: WeekMatchup[] = [];

    for (const [_matchupId, matchupPair] of matchupGroups) {
      if (matchupPair.length === 2) {
        const [team1, team2] = matchupPair;

        // Find user IDs for each roster
        const user1 = [...userToRosterMap.entries()].find(([, rosterId]) => rosterId === team1.roster_id)?.[0];
        const user2 = [...userToRosterMap.entries()].find(([, rosterId]) => rosterId === team2.roster_id)?.[0];

        if (user1 && user2) {
          // Get roster data for both teams to extract records
          const roster1 = rosterIdToRosterMap.get(team1.roster_id);
          const roster2 = rosterIdToRosterMap.get(team2.roster_id);

          // Determine winner/loser based on points (for completed weeks) or use neutral for active weeks
          const isComplete = team1.points !== null && team2.points !== null;
          let winner, loser, winnerPoints, loserPoints, winnerRoster, loserRoster;

          if (isComplete) {
            if (team1.points > team2.points) {
              winner = user1;
              loser = user2;
              winnerPoints = team1.points;
              loserPoints = team2.points;
              winnerRoster = roster1;
              loserRoster = roster2;
            } else if (team2.points > team1.points) {
              winner = user2;
              loser = user1;
              winnerPoints = team2.points;
              loserPoints = team1.points;
              winnerRoster = roster2;
              loserRoster = roster1;
            } else {
              // Tie game
              winner = user1;
              loser = user2;
              winnerPoints = team1.points;
              loserPoints = team2.points;
              winnerRoster = roster1;
              loserRoster = roster2;
            }
          } else {
            // For active/incomplete weeks, assign arbitrarily
            winner = user1;
            loser = user2;
            winnerPoints = team1.points || 0;
            loserPoints = team2.points || 0;
            winnerRoster = roster1;
            loserRoster = roster2;
          }

          // Format records from roster settings
          const formatRecord = (roster: SleeperRoster | undefined): string => {
            if (!roster?.settings) return '';
            const wins = roster.settings.wins ?? 0;
            const losses = roster.settings.losses ?? 0;
            const ties = roster.settings.ties ?? 0;
            return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
          };

          weekMatchups.push({
            winner,
            loser,
            winnerScore: winnerPoints,
            loserScore: loserPoints,
            winnerRecord: formatRecord(winnerRoster),
            loserRecord: formatRecord(loserRoster)
          });
        }
      }
    }

    return weekMatchups;
  }

  // Enhanced method to get matchups with user info
  async getWeekMatchupsWithUserInfo(league: LeagueTier, year: string, week: number) {
    let matchups: WeekMatchup[];

    // For the current active week in 2025, prioritize live Sleeper API data
    if (year === '2025' && getCurrentNFLWeek() === week) {
      console.log(`Active week detected for ${league} ${year} week ${week}, using live Sleeper API data`);
      try {
        matchups = await this.getLiveWeekMatchups(league, year, week);
        console.log(`Successfully fetched live data for ${league} week ${week}`);
      } catch (liveError) {
        console.warn(`Live data failed for ${league} week ${week}, falling back to static data:`, liveError);
        try {
          matchups = await this.getWeekMatchups(league, year, week);
        } catch (staticError) {
          console.error(`Both live and static data failed for ${league} week ${week}`);
          throw staticError;
        }
      }
    } else {
      // For completed weeks or non-2025 seasons, use static data first
      try {
        matchups = await this.getWeekMatchups(league, year, week);
      } catch (error) {
        // If static data doesn't exist but this is a 2025 week, try live data as fallback
        if (year === '2025') {
          console.log(`No static data for ${league} ${year} week ${week}, trying live data as fallback`);
          matchups = await this.getLiveWeekMatchups(league, year, week);
        } else {
          throw error;
        }
      }
      // Update with live data if this is any 2025 week (to get most current scores)
      if (year === '2025') {
        matchups = await this.updateWithLiveData(matchups, league, year, week);
      }
    }

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

    // Filter leagues based on parameters
    const filteredLeagues = allLeagues.filter(config => {
      if (league && league !== config.tier) return false;
      if (year && year !== config.year) return false;
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

    // Filter out 2025 data for single game, season, and special game records
    const gameRecordsExcluding2025 = allGameRecords.filter(record => record.year !== '2025');
    const seasonRecordsExcluding2025 = allSeasonRecords.filter(record => record.year !== '2025');
    const matchupsExcluding2025 = allMatchups.filter(matchup => matchup.year !== '2025');

    // Calculate records
    const records: AllTimeRecords = {
      highestSingleGame: this.findHighestScore(gameRecordsExcluding2025),
      lowestSingleGame: this.findLowestScore(gameRecordsExcluding2025),
      mostPointsSeason: this.findMostPointsSeason(seasonRecordsExcluding2025),
      leastPointsSeason: this.findLeastPointsSeason(seasonRecordsExcluding2025),
      mostPointsInLoss: this.findMostPointsInLoss(gameRecordsExcluding2025),
      fewestPointsInWin: this.findFewestPointsInWin(gameRecordsExcluding2025),
      closestGame: this.findClosestGame(matchupsExcluding2025),
      biggestBlowout: this.findBiggestBlowout(matchupsExcluding2025),
      topScores: this.findTopScores(allGameRecords, allGameRecords.length), // Return all scores
      topClosestMatchups: this.findTopClosestMatchups(allMatchups, 25)
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

  private findTopScores(gameRecords: GameRecord[], limit: number): GameRecord[] {
    if (gameRecords.length === 0) {
      return [];
    }

    // Filter out incomplete games (where both scores are 0 or total score is unrealistically low)
    const completedGames = gameRecords.filter(record => {
      const totalScore = record.score + (record.opponentScore || 0);
      // Exclude games where both teams scored 0 or total is less than 20 (likely incomplete)
      return totalScore >= 20;
    });

    // Sort by score in descending order and take top N
    return [...completedGames]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private findTopClosestMatchups(matchups: (WeekMatchup & {
    week: number,
    year: string,
    league: LeagueTier,
    margin: number,
    winnerInfo: UserInfo,
    loserInfo: UserInfo
  })[], limit: number): AllTimeRecords['topClosestMatchups'] {
    if (matchups.length === 0) {
      return [];
    }

    // Filter out incomplete games (where both scores are 0 or total score is unrealistically low)
    const completedMatchups = matchups.filter(matchup => {
      const totalScore = matchup.winnerScore + matchup.loserScore;
      // Exclude games where both teams scored 0 or total is less than 20 (likely incomplete)
      return totalScore >= 20;
    });

    // Sort by margin in ascending order (smallest margin first) and take top N
    return [...completedMatchups]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, limit)
      .map(matchup => ({
        winner: matchup.winnerInfo,
        loser: matchup.loserInfo,
        winnerScore: matchup.winnerScore,
        loserScore: matchup.loserScore,
        margin: matchup.margin,
        week: matchup.week,
        year: matchup.year,
        league: matchup.league
      }));
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