/**
 * ESPN Historical Data Generator V2 - Simplified approach
 * Focuses on accurate team name mapping and proper data structure generation
 * 
 * Usage: node scripts/generate-espn-data-v2.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const ESPN_YEARS = ['2018', '2019', '2020'];
const ESPN_LEAGUES = ['PREMIER', 'NATIONAL'];
const ESPN_PLAYOFF_WEEKS = [14, 15, 16];

// Current Sleeper users (from constants.ts)
const SLEEPER_USERS = [
  { sleeperId: '331590801261883392', teamName: 'The Stallions', abbreviation: 'STA' },
  { sleeperId: '396808818157182976', teamName: 'FFUcked Up', abbreviation: 'FU' },
  { sleeperId: '398574272387297280', teamName: 'Dmandre161', abbreviation: 'DMAN' },
  { sleeperId: '398576262546735104', teamName: 'Blood, Sweat, and Beers', abbreviation: 'BEER' },
  { sleeperId: '467404039059927040', teamName: 'Malibu Leopards', abbreviation: 'MLBU' },
  { sleeperId: '470715135581745152', teamName: 'Pottsville Maroons', abbreviation: 'POTT' },
  { sleeperId: '705642514408886272', teamName: 'The Dark Knights', abbreviation: 'BATS' },
  { sleeperId: '710981985102802944', teamName: 'Frank\'s Little Beauties', abbreviation: 'FLB' },
  { sleeperId: '727368657923063808', teamName: 'Fort Wayne Banana Bread', abbreviation: 'FWBB' },
  { sleeperId: '729741648338210816', teamName: 'ChicagoPick6', abbreviation: 'CP6' },
  { sleeperId: '798327505219096576', teamName: 'TKO Blow', abbreviation: 'TKO' },
  { sleeperId: '860973514839199744', teamName: 'Show Biz Kitten', abbreviation: 'SBK' },
  { sleeperId: '862142522036703232', teamName: 'Boca Ciega Banditos', abbreviation: 'BOCA' },
  { sleeperId: '84604928349585408', teamName: 'The (Teddy) Bears', abbreviation: 'TTB' },
  { sleeperId: '398552306884345856', teamName: 'arcorey15', abbreviation: 'ARCO' },
  { sleeperId: '578691097983754240', teamName: 'MustachePapi', abbreviation: 'MUST' },
  { sleeperId: '602712418325442560', teamName: 'The Riveters', abbreviation: 'RVTR' },
  { sleeperId: '804551335088361472', teamName: 'Crawfordsville\'s Finest', abbreviation: 'CRAW' },
  { sleeperId: '821067488811909120', teamName: 'LegendsRise', abbreviation: 'RISE' },
  { sleeperId: '856248808915480576', teamName: 'The Tooth Tuggers', abbreviation: 'TT' },
  { sleeperId: '864966364937461760', teamName: 'Nighthawks', abbreviation: 'HAWK' },
  { sleeperId: '865078270985629696', teamName: 'The Gaston Ramblers', abbreviation: 'TGR' },
  { sleeperId: '84006772809285632', teamName: 'The Minutemen', abbreviation: 'MMEN' },
  { sleeperId: '325766631336714240', teamName: 'Act More Stupidly', abbreviation: 'AMS' },
  { sleeperId: '386791325690994688', teamName: 'Indianapolis Aztecs', abbreviation: 'AZTC' },
  { sleeperId: '462383465753473024', teamName: 'Raging Rhinos', abbreviation: 'RAGE' },
  { sleeperId: '465884883869233152', teamName: 'CamDelphia', abbreviation: 'CAM' },
  { sleeperId: '507633950666584064', teamName: 'El Guapo Puto', abbreviation: 'EGP' },
  { sleeperId: '508719015656099840', teamName: 'Team Pancake', abbreviation: 'TP' },
  { sleeperId: '527884868880531456', teamName: 'Johnkshire Cats', abbreviation: 'CATS' },
  { sleeperId: '726572095210930176', teamName: 'Team Dogecoin', abbreviation: 'DOGE' },
  { sleeperId: '639877229681147904', teamName: 'He Hate Me', abbreviation: 'HATE' },
  { sleeperId: '664739261735591936', teamName: 'CENATION', abbreviation: 'CENA' },
  { sleeperId: '715362669380591616', teamName: 'ZBoser', abbreviation: 'ZBOS' },
  { sleeperId: '727366898383122432', teamName: 'Big Ten Bandits', abbreviation: 'B1G' },
  { sleeperId: '865323291064291328', teamName: 'Head Cow Always Grazing', abbreviation: 'HCAG' },
  { sleeperId: '399322397750124544', teamName: 'Team Jacamart', abbreviation: 'JACA' },
  { sleeperId: '472876832719368192', teamName: 'Stark Direwolves', abbreviation: 'STRK' },
  { sleeperId: '399297882890440704', teamName: 'Circle City Phantoms', abbreviation: 'CCP' },
  { sleeperId: '467553389673181184', teamName: 'Shton\'s Strikers', abbreviation: 'SHTN' },
  { sleeperId: '399379352174768128', teamName: 'Stone Cold Steve Irwins', abbreviation: 'SCSI' }
];

class EspnDataGeneratorV2 {
  constructor() {
    this.inputDir = path.join(__dirname, '../public/old-league-data');
    this.outputDir = path.join(__dirname, '../public/data');
    
    // Build team name mapping from CSV
    this.teamNameMappings = new Map();
    this.loadTeamNameMappings();
    
    // Historical user counter for teams without current Sleeper mapping
    this.historicalUserCounter = 1;
    this.historicalUsers = new Map(); // Maps ESPN team name to generated historical user info
  }

  // Load team name mappings from CSV
  loadTeamNameMappings() {
    const mappingFile = path.join(this.inputDir, 'ESPN Fantasy Scrapes - Team Name Mapping.csv');
    if (!fs.existsSync(mappingFile)) {
      console.warn('⚠️  Team name mapping file not found, using direct name matching only');
      return;
    }

    const csvContent = fs.readFileSync(mappingFile, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVRow(lines[i]);
      const currentName = row[0]?.trim();
      
      if (currentName) {
        // Map all past names to current name
        for (let j = 1; j < row.length; j++) {
          const pastName = row[j]?.trim();
          if (pastName) {
            this.teamNameMappings.set(pastName, currentName);
          }
        }
        
        // Also map current name to itself
        this.teamNameMappings.set(currentName, currentName);
      }
    }
    
    console.log(`📋 Loaded ${this.teamNameMappings.size} team name mappings`);
  }

  // Parse CSV row with proper quote handling
  parseCSVRow(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Map ESPN team name to Sleeper user or create historical user
  mapTeamToUser(espnTeamName) {
    // First, normalize the team name using mappings
    const normalizedName = this.teamNameMappings.get(espnTeamName) || espnTeamName;
    
    // Try to find matching Sleeper user
    const sleeperUser = SLEEPER_USERS.find(user => 
      user.teamName.toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (sleeperUser) {
      return {
        userId: sleeperUser.sleeperId,
        teamName: sleeperUser.teamName,
        abbreviation: sleeperUser.abbreviation,
        isHistorical: false
      };
    }
    
    // Create or retrieve historical user
    if (!this.historicalUsers.has(espnTeamName)) {
      const historicalId = `espn-historical-${this.historicalUserCounter.toString().padStart(3, '0')}`;
      this.historicalUserCounter++;
      
      this.historicalUsers.set(espnTeamName, {
        userId: historicalId,
        teamName: espnTeamName,
        abbreviation: espnTeamName.length >= 3 ? espnTeamName.substring(0, 3).toUpperCase() : 'UNK',
        isHistorical: true
      });
    }
    
    return this.historicalUsers.get(espnTeamName);
  }

  // Parse CSV file
  parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = this.parseCSVRow(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVRow(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  }

  // Process teams CSV
  processTeamsData(year, league) {
    const leaguePrefix = league === 'PREMIER' ? 'P' : 'N';
    const filename = `ESPN Fantasy Scrapes - Teams ${leaguePrefix}${year.slice(-2)}.csv`;
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Teams file not found: ${filename}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const teams = this.parseCSV(csvContent);
    
    return teams.map(team => {
      const teamName = team['Team/Member']?.trim() || '';
      const record = team.Record?.split('-') || [];
      const wins = parseInt(record[0]) || 0;
      const losses = parseInt(record[1]) || 0;
      const pointsScored = parseFloat(team['Points Scored']?.replace(/,/g, '')) || 0;
      const pointsAgainst = parseFloat(team['Points Against']?.replace(/,/g, '')) || 0;
      const finalRank = parseInt(team['Final Rank']) || 0;
      
      const userInfo = this.mapTeamToUser(teamName);
      
      return {
        espnTeamName: teamName,
        userInfo,
        wins,
        losses,
        pointsScored,
        pointsAgainst,
        finalRank
      };
    });
  }

  // Process matchups CSV
  processMatchupsData(year, league) {
    const leaguePrefix = league === 'PREMIER' ? 'P' : 'N';
    const filename = `ESPN Fantasy Scrapes - Matchups ${leaguePrefix}${year.slice(-2)}.csv`;
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Matchups file not found: ${filename}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const matchups = this.parseCSV(csvContent);
    
    return matchups.map(matchup => {
      const week = parseInt(matchup.Week?.replace('Week ', '')) || 0;
      const team = matchup.Team?.trim() || '';
      const opponent = matchup.Opponent?.trim() || '';
      const score = parseFloat(matchup.Score) || 0;
      
      return {
        week,
        team,
        opponent,
        score,
        isPlayoff: ESPN_PLAYOFF_WEEKS.includes(week)
      };
    });
  }

  // Convert to standings format
  convertStandings(teams, matchups) {
    const standings = [];
    
    teams.forEach(team => {
      // Calculate high/low games from matchups
      const teamScores = matchups
        .filter(m => m.team === team.espnTeamName)
        .map(m => m.score);
      
      const standing = {
        userId: team.userInfo.userId,
        wins: team.wins,
        losses: team.losses,
        pointsFor: team.pointsScored,
        pointsAgainst: team.pointsAgainst,
        rank: team.finalRank,
        highGame: teamScores.length > 0 ? Math.max(...teamScores) : 0,
        lowGame: teamScores.length > 0 ? Math.min(...teamScores) : 0,
        // Include userInfo in the standing object for preservation
        userInfo: {
          userId: team.userInfo.userId,
          teamName: team.userInfo.teamName,
          abbreviation: team.userInfo.abbreviation
        }
      };
      
      standings.push(standing);
    });
    
    return standings.sort((a, b) => a.rank - b.rank);
  }

  // Convert to playoff results format
  convertPlayoffResults(teams, matchups) {
    const playoffResults = [];
    
    // Only include teams that made playoffs (top 6)
    const playoffTeams = teams.filter(team => team.finalRank <= 6);
    
    playoffTeams.forEach(team => {
      playoffResults.push({
        userId: team.userInfo.userId,
        placement: team.finalRank,
        placementName: this.getPlacementName(team.finalRank),
        // Include userInfo in playoff results
        userInfo: {
          userId: team.userInfo.userId,
          teamName: team.userInfo.teamName,
          abbreviation: team.userInfo.abbreviation
        }
      });
    });
    
    return playoffResults.sort((a, b) => a.placement - b.placement);
  }

  // Convert matchups to weekly format
  convertMatchupsByWeek(matchups, teams) {
    const matchupsByWeek = {};
    
    // Initialize all weeks
    for (let week = 1; week <= 16; week++) {
      matchupsByWeek[week] = [];
    }
    
    // Group matchups by week
    const weeklyGroups = {};
    matchups.forEach(matchup => {
      if (!weeklyGroups[matchup.week]) {
        weeklyGroups[matchup.week] = [];
      }
      weeklyGroups[matchup.week].push(matchup);
    });
    
    // Convert to head-to-head format
    Object.entries(weeklyGroups).forEach(([weekStr, weekMatchups]) => {
      const week = parseInt(weekStr);
      const convertedMatchups = [];
      const processedPairs = new Set();
      
      weekMatchups.forEach(matchup => {
        const pairKey = [matchup.team, matchup.opponent].sort().join('-');
        if (processedPairs.has(pairKey)) return;
        
        // Find opponent's matchup to get their score
        const opponentMatchup = weekMatchups.find(m => 
          m.team === matchup.opponent && m.opponent === matchup.team
        );
        
        if (!opponentMatchup) return;
        
        // Determine winner
        const teamUser = this.mapTeamToUser(matchup.team);
        const opponentUser = this.mapTeamToUser(matchup.opponent);
        
        let winner, loser, winnerScore, loserScore;
        
        if (matchup.score > opponentMatchup.score) {
          winner = teamUser.userId;
          loser = opponentUser.userId;
          winnerScore = matchup.score;
          loserScore = opponentMatchup.score;
        } else {
          winner = opponentUser.userId;
          loser = teamUser.userId;
          winnerScore = opponentMatchup.score;
          loserScore = matchup.score;
        }
        
        convertedMatchups.push({
          winner,
          loser,
          winnerScore,
          loserScore
        });
        
        processedPairs.add(pairKey);
      });
      
      matchupsByWeek[week] = convertedMatchups;
    });
    
    return matchupsByWeek;
  }

  // Utility functions
  getPlacementName(placement) {
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
  }

  // Generate data for a specific league/year
  async generateLeagueData(year, league) {
    console.log(`\n🏈 Generating ${year} ${league}...`);
    
    try {
      const teams = this.processTeamsData(year, league);
      const matchups = this.processMatchupsData(year, league);
      
      console.log(`   📊 Processed ${teams.length} teams, ${matchups.length} matchup records`);
      
      const standings = this.convertStandings(teams, matchups);
      const playoffResults = this.convertPlayoffResults(teams, matchups);
      const matchupsByWeek = this.convertMatchupsByWeek(matchups, teams);
      
      // Show user mapping results
      const currentUsers = teams.filter(t => !t.userInfo.isHistorical).length;
      const historicalUsers = teams.filter(t => t.userInfo.isHistorical).length;
      console.log(`   👥 ${currentUsers} current users, ${historicalUsers} historical users`);
      
      const leagueData = {
        league,
        year,
        leagueId: `espn-${year}-${league.toLowerCase()}`,
        standings,
        playoffResults,
        promotions: [],
        relegations: [],
        matchupsByWeek,
        memberGameStats: this.calculateMemberGameStats(matchupsByWeek)
      };
      
      await this.saveData(year, league, leagueData);
      console.log(`   ✅ Successfully generated ${year} ${league}`);
      return leagueData;
      
    } catch (error) {
      console.error(`   ❌ Failed to generate ${year} ${league}:`, error.message);
      return null;
    }
  }

  // Calculate member game stats
  calculateMemberGameStats(matchupsByWeek) {
    const stats = {};
    
    Object.values(matchupsByWeek).forEach(weekMatchups => {
      weekMatchups.forEach(matchup => {
        // Winner stats
        if (!stats[matchup.winner]) {
          stats[matchup.winner] = { highGame: 0, lowGame: Infinity, games: [] };
        }
        stats[matchup.winner].games.push(matchup.winnerScore);
        stats[matchup.winner].highGame = Math.max(stats[matchup.winner].highGame, matchup.winnerScore);
        stats[matchup.winner].lowGame = Math.min(stats[matchup.winner].lowGame, matchup.winnerScore);
        
        // Loser stats
        if (!stats[matchup.loser]) {
          stats[matchup.loser] = { highGame: 0, lowGame: Infinity, games: [] };
        }
        stats[matchup.loser].games.push(matchup.loserScore);
        stats[matchup.loser].highGame = Math.max(stats[matchup.loser].highGame, matchup.loserScore);
        stats[matchup.loser].lowGame = Math.min(stats[matchup.loser].lowGame, matchup.loserScore);
      });
    });
    
    // Clean up and remove games array
    Object.keys(stats).forEach(userId => {
      if (stats[userId].lowGame === Infinity) stats[userId].lowGame = 0;
      delete stats[userId].games;
    });
    
    return stats;
  }

  // Save data to file
  async saveData(year, league, data) {
    const yearDir = path.join(this.outputDir, year);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    
    const filename = `${league.toLowerCase()}.json`;
    const filepath = path.join(yearDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved: ${path.relative(this.outputDir, filepath)}`);
  }

  // Generate all ESPN data
  async generateAll() {
    console.log('🚀 Starting ESPN data generation (V2)...');
    console.log(`📁 Input: ${this.inputDir}`);
    console.log(`📁 Output: ${this.outputDir}`);
    
    let successCount = 0;
    let totalCount = 0;
    
    for (const year of ESPN_YEARS) {
      for (const league of ESPN_LEAGUES) {
        totalCount++;
        const result = await this.generateLeagueData(year, league);
        if (result) successCount++;
      }
    }
    
    console.log('\n📊 Summary');
    console.log('═'.repeat(30));
    console.log(`✅ Success: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}`);
    console.log('\n🎉 Generation complete!');
    
    // Show historical users created
    console.log('\n👥 Historical Users Created:');
    this.historicalUsers.forEach((userInfo, espnTeamName) => {
      console.log(`   ${userInfo.userId}: ${espnTeamName}`);
    });
  }
}

// Main execution
async function main() {
  const generator = new EspnDataGeneratorV2();
  await generator.generateAll();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EspnDataGeneratorV2 };