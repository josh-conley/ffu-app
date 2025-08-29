/**
 * Test command - Debug bot functionality
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('Test bot functionality and data access');

export async function execute(interaction, ffuService) {
  try {
    console.log('Test command received');
    await interaction.deferReply();
    console.log('Reply deferred');

    // Test basic functionality
    const embed = new EmbedBuilder()
      .setTitle('🧪 FFU Bot Test Results')
      .setColor(0x00FF00)
      .setTimestamp();

    let testResults = '';

    // Test 1: Basic bot functionality
    testResults += '✅ **Bot responding**: OK\n';
    testResults += `✅ **Environment**: ${process.env.NODE_ENV || 'development'}\n`;
    testResults += `✅ **Base URL**: ${process.env.FFU_DATA_BASE_URL || 'default'}\n`;

    // Test 2: Try to fetch test data
    try {
      console.log('Testing data fetch...');
      const testData = await ffuService.getLeagueData('NATIONAL', '2024');
      testResults += `✅ **Data fetch**: OK (${testData.standings?.length || 0} teams)\n`;
    } catch (dataError) {
      console.error('Data fetch test failed:', dataError);
      testResults += `❌ **Data fetch**: Failed - ${dataError.message}\n`;
    }

    // Test 3: Team name mapping
    try {
      const testTeamName = ffuService.getTeamName('331590801261883392');
      testResults += `✅ **Team mapping**: OK (${testTeamName})\n`;
    } catch (mappingError) {
      testResults += `❌ **Team mapping**: Failed - ${mappingError.message}\n`;
    }

    // Test 4: Cache stats
    try {
      const cacheStats = ffuService.getCacheStats();
      testResults += `✅ **Cache**: ${cacheStats.totalEntries} entries\n`;
    } catch (cacheError) {
      testResults += `❌ **Cache**: Failed - ${cacheError.message}\n`;
    }

    embed.setDescription(testResults);

    console.log('Sending test results...');
    await interaction.editReply({ embeds: [embed] });
    console.log('Test command completed successfully');

  } catch (error) {
    console.error('Error in test command:', error);
    console.error('Error stack:', error.stack);
    
    try {
      await interaction.editReply({
        content: `❌ Test failed: ${error.message}\n\nCheck logs for details.`,
        ephemeral: true
      });
    } catch (replyError) {
      console.error('Failed to send test error reply:', replyError);
    }
  }
}