#!/usr/bin/env node

/**
 * Script to fetch Sleeper custom team logos for all league members
 * and store them locally in the public/team-logos directory
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// League configurations - only completed seasons (active seasons use live API)
const LEAGUES = [
  // 2024 Leagues (completed seasons only)
  { id: '1124841088360660992', year: '2024', tier: 'PREMIER', status: 'completed' },
  { id: '1124833010697379840', year: '2024', tier: 'MASTERS', status: 'completed' },
  { id: '1124834889196134400', year: '2024', tier: 'NATIONAL', status: 'completed' },
  
  // 2023 Leagues  
  { id: '989237166217723904', year: '2023', tier: 'PREMIER', status: 'completed' },
  { id: '989238596353794048', year: '2023', tier: 'MASTERS', status: 'completed' },
  { id: '989240797381951488', year: '2023', tier: 'NATIONAL', status: 'completed' },
  
  // 2022 Leagues
  { id: '856271024054996992', year: '2022', tier: 'PREMIER', status: 'completed' },
  { id: '856271401471029248', year: '2022', tier: 'MASTERS', status: 'completed' },
  { id: '856271753788403712', year: '2022', tier: 'NATIONAL', status: 'completed' },
  
  // Note: 2025 active seasons are excluded - they use live API
];

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1';
const OUTPUT_DIR = path.join(path.dirname(__dirname), 'public', 'team-logos', 'sleeper');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Helper function to make HTTP requests
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON from ${url}: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper function to download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', reject);
  });
}

// Helper function to get file extension from URL
function getFileExtension(url) {
  const match = url.match(/\\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : 'jpg'; // Default to jpg
}

// Helper function to extract logo ID from Sleeper URL
function getLogoId(url) {
  const match = url.match(/uploads\/([^/?#]+)/);
  if (match) {
    // Remove any file extension from the logo ID
    const logoId = match[1];
    return logoId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  }
  return null;
}

// Main function to fetch team logos for all leagues
async function fetchAllTeamLogos() {
  console.log('🚀 Starting team logo fetch for FFU leagues...\n');
  
  const allTeams = new Set(); // Track unique teams across leagues
  const teamLogoMap = new Map(); // Map user_id to logo info
  let totalFetched = 0;
  let totalSkipped = 0;

  try {
    // Step 1: Collect all unique teams across all leagues
    for (const league of LEAGUES) {
      console.log(`📋 Fetching users for ${league.tier} ${league.year}...`);
      
      try {
        const users = await fetchJSON(`${SLEEPER_API_BASE}/league/${league.id}/users`);
        console.log(`   Found ${users.length} users`);
        
        let usersWithLogos = 0;
        users.forEach(user => {
          const teamLogo = user.metadata?.avatar;
          const teamName = user.metadata?.team_name || user.display_name;
          
          if (teamLogo && teamLogo.startsWith('https://sleepercdn.com/uploads/')) {
            allTeams.add(user.user_id);
            const logoId = getLogoId(teamLogo);
            const extension = getFileExtension(teamLogo);
            
            teamLogoMap.set(user.user_id, {
              logoUrl: teamLogo,
              logoId: logoId,
              teamName: teamName,
              displayName: user.display_name,
              extension: extension,
              filename: `${logoId}.${extension}`
            });
            usersWithLogos++;
          }
        });
        
        console.log(`   Found ${usersWithLogos} users with custom team logos`);
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error fetching users for ${league.tier} ${league.year}:`, error.message);
      }
    }

    console.log(`\n📊 Found ${allTeams.size} unique teams with custom logos`);
    console.log(`📁 Team logo directory: ${OUTPUT_DIR}\n`);

    // Step 2: Download all unique team logos
    let processed = 0;
    for (const [userId, logoData] of teamLogoMap.entries()) {
      const { logoUrl, logoId, teamName, filename, extension } = logoData;
      const filepath = path.join(OUTPUT_DIR, filename);
      
      processed++;
      console.log(`[${processed}/${teamLogoMap.size}] Processing ${teamName} (${logoId})...`);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`   ⏭️  Already exists, skipping`);
        totalSkipped++;
        continue;
      }
      
      try {
        await downloadImage(logoUrl, filepath);
        console.log(`   ✅ Downloaded: ${filename}`);
        totalFetched++;
        
        // Small delay to be respectful to the CDN
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Step 3: Create metadata file
    const metadata = {
      generated: new Date().toISOString(),
      totalTeams: teamLogoMap.size,
      totalFetched,
      totalSkipped,
      teams: Object.fromEntries(
        Array.from(teamLogoMap.entries()).map(([userId, logoData]) => [
          userId,
          {
            logoId: logoData.logoId,
            logoUrl: logoData.logoUrl,
            teamName: logoData.teamName,
            displayName: logoData.displayName,
            filename: logoData.filename,
            extension: logoData.extension
          }
        ])
      )
    };

    const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`\n📋 Created metadata file: ${metadataPath}`);

    // Summary
    console.log('\n🎉 Team logo fetch complete!');
    console.log(`   📥 Downloaded: ${totalFetched} new team logos`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} existing team logos`);
    console.log(`   📁 Location: ${OUTPUT_DIR}`);
    console.log(`   📋 Metadata: ${metadataPath}`);

    if (totalFetched === 0 && totalSkipped === 0) {
      console.log('\n⚠️  No custom team logos found. Users may not have uploaded team logos yet.');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fetchAllTeamLogos().catch(console.error);

export { fetchAllTeamLogos };