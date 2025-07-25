import { SleeperService } from './sleeper.service';
import { dataService } from './data.service';
import { getLeagueId, getAllLeagueConfigs, validateLeagueAndYear, getUserInfoBySleeperId, isHistoricalYear } from '../config/constants';
import type { 
  LeagueSeasonData, 
  SeasonStandings, 
  PlayoffResult, 
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

    // Check if we should use historical data
    if (isHistoricalYear(year)) {
      const historicalData = await dataService.loadHistoricalLeagueData(league, year);
      if (historicalData) {
        return dataService.convertHistoricalToEnhanced(historicalData);
      }
      // Fall back to API if historical data not available
      console.warn(`Historical data not found for ${league} ${year}, falling back to API`);
    }

    // Use live API for current year or when historical data is not available
    const leagueId = getLeagueId(league, year);
    if (!leagueId) {
      throw new Error(`League ID not found for ${league} ${year}`);
    }

    const [rosters] = await Promise.all([
      this.sleeperService.getLeagueRosters(leagueId)
    ]);
    
    let standings: SeasonStandings[] = rosters
      .map(roster => ({
        userId: roster.owner_id,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
        pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
        rank: 0 // Will be calculated after sorting
      }));

    // Get playoff results if available
    let playoffResults: PlayoffResult[] = [];
    try {
      const [winnersBracket, losersBracket] = await Promise.all([
        this.sleeperService.getWinnersBracket(leagueId),
        this.sleeperService.getLosersBracket(leagueId)
      ]);
      playoffResults = this.parsePlayoffResults(winnersBracket, losersBracket, rosters);
    } catch (error) {
      console.warn(`Could not fetch playoff results for ${league} ${year}:`, error);
    }

    // Sort standings based on playoff results if available, otherwise by regular season
    if (playoffResults.length > 0) {
      // Create a map of playoff placements
      const playoffPlacementMap: Record<string, number> = {};
      playoffResults.forEach(result => {
        playoffPlacementMap[result.userId] = result.placement;
      });

      // Sort by playoff placement first, then regular season performance for non-playoff teams
      standings = standings.sort((a, b) => {
        const aPlayoffPlace = playoffPlacementMap[a.userId];
        const bPlayoffPlace = playoffPlacementMap[b.userId];

        // Both teams made playoffs - sort by playoff placement
        if (aPlayoffPlace && bPlayoffPlace) {
          return aPlayoffPlace - bPlayoffPlace;
        }

        // Only one team made playoffs - playoff team wins
        if (aPlayoffPlace && !bPlayoffPlace) return -1;
        if (!aPlayoffPlace && bPlayoffPlace) return 1;

        // Neither team made playoffs - sort by regular season record
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      });
    } else {
      // No playoff results - sort by regular season performance
      standings = standings.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        return b.pointsFor - a.pointsFor;
      });
    }

    // Assign final ranks
    standings = standings.map((standing, index) => ({
      ...standing,
      rank: index + 1
    }));

    return {
      league,
      year,
      leagueId,
      standings,
      playoffResults,
      promotions: this.calculatePromotions(league, standings),
      relegations: this.calculateRelegations(league, standings)
    };
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

    // Check if we should use historical data
    if (isHistoricalYear(year)) {
      const historicalData = await dataService.loadHistoricalLeagueData(league, year);
      if (historicalData) {
        const weekMatchups = historicalData.matchupsByWeek[week];
        return weekMatchups || [];
      }
      // Fall back to API if historical data not available
      console.warn(`Historical matchup data not found for ${league} ${year} week ${week}, falling back to API`);
    }

    // Use live API for current year or when historical data is not available
    const leagueId = getLeagueId(league, year);
    if (!leagueId) {
      throw new Error(`League ID not found for ${league} ${year}`);
    }

    const [matchups, rosters] = await Promise.all([
      this.sleeperService.getMatchupsForWeek(leagueId, week),
      this.sleeperService.getLeagueRosters(leagueId)
    ]);

    const rosterOwnerMap = this.sleeperService.createRosterOwnerMap(rosters);
    
    // Group matchups by matchup_id
    const groupedMatchups: Record<number, typeof matchups> = {};
    matchups.forEach(matchup => {
      if (!groupedMatchups[matchup.matchup_id]) {
        groupedMatchups[matchup.matchup_id] = [];
      }
      groupedMatchups[matchup.matchup_id].push(matchup);
    });

    // Create head-to-head matchups
    const weekMatchups: WeekMatchup[] = [];
    Object.values(groupedMatchups).forEach(matchupPair => {
      if (matchupPair.length === 2) {
        const [team1, team2] = matchupPair;
        const team1Owner = rosterOwnerMap[team1.roster_id];
        const team2Owner = rosterOwnerMap[team2.roster_id];
        
        if (team1.points > team2.points) {
          weekMatchups.push({
            winner: team1Owner,
            loser: team2Owner,
            winnerScore: team1.points,
            loserScore: team2.points
          });
        } else {
          weekMatchups.push({
            winner: team2Owner,
            loser: team1Owner,
            winnerScore: team2.points,
            loserScore: team1.points
          });
        }
      }
    });

    return weekMatchups;
  }

  // Enhanced method to get matchups with user info
  async getWeekMatchupsWithUserInfo(league: LeagueTier, year: string, week: number) {
    const matchups = await this.getWeekMatchups(league, year, week);
    
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
        userInfo: this.getUserInfo(standing.userId)
      })),
      playoffResults: leagueData.playoffResults.map(result => ({
        ...result,
        userInfo: this.getUserInfo(result.userId)
      }))
    }));
  }

  private getUserInfo(userId: string): UserInfo {
    const userInfo = getUserInfoBySleeperId(userId);
    return userInfo 
      ? { userId, teamName: userInfo.teamName, abbreviation: userInfo.abbreviation }
      : { userId, teamName: 'Unknown Team', abbreviation: 'UNK' };
  }

  private processRawMatchups(matchups: any[], rosters: any[]): WeekMatchup[] {
    const rosterOwnerMap = this.sleeperService.createRosterOwnerMap(rosters);
    
    // Group matchups by matchup_id
    const groupedMatchups: Record<number, typeof matchups> = {};
    matchups.forEach(matchup => {
      if (!groupedMatchups[matchup.matchup_id]) {
        groupedMatchups[matchup.matchup_id] = [];
      }
      groupedMatchups[matchup.matchup_id].push(matchup);
    });

    // Create head-to-head matchups
    const weekMatchups: WeekMatchup[] = [];
    Object.values(groupedMatchups).forEach(matchupPair => {
      if (matchupPair.length === 2) {
        const [team1, team2] = matchupPair;
        const team1Owner = rosterOwnerMap[team1.roster_id];
        const team2Owner = rosterOwnerMap[team2.roster_id];
        
        if (team1.points > team2.points) {
          weekMatchups.push({
            winner: team1Owner,
            loser: team2Owner,
            winnerScore: team1.points,
            loserScore: team2.points
          });
        } else {
          weekMatchups.push({
            winner: team2Owner,
            loser: team1Owner,
            winnerScore: team2.points,
            loserScore: team1.points
          });
        }
      }
    });

    return weekMatchups;
  }

  private parsePlayoffResults(winnersBracket: any[], losersBracket: any[], rosters: any[]): PlayoffResult[] {
    const results: PlayoffResult[] = [];
    
    // Create roster ID to owner ID mapping
    const rosterToOwner: Record<number, string> = {};
    rosters.forEach(roster => {
      rosterToOwner[roster.roster_id] = roster.owner_id;
    });

    // Debug logging
    // if (import.meta.env.MODE === 'development') {
    //   console.log('Winners Bracket (Playoffs - places 1-6):', JSON.stringify(winnersBracket, null, 2));
    //   console.log('Losers Bracket (Toilet Bowl - places 7-12, LOSERS ADVANCE):', JSON.stringify(losersBracket, null, 2));
    // }

    // STEP 1: Process Winners Bracket (Playoffs - places 1-6)
    const playoffParticipants = new Set<string>();
    const playoffPlacements = new Map<string, number>();
    
    // Collect all playoff participants
    winnersBracket.forEach(match => {
      if (match.w && rosterToOwner[match.w]) playoffParticipants.add(rosterToOwner[match.w]);
      if (match.l && rosterToOwner[match.l]) playoffParticipants.add(rosterToOwner[match.l]);
    });

    // Handle championship (places 1st and 2nd)
    const maxRound = winnersBracket.length > 0 ? Math.max(...winnersBracket.map(match => match.r)) : 0;
    const championshipMatch = winnersBracket.find(match => match.r === maxRound);
    
    if (championshipMatch && championshipMatch.w && championshipMatch.l) {
      playoffPlacements.set(rosterToOwner[championshipMatch.w], 1); // Champion
      playoffPlacements.set(rosterToOwner[championshipMatch.l], 2); // Runner-up
    }

    // Extract explicit placements from winners bracket
    winnersBracket.forEach(match => {
      if (match.p && match.w && rosterToOwner[match.w]) {
        playoffPlacements.set(rosterToOwner[match.w], match.p);
      }
      if (match.p && match.l && rosterToOwner[match.l] && match.p < 6) {
        playoffPlacements.set(rosterToOwner[match.l], match.p + 1);
      }
    });

    // Assign remaining playoff participants to places 3-6
    const assignedPlayoffUsers = new Set(playoffPlacements.keys());
    const unplacedPlayoffUsers = Array.from(playoffParticipants).filter(userId => !assignedPlayoffUsers.has(userId));
    
    let nextPlayoffPlace = 3;
    while (Array.from(playoffPlacements.values()).includes(nextPlayoffPlace) && nextPlayoffPlace <= 6) {
      nextPlayoffPlace++;
    }
    
    unplacedPlayoffUsers.forEach(userId => {
      if (nextPlayoffPlace <= 6) {
        playoffPlacements.set(userId, nextPlayoffPlace);
        nextPlayoffPlace++;
      }
    });

    // STEP 2: Process Losers Bracket (Toilet Bowl - places 7-12, LOSERS ADVANCE)
    const toiletBowlParticipants = new Set<string>();
    const toiletBowlPlacements = new Map<string, number>();
    
    // Collect all toilet bowl participants
    losersBracket.forEach(match => {
      if (match.w && rosterToOwner[match.w]) toiletBowlParticipants.add(rosterToOwner[match.w]);
      if (match.l && rosterToOwner[match.l]) toiletBowlParticipants.add(rosterToOwner[match.l]);
    });

    // Handle toilet bowl championship - WINNER gets 12th place (worst), LOSER gets 11th
    const toiletBowlMaxRound = losersBracket.length > 0 ? Math.max(...losersBracket.map(match => match.r)) : 0;
    const toiletBowlChampMatch = losersBracket.find(match => match.r === toiletBowlMaxRound);
    
    if (toiletBowlChampMatch && toiletBowlChampMatch.w && toiletBowlChampMatch.l) {
      toiletBowlPlacements.set(rosterToOwner[toiletBowlChampMatch.w], 12); // Toilet bowl "champion" = 12th place (worst)
      toiletBowlPlacements.set(rosterToOwner[toiletBowlChampMatch.l], 11); // Toilet bowl "runner-up" = 11th place
    }

    // Extract explicit placements from losers bracket - reverse the logic
    losersBracket.forEach(match => {
      if (match.p && match.w && rosterToOwner[match.w]) {
        // Winner in toilet bowl gets worse placement (higher number)
        const toiletBowlPlace = 13 - match.p; // Reverse: p=1 becomes 12th, p=2 becomes 11th, etc.
        if (toiletBowlPlace >= 7 && toiletBowlPlace <= 12) {
          toiletBowlPlacements.set(rosterToOwner[match.w], toiletBowlPlace);
        }
      }
      if (match.p && match.l && rosterToOwner[match.l]) {
        // Loser in toilet bowl gets better placement (lower number)
        const toiletBowlPlace = 12 - match.p; // Loser gets better place
        if (toiletBowlPlace >= 7 && toiletBowlPlace <= 12) {
          toiletBowlPlacements.set(rosterToOwner[match.l], toiletBowlPlace);
        }
      }
    });

    // Assign remaining toilet bowl participants to places 7-10
    const assignedToiletBowlUsers = new Set(toiletBowlPlacements.keys());
    const unplacedToiletBowlUsers = Array.from(toiletBowlParticipants).filter(userId => !assignedToiletBowlUsers.has(userId));
    
    let nextToiletBowlPlace = 7;
    while (Array.from(toiletBowlPlacements.values()).includes(nextToiletBowlPlace) && nextToiletBowlPlace <= 10) {
      nextToiletBowlPlace++;
    }
    
    unplacedToiletBowlUsers.forEach(userId => {
      if (nextToiletBowlPlace <= 10) {
        toiletBowlPlacements.set(userId, nextToiletBowlPlace);
        nextToiletBowlPlace++;
      }
    });

    // STEP 3: Combine results
    playoffPlacements.forEach((placement, userId) => {
      results.push({
        userId,
        placement,
        placementName: this.getPlacementName(placement)
      });
    });

    toiletBowlPlacements.forEach((placement, userId) => {
      results.push({
        userId,
        placement,
        placementName: this.getPlacementName(placement)
      });
    });

    // Sort by placement and return
    return results.sort((a, b) => a.placement - b.placement);
  }

  private getPlacementName(placement: number): string {
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
  }

  private calculatePromotions(league: LeagueTier, standings: SeasonStandings[]): string[] {
    if (league === 'PREMIER') return []; // No promotions from Premier
    
    // Typically top 2 get promoted (adjust as needed for your league rules)
    return standings.slice(0, 2).map(s => s.userId);
  }

  private calculateRelegations(league: LeagueTier, standings: SeasonStandings[]): string[] {
    if (league === 'NATIONAL') return []; // No relegations from National
    
    // Typically bottom 2 get relegated (adjust as needed for your league rules)
    return standings.slice(-2).map(s => s.userId);
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

        // Get all season matchup data - use historical data if available
        try {
          if (isHistoricalYear(leagueConfig.year)) {
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
              console.warn(`Historical data not found for ${leagueConfig.tier} ${leagueConfig.year}, skipping matchup data for records`);
            }
          } else {
            // Use live API for current year
            const leagueId = getLeagueId(leagueConfig.tier, leagueConfig.year);
            if (leagueId) {
              const [allWeekData, rosters] = await Promise.all([
                this.sleeperService.getAllSeasonMatchups(leagueId),
                this.sleeperService.getLeagueRosters(leagueId)
              ]);
              
              allWeekData.forEach(({ week, matchups }) => {
                const weekMatchups = this.processRawMatchups(matchups, rosters);
                
                weekMatchups.forEach(matchup => {
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
            }
          }
        } catch (error) {
          console.warn(`Could not fetch season matchups for ${leagueConfig.tier} ${leagueConfig.year}:`, error);
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
      closestGame: this.findClosestGame(allMatchups)
    };

    return records;
  }

  private findHighestScore(gameRecords: GameRecord[]): GameRecord {
    return gameRecords.reduce((highest, current) => 
      current.score > highest.score ? current : highest
    );
  }

  private findLowestScore(gameRecords: GameRecord[]): GameRecord {
    return gameRecords.reduce((lowest, current) => 
      current.score < lowest.score ? current : lowest
    );
  }

  private findMostPointsSeason(seasonRecords: SeasonRecord[]): SeasonRecord {
    return seasonRecords.reduce((highest, current) => 
      current.points > highest.points ? current : highest
    );
  }

  private findLeastPointsSeason(seasonRecords: SeasonRecord[]): SeasonRecord {
    return seasonRecords.reduce((lowest, current) => 
      current.points < lowest.points ? current : lowest
    );
  }

  private findMostPointsInLoss(gameRecords: (GameRecord & { isLoss: boolean })[]): GameRecord {
    const losses = gameRecords.filter(record => record.isLoss);
    return losses.reduce((highest, current) => 
      current.score > highest.score ? current : highest
    );
  }

  private findFewestPointsInWin(gameRecords: (GameRecord & { isWin: boolean })[]): GameRecord {
    const wins = gameRecords.filter(record => record.isWin);
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
}