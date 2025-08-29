/**
 * Deploy slash commands to a specific Discord guild for instant testing
 * Usage: DISCORD_GUILD_ID=your_server_id node deploy-guild-commands.js
 */

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

// Load all command files
async function loadCommands() {
  const commandsPath = join(__dirname, 'src', 'commands');
  const commandFiles = await readdir(commandsPath);
  const jsFiles = commandFiles.filter(file => file.endsWith('.js'));
  
  console.log(`📝 Loading ${jsFiles.length} commands for guild deployment...`);
  
  for (const file of jsFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    
    if ('data' in command) {
      commands.push(command.data.toJSON());
      console.log(`✅ Loaded: ${command.data.name}`);
    } else {
      console.log(`❌ Skipped ${file}: missing 'data' property`);
    }
  }
}

// Deploy commands to guild
async function deployGuildCommands() {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
  
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.error('❌ Missing required environment variables:');
    if (!DISCORD_TOKEN) console.error('  - DISCORD_TOKEN');
    if (!DISCORD_CLIENT_ID) console.error('  - DISCORD_CLIENT_ID');
    process.exit(1);
  }
  
  if (!DISCORD_GUILD_ID) {
    console.error('❌ Missing DISCORD_GUILD_ID environment variable');
    console.error('💡 Usage: DISCORD_GUILD_ID=your_server_id node deploy-guild-commands.js');
    console.error('💡 Get your server ID: Right-click server name → Copy Server ID');
    process.exit(1);
  }
  
  const rest = new REST().setToken(DISCORD_TOKEN);
  
  try {
    console.log(`🚀 Started refreshing ${commands.length} guild commands for server ${DISCORD_GUILD_ID}.`);
    
    // Deploy commands to specific guild (instant)
    const data = await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully deployed ${data.length} guild commands (available immediately).`);
    console.log('🎉 You can now test /ping and /test commands in your Discord server!');
    
  } catch (error) {
    console.error('❌ Error deploying guild commands:', error);
  }
}

// Run deployment
async function main() {
  console.log('🤖 FFU Bot - Guild Command Deployment (Instant Testing)');
  console.log('======================================================');
  
  try {
    await loadCommands();
    await deployGuildCommands();
    
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

main();