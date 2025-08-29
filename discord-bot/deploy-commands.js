/**
 * Deploy slash commands to Discord
 * Run this script whenever you add or modify commands
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
  
  console.log(`📝 Loading ${jsFiles.length} commands for deployment...`);
  
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

// Deploy commands
async function deployCommands() {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
  
  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.error('❌ Missing required environment variables:');
    if (!DISCORD_TOKEN) console.error('  - DISCORD_TOKEN');
    if (!DISCORD_CLIENT_ID) console.error('  - DISCORD_CLIENT_ID');
    console.error('📝 Please check your .env file');
    process.exit(1);
  }
  
  const rest = new REST().setToken(DISCORD_TOKEN);
  
  try {
    console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);
    
    // Deploy commands globally (takes up to 1 hour to propagate)
    const data = await rest.put(
      Routes.applicationCommands(DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally.`);
    console.log('⏰ Note: Global commands may take up to 1 hour to update in Discord.');
    
    // Optional: Deploy to specific guild for instant updates during development
    // Uncomment and add DISCORD_GUILD_ID to your .env for instant testing
    /*
    if (process.env.DISCORD_GUILD_ID) {
      const guildData = await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Also deployed ${guildData.length} commands to test guild (instant).`);
    }
    */
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

// Run deployment
async function main() {
  console.log('🤖 FFU Bot - Command Deployment');
  console.log('================================');
  
  try {
    await loadCommands();
    await deployCommands();
    
    console.log('\n🎉 Command deployment complete!');
    console.log('💡 You can now use the bot commands in Discord.');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

main();