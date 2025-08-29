/**
 * Standings command - Show league standings
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('standings')
  .setDescription('Show FFU league standings')
  .addStringOption(option =>
    option.setName('league')
      .setDescription('The league to check')
      .setRequired(true)
      .addChoices(
        { name: 'Premier League', value: 'PREMIER' },
        { name: 'Masters League', value: 'MASTERS' },
        { name: 'National League', value: 'NATIONAL' }
      ))
  .addStringOption(option =>
    option.setName('year')
      .setDescription('The year to check (defaults to current year)')
      .setRequired(false));

export async function execute(interaction, ffuService) {
  const league = interaction.options.getString('league');
  const year = interaction.options.getString('year') || new Date().getFullYear().toString();

  try {
    await interaction.deferReply();

    // Validate league and year
    if (!ffuService.isValidLeagueYear(league, year)) {
      const availableYears = ffuService.getAvailableYears(league);
      return await interaction.editReply({
        content: `❌ Invalid year for ${ffuService.getLeagueDisplayName(league)}.\nAvailable years: ${availableYears.join(', ')}`,
        ephemeral: true
      });
    }

    const standings = await ffuService.getStandings(league, year);
    
    if (!standings || standings.length === 0) {
      return await interaction.editReply({
        content: `❌ No standings data found for ${ffuService.getLeagueDisplayName(league)} ${year}`,
        ephemeral: true
      });
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${ffuService.getLeagueDisplayName(league)} Standings - ${year}`)
      .setColor(getLeagueColor(league))
      .setTimestamp()
      .setFooter({ text: 'FFU Bot - Fantasy Football Union' });

    // Sort standings by rank
    const sortedStandings = standings.sort((a, b) => a.rank - b.rank);

    // Create standings text
    let standingsText = '';
    sortedStandings.slice(0, 12).forEach((team, index) => {
      const rank = team.rank || (index + 1);
      const teamName = getTeamDisplayName(team, ffuService);
      const record = `${team.wins}-${team.losses}`;
      const points = team.pointsFor ? team.pointsFor.toFixed(1) : '0.0';
      
      const rankEmoji = getRankEmoji(rank);
      standingsText += `${rankEmoji} **${rank}.** ${teamName}\n`;
      standingsText += `     ${record} • ${points} pts\n\n`;
    });

    embed.setDescription(standingsText.trim());

    // Add playoff info if available
    const playoffCutoff = Math.min(6, sortedStandings.length);
    if (playoffCutoff > 0) {
      embed.addFields({
        name: '📊 Playoff Format',
        value: `Top ${playoffCutoff} teams make playoffs`,
        inline: true
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in standings command:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch standings: ${error.message}`,
      ephemeral: true
    });
  }
}

function getLeagueColor(league) {
  const colors = {
    'PREMIER': 0xFFD700,  // Gold
    'MASTERS': 0x9B59B6,  // Purple
    'NATIONAL': 0xE74C3C  // Red
  };
  return colors[league] || 0x3498DB;
}

function getRankEmoji(rank) {
  const emojis = {
    1: '🥇',
    2: '🥈', 
    3: '🥉',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣'
  };
  return emojis[rank] || `${rank}️⃣`;
}

function getTeamDisplayName(team, ffuService) {
  // Try to get team name from userInfo first
  if (team.userInfo?.teamName && team.userInfo.teamName.trim()) {
    return team.userInfo.teamName;
  }
  
  // Use FFU service to get team name from mapping
  if (team.userId) {
    return ffuService.getTeamName(team.userId);
  }
  
  return 'Unknown Team';
}