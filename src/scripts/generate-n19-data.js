#!/usr/bin/env node

/**
 * ESPN N19 Data Generation Script
 * 
 * This script processes the ESPN Fantasy Scrapes CSV files for N19 (2019 National league)
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
  
  // Find the first non-empty line as the header
  let headerIndex = 0;
  while (headerIndex < lines.length && (!lines[headerIndex] || lines[headerIndex].trim() === '' || lines[headerIndex].split(',').every(cell => cell.trim() === ''))) {
    headerIndex++;
  }
  
  if (headerIndex >= lines.length) {
    throw new Error('No valid header found in CSV');
  }
  
  // Parse headers
  const headerLine = lines[headerIndex];
  const headers = parseCSVLine(headerLine);
  
  // Handle duplicate "Score" columns by renaming them
  const processedHeaders = headers.map((header, index) => {
    if (header === 'Score') {
      const scoreCount = headers.slice(0, index).filter(h => h === 'Score').length;
      return scoreCount === 0 ? 'UserScore' : 'OpponentScore';
    }
    return header;
  });
  
  return lines.slice(headerIndex + 1).map(line => {
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

// User mapping based on the Sleeper ID Key and configuration for N19
const userMapping = {
  'rhinos': { ffuId: 'ffu-026', sleeperId: '462383465753473024' },
  'aztecs': { ffuId: 'ffu-025', sleeperId: '386791325690994688' },
  'picks': { ffuId: 'ffu-010', sleeperId: '729741648338210816' },
  'blackdeath': { ffuId: 'ffu-045', sleeperId: '599711204499312640' },
  'jacamart': { ffuId: 'ffu-041', sleeperId: '399322397750124544' },
  'tcool': { ffuId: 'ffu-043', sleeperId: '399297882890440704' },
  'guapo': { ffuId: 'ffu-028', sleeperId: '507633950666584064' },
  'pancake': { ffuId: 'ffu-029', sleeperId: '508719015656099840' },
  // Historical users who participated in N19 but didn't continue to Sleeper era
  'makos': { ffuId: 'ffu-h01', sleeperId: 'historical-naptown-makos' },
  'cog': { ffuId: 'ffu-h02', sleeperId: 'historical-speedway-ritual-cog' },
  'losers': { ffuId: 'ffu-h05', sleeperId: 'historical-the-losers' },
  'flame': { ffuId: 'ffu-h06', sleeperId: 'historical-gingy-flame' },
};

// Team name to ESPN username mapping for N19
const teamNameMapping = {
  'Currier Island Raging Rhinos': 'rhinos',
  'Currier Island Raging ...': 'rhinos', // Truncated version from CSV
  'Indianapolis Aztecs': 'aztecs',
  'Team Painter Pick 6': 'picks',
  'Team Black Death': 'blackdeath',
  'Great Team Name': 'jacamart',
  'Elm Street Skywalkers': 'tcool',
  'El Guapo Puto': 'guapo',
  'Team Pancake': 'pancake',
  // Historical users who participated in N19 but didn't continue to Sleeper era
  'Naptown Makos': 'makos',
  "Speedway's Ritual Cog": 'cog',
  'The Losers': 'losers',
  'Gingy Flame': 'flame'
};

// Mapping from any team name (including truncated) to full team name
const fullTeamNameMapping = {
  'Currier Island Raging Rhinos': 'Currier Island Raging Rhinos',
  'Currier Island Raging ...': 'Currier Island Raging Rhinos', // Fix truncated name
  'Indianapolis Aztecs': 'Indianapolis Aztecs',
  'Team Painter Pick 6': 'Team Painter Pick 6',
  'Team Black Death': 'Team Black Death',
  'Great Team Name': 'Great Team Name',
  'Elm Street Skywalkers': 'Elm Street Skywalkers',
  'El Guapo Puto': 'El Guapo Puto',
  'Team Pancake': 'Team Pancake',
  'Naptown Makos': 'Naptown Makos',
  "Speedway's Ritual Cog": "Speedway's Ritual Cog",
  'The Losers': 'The Losers',
  'Gingy Flame': 'Gingy Flame'
};

// Helper function to get user info by team name
function getUserByTeamName(teamName) {
  const espnUsername = teamNameMapping[teamName];
  
  if (!espnUsername) {
    // Create historical user ID for unmapped teams
    const historicalId = `historical-${teamName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const fullTeamName = fullTeamNameMapping[teamName] || teamName;
    return {
      userId: historicalId,
      ffuUserId: null,
      teamName: fullTeamName, // For unmapped users, use the full historical name
      abbreviation: fullTeamName.split(' ').map(w => w[0]).join('').substr(0, 4).toUpperCase(),
      isHistorical: true
    };
  }
  
  const userInfo = userMapping[espnUsername];
  if (!userInfo) {
    throw new Error(`No user mapping found for ESPN username: ${espnUsername}`);
  }
  
  // For historical consistency, use the full 2019 team name (fix any truncated names)
  const fullTeamName = fullTeamNameMapping[teamName] || teamName;
  return {
    userId: userInfo.sleeperId,
    ffuUserId: userInfo.ffuId,
    teamName: fullTeamName, // Use full historical 2019 team name
    abbreviation: fullTeamName.split(' ').map(w => w[0]).join('').substr(0, 4).toUpperCase(),
    isHistorical: false
  };
}

// Helper function to get current team name by Sleeper ID for N19
function getCurrentTeamNameBySleeperId(sleeperId) {
  const userMappingToCurrent = {
    '462383465753473024': 'Raging Rhinos',
    '386791325690994688': 'Indianapolis Aztecs',
    '729741648338210816': 'ChicagoPick6',
    '599711204499312640': 'Team Black Death',
    '399322397750124544': 'Great Team Name',
    '399297882890440704': 'Elm Street Skywalkers',
    '507633950666584064': 'El Guapo Puto',
    '508719015656099840': 'Team Pancake',
    // Historical users who participated in N19 but didn't continue to Sleeper era
    'historical-naptown-makos': 'Naptown Makos',
    'historical-speedway-ritual-cog': "Speedway's Ritual Cog",
    'historical-the-losers': 'The Losers',
    'historical-gingy-flame': 'Gingy Flame'
  };
  
  return userMappingToCurrent[sleeperId];
}

// Helper function to get current abbreviation by Sleeper ID for N19
function getCurrentAbbreviationBySleeperId(sleeperId) {
  const abbreviationMapping = {
    '462383465753473024': 'RAGE',
    '386791325690994688': 'AZTC',
    '729741648338210816': 'CP6',
    '599711204499312640': 'TBD',
    '399322397750124544': 'GTN',
    '399297882890440704': 'ESS',
    '507633950666584064': 'EGP',
    '508719015656099840': 'PCKE',
    // Historical users who participated in N19 but didn't continue to Sleeper era
    'historical-naptown-makos': 'NM',
    'historical-speedway-ritual-cog': 'SRC',
    'historical-the-losers': 'TL',
    'historical-gingy-flame': 'GF'
  };
  
  return abbreviationMapping[sleeperId];
}

// Load and parse CSV files
function loadCSVData() {
  const dataPath = path.join(process.cwd(), 'public', 'espn-league-data');
  
  const teamsCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Teams N19.original.csv'), 'utf8');
  const matchupsCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Matchups N19.original.csv'), 'utf8');
  const draftCSV = fs.readFileSync(path.join(dataPath, 'ESPN Fantasy Scrapes - Draft Results N19.original.csv'), 'utf8');
  
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
    // Also add truncated version for CSV matching
    if (team.Team === 'Currier Island Raging Rhinos') {
      finalRankings['Currier Island Raging ...'] = parseInt(team['Final Rank']);
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
      draftId: 'espn-2019-national-draft'
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
    draftId: 'espn-2019-national-draft',
    leagueId: 'espn-2019-national',
    year: '2019',
    league: 'NATIONAL',
    draftOrder,
    picks,
    settings: {
      teams: 12,
      rounds: 15,
      draftType: 'snake'
    },
    metadata: {
      name: 'ESPN 2019 National Draft',
      description: 'National League Draft for 2019 season',
      scoringType: 'standard'
    },
    startTime: new Date('2019-08-15').getTime(), // Approximate draft date
    status: 'complete'
  };
}

// Main function to generate N19 data
function generateN19Data() {
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
  
  const n19Data = {
    league: 'NATIONAL',
    year: '2019',
    leagueId: 'espn-2019-national',
    standings,
    playoffResults,
    promotions: [], // No promotions in ESPN era
    relegations: [], // No relegations in ESPN era
    matchupsByWeek,
    memberGameStats: {}, // Will be calculated from matchups if needed
    draftData
  };
  
  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'public', 'data', '2019');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the data file
  const outputPath = path.join(outputDir, 'national.json');
  fs.writeFileSync(outputPath, JSON.stringify(n19Data, null, 2));
  
  console.log(`✅ N19 data generated successfully: ${outputPath}`);
  console.log(`📊 Generated data includes:`);
  console.log(`   - ${standings.length} teams in standings`);
  console.log(`   - ${Object.keys(matchupsByWeek).length} weeks of matchups`);
  console.log(`   - ${draftData.picks.length} draft picks`);
  console.log(`   - ${playoffResults.length} playoff results`);
  
  // Show user mapping summary
  const mappedUsers = standings.filter(s => !s.userId.startsWith('historical-')).length;
  const historicalUsers = standings.filter(s => s.userId.startsWith('historical-')).length;
  console.log(`👥 User mapping: ${mappedUsers} current users, ${historicalUsers} historical users`);
  
  return n19Data;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateN19Data();
  } catch (error) {
    console.error('❌ Error generating N19 data:', error.message);
    process.exit(1);
  }
}

export { generateN19Data };