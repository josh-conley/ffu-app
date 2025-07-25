import { SleeperService } from './sleeper.service';
import { getLeagueId, getAllLeagueConfigs, validateLeagueAndYear, getUserInfoBySleeperId } from '../config/constants';
import type { 
  LeagueSeasonData, 
  SeasonStandings, 
  PlayoffResult, 
  WeekMatchup,
  LeagueTier,
  UserInfo
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

  private parsePlayoffResults(winnersBracket: any[], losersBracket: any[], rosters: any[]): PlayoffResult[] {
    const results: PlayoffResult[] = [];
    
    // Create roster ID to owner ID mapping
    const rosterToOwner: Record<number, string> = {};
    rosters.forEach(roster => {
      rosterToOwner[roster.roster_id] = roster.owner_id;
    });

    // Debug logging
    if (import.meta.env.MODE === 'development') {
      console.log('Winners Bracket (Playoffs - places 1-6):', JSON.stringify(winnersBracket, null, 2));
      console.log('Losers Bracket (Consolation - places 7-12):', JSON.stringify(losersBracket, null, 2));
    }

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

    // STEP 2: Process Losers Bracket (Consolation - places 7-12)
    const consolationParticipants = new Set<string>();
    const consolationPlacements = new Map<string, number>();
    
    // Collect all consolation participants
    losersBracket.forEach(match => {
      if (match.w && rosterToOwner[match.w]) consolationParticipants.add(rosterToOwner[match.w]);
      if (match.l && rosterToOwner[match.l]) consolationParticipants.add(rosterToOwner[match.l]);
    });

    // Handle consolation championship (7th place)
    const consolationMaxRound = losersBracket.length > 0 ? Math.max(...losersBracket.map(match => match.r)) : 0;
    const consolationChampMatch = losersBracket.find(match => match.r === consolationMaxRound);
    
    if (consolationChampMatch && consolationChampMatch.w && consolationChampMatch.l) {
      consolationPlacements.set(rosterToOwner[consolationChampMatch.w], 7); // Consolation champion
      consolationPlacements.set(rosterToOwner[consolationChampMatch.l], 8); // Consolation runner-up
    }

    // Extract explicit placements from losers bracket (offset by 6 for consolation)
    losersBracket.forEach(match => {
      if (match.p && match.w && rosterToOwner[match.w]) {
        const consolationPlace = match.p + 6; // Convert to consolation placement
        if (consolationPlace >= 7 && consolationPlace <= 12) {
          consolationPlacements.set(rosterToOwner[match.w], consolationPlace);
        }
      }
      if (match.p && match.l && rosterToOwner[match.l]) {
        const consolationPlace = match.p + 7; // Loser gets next place
        if (consolationPlace >= 7 && consolationPlace <= 12) {
          consolationPlacements.set(rosterToOwner[match.l], consolationPlace);
        }
      }
    });

    // Assign remaining consolation participants to places 9-12
    const assignedConsolationUsers = new Set(consolationPlacements.keys());
    const unplacedConsolationUsers = Array.from(consolationParticipants).filter(userId => !assignedConsolationUsers.has(userId));
    
    let nextConsolationPlace = 9;
    while (Array.from(consolationPlacements.values()).includes(nextConsolationPlace) && nextConsolationPlace <= 12) {
      nextConsolationPlace++;
    }
    
    unplacedConsolationUsers.forEach(userId => {
      if (nextConsolationPlace <= 12) {
        consolationPlacements.set(userId, nextConsolationPlace);
        nextConsolationPlace++;
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

    consolationPlacements.forEach((placement, userId) => {
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
}