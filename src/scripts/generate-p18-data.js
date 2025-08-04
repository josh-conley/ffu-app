#!/usr/bin/env node

/**
 * ESPN P18 Data Generation Script
 * 
 * This script processes the ESPN Fantasy Scrapes CSV files for P18 (2018 Premier league)
 * and generates a JSON file matching the existing Sleeper data structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to parse CSV content with proper quote handling
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  
  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  // Handle duplicate "Score" columns by renaming them
  const processedHeaders = headers.map((header, index) => {
    if (header === 'Score') {
      const scoreCount = headers.slice(0, index).filter(h => h === 'Score').length;
      return scoreCount === 0 ? 'UserScore' : 'OpponentScore';
    }
    return header;
  });
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    
    const row = {};
    processedHeaders.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Helper function to parse a single CSV line handling quotes properly
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"/, '').replace(/"$/, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"/, '').replace(/"$/, '')); // Add the last value
  
  return values;
}

// User mapping based on the Sleeper ID Key and configuration for P18
const userMapping = {
  'mmen': { ffuId: 'ffu-023', sleeperId: '84006772809285632' },
  'bandits': { ffuId: 'ffu-036', sleeperId: '727366898383122432' },
  'ffuckedup': { ffuId: 'ffu-002', sleeperId: '396808818157182976' },
  'stallions': { ffuId: 'ffu-001', sleeperId: '331590801261883392' },
  'beers': { ffuId: 'ffu-004', sleeperId: '398576262546735104' },
  'tcool': { ffuId: 'ffu-043', sleeperId: '399297882890440704' },
  'aztecs': { ffuId: 'ffu-025', sleeperId: '386791325690994688' },
  'guapo': { ffuId: 'ffu-028', sleeperId: '507633950666584064' },
  'rhinos': { ffuId: 'ffu-026', sleeperId: '462383465753473024' },
  // Historical users who participated in P18 but didn't continue to Sleeper era
  'devils': { ffuId: 'ffu-h04', sleeperId: 'historical-durham-handsome-devils' },
  'joes': { ffuId: 'ffu-h07', sleeperId: 'historical-not-your-average-joes' },
  'losers': { ffuId: 'ffu-h05', sleeperId: 'historical-the-losers' }
};

// Team name to ESPN username mapping for P18
const teamNameMapping = {
  'The Minutemen': 'mmen',
  "Disney's PigskinSlingers": 'bandits',
  'Durham Handsome Devils': 'devils',
  'Durham Actually Ugly D...': 'devils', // Truncated name from matchups CSV
  'FFUcked Up': 'ffuckedup',
  'The Stallions': 'stallions',
  'Not Your Average Joes': 'joes',
  'Blood, Sweat and Beers': 'beers',
  'Bailando Cabras': 'tcool',
  'Indianapolis Aztecs': 'aztecs',
  'El Guapo Puto': 'guapo',
  'The Losers': 'losers',
  'Currier Island Raging Rhinos': 'rhinos',
  'Currier Island Raging ...': 'rhinos' // Truncated name from matchups CSV
};

// Helper function to get user info by team name
function getUserByTeamName(teamName) {
  const espnUsername = teamNameMapping[teamName];
  
  if (!espnUsername) {
    // Create historical user ID for unmapped teams
    const historicalId = `historical-${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return {
      userId: historicalId,
      ffuUserId: null,
      teamName: teamName, // For unmapped users, use the historical name
      abbreviation: teamName.split(' ').map(w => w[0]).join('').substr(0, 4).toUpperCase(),
      isHistorical: true
    };
  }
  
  const userInfo = userMapping[espnUsername];
  if (!userInfo) {
    throw new Error(`No user mapping found for ESPN username: ${espnUsername}`);
  }
  
  // For mapped users, get their CURRENT team name from the USERS configuration
  const currentUser = userMapping[espnUsername];
  const currentTeamName = getCurrentTeamNameBySleeperId(currentUser.sleeperId);
  const currentAbbreviation = getCurrentAbbreviationBySleeperId(currentUser.sleeperId);
  
  return {
    userId: userInfo.sleeperId,
    ffuUserId: userInfo.ffuId,
    teamName: currentTeamName || teamName, // Use current name, fallback to historical
    abbreviation: currentAbbreviation || teamName.split(' ').map(w => w[0]).join('').substr(0, 4).toUpperCase(),
    isHistorical: false
  };
}

// Helper function to get current team name by Sleeper ID for P18
function getCurrentTeamNameBySleeperId(sleeperId) {
  const userMappingToCurrent = {
    '84006772809285632': 'The Minutemen',
    '727366898383122432': 'Big Ten Bandits',
    '396808818157182976': 'FFUcked Up',
    '331590801261883392': 'The Stallions',
    '398576262546735104': 'Blood, Sweat, and Beers',
    '399297882890440704': 'Elm Street Skywalkers',
    '386791325690994688': 'Indianapolis Aztecs',
    '507633950666584064': 'El Guapo Puto',
    '462383465753473024': 'Raging Rhinos',
    // Historical users who participated in P18 but didn't continue to Sleeper era
    'historical-durham-handsome-devils': 'Durham Handsome Devils',
    'historical-not-your-average-joes': 'Not Your Average Joes',
    'historical-the-losers': 'The Losers'
  };
  
  return userMappingToCurrent[sleeperId];
}

// Helper function to get current abbreviation by Sleeper ID for P18
function getCurrentAbbreviationBySleeperId(sleeperId) {
  const abbreviationMapping = {
    '84006772809285632': 'MMEN',
    '727366898383122432': 'BTB',
    '396808818157182976': 'FFU',
    '331590801261883392': 'STA',
    '398576262546735104': 'BEER',
    '399297882890440704': 'ESS',
    '386791325690994688': 'AZTC',
    '507633950666584064': 'EGP',
    '462383465753473024': 'RAGE',
    // Historical users who participated in P18 but didn't continue to Sleeper era
    'historical-durham-handsome-devils': 'DHD',
    'historical-not-your-average-joes': 'NYAJ',
    'historical-the-losers': 'TL'
  };
  
  return abbreviationMapping[sleeperId];
}

// Load and parse CSV files
function loadCSVData() {
  const dataPath = path.join(process.cwd(), 'public', 'espn-league-data');
  
  const teamsCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Teams P18.original.csv'), 'utf8');
  const matchupsCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Matchups P18.original.csv'), 'utf8');
  const draftCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Draft Results P18.original.csv'), 'utf8');
  
  return {
    teams: parseCSV(teamsCSV),
    matchups: parseCSV(matchupsCSV),
    draft: parseCSV(draftCSV)
  };
}

// Generate standings data
function generateStandings(teamsData) {
  return teamsData.map(team => {
    const userInfo = getUserByTeamName(team.Team);
    const [wins, losses] = team.Record.split('-').map(Number);
    
    return {
      userId: userInfo.userId,
      ffuUserId: userInfo.ffuUserId,
      wins,
      losses,
      pointsFor: parseFloat(team['Points Scored'].replace(/,/g, '')),
      pointsAgainst: parseFloat(team['Points Against'].replace(/,/g, '')),
      rank: parseInt(team['Final Rank']),
      userInfo: {
        teamName: userInfo.teamName,
        abbreviation: userInfo.abbreviation
      }
    };
  });
}

// Generate playoff results
function generatePlayoffResults(teamsData) {
  return teamsData.map(team => {
    const userInfo = getUserByTeamName(team.Team);
    const finalRank = parseInt(team['Final Rank']);
    
    let placementName;
    if (finalRank === 1) placementName = '1st';
    else if (finalRank === 2) placementName = '2nd';
    else if (finalRank === 3) placementName = '3rd';
    else placementName = `${finalRank}th`;
    
    return {
      userId: userInfo.userId,
      ffuUserId: userInfo.ffuUserId,
      placement: finalRank,
      placementName,
      userInfo: {
        teamName: userInfo.teamName,
        abbreviation: userInfo.abbreviation
      }
    };
  });
}

// Generate matchups by week with proper placement game detection
function generateMatchupsByWeek(matchupsData, teamsData) {
  const matchupsByWeek = {};
  
  // Create final standings lookup for placement game detection
  const finalRankings = {};
  teamsData.forEach(team => {
    finalRankings[team.Team] = parseInt(team['Final Rank']);
    // Also add truncated versions for CSV matching
    if (team.Team === 'Currier Island Raging Rhinos') {
      finalRankings['Currier Island Raging ...'] = parseInt(team['Final Rank']);
    }
    if (team.Team === 'Durham Handsome Devils') {
      finalRankings['Durham Actually Ugly D...'] = parseInt(team['Final Rank']);
    }
  });
  
  matchupsData.forEach((matchup, index) => {
    const week = parseInt(matchup.Week.replace('Week ', ''));
    const team1 = getUserByTeamName(matchup.Team);
    const team2 = getUserByTeamName(matchup.Opponent);
    
    if (!matchupsByWeek[week]) {
      matchupsByWeek[week] = [];
    }
    
    // Use the properly parsed score fields
    const userScore = parseFloat(matchup.UserScore || '0');
    const opponentScore = parseFloat(matchup.OpponentScore || '0');
    
    // Determine placement type based on final rankings and week
    let placementType = null;
    if (week >= 14) { // Playoff weeks
      placementType = determineplacementType(matchup.Team, matchup.Opponent, userScore, opponentScore, finalRankings, week);
    }
    
    // Determine winner and loser based on scores
    const isUserWinner = userScore > opponentScore;
    const winner = isUserWinner ? team1.userId : team2.userId;
    const loser = isUserWinner ? team2.userId : team1.userId;
    const winnerScore = isUserWinner ? userScore : opponentScore;
    const loserScore = isUserWinner ? opponentScore : userScore;
    
    const matchupObj = {
      winner,
      loser,
      winnerScore,
      loserScore
    };
    
    if (placementType) {
      matchupObj.placementType = placementType;
    }
    
    matchupsByWeek[week].push(matchupObj);
  });
  
  return matchupsByWeek;
}

// Determine the specific placement type for playoff games
function determineplacementType(team1Name, team2Name, team1Score, team2Score, finalRankings, week) {
  const team1Rank = finalRankings[team1Name];
  const team2Rank = finalRankings[team2Name];
  
  if (!team1Rank || !team2Rank) {
    // For unmapped teams, use generic playoff round names
    if (week === 14) return 'Quarterfinal';
    if (week === 15) return 'Semifinal';
    if (week === 16) return 'Championship';
    return null;
  }
  
  // Determine winner and bracket type
  const winner = team1Score > team2Score ? team1Name : team2Name;
  const winnerRank = team1Score > team2Score ? team1Rank : team2Rank;
  const loserRank = team1Score > team2Score ? team2Rank : team1Rank;
  
  
  // Determine if this is Championship Bracket (ranks 1-6) or Toilet Bowl Bracket (ranks 7-12)
  const isChampionshipBracket = team1Rank <= 6 && team2Rank <= 6;
  const isToiletBowlBracket = team1Rank >= 7 && team2Rank >= 7;
  
  // Week 16 - Finals
  if (week === 16) {
    if (isChampionshipBracket) {
      // Championship Final: Winner gets 1st, loser gets 2nd
      if (winnerRank === 1 && loserRank === 2) {
        return 'Championship';
      }
      // 3rd Place Game: Winner gets 3rd, loser gets 4th
      if (winnerRank === 3 && loserRank === 4) {
        return '3rd Place';
      }
      // 5th Place Game: Winner gets 5th, loser gets 6th
      if (winnerRank === 5 && loserRank === 6) {
        return '5th Place';
      }
      // Default fallback for other championship bracket games
      return '3rd Place';
    } else if (isToiletBowlBracket) {
      // Last Place Game: Winner gets 11th, loser gets 12th
      if (winnerRank === 11 && loserRank === 12) {
        return 'Last Place';
      }
      // 9th Place Game: Winner gets 9th, loser gets 10th
      if (winnerRank === 9 && loserRank === 10) {
        return '9th Place';
      }
      // 7th Place Game: Winner gets 7th, loser gets 8th
      if (winnerRank === 7 && loserRank === 8) {
        return '7th Place';
      }
      // Default fallback for other toilet bowl bracket games
      return 'Toilet Bowl Final';
    }
    return 'Playoff Final';
  }
  
  // Week 15 - Semifinals
  if (week === 15) {
    if (isChampionshipBracket) {
      return 'Championship Semifinal';
    } else if (isToiletBowlBracket) {
      return 'Toilet Bowl Semifinal';
    }
    return 'Semifinal';
  }
  
  // Week 14 - Quarterfinals
  if (week === 14) {
    if (isChampionshipBracket) {
      // Teams 3-6 play in championship quarterfinals (teams 1-2 have byes)
      return 'Championship Quarterfinal';
    } else if (isToiletBowlBracket) {
      // Teams 7-10 play in toilet bowl quarterfinals (teams 11-12 have byes)
      return 'Toilet Bowl Quarterfinal';
    }
    return 'Quarterfinal';
  }
  
  return null;
}

// Generate draft data
function generateDraftData(draftData) {
  // First pass: collect all picks and establish team order
  const allPicks = draftData.map((pick, index) => {
    const pickInfo = pick.Pick.match(/(\d+)\.(\d+) \((\d+)\)/);
    if (!pickInfo) return null;
    
    const [, round, pickInRound, overallPick] = pickInfo;
    const playerInfo = pick.Player.split(' · ');
    const userInfo = getUserByTeamName(pick.Team);
    
    return {
      pickNumber: parseInt(overallPick),
      round: parseInt(round),
      pickInRound: parseInt(pickInRound),
      playerId: `espn-player-${playerInfo[0].toLowerCase().replace(/\s+/g, '-')}`,
      playerInfo: {
        name: playerInfo[0],
        position: playerInfo[1] || 'UNKNOWN',
        team: playerInfo[2] ? playerInfo[2].replace(/[()]/g, '') : 'UNKNOWN'
      },
      pickedBy: userInfo.userId,
      userInfo: {
        userId: userInfo.userId,
        ffuUserId: userInfo.ffuUserId,
        teamName: userInfo.teamName,
        abbreviation: userInfo.abbreviation
      },
      draftId: 'espn-2018-premier-draft'
    };
  }).filter(Boolean);

  // Extract draft order from first round
  const round1Picks = allPicks.filter(pick => pick.round === 1).sort((a, b) => a.pickInRound - b.pickInRound);
  const draftOrderArray = round1Picks.map(pick => pick.pickedBy);
  
  // Calculate correct draftSlot for snake draft
  const picks = allPicks.map(pick => {
    const { round, pickInRound } = pick;
    let draftSlot;
    
    if (round % 2 === 1) {
      // Odd rounds: normal order (1, 2, 3, ..., 12)
      draftSlot = pickInRound;
    } else {
      // Even rounds: reverse order (12, 11, 10, ..., 1)  
      draftSlot = 13 - pickInRound;
    }
    
    return {
      ...pick,
      draftSlot
    };
  });
  
  // Generate draft order mapping from first round order
  const draftOrder = {};
  draftOrderArray.forEach((userId, index) => {
    draftOrder[userId] = index + 1;
  });

  return {
    draftId: 'espn-2018-premier-draft',
    leagueId: 'espn-2018-premier',
    year: '2018',
    league: 'PREMIER',
    draftOrder,
    picks,
    settings: {
      teams: 12,
      rounds: 15,
      draftType: 'snake'
    },
    metadata: {
      name: 'ESPN 2018 Premier Draft',
      description: 'Premier League Draft for 2018 season',
      scoringType: 'standard'
    },
    startTime: new Date('2018-08-15').getTime(), // Approximate draft date
    status: 'complete'
  };
}

// Main function to generate P18 data
function generateP18Data() {
  console.log('Loading CSV data...');
  const csvData = loadCSVData();
  
  console.log('Generating standings...');
  const standings = generateStandings(csvData.teams);
  
  console.log('Generating playoff results...');
  const playoffResults = generatePlayoffResults(csvData.teams);
  
  console.log('Generating matchups by week...');
  const matchupsByWeek = generateMatchupsByWeek(csvData.matchups, csvData.teams);
  
  console.log('Generating draft data...');
  const draftData = generateDraftData(csvData.draft);
  
  const p18Data = {
    league: 'PREMIER',
    year: '2018',
    leagueId: 'espn-2018-premier',
    standings,
    playoffResults,
    promotions: [], // No promotions in ESPN era
    relegations: [], // No relegations in ESPN era
    matchupsByWeek,
    memberGameStats: {}, // Will be calculated from matchups if needed
    draftData
  };
  
  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'public', 'data', '2018');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the data file
  const outputPath = path.join(outputDir, 'premier.json');
  fs.writeFileSync(outputPath, JSON.stringify(p18Data, null, 2));
  
  console.log(`✅ P18 data generated successfully: ${outputPath}`);
  console.log(`📊 Generated data includes:`);
  console.log(`   - ${standings.length} teams in standings`);
  console.log(`   - ${Object.keys(matchupsByWeek).length} weeks of matchups`);
  console.log(`   - ${draftData.picks.length} draft picks`);
  console.log(`   - ${playoffResults.length} playoff results`);
  
  // Show user mapping summary
  const mappedUsers = standings.filter(s => !s.userId.startsWith('historical-')).length;
  const historicalUsers = standings.filter(s => s.userId.startsWith('historical-')).length;
  console.log(`👥 User mapping: ${mappedUsers} current users, ${historicalUsers} historical users`);
  
  return p18Data;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateP18Data();
  } catch (error) {
    console.error('❌ Error generating P18 data:', error.message);
    process.exit(1);
  }
}

export { generateP18Data };