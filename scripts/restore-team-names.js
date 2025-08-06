#!/usr/bin/env node

/**
 * Script to restore team names in CSV files while keeping anonymized usernames
 * This fixes the issue where team names got accidentally anonymized
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Original team names from the ESPN data (from our earlier analysis)
const ORIGINAL_TEAM_NAMES = {
  'P18': [
    'The Minutemen',
    'Disney\'s PigskinSlingers', 
    'Durham Handsome Devils',
    'FFUcked Up',
    'The Stallions',
    'Not Your Average Joes',
    'Blood, Sweat and Beers',
    'Bailando Cabras',
    'Indianapolis Aztecs',
    'El Guapo Puto',
    'The Losers',
    'Currier Island Raging Rhinos'
  ],
  'N18': [
    'Goat Emoji',
    'Oklahoma Banana Bread',
    'Team Dogecoin',
    'The Well Done Stakes',
    'Stark Direwolves',
    'Circle City Phantoms',
    'Team Jacamart',
    'Shton\'s Strikers',
    'Stone Cold Steve Irwins',
    'Always Sunny in Camdelphia',
    'Purple Parade',
    'Browntown'
  ]
};

class TeamNameRestorer {
  constructor() {
    this.inputDir = path.join(__dirname, '../public/old-league-data');
  }

  // Parse CSV row
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

  // Build CSV row
  buildRow(values) {
    return values.map(value => {
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }

  // Restore team names in a file
  restoreFile(filename) {
    const filePath = path.join(this.inputDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}`);
      return false;
    }

    // Extract league/year from filename (e.g., "Teams P18.csv" -> "P18")
    const match = filename.match(/Teams ([PN]\d{2})\.csv/);
    if (!match) {
      console.log(`⚠️  Could not parse league/year from ${filename}`);
      return false;
    }

    const leagueYear = match[1];
    const originalTeamNames = ORIGINAL_TEAM_NAMES[leagueYear];
    if (!originalTeamNames) {
      console.log(`⚠️  No original team names found for ${leagueYear}`);
      return false;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) {
        console.log(`⚠️  Empty file: ${filename}`);
        return false;
      }

      console.log(`🔄 Restoring team names in ${filename}...`);

      // Process each data row (skip header)
      const restoredLines = [lines[0]]; // Keep header
      
      for (let i = 1; i <= originalTeamNames.length && i < lines.length; i++) {
        const values = this.parseRow(lines[i]);
        
        // Replace the first column (Team/Member) with original team name
        values[0] = originalTeamNames[i - 1];
        
        restoredLines.push(this.buildRow(values));
      }

      // Write back to file
      fs.writeFileSync(filePath, restoredLines.join('\n'));
      console.log(`✅ Restored team names in ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
      return false;
    }
  }

  // Restore all team files
  async restoreAllFiles() {
    console.log('🚀 Starting team name restoration...');

    const files = ['ESPN Fantasy Scrapes - Teams P18.csv', 'ESPN Fantasy Scrapes - Teams N18.csv'];
    let successCount = 0;

    for (const file of files) {
      if (this.restoreFile(file)) {
        successCount++;
      }
    }

    console.log('\n📊 Restoration Summary');
    console.log('═'.repeat(50));
    console.log(`✅ Successfully restored: ${successCount}`);
    console.log(`❌ Failed: ${files.length - successCount}`);
    console.log('\n🎉 Team name restoration complete!');
  }
}

// Run the script
async function main() {
  const restorer = new TeamNameRestorer();
  await restorer.restoreAllFiles();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TeamNameRestorer };