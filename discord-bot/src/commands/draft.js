/**
 * Draft command - Show draft results
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('draft')
  .setDescription('Show FFU draft results')
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
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('round')
      .setDescription('Show specific round (1-15)')
      .setMinValue(1)
      .setMaxValue(15)
      .setRequired(false));

export async function execute(interaction, ffuService) {
  const league = interaction.options.getString('league');
  const year = interaction.options.getString('year') || new Date().getFullYear().toString();
  const round = interaction.options.getInteger('round');

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

    console.log('Fetching draft data...');
    const draftData = await ffuService.getDraftData(league, year);
    console.log('Draft data received:', {
      hasDraftData: !!draftData,
      hasPicks: !!draftData?.picks,
      picksLength: draftData?.picks?.length,
      status: draftData?.status
    });
    
    if (!draftData || !draftData.picks || draftData.picks.length === 0) {
      console.log('No draft data available, sending error response');
      return await interaction.editReply({
        content: `❌ No draft data found for ${ffuService.getLeagueDisplayName(league)} ${year}.\n${draftData?.status === 'pre_draft' ? 'Draft has not started yet.' : 'Draft data may not be available.'}`,
        ephemeral: true
      });
    }

    console.log('Creating embed...');
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`🏈 ${ffuService.getLeagueDisplayName(league)} Draft - ${year}`)
      .setColor(getLeagueColor(league))
      .setTimestamp()
      .setFooter({ text: 'FFU Bot - Fantasy Football Union' });

    console.log('Sorting picks...');
    const picks = draftData.picks.sort((a, b) => a.pickNumber - b.pickNumber);
    console.log(`Sorted ${picks.length} picks`);

    if (round) {
      // Show specific round
      const roundPicks = picks.filter(pick => pick.round === round);
      
      if (roundPicks.length === 0) {
        return await interaction.editReply({
          content: `❌ No picks found for round ${round}`,
          ephemeral: true
        });
      }

      embed.setTitle(`🏈 ${ffuService.getLeagueDisplayName(league)} Draft - Round ${round} (${year})`);
      
      let draftText = '';
      roundPicks.forEach(pick => {
        const player = pick.playerInfo;
        const teamName = getTeamDisplayName(pick.userInfo, ffuService);
        const positionEmoji = getPositionEmoji(player.position);
        
        draftText += `**${pick.pickNumber}.** ${positionEmoji} **${player.name}** (${player.position})\n`;
        draftText += `     ${player.team} • ${teamName}\n\n`;
      });

      embed.setDescription(draftText.trim());
      
    } else {
      // Show draft summary
      const totalPicks = picks.length;
      const totalRounds = Math.max(...picks.map(p => p.round));
      const teamsCount = draftData.settings?.teams || 12;
      
      embed.setDescription(`Draft completed with ${totalPicks} picks across ${totalRounds} rounds.`);
      
      // Add draft status
      if (draftData.status) {
        embed.addFields({
          name: '📊 Draft Status',
          value: formatDraftStatus(draftData.status),
          inline: true
        });
      }

      // Show first round picks
      const firstRound = picks.filter(pick => pick.round === 1).slice(0, 12);
      if (firstRound.length > 0) {
        let firstRoundText = '';
        firstRound.forEach(pick => {
          const player = pick.playerInfo;
          const positionEmoji = getPositionEmoji(player.position);
          firstRoundText += `**${pick.pickNumber}.** ${positionEmoji} ${player.name} (${player.position})\n`;
        });
        
        embed.addFields({
          name: '🥇 First Round Picks',
          value: firstRoundText.trim(),
          inline: false
        });
      }

      // Add draft info
      embed.addFields(
        {
          name: '📈 Draft Info',
          value: `${teamsCount} teams • ${totalRounds} rounds`,
          inline: true
        }
      );

      if (draftData.startTime) {
        const draftDate = new Date(draftData.startTime).toLocaleDateString();
        embed.addFields({
          name: '📅 Draft Date',
          value: draftDate,
          inline: true
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Error in draft command:', error);
    await interaction.editReply({
      content: `❌ Failed to fetch draft data: ${error.message}`,
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

function getPositionEmoji(position) {
  const emojis = {
    'QB': '🎯',
    'RB': '🏃',
    'WR': '🙌',
    'TE': '🤝',
    'K': '🦵',
    'DEF': '🛡️',
    'D/ST': '🛡️'
  };
  return emojis[position] || '⚽';
}

function formatDraftStatus(status) {
  const statusMap = {
    'pre_draft': '⏳ Pre-Draft',
    'drafting': '🟢 In Progress',
    'complete': '✅ Complete',
    'paused': '⏸️ Paused'
  };
  return statusMap[status] || status;
}

function getTeamDisplayName(userInfo, ffuService) {
  // Try to get team name from userInfo first
  if (userInfo?.teamName && userInfo.teamName.trim()) {
    return userInfo.teamName;
  }
  
  // Use FFU service to get team name from mapping
  if (userInfo?.userId) {
    return ffuService.getTeamName(userInfo.userId);
  }
  
  return 'Unknown Team';
}