/**
 * Script to generate historical data JSON files from Sleeper API
 * Run this script to populate the /public/data directory with historical league data
 * 
 * Usage: node scripts/generate-historical-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import constants (we'll need to adapt this for Node.js)
const LEAGUES = [
  // PREMIER LEAGUE
  { sleeperId: '1124841088360660992', year: '2024', tier: 'PREMIER', status: 'active', startYear: 2024 },
  { sleeperId: '989237166217723904', year: '2023', tier: 'PREMIER', status: 'completed', startYear: 2023 },
  { sleeperId: '856271024054996992', year: '2022', tier: 'PREMIER', status: 'completed', startYear: 2022 },
  { sleeperId: '710961812656455680', year: '2021', tier: 'PREMIER', status: 'completed', startYear: 2021 },
  
  // MASTERS LEAGUE  
  { sleeperId: '1124833010697379840', year: '2024', tier: 'MASTERS', status: 'active', startYear: 2024 },
  { sleeperId: '989238596353794048', year: '2023', tier: 'MASTERS', status: 'completed', startYear: 2023 },
  { sleeperId: '856271401471029248', year: '2022', tier: 'MASTERS', status: 'completed', startYear: 2022 },
  
  // NATIONAL LEAGUE
  { sleeperId: '1124834889196134400', year: '2024', tier: 'NATIONAL', status: 'active', startYear: 2024 },
  { sleeperId: '989240797381951488', year: '2023', tier: 'NATIONAL', status: 'completed', startYear: 2023 },
  { sleeperId: '856271753788403712', year: '2022', tier: 'NATIONAL', status: 'completed', startYear: 2022 },
  { sleeperId: '726573082608775168', year: '2021', tier: 'NATIONAL', status: 'completed', startYear: 2021 },
];

const HISTORICAL_YEARS = ['2021', '2022', '2023', '2024'];

class SleeperAPIService {
  constructor() {
    this.baseUrl = 'https://api.sleeper.app/v1';
  }

  async getLeagueRosters(leagueId) {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/rosters`);
    if (!response.ok) {
      throw new Error(`Failed to fetch rosters for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getWinnersBracket(leagueId) {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/winners_bracket`);
    if (!response.ok) {
      throw new Error(`Failed to fetch winners bracket for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getLosersBracket(leagueId) {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/losers_bracket`);
    if (!response.ok) {
      throw new Error(`Failed to fetch losers bracket for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getMatchupsForWeek(leagueId, week) {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/matchups/${week}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch matchups for league ${leagueId} week ${week}: ${response.statusText}`);
    }
    return response.json();
  }

  async getAllSeasonMatchups(leagueId, startWeek = 1, endWeek = 17) {
    const weekPromises = [];
    for (let week = startWeek; week <= endWeek; week++) {
      weekPromises.push(
        this.getMatchupsForWeek(leagueId, week)
          .then(matchups => ({ week, matchups }))
          .catch(error => {
            console.warn(`Failed to fetch week ${week} for league ${leagueId}:`, error);
            return { week, matchups: [] };
          })
      );
    }

    const results = await Promise.all(weekPromises);
    return results.filter(result => result.matchups.length > 0);
  }

  createRosterOwnerMap(rosters) {
    const map = {};
    rosters.forEach(roster => {
      map[roster.roster_id] = roster.owner_id;
    });
    return map;
  }
}

class HistoricalDataGenerator {
  constructor() {
    this.sleeperService = new SleeperAPIService();
    this.outputDir = path.join(__dirname, '../public/data');
  }

  async generateLeagueData(league) {
    console.log(`Generating data for ${league.tier} ${league.year}...`);

    try {
      // Get basic league data
      const [rosters, winnersBracket, losersBracket] = await Promise.all([
        this.sleeperService.getLeagueRosters(league.sleeperId),
        this.sleeperService.getWinnersBracket(league.sleeperId).catch(() => []),
        this.sleeperService.getLosersBracket(league.sleeperId).catch(() => [])
      ]);

      // Generate playoff results first
      const playoffResults = this.parsePlayoffResults(winnersBracket, losersBracket, rosters);

      // Generate standings based on playoff results
      const standings = this.generateStandings(rosters, playoffResults);

      // Get all matchups
      const allWeekData = await this.sleeperService.getAllSeasonMatchups(league.sleeperId);
      const matchupsByWeek = {};
      const processedMatchups = [];

      allWeekData.forEach(({ week, matchups }) => {
        const weekMatchups = this.processRawMatchups(matchups, rosters);
        matchupsByWeek[week] = weekMatchups;
        processedMatchups.push(...weekMatchups.map(m => ({ ...m, week })));
      });

      // Calculate promotions and relegations (simplified)
      const promotions = this.calculatePromotions(league.tier, standings);
      const relegations = this.calculateRelegations(league.tier, standings);

      const historicalData = {
        league: league.tier,
        year: league.year,
        leagueId: league.sleeperId,
        standings: standings,
        playoffResults: playoffResults,
        promotions: promotions,
        relegations: relegations,
        matchupsByWeek: matchupsByWeek
      };

      // Save to file
      await this.saveLeagueData(league.year, league.tier, historicalData);

      console.log(`✅ Generated data for ${league.tier} ${league.year}`);
      return historicalData;

    } catch (error) {
      console.error(`❌ Failed to generate data for ${league.tier} ${league.year}:`, error);
      return null;
    }
  }

  generateStandings(rosters, playoffResults) {
    let standings = rosters
      .map(roster => ({
        userId: roster.owner_id,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
        pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
        rank: 0 // Will be calculated after sorting
      }));

    // Sort standings based on playoff results if available, otherwise by regular season
    if (playoffResults.length > 0) {
      // Create a map of playoff placements
      const playoffPlacementMap = {};
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
    return standings.map((standing, index) => ({
      ...standing,
      rank: index + 1
    }));
  }

  parsePlayoffResults(winnersBracket, losersBracket, rosters) {
    const results = [];
    
    // Create roster ID to owner ID mapping
    const rosterToOwner = {};
    rosters.forEach(roster => {
      rosterToOwner[roster.roster_id] = roster.owner_id;
    });

    // Debug logging
    console.log('Winners Bracket (Playoffs - places 1-6):', JSON.stringify(winnersBracket, null, 2));
    console.log('Losers Bracket (Toilet Bowl - places 7-12, LOSERS ADVANCE):', JSON.stringify(losersBracket, null, 2));

    // STEP 1: Process Winners Bracket (Playoffs - places 1-6)
    const playoffParticipants = new Set();
    const playoffPlacements = new Map();
    
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
    const toiletBowlParticipants = new Set();
    const toiletBowlPlacements = new Map();
    
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

  getPlacementName(placement) {
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
  }

  processRawMatchups(matchups, rosters) {
    const rosterOwnerMap = this.sleeperService.createRosterOwnerMap(rosters);
    
    // Group matchups by matchup_id
    const groupedMatchups = {};
    matchups.forEach(matchup => {
      if (!groupedMatchups[matchup.matchup_id]) {
        groupedMatchups[matchup.matchup_id] = [];
      }
      groupedMatchups[matchup.matchup_id].push(matchup);
    });

    // Create head-to-head matchups
    const weekMatchups = [];
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

  calculatePromotions(tier, standings) {
    if (tier === 'PREMIER') return [];
    return standings.slice(0, 2).map(s => s.userId);
  }

  calculateRelegations(tier, standings) {
    if (tier === 'NATIONAL') return [];
    return standings.slice(-2).map(s => s.userId);
  }

  async saveLeagueData(year, tier, data) {
    const yearDir = path.join(this.outputDir, year);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }

    const filename = `${tier.toLowerCase()}.json`;
    const filepath = path.join(yearDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  async generateAllHistoricalData() {
    console.log('🚀 Starting historical data generation...');

    const historicalLeagues = LEAGUES.filter(league => 
      HISTORICAL_YEARS.includes(league.year)
    );

    for (const league of historicalLeagues) {
      await this.generateLeagueData(league);
      // Add delay to be respectful to Sleeper API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Historical data generation complete!');
  }
}

// Run the script
async function main() {
  const generator = new HistoricalDataGenerator();
  await generator.generateAllHistoricalData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { HistoricalDataGenerator };