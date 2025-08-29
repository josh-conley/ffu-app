/**
 * Simple ping command to test basic bot functionality
 */

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Test if bot is responding');

export async function execute(interaction, ffuService) {
  try {
    console.log('Ping command received');
    
    await interaction.deferReply();
    console.log('Reply deferred');
    
    console.log('Sending pong response...');
    await interaction.editReply('🏓 Pong! Bot is working.');
    console.log('Pong response sent successfully');
    
  } catch (error) {
    console.error('Error in ping command:', error);
    console.error('Error stack:', error.stack);
    
    try {
      await interaction.editReply({
        content: `❌ Ping failed: ${error.message}`,
        ephemeral: true
      });
    } catch (replyError) {
      console.error('Failed to send ping error reply:', replyError);
    }
  }
}