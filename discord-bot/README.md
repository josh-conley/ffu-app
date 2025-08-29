# FFU Discord Bot

A Discord bot that provides Fantasy Football Union (FFU) league data including standings, draft results, and matchups.

## Features

- 🏆 **Standings** - View current league standings
- 🏈 **Draft Results** - Show draft picks by round or full draft summary
- 📊 **Real-time Data** - Fetches data directly from your FFU website
- 🎯 **Multi-league Support** - Premier, Masters, and National leagues
- ⚡ **Slash Commands** - Modern Discord slash command interface
- 💾 **Smart Caching** - Reduces API calls with 5-minute cache

## Setup Instructions

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "FFU Bot")
3. Go to the "Bot" section and click "Add Bot"
4. Copy the bot token (you'll need this later)
5. Go to the "General Information" section and copy the Client ID

### 2. Set Up Bot Permissions

In the Discord Developer Portal:
1. Go to the "Bot" section
2. Under "Privileged Gateway Intents", enable:
   - Message Content Intent (if needed)
3. Go to the "OAuth2" > "URL Generator" section
4. Select scopes: `bot` and `applications.commands`
5. Select bot permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`
6. Copy the generated URL and use it to invite the bot to your server

### 3. Install Dependencies

```bash
cd discord-bot
npm install
```

### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here

   # FFU Data Configuration  
   FFU_DATA_BASE_URL=https://josh-conley.github.io/ffu-app/data
   ```

### 5. Deploy Commands to Discord

```bash
node deploy-commands.js
```

This registers the slash commands with Discord. You only need to run this once, or whenever you modify commands.

### 6. Start the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Available Commands

### `/standings`
Show league standings for any year and league.

**Options:**
- `league` (required) - Premier, Masters, or National
- `year` (optional) - Defaults to current year

**Example:**
```
/standings league:Masters year:2024
```

### `/draft` 
Show draft results with detailed player information.

**Options:**
- `league` (required) - Premier, Masters, or National  
- `year` (optional) - Defaults to current year
- `round` (optional) - Show specific round (1-15)

**Examples:**
```
/draft league:National year:2025
/draft league:Masters year:2024 round:1
```

## Data Source

The bot fetches data directly from your FFU website at:
`https://josh-conley.github.io/ffu-app/data/`

Data includes:
- League standings with wins/losses/points
- Complete draft results with player info
- Historical data back to 2018 (2022 for Masters)

## Architecture

```
discord-bot/
├── src/
│   ├── commands/          # Slash command definitions
│   │   ├── standings.js   # Standings command
│   │   └── draft.js       # Draft command  
│   └── services/
│       └── ffuDataService.js  # FFU data fetching service
├── index.js               # Main bot file
├── deploy-commands.js     # Command deployment script
└── package.json
```

## Development

### Adding New Commands

1. Create a new file in `src/commands/`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Run `node deploy-commands.js` to register the new command
4. Restart the bot

### Command Template

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('commandname')
  .setDescription('Command description');

export async function execute(interaction, ffuService) {
  // Your command logic here
  await interaction.reply('Hello!');
}
```

### Data Service Methods

The `ffuService` provides these methods:

- `getStandings(league, year)` - Get league standings
- `getDraftData(league, year)` - Get draft information
- `getMatchups(league, year, week)` - Get weekly matchups
- `isValidLeagueYear(league, year)` - Validate league/year combo
- `getLeagueDisplayName(league)` - Get formatted league name

## Troubleshooting

### Bot doesn't respond to commands
- Check that commands were deployed: `node deploy-commands.js`
- Verify bot has correct permissions in your Discord server
- Check console for error messages

### "Invalid year" errors
- Masters league only available from 2022+
- Premier/National available from 2018+
- Check that data exists on your website

### Data fetch errors
- Verify your website is accessible
- Check the `FFU_DATA_BASE_URL` in your `.env` file
- Ensure JSON files are properly formatted

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the FFU app and follows the same license.