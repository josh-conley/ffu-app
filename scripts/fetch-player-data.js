/**
 * Script to fetch and cache NFL player data from Sleeper API
 * This should be run manually 2-3 times per year to update player database
 * 
 * Usage: node scripts/fetch-player-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PlayerDataFetcher {
  constructor() {
    this.baseUrl = 'https://api.sleeper.app/v1';
    this.outputDir = path.join(__dirname, '../public/data/players');
  }

  async fetchNFLPlayers() {
    console.log('🏈 Fetching NFL player data from Sleeper API...');
    console.log('⚠️  This is a ~5MB download and should only be done 2-3 times per year');

    try {
      const response = await fetch(`${this.baseUrl}/players/nfl`);
      if (!response.ok) {
        throw new Error(`Failed to fetch NFL players: ${response.statusText}`);
      }

      const players = await response.json();
      console.log(`✅ Retrieved ${Object.keys(players).length} players`);

      // Calculate file size
      const dataString = JSON.stringify(players);
      const sizeInMB = (Buffer.byteLength(dataString, 'utf8') / (1024 * 1024)).toFixed(2);
      console.log(`📊 Data size: ${sizeInMB} MB`);

      return players;
    } catch (error) {
      console.error('❌ Failed to fetch NFL players:', error);
      throw error;
    }
  }

  async savePlayerData(players) {
    console.log('💾 Saving player data...');

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const filepath = path.join(this.outputDir, 'nfl-players.json');
    
    // Save with current timestamp for reference
    const playerDataWithMetadata = {
      lastUpdated: new Date().toISOString(),
      totalPlayers: Object.keys(players).length,
      players: players
    };

    fs.writeFileSync(filepath, JSON.stringify(playerDataWithMetadata, null, 2));
    console.log(`✅ Player data saved to: ${filepath}`);

    // Also save a compressed version for size comparison
    const compressedFilepath = path.join(this.outputDir, 'nfl-players-compressed.json');
    fs.writeFileSync(compressedFilepath, JSON.stringify(playerDataWithMetadata));
    
    const originalSize = fs.statSync(filepath).size;
    const compressedSize = fs.statSync(compressedFilepath).size;
    console.log(`📦 Original size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`📦 Compressed size: ${(compressedSize / (1024 * 1024)).toFixed(2)} MB`);
  }

  async run() {
    try {
      console.log('🚀 Starting NFL player data fetch...');
      
      const players = await this.fetchNFLPlayers();
      await this.savePlayerData(players);
      
      console.log('🎉 NFL player data fetch complete!');
      console.log('💡 Remember: Only run this script 2-3 times per year to respect Sleeper API guidelines');
      
    } catch (error) {
      console.error('💥 Script failed:', error);
      process.exit(1);
    }
  }
}

// Run the script
async function main() {
  const fetcher = new PlayerDataFetcher();
  await fetcher.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PlayerDataFetcher };