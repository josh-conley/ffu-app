/**
 * Script to fetch and cache NFL historical team data from NFLverse
 * This should be run manually once per year after the season ends
 * 
 * Usage: node scripts/fetch-historical-teams.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HistoricalTeamDataFetcher {
  constructor() {
    this.nflverseBaseUrl = 'https://github.com/nflverse/nflverse-data/releases/latest/download';
    this.outputDir = path.join(__dirname, '../public/data/historical-teams');
    this.playersDataPath = path.join(__dirname, '../public/data/players/nfl-players.json');
  }

  async fetchNFLverseRosterData() {
    console.log('🏈 Fetching NFLverse Week 1 roster data for all draft years (2018-2024)...');
    console.log('⚠️  This will download 7 weekly roster CSV files (~21MB total) from NFLverse GitHub');
    console.log('📅 Using Week 1 data to get accurate starting teams (not season-end teams)');
    console.log('🔧 Including ESPN era (2018-2020) to fix FA player team data');

    const allYears = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const allRosterData = [];
    
    try {
      for (const year of allYears) {
        console.log(`📥 Fetching ${year} weekly roster data...`);
        const url = `https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_${year}.csv`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${year} weekly roster data: ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log(`✅ Retrieved ${year} weekly roster data (${(csvText.length / 1024 / 1024).toFixed(2)} MB)`);
        
        const yearData = this.parseCSV(csvText);
        
        // Filter for Week 1 data only (start of season rosters)
        const week1Data = yearData.filter(entry => entry.week === 1 || entry.week === '1');
        console.log(`  📅 Filtered to ${week1Data.length} Week 1 entries from ${yearData.length} total weekly entries`);
        
        // Add year to each entry if it's not already there
        week1Data.forEach(entry => {
          if (!entry.season) {
            entry.season = year;
          }
        });
        
        allRosterData.push(...week1Data);
      }

      console.log(`📊 Total NFLverse Week 1 entries: ${allRosterData.length}`);
      return allRosterData;
    } catch (error) {
      console.error('❌ Failed to fetch NFLverse weekly roster data:', error);
      throw error;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const entry = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '').trim() || '';
        
        // Convert numeric fields
        if (['season', 'games', 'starts', 'years', 'av', 'jersey_number'].includes(header)) {
          entry[header] = value ? parseInt(value, 10) : 0;
        } else {
          entry[header] = value;
        }
      });
      
      return entry;
    });
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  async loadSleeperPlayerData() {
    console.log('📖 Loading Sleeper player data...');
    
    if (!fs.existsSync(this.playersDataPath)) {
      console.warn('⚠️  Sleeper player data not found. Run fetch-player-data.js first.');
      return {};
    }

    const data = JSON.parse(fs.readFileSync(this.playersDataPath, 'utf8'));
    console.log(`✅ Loaded ${data.totalPlayers} Sleeper players`);
    return data.players;
  }

  buildPlayerMappings(sleeperPlayers, nflverseRosters) {
    console.log('🔗 Building player mappings between Sleeper and NFLverse...');
    
    const mappings = [];
    let exactMatches = 0;
    let fuzzyMatches = 0;
    let noMatches = 0;

    for (const [sleeperId, sleeperPlayer] of Object.entries(sleeperPlayers)) {
      if (!sleeperPlayer.active || !sleeperPlayer.position || !sleeperPlayer.full_name) {
        continue;
      }

      const mapping = this.findPlayerMapping(sleeperPlayer, nflverseRosters, sleeperId);
      if (mapping) {
        mappings.push(mapping);
        if (mapping.matchedOn === 'exact_name') {
          exactMatches++;
        } else {
          fuzzyMatches++;
        }
      } else {
        noMatches++;
      }
    }
    
    console.log(`✅ Created ${mappings.length} mappings:`);
    console.log(`   - ${exactMatches} exact matches`);
    console.log(`   - ${fuzzyMatches} fuzzy matches`);
    console.log(`   - ${noMatches} players without matches`);
    
    return mappings;
  }

  findPlayerMapping(sleeperPlayer, nflverseRosters, sleeperId) {
    const { full_name, position } = sleeperPlayer;
    
    // Try exact name match first
    const exactMatch = nflverseRosters.find(roster =>
      this.normalizePlayerName(roster.full_name) === this.normalizePlayerName(full_name) &&
      this.normalizePosition(roster.position) === this.normalizePosition(position)
    );

    if (exactMatch) {
      return {
        sleeperId,
        nflverseKey: this.createNFLverseKey(exactMatch.full_name, exactMatch.position),
        sleeperName: full_name,
        nflverseName: exactMatch.full_name,
        position: exactMatch.position,
        confidence: 'high',
        matchedOn: 'exact_name'
      };
    }

    // Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(sleeperPlayer, nflverseRosters);
    if (fuzzyMatch) {
      return {
        sleeperId,
        nflverseKey: this.createNFLverseKey(fuzzyMatch.full_name, fuzzyMatch.position),
        sleeperName: full_name,
        nflverseName: fuzzyMatch.full_name,
        position: fuzzyMatch.position,
        confidence: 'medium',
        matchedOn: 'fuzzy_name'
      };
    }

    return null;
  }

  findFuzzyMatch(sleeperPlayer, nflverseRosters) {
    const normalizedSleeperName = this.normalizePlayerName(sleeperPlayer.full_name);
    const sleeperPosition = this.normalizePosition(sleeperPlayer.position);
    
    // Filter by position first
    const samePositionPlayers = nflverseRosters.filter(roster =>
      this.normalizePosition(roster.position) === sleeperPosition
    );

    // Check for partial matches (simple approach for the script)
    for (const roster of samePositionPlayers) {
      const normalizedRosterName = this.normalizePlayerName(roster.full_name);
      
      // Check if last names match and first names are similar
      const sleeperParts = normalizedSleeperName.split(' ');
      const rosterParts = normalizedRosterName.split(' ');
      
      if (sleeperParts.length >= 2 && rosterParts.length >= 2) {
        // Last name should match
        const sleeperLast = sleeperParts[sleeperParts.length - 1];
        const rosterLast = rosterParts[rosterParts.length - 1];
        
        if (sleeperLast === rosterLast) {
          // Check if first name or initials match
          const sleeperFirst = sleeperParts[0];
          const rosterFirst = rosterParts[0];
          
          if (sleeperFirst === rosterFirst || 
              sleeperFirst.startsWith(rosterFirst) || 
              rosterFirst.startsWith(sleeperFirst)) {
            return roster;
          }
        }
      }
    }

    return null;
  }

  normalizePlayerName(name) {
    return name
      .toLowerCase()
      .replace(/[.\-']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizePosition(position) {
    const positionMap = {
      'def': 'dst',
      'dst': 'dst',
      'defense': 'dst'
    };
    
    const normalized = position.toLowerCase();
    return positionMap[normalized] || normalized;
  }

  createNFLverseKey(fullName, position) {
    return `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${position.toLowerCase()}`;
  }

  buildHistoricalTeamLookup(nflverseRosters, playerMappings) {
    console.log('📊 Building historical team lookup data...');
    
    const lookup = {};
    let totalEntries = 0;
    
    // Create a map of NFLverse keys from mappings for faster lookup
    const nflverseKeys = new Set(playerMappings.map(m => m.nflverseKey));
    
    nflverseRosters.forEach(roster => {
      const playerKey = this.createNFLverseKey(roster.full_name, roster.position);
      
      // Only include players that we have mappings for (to reduce size)
      if (nflverseKeys.has(playerKey)) {
        if (!lookup[playerKey]) {
          lookup[playerKey] = {};
        }
        
        lookup[playerKey][roster.season] = {
          team: roster.team,
          full_name: roster.full_name,
          position: roster.position,
          games: roster.games || 0,
          starts: roster.starts || 0
        };
        totalEntries++;
      }
    });
    
    console.log(`✅ Built lookup with ${Object.keys(lookup).length} players and ${totalEntries} season entries`);
    return lookup;
  }

  async saveData(playerMappings, historicalTeamLookup, nflverseRosters) {
    console.log('💾 Saving historical team data...');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Save player mappings
    const mappingsData = {
      lastUpdated: new Date().toISOString(),
      totalMappings: playerMappings.length,
      mappings: playerMappings
    };
    
    const mappingsPath = path.join(this.outputDir, 'player-mappings.json');
    fs.writeFileSync(mappingsPath, JSON.stringify(mappingsData, null, 2));
    console.log(`✅ Saved ${playerMappings.length} player mappings to: ${mappingsPath}`);

    // Save historical team lookup
    const lookupData = {
      lastUpdated: new Date().toISOString(),
      totalPlayers: Object.keys(historicalTeamLookup).length,
      totalSeasonEntries: Object.values(historicalTeamLookup).reduce((sum, player) => 
        sum + Object.keys(player).length, 0
      ),
      dataSourceSeasons: [...new Set(nflverseRosters.map(r => r.season))].sort((a, b) => a - b),
      historicalTeams: historicalTeamLookup
    };
    
    const lookupPath = path.join(this.outputDir, 'historical-teams.json');
    fs.writeFileSync(lookupPath, JSON.stringify(lookupData, null, 2));
    console.log(`✅ Saved historical team data to: ${lookupPath}`);

    // Calculate file sizes
    const mappingsSize = fs.statSync(mappingsPath).size;
    const lookupSize = fs.statSync(lookupPath).size;
    console.log(`📦 Mappings file: ${(mappingsSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📦 Historical teams file: ${(lookupSize / 1024 / 1024).toFixed(2)} MB`);
  }

  async run() {
    try {
      console.log('🚀 Starting historical NFL team data fetch...');
      
      // Load existing Sleeper player data
      const sleeperPlayers = await this.loadSleeperPlayerData();
      
      // Fetch NFLverse roster data
      const nflverseRosters = await this.fetchNFLverseRosterData();
      const seasons = [...new Set(nflverseRosters.map(r => r.season))].sort((a, b) => a - b);
      console.log(`📊 NFLverse data covers Sleeper era seasons: ${seasons.join(', ')}`);
      
      // Build player mappings
      const playerMappings = this.buildPlayerMappings(sleeperPlayers, nflverseRosters);
      
      // Build historical team lookup
      const historicalTeamLookup = this.buildHistoricalTeamLookup(nflverseRosters, playerMappings);
      
      // Save all data
      await this.saveData(playerMappings, historicalTeamLookup, nflverseRosters);
      
      console.log('🎉 Historical NFL team data fetch complete for all draft years!');
      console.log('💡 This data will be used to show accurate team affiliations for:');
      console.log('   📊 Sleeper drafts (2021-2024): Week 1 teams instead of season-end teams');
      console.log('   🔧 ESPN drafts (2018-2020): Week 1 teams for players showing as "FA"');
      
    } catch (error) {
      console.error('💥 Script failed:', error);
      process.exit(1);
    }
  }
}

// Run the script
async function main() {
  const fetcher = new HistoricalTeamDataFetcher();
  await fetcher.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { HistoricalTeamDataFetcher };