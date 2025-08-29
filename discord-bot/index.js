/**
 * FFU Discord Bot - Main entry point
 */

import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import { FFUDataService } from './src/services/ffuDataService.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Initialize FFU Data Service
const ffuService = new FFUDataService();

// Collection to store commands
client.commands = new Collection();

// Load commands
async function loadCommands() {
  const commandsPath = join(__dirname, 'src', 'commands');
  
  try {
    const commandFiles = await readdir(commandsPath);
    const jsFiles = commandFiles.filter(file => file.endsWith('.js'));
    
    console.log(`Loading ${jsFiles.length} commands...`);
    
    for (const file of jsFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(`file://${filePath}`);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`❌ Command ${file} is missing required "data" or "execute" property`);
      }
    }
  } catch (error) {
    console.error('Error loading commands:', error);
  }
}

// Bot ready event
client.once(Events.ClientReady, readyClient => {
  console.log(`🤖 FFU Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`📊 Serving data from: ${process.env.FFU_DATA_BASE_URL || 'https://josh-conley.github.io/ffu-app/data'}`);
  
  // Set bot status
  client.user.setActivity('FFU League Data', { type: 'WATCHING' });
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    console.log(`Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
    await command.execute(interaction, ffuService);
  } catch (error) {
    console.error('Error executing command:', error);
    
    const errorMessage = 'There was an error while executing this command!';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle errors
client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down FFU Bot...');
  client.destroy();
  process.exit(0);
});

// Start the bot
async function startBot() {
  try {
    console.log('🚀 Starting FFU Discord Bot...');
    
    // Load commands
    await loadCommands();
    
    // Check for required environment variables
    if (!process.env.DISCORD_TOKEN) {
      console.error('❌ DISCORD_TOKEN is not set in environment variables');
      console.error('📝 Please copy .env.example to .env and add your bot token');
      process.exit(1);
    }
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Test FFU service on startup
async function testFFUService() {
  try {
    console.log('🧪 Testing FFU data service...');
    const testData = await ffuService.getStandings('NATIONAL', '2024');
    console.log(`✅ FFU service working - found ${testData.length} teams in National 2024`);
  } catch (error) {
    console.warn('⚠️ FFU service test failed:', error.message);
    console.warn('   Bot will still start, but data fetching may not work');
  }
}

// Initialize everything
testFFUService();
startBot();