/**
 * Script to generate current season data JSON files from Sleeper API
 * Run this script to populate the /public/data directory with only active league data
 * 
 * Usage: node scripts/generate-current-season.js
 */

import { HistoricalDataGenerator } from './generate-historical-data.js';

// Run the current season data generation
async function main() {
  const generator = new HistoricalDataGenerator();
  await generator.generateCurrentSeasonData();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}