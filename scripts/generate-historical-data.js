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

// We'll load the league constants from the main config file
// For now, keep local constants but will filter by completion status
const LEAGUES = [
  // PREMIER LEAGUE
  { sleeperId: '1256010768692805632', year: '2025', tier: 'PREMIER', status: 'active', startYear: 2025 },
  { sleeperId: '1124841088360660992', year: '2024', tier: 'PREMIER', status: 'completed', startYear: 2024 },
  { sleeperId: '989237166217723904', year: '2023', tier: 'PREMIER', status: 'completed', startYear: 2023 },
  { sleeperId: '856271024054996992', year: '2022', tier: 'PREMIER', status: 'completed', startYear: 2022 },
  { sleeperId: '710961812656455680', year: '2021', tier: 'PREMIER', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-premier', year: '2020', tier: 'PREMIER', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-premier', year: '2019', tier: 'PREMIER', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-premier', year: '2018', tier: 'PREMIER', status: 'completed', startYear: 2018 },
  
  // MASTERS LEAGUE  
  { sleeperId: '1256011253583708161', year: '2025', tier: 'MASTERS', status: 'active', startYear: 2025 },
  { sleeperId: '1124833010697379840', year: '2024', tier: 'MASTERS', status: 'completed', startYear: 2024 },
  { sleeperId: '989238596353794048', year: '2023', tier: 'MASTERS', status: 'completed', startYear: 2023 },
  { sleeperId: '856271401471029248', year: '2022', tier: 'MASTERS', status: 'completed', startYear: 2022 },
  // Note: No Masters league in ESPN era (2018-2020)
  
  // NATIONAL LEAGUE
  { sleeperId: '1256012193275576320', year: '2025', tier: 'NATIONAL', status: 'active', startYear: 2025 },
  { sleeperId: '1124834889196134400', year: '2024', tier: 'NATIONAL', status: 'completed', startYear: 2024 },
  { sleeperId: '989240797381951488', year: '2023', tier: 'NATIONAL', status: 'completed', startYear: 2023 },
  { sleeperId: '856271753788403712', year: '2022', tier: 'NATIONAL', status: 'completed', startYear: 2022 },
  { sleeperId: '726573082608775168', year: '2021', tier: 'NATIONAL', status: 'completed', startYear: 2021 },
  { sleeperId: 'espn-2020-national', year: '2020', tier: 'NATIONAL', status: 'completed', startYear: 2020 },
  { sleeperId: 'espn-2019-national', year: '2019', tier: 'NATIONAL', status: 'completed', startYear: 2019 },
  { sleeperId: 'espn-2018-national', year: '2018', tier: 'NATIONAL', status: 'completed', startYear: 2018 },
];

// Process completed seasons for historical data and active seasons for current data
const SLEEPER_HISTORICAL_YEARS = ['2021', '2022', '2023', '2024'];
const SLEEPER_ACTIVE_YEARS = ['2025'];

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

  async getLeagueDrafts(leagueId) {
    const response = await fetch(`${this.baseUrl}/league/${leagueId}/drafts`);
    if (!response.ok) {
      throw new Error(`Failed to fetch drafts for league ${leagueId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getDraftPicks(draftId) {
    const response = await fetch(`${this.baseUrl}/draft/${draftId}/picks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft picks for draft ${draftId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getDraft(draftId) {
    const response = await fetch(`${this.baseUrl}/draft/${draftId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch draft ${draftId}: ${response.statusText}`);
    }
    return response.json();
  }

  async getNFLPlayers() {
    const response = await fetch(`${this.baseUrl}/players/nfl`);
    if (!response.ok) {
      throw new Error(`Failed to fetch NFL players: ${response.statusText}`);
    }
    return response.json();
  }
}

class HistoricalDataGenerator {
  constructor() {
    this.sleeperService = new SleeperAPIService();
    this.outputDir = path.join(__dirname, '../public/data');
    this.playerData = null;
  }

  async loadPlayerData() {
    if (this.playerData) return this.playerData;

    try {
      const playerFilePath = path.join(this.outputDir, 'players', 'nfl-players.json');
      if (fs.existsSync(playerFilePath)) {
        const data = JSON.parse(fs.readFileSync(playerFilePath, 'utf8'));
        this.playerData = data.players;
        console.log(`📋 Loaded ${Object.keys(this.playerData).length} cached players`);
        return this.playerData;
      }
    } catch (error) {
      console.warn('⚠️ Could not load cached player data:', error.message);
    }

    console.log('📥 No cached player data found, fetching from API...');
    console.log('💡 Consider running: node scripts/fetch-player-data.js first');
    
    try {
      this.playerData = await this.sleeperService.getNFLPlayers();
      console.log(`📋 Fetched ${Object.keys(this.playerData).length} players from API`);
      return this.playerData;
    } catch (error) {
      console.error('❌ Failed to fetch player data from API:', error);
      return {};
    }
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

      // Get all matchups
      const allWeekData = await this.sleeperService.getAllSeasonMatchups(league.sleeperId);
      const matchupsByWeek = {};
      const processedMatchups = [];

      allWeekData.forEach(({ week, matchups }) => {
        const weekMatchups = this.processRawMatchups(matchups, rosters);
        matchupsByWeek[week] = weekMatchups;
        processedMatchups.push(...weekMatchups.map(m => ({ ...m, week })));
      });

      // Add running records to each week's matchups
      this.addRunningRecordsToMatchups(matchupsByWeek);

      // Add placement indicators to playoff matchups
      this.addPlacementIndicators(matchupsByWeek, winnersBracket, losersBracket, rosters);

      // Calculate member game stats (high/low games)
      const memberGameStats = this.calculateMemberGameStats(matchupsByWeek);

      // Generate standings based on playoff results and include game stats
      const standings = this.generateStandings(rosters, playoffResults, memberGameStats);

      // Calculate promotions and relegations (simplified)
      const promotions = this.calculatePromotions(league.tier, standings);
      const relegations = this.calculateRelegations(league.tier, standings);

      // Get draft data
      let draftData = null;
      try {
        console.log(`Fetching draft data for ${league.tier} ${league.year}...`);
        draftData = await this.generateDraftData(league.sleeperId, league.tier, league.year, rosters);
        console.log(`✅ Draft data generated for ${league.tier} ${league.year}`);
      } catch (error) {
        console.warn(`⚠️ Could not fetch draft data for ${league.tier} ${league.year}:`, error.message);
      }

      const historicalData = {
        league: league.tier,
        year: league.year,
        leagueId: league.sleeperId,
        standings: standings,
        playoffResults: playoffResults,
        promotions: promotions,
        relegations: relegations,
        matchupsByWeek: matchupsByWeek,
        memberGameStats: memberGameStats,
        draftData: draftData
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

  generateStandings(rosters, playoffResults, memberGameStats = {}) {
    let standings = rosters
      .map(roster => ({
        userId: roster.owner_id,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        pointsFor: (roster.settings?.fpts || 0) + (roster.settings?.fpts_decimal || 0) / 100,
        pointsAgainst: (roster.settings?.fpts_against || 0) + (roster.settings?.fpts_against_decimal || 0) / 100,
        rank: 0, // Will be calculated after sorting
        highGame: memberGameStats[roster.owner_id]?.highGame || 0,
        lowGame: memberGameStats[roster.owner_id]?.lowGame || 0
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

  addRunningRecordsToMatchups(matchupsByWeek) {
    // Initialize record tracking for all users
    const userRecords = {};
    
    // Sort weeks to ensure proper order, only include regular season (weeks 1-14)
    const sortedWeeks = Object.keys(matchupsByWeek)
      .map(Number)
      .filter(week => week <= 14) // Only regular season
      .sort((a, b) => a - b);
    
    sortedWeeks.forEach(week => {
      const weekMatchups = matchupsByWeek[week];
      
      // Add records to each matchup for this week
      weekMatchups.forEach(matchup => {
        // Initialize records if first time seeing these users
        if (!userRecords[matchup.winner]) {
          userRecords[matchup.winner] = { wins: 0, losses: 0 };
        }
        if (!userRecords[matchup.loser]) {
          userRecords[matchup.loser] = { wins: 0, losses: 0 };
        }
        
        // Update records AFTER this game (inclusive)
        userRecords[matchup.winner].wins++;
        userRecords[matchup.loser].losses++;
        
        // Add updated records to the matchup (AFTER updating for this game)
        const winnerRecord = userRecords[matchup.winner];
        const loserRecord = userRecords[matchup.loser];
        
        matchup.winnerRecord = `${winnerRecord.wins}-${winnerRecord.losses}`;
        matchup.loserRecord = `${loserRecord.wins}-${loserRecord.losses}`;
      });
    });

    // Add final regular season records to playoff weeks (15-17)
    const playoffWeeks = Object.keys(matchupsByWeek)
      .map(Number)
      .filter(week => week >= 15)
      .sort((a, b) => a - b);
    
    playoffWeeks.forEach(week => {
      const weekMatchups = matchupsByWeek[week];
      
      weekMatchups.forEach(matchup => {
        // Add final regular season record to playoff matchups
        if (userRecords[matchup.winner]) {
          const winnerRecord = userRecords[matchup.winner];
          matchup.winnerRecord = `${winnerRecord.wins}-${winnerRecord.losses}`;
        }
        if (userRecords[matchup.loser]) {
          const loserRecord = userRecords[matchup.loser];
          matchup.loserRecord = `${loserRecord.wins}-${loserRecord.losses}`;
        }
      });
    });
  }

  addPlacementIndicators(matchupsByWeek, winnersBracket, losersBracket, rosters) {
    // Create roster ID to owner ID mapping
    const rosterToOwner = {};
    rosters.forEach(roster => {
      rosterToOwner[roster.roster_id] = roster.owner_id;
    });

    // Process winners bracket (playoffs) - weeks 15-17
    winnersBracket.forEach(match => {
      const winner = rosterToOwner[match.w];
      const loser = rosterToOwner[match.l];
      
      if (!winner || !loser) return;

      // Find the matchup in the appropriate week
      for (let week = 15; week <= 17; week++) {
        if (!matchupsByWeek[week]) continue;
        
        const matchup = matchupsByWeek[week].find(m => 
          (m.winner === winner && m.loser === loser) || 
          (m.winner === loser && m.loser === winner)
        );
        
        if (matchup) {
          // Determine placement based on match properties
          let placementType = '';
          
          // Championship game (round 3, final match)
          if (match.r === 3 && match.p === 1) {
            placementType = 'Championship';
          }
          // 3rd place game
          else if (match.r === 3 && match.p === 3) {
            placementType = '3rd Place';
          }
          // 5th place game  
          else if (match.r === 2 && match.p === 5) {
            placementType = '5th Place';
          }
          // Semi-finals
          else if (match.r === 2) {
            placementType = 'Semifinal';
          }
          // Quarter-finals
          else if (match.r === 1) {
            placementType = 'Quarterfinal';
          }
          
          if (placementType) {
            matchup.placementType = placementType;
          }
          break;
        }
      }
    });

    // Process losers bracket (toilet bowl) - weeks 15-17
    losersBracket.forEach(match => {
      const winner = rosterToOwner[match.w];
      const loser = rosterToOwner[match.l];
      
      if (!winner || !loser) return;

      // Find the matchup in the appropriate week
      for (let week = 15; week <= 17; week++) {
        if (!matchupsByWeek[week]) continue;
        
        const matchup = matchupsByWeek[week].find(m => 
          (m.winner === winner && m.loser === loser) || 
          (m.winner === loser && m.loser === winner)
        );
        
        if (matchup) {
          // Determine placement based on match properties
          let placementType = '';
          
          // Last place game (toilet bowl championship - round 3)
          if (match.r === 3 && match.p === 1) {
            placementType = 'Last Place';
          }
          // 9th place game
          else if (match.r === 3 && match.p === 3) {
            placementType = '9th Place';
          }
          // 7th place game
          else if (match.r === 2 && match.p === 5) {
            placementType = '7th Place';
          }
          // Toilet bowl semi-finals
          else if (match.r === 2) {
            placementType = 'Toilet Bowl Semifinal';
          }
          // Toilet bowl quarter-finals
          else if (match.r === 1) {
            placementType = 'Toilet Bowl Quarterfinal';
          }
          
          if (placementType) {
            matchup.placementType = placementType;
          }
          break;
        }
      }
    });
  }

  calculateMemberGameStats(matchupsByWeek) {
    const memberStats = {};

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

  async generateDraftData(leagueId, tier, year, rosters) {
    // Load player data first
    const playerMap = await this.loadPlayerData();
    
    // Get drafts for this league
    const drafts = await this.sleeperService.getLeagueDrafts(leagueId);
    
    if (!drafts || drafts.length === 0) {
      throw new Error('No drafts found for this league');
    }

    // Get the main draft (usually the first one)
    const mainDraft = drafts[0];
    
    // Get draft details and picks
    const [draftDetails, draftPicks] = await Promise.all([
      this.sleeperService.getDraft(mainDraft.draft_id),
      this.sleeperService.getDraftPicks(mainDraft.draft_id)
    ]);

    // Create roster to owner mapping
    const rosterOwnerMap = this.sleeperService.createRosterOwnerMap(rosters);

    // Process picks with player information
    const processedPicks = draftPicks.map(pick => {
      const player = playerMap[pick.player_id] || {};
      const ownerUserId = rosterOwnerMap[pick.roster_id];
      
      return {
        pickNumber: pick.pick_no,
        round: pick.round,
        draftSlot: pick.draft_slot,
        playerId: pick.player_id,
        playerInfo: {
          name: player.full_name || `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player',
          position: player.position || pick.metadata?.position || 'UNK',
          team: player.team || pick.metadata?.team || null,
          college: player.college || undefined,
          age: player.age || undefined
        },
        pickedBy: pick.picked_by,
        userInfo: {
          userId: ownerUserId || pick.picked_by,
          teamName: '', // Will be filled in when displaying
          abbreviation: ''
        },
        draftId: pick.draft_id
      };
    });

    // Sort picks by pick number
    processedPicks.sort((a, b) => a.pickNumber - b.pickNumber);

    return {
      draftId: draftDetails.draft_id,
      leagueId: leagueId,
      year: year,
      league: tier,
      draftOrder: draftDetails.draft_order || {},
      picks: processedPicks,
      settings: {
        teams: draftDetails.settings?.teams || 12,
        rounds: draftDetails.settings?.rounds || 16,
        draftType: this.getDraftTypeName(draftDetails.type)
      },
      metadata: {
        name: draftDetails.metadata?.name || 'Draft',
        description: draftDetails.metadata?.description || '',
        scoringType: draftDetails.metadata?.scoring_type || 'ppr'
      },
      startTime: draftDetails.start_time,
      status: draftDetails.status
    };
  }

  getDraftTypeName(draftType) {
    switch (draftType) {
      case 0: return 'Snake';
      case 1: return 'Linear';
      case 2: return 'Auction';
      default: return 'Unknown';
    }
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
    console.log('🚀 Starting data generation...');

    // Filter to include completed seasons and active seasons from Sleeper era
    const historicalLeagues = LEAGUES.filter(league => 
      SLEEPER_HISTORICAL_YEARS.includes(league.year) && 
      league.status === 'completed' &&
      !league.sleeperId.startsWith('espn-') // Only Sleeper leagues, not ESPN era
    );

    const activeLeagues = LEAGUES.filter(league => 
      SLEEPER_ACTIVE_YEARS.includes(league.year) && 
      league.status === 'active' &&
      !league.sleeperId.startsWith('espn-') // Only Sleeper leagues, not ESPN era
    );

    const allLeagues = [...historicalLeagues, ...activeLeagues];

    console.log(`📊 Processing ${historicalLeagues.length} completed Sleeper leagues and ${activeLeagues.length} active leagues...`);
    
    for (const league of allLeagues) {
      console.log(`📈 Processing ${league.tier} ${league.year} (Status: ${league.status})`);
      await this.generateLeagueData(league);
      // Add delay to be respectful to Sleeper API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Data generation complete!');
    console.log(`💡 Processed ${historicalLeagues.length} historical seasons and ${activeLeagues.length} active seasons`);
  }

  async generateCurrentSeasonData() {
    console.log('🚀 Starting current season data generation...');

    // Filter to only include active seasons from current year
    const activeLeagues = LEAGUES.filter(league => 
      SLEEPER_ACTIVE_YEARS.includes(league.year) && 
      league.status === 'active' &&
      !league.sleeperId.startsWith('espn-') // Only Sleeper leagues, not ESPN era
    );

    console.log(`📊 Processing ${activeLeagues.length} active leagues for current season...`);
    
    for (const league of activeLeagues) {
      console.log(`📈 Processing ${league.tier} ${league.year} (Status: ${league.status})`);
      await this.generateLeagueData(league);
      // Add delay to be respectful to Sleeper API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Current season data generation complete!');
    console.log(`💡 Processed ${activeLeagues.length} active leagues`);
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