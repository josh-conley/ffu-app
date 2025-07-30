/**
 * Script to generate ESPN historical data JSON files from CSV files
 * Run this script to populate the /public/data directory with ESPN era data (2018-2020)
 * 
 * Usage: node scripts/generate-espn-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const ESPN_YEARS = ['2018', '2019', '2020'];
const ESPN_LEAGUES = ['PREMIER', 'NATIONAL']; // No Masters in ESPN era
const ESPN_PLAYOFF_WEEKS = [14, 15, 16];
const ESPN_SEASON_LENGTH = 16;

// Current Sleeper users - copied from constants.ts
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

// Team name mappings from CSV - maps current team names to historical ESPN names
const TEAM_NAME_MAPPINGS = {
  'Act More Stupidly': ['Goat Emoji', 'Goat Emoji II'],
  'Fort Wayne Banana Bread': ['Oklahoma Banana Bread', 'Wisconsin Banana Bread'],
  'Raging Rhinos': ['Currier Island Raging Rhinos'],
  'Big Ten Bandits': ['Disney\'s PigskinSlingers'],
  'Durham Handsome Devils': ['Atlanta Handsome Devils', 'Durham Actually Ugly Devils'],
  'Circle City Phantoms': ['Bailando Cabras', 'Elm Street Skywalkers'],
  'Stone Cold Steve Irwins': ['CreamOfTheCrop Macho Men'],
  'Team Jacamart': ['Great Team Name'],
  'CamDelphia': ['Always Sunny in Camdelphia', 'CamDelphia'],
  'The Dark Knights': ['Purple Parade'],
  'Shton\'s Strikers': ['Browntown'],
  'Blood, Sweat, and Beers': ['Blood, Sweat and Beers']
};

class EspnDataGenerator {
  constructor() {
    this.inputDir = path.join(__dirname, '../public/old-league-data');
    this.outputDir = path.join(__dirname, '../public/data');
    
    // Create team mapping lookups
    this.espnToSleeperMap = new Map();
    this.sleeperToEspnMap = new Map();
    
    // Historical user ID counter for anonymization
    this.historicalUserCounter = 1;
    this.historicalUserMap = new Map(); // Maps ESPN username to anonymized ID
    
    // Build mappings from team name mappings and sleeper users
    SLEEPER_USERS.forEach(user => {
      // Direct mapping for current team name
      this.espnToSleeperMap.set(user.teamName, user.sleeperId);
      
      // Check if this team has historical names
      if (TEAM_NAME_MAPPINGS[user.teamName]) {
        TEAM_NAME_MAPPINGS[user.teamName].forEach(historicalName => {
          this.espnToSleeperMap.set(historicalName, user.sleeperId);
        });
      }
    });
    
    // Add some additional mappings we know from the sample data
    this.espnToSleeperMap.set('The Minutemen', '84006772809285632');
    this.espnToSleeperMap.set('FFUcked Up', '396808818157182976');
    this.espnToSleeperMap.set('Durham Handsome Devils', '398574272387297280'); // Dmandre161
    this.espnToSleeperMap.set('The Stallions', '331590801261883392');
    this.espnToSleeperMap.set('Not Your Average Joes', '602712418325442560'); // The Riveters
    this.espnToSleeperMap.set('Indianapolis Aztecs', '386791325690994688');
    this.espnToSleeperMap.set('El Guapo Puto', '507633950666584064');
    this.espnToSleeperMap.set('The Losers', 'unknown'); // Will generate historical ID
  }

  // CSV parsing utilities
  parseCsv(csvContent) {
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = this.parseRow(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseRow(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  }

  parseRow(line) {
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

  // Generate anonymized historical user ID for ESPN era
  generateHistoricalUserId(espnUsername) {
    // Check if we already have an anonymized ID for this username
    if (this.historicalUserMap.has(espnUsername)) {
      return this.historicalUserMap.get(espnUsername);
    }
    
    // Create new anonymized ID
    const anonymizedId = `espn-historical-${this.historicalUserCounter.toString().padStart(3, '0')}`;
    this.historicalUserMap.set(espnUsername, anonymizedId);
    this.historicalUserCounter++;
    
    return anonymizedId;
  }

  // Get Sleeper user ID from ESPN team name
  getSleeperUserId(espnTeamName, year) {
    const sleeperUserId = this.espnToSleeperMap.get(espnTeamName);
    if (sleeperUserId && sleeperUserId !== 'unknown') {
      return sleeperUserId;
    }
    return null; // Return null instead of generating historical ID here
  }

  // Get user info for standings (handles both real and historical users)
  getUserInfoForStanding(userId, espnTeamName, espnUsername) {
    // Check if this is a real Sleeper user
    const sleeperUser = SLEEPER_USERS.find(user => user.sleeperId === userId);
    if (sleeperUser) {
      return {
        userId: userId,
        teamName: sleeperUser.teamName,
        abbreviation: sleeperUser.abbreviation
      };
    }
    
    // For historical users, use the ESPN team name or fallback to a generated name
    let teamName = espnTeamName;
    if (!teamName || teamName.trim() === '') {
      // If no team name, create one based on the anonymized user ID
      const userNumber = userId.replace('espn-historical-', '');
      teamName = `ESPN Team ${userNumber}`;
    }
    
    return {
      userId: userId,
      teamName: teamName,
      abbreviation: teamName.length >= 3 ? teamName.substring(0, 3).toUpperCase() : 'UNK'
    };
  }

  // Process teams CSV file
  async processTeamsFile(year, league) {
    const leaguePrefix = league === 'PREMIER' ? 'P' : 'N';
    const filename = `ESPN Fantasy Scrapes - Teams ${leaguePrefix}${year.slice(-2)}.csv`;
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Teams file not found: ${filename}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const rawTeams = this.parseCsv(csvContent);
    
    return rawTeams.map(team => ({
      teamName: team['Team/Member'],
      espnUsername: team.Member,
      wins: parseInt(team.Record.split('-')[0]) || 0,
      losses: parseInt(team.Record.split('-')[1]) || 0,
      pointsScored: parseFloat(team['Points Scored'].replace(/,/g, '')) || 0,
      pointsAgainst: parseFloat(team['Points Against'].replace(/,/g, '')) || 0,
      finalRank: parseInt(team['Final Rank']) || 0
    }));
  }

  // Process matchups CSV file
  async processMatchupsFile(year, league) {
    const leaguePrefix = league === 'PREMIER' ? 'P' : 'N';
    const filename = `ESPN Fantasy Scrapes - Matchups ${leaguePrefix}${year.slice(-2)}.csv`;
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Matchups file not found: ${filename}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const rawMatchups = this.parseCsv(csvContent);
    
    return rawMatchups.map(matchup => {
      const week = parseInt(matchup.Week.replace('Week ', ''));
      return {
        week,
        team: matchup.Team,
        score: parseFloat(matchup.Score) || 0,
        opponent: matchup.Opponent,
        opponentScore: parseFloat(matchup.Score) || 0, // ESPN CSV structure issue
        isPlayoff: ESPN_PLAYOFF_WEEKS.includes(week)
      };
    });
  }

  // Process draft CSV file
  async processDraftFile(year, league) {
    const leaguePrefix = league === 'PREMIER' ? 'P' : 'N';
    const filename = `ESPN Fantasy Scrapes - Draft Results ${leaguePrefix}${year.slice(-2)}.csv`;
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Draft file not found: ${filename}`);
    }
    
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const rawDraft = this.parseCsv(csvContent);
    
    return rawDraft.map(pick => {
      // Parse pick format "1.1 (1)"
      const pickMatch = pick.Pick.match(/(\d+)\.(\d+)\s*\((\d+)\)/);
      const round = pickMatch ? parseInt(pickMatch[1]) : 0;
      const draftSlot = pickMatch ? parseInt(pickMatch[2]) : 0;
      const pickNumber = pickMatch ? parseInt(pickMatch[3]) : 0;
      
      // Parse player format "Ezekiel Elliott · RB · (DAL)"
      const playerParts = pick.Player.split(' · ');
      const playerName = playerParts[0] || '';
      const position = playerParts[1] || '';
      const nflTeam = playerParts[2] ? playerParts[2].replace(/[()]/g, '') : '';
      
      return {
        pickNumber,
        round,
        draftSlot,
        playerName,
        position,
        nflTeam,
        espnTeamName: pick.Team
      };
    });
  }

  // Convert standings
  convertStandings(teams, matchups, year, league) {
    const standings = [];
    
    teams.forEach(team => {
      const sleeperUserId = this.getSleeperUserId(team.teamName, year) || this.generateHistoricalUserId(team.espnUsername || 'unknown');
      
      // Calculate high/low games from matchups
      const teamScores = [];
      matchups.forEach(matchup => {
        if (matchup.team === team.teamName) {
          teamScores.push(matchup.score);
        } else if (matchup.opponent === team.teamName) {
          teamScores.push(matchup.opponentScore);
        }
      });
      
      const standing = {
        userId: sleeperUserId,
        wins: team.wins,
        losses: team.losses,
        pointsFor: team.pointsScored,
        pointsAgainst: team.pointsAgainst,
        rank: team.finalRank,
        highGame: teamScores.length > 0 ? Math.max(...teamScores) : 0,
        lowGame: teamScores.length > 0 ? Math.min(...teamScores) : 0,
        userInfo: this.getUserInfoForStanding(sleeperUserId, team.teamName, team.espnUsername)
      };
      
      standings.push(standing);
    });
    
    return standings.sort((a, b) => a.rank - b.rank);
  }

  // Convert playoff results
  convertPlayoffResults(teams, matchups, year, league) {
    const playoffResults = [];
    
    teams.forEach(team => {
      const sleeperUserId = this.getSleeperUserId(team.teamName, year) || this.generateHistoricalUserId(team.espnUsername || 'unknown');
      
      // Check if team made playoffs (participated in playoff weeks)
      const madePlayoffs = matchups.some(matchup => 
        matchup.isPlayoff && 
        (matchup.team === team.teamName || matchup.opponent === team.teamName)
      );
      
      if (madePlayoffs) {
        playoffResults.push({
          userId: sleeperUserId,
          placement: team.finalRank,
          placementName: this.getPlacementName(team.finalRank),
          userInfo: this.getUserInfoForStanding(sleeperUserId, team.teamName, team.espnUsername)
        });
      }
    });
    
    return playoffResults.sort((a, b) => a.placement - b.placement);
  }

  // Convert matchups to weekly format
  convertMatchupsByWeek(matchups, year, league) {
    const matchupsByWeek = {};
    
    // Initialize all weeks
    for (let week = 1; week <= ESPN_SEASON_LENGTH; week++) {
      matchupsByWeek[week] = [];
    }
    
    // Group matchups by week
    const weeklyMatchups = {};
    matchups.forEach(matchup => {
      if (!weeklyMatchups[matchup.week]) {
        weeklyMatchups[matchup.week] = [];
      }
      weeklyMatchups[matchup.week].push(matchup);
    });
    
    // Convert to head-to-head format
    Object.entries(weeklyMatchups).forEach(([weekStr, weekMatchups]) => {
      const week = parseInt(weekStr);
      const convertedMatchups = [];
      const processedTeams = new Set();
      
      weekMatchups.forEach(matchup => {
        if (processedTeams.has(matchup.team)) return;
        
        // Find opponent's row
        const opponentMatchup = weekMatchups.find(m => 
          m.team === matchup.opponent && 
          m.opponent === matchup.team &&
          !processedTeams.has(m.team)
        );
        
        if (!opponentMatchup) return;
        
        // Determine winner and loser
        const isTeamWinner = matchup.score > matchup.opponentScore;
        const winner = isTeamWinner ? matchup.team : matchup.opponent;
        const loser = isTeamWinner ? matchup.opponent : matchup.team;
        const winnerScore = isTeamWinner ? matchup.score : matchup.opponentScore;
        const loserScore = isTeamWinner ? matchup.opponentScore : matchup.score;
        
        // Map to Sleeper user IDs
        const winnerUserId = this.getSleeperUserId(winner, year) || this.generateHistoricalUserId('unknown');
        const loserUserId = this.getSleeperUserId(loser, year) || this.generateHistoricalUserId('unknown');
        
        const convertedMatchup = {
          winner: winnerUserId,
          loser: loserUserId,
          winnerScore,
          loserScore
        };
        
        // Add playoff placement type
        if (ESPN_PLAYOFF_WEEKS.includes(week)) {
          convertedMatchup.placementType = this.getPlayoffRoundName(week);
        }
        
        convertedMatchups.push(convertedMatchup);
        processedTeams.add(matchup.team);
        processedTeams.add(matchup.opponent);
      });
      
      matchupsByWeek[week] = convertedMatchups;
    });
    
    return matchupsByWeek;
  }

  // Convert draft data
  convertDraftData(draftPicks, year, league) {
    const convertedPicks = [];
    
    draftPicks.forEach(pick => {
      const sleeperUserId = this.getSleeperUserId(pick.espnTeamName, year) || this.generateHistoricalUserId('unknown');
      
      convertedPicks.push({
        pickNumber: pick.pickNumber,
        round: pick.round,
        draftSlot: pick.draftSlot,
        playerId: `player-${pick.playerName.toLowerCase().replace(/\s+/g, '-')}-${pick.position.toLowerCase()}`,
        playerInfo: {
          name: pick.playerName,
          position: pick.position,
          team: pick.nflTeam || null,
          college: undefined,
          age: undefined
        },
        pickedBy: sleeperUserId,
        userInfo: {
          userId: sleeperUserId,
          teamName: pick.espnTeamName,
          abbreviation: pick.espnTeamName.substring(0, 3).toUpperCase()
        },
        draftId: `espn-${year}-${league.toLowerCase()}-draft`
      });
    });
    
    return {
      draftId: `espn-${year}-${league.toLowerCase()}-draft`,
      leagueId: `espn-${year}-${league.toLowerCase()}`,
      year,
      league,
      draftOrder: {},
      picks: convertedPicks.sort((a, b) => a.pickNumber - b.pickNumber),
      settings: {
        teams: Math.max(...convertedPicks.map(p => p.draftSlot)),
        rounds: Math.max(...convertedPicks.map(p => p.round)),
        draftType: 'snake'
      },
      metadata: {
        name: `${year} ${league} Draft`,
        description: `ESPN ${year} season draft`,
        scoringType: 'standard'
      },
      startTime: new Date(`${year}-08-25`).getTime(),
      status: 'complete'
    };
  }

  // Utility functions
  getPlacementName(placement) {
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
  }

  getPlayoffRoundName(week) {
    if (week === 14) return 'Quarterfinal';
    if (week === 15) return 'Semifinal';
    if (week === 16) return 'Championship';
    return null;
  }

  // Generate league data
  async generateLeagueData(year, league) {
    console.log(`\n🏈 Generating data for ${year} ${league}...`);

    try {
      // Process CSV files
      const teams = await this.processTeamsFile(year, league);
      const matchups = await this.processMatchupsFile(year, league);
      const draftPicks = await this.processDraftFile(year, league);

      console.log(`   📊 Processed ${teams.length} teams, ${matchups.length} matchup records`);

      // Convert data
      const standings = this.convertStandings(teams, matchups, year, league);
      const playoffResults = this.convertPlayoffResults(teams, matchups, year, league);
      const matchupsByWeek = this.convertMatchupsByWeek(matchups, year, league);
      const draftData = this.convertDraftData(draftPicks, year, league);

      // Generate member game stats
      const memberGameStats = {};
      standings.forEach(standing => {
        memberGameStats[standing.userId] = {
          highGame: standing.highGame,
          lowGame: standing.lowGame,
          games: [] // Would need to calculate from matchups
        };
      });

      const leagueData = {
        league,
        year,
        leagueId: `espn-${year}-${league.toLowerCase()}`,
        standings,
        playoffResults,
        promotions: [], // No promotions/relegations in ESPN era
        relegations: [],
        matchupsByWeek,
        memberGameStats,
        draftData
      };

      // Save to file
      await this.saveLeagueData(year, league, leagueData);
      
      console.log(`   ✅ Generated data for ${year} ${league}`);
      return leagueData;

    } catch (error) {
      console.error(`   ❌ Failed to generate data for ${year} ${league}:`, error.message);
      return null;
    }
  }

  // Save league data to JSON file
  async saveLeagueData(year, league, data) {
    const yearDir = path.join(this.outputDir, year);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }

    const filename = `${league.toLowerCase()}.json`;
    const filepath = path.join(yearDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`   💾 Saved: ${path.relative(this.outputDir, filepath)}`);
  }

  // Generate all ESPN historical data
  async generateAllEspnData() {
    console.log('🚀 Starting ESPN historical data generation...');
    console.log(`📁 Input directory: ${this.inputDir}`);
    console.log(`📁 Output directory: ${this.outputDir}`);

    let successCount = 0;
    let totalCount = 0;

    for (const year of ESPN_YEARS) {
      for (const league of ESPN_LEAGUES) {
        totalCount++;
        const result = await this.generateLeagueData(year, league);
        if (result) {
          successCount++;
        }
      }
    }

    console.log('\n📊 Migration Summary');
    console.log('═'.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}`);
    console.log(`📁 Output location: ${this.outputDir}`);
    console.log('\n🎉 ESPN data generation complete!');
  }
}

// Run the script
async function main() {
  const generator = new EspnDataGenerator();
  await generator.generateAllEspnData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { EspnDataGenerator };