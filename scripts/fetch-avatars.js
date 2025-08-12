#!/usr/bin/env node

/**
 * Script to fetch Sleeper avatars for all league members
 * and store them locally in the public/avatars directory
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
const SLEEPER_CDN_BASE = 'https://sleepercdn.com/avatars/thumbs';
const OUTPUT_DIR = path.join(path.dirname(__dirname), 'public', 'avatars');

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
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
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

// Main function to fetch avatars for all leagues
async function fetchAllAvatars() {
  console.log('🚀 Starting avatar fetch for FFU leagues...\n');
  
  const allUsers = new Set(); // Track unique users across leagues
  const userAvatarMap = new Map(); // Map user_id to avatar_id
  let totalFetched = 0;
  let totalSkipped = 0;

  try {
    // Step 1: Collect all unique users across all leagues
    for (const league of LEAGUES) {
      console.log(`📋 Fetching users for ${league.tier} ${league.year}...`);
      
      try {
        const users = await fetchJSON(`${SLEEPER_API_BASE}/league/${league.id}/users`);
        console.log(`   Found ${users.length} users`);
        
        users.forEach(user => {
          if (user.avatar) {
            allUsers.add(user.user_id);
            userAvatarMap.set(user.user_id, {
              avatar: user.avatar,
              display_name: user.display_name || user.username,
              username: user.username
            });
          }
        });
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ Error fetching users for ${league.tier} ${league.year}:`, error.message);
      }
    }

    console.log(`\n📊 Found ${allUsers.size} unique users with avatars`);
    console.log(`📁 Avatar directory: ${OUTPUT_DIR}\n`);

    // Step 2: Download all unique avatars
    let processed = 0;
    for (const [userId, userData] of userAvatarMap.entries()) {
      const avatarId = userData.avatar;
      const filename = `${avatarId}.jpg`; // Sleeper avatars are typically JPG
      const filepath = path.join(OUTPUT_DIR, filename);
      
      processed++;
      console.log(`[${processed}/${userAvatarMap.size}] Processing ${userData.display_name} (${avatarId})...`);
      
      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`   ⏭️  Already exists, skipping`);
        totalSkipped++;
        continue;
      }
      
      try {
        const avatarUrl = `${SLEEPER_CDN_BASE}/${avatarId}`;
        await downloadImage(avatarUrl, filepath);
        console.log(`   ✅ Downloaded: ${filename}`);
        totalFetched++;
        
        // Small delay to be respectful to the CDN
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // Step 3: Create metadata file
    const metadata = {
      generated: new Date().toISOString(),
      totalUsers: userAvatarMap.size,
      totalFetched,
      totalSkipped,
      users: Object.fromEntries(
        Array.from(userAvatarMap.entries()).map(([userId, userData]) => [
          userId,
          {
            avatar: userData.avatar,
            display_name: userData.display_name,
            username: userData.username,
            filename: `${userData.avatar}.jpg`
          }
        ])
      )
    };

    const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`\n📋 Created metadata file: ${metadataPath}`);

    // Summary
    console.log('\n🎉 Avatar fetch complete!');
    console.log(`   📥 Downloaded: ${totalFetched} new avatars`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} existing avatars`);
    console.log(`   📁 Location: ${OUTPUT_DIR}`);
    console.log(`   📋 Metadata: ${metadataPath}`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fetchAllAvatars().catch(console.error);

export { fetchAllAvatars };