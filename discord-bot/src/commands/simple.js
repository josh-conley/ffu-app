/**
 * Ultra-simple command to test Render hosting
 */

import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('simple')
  .setDescription('Ultra simple test - no data fetching, no complex processing');

export async function execute(interaction, ffuService) {
  const startTime = Date.now();
  console.log(`[SIMPLE] Command started on ${process.env.NODE_ENV || 'unknown'} environment`);
  
  try {
    console.log('[SIMPLE] Deferring reply...');
    await interaction.deferReply();
    console.log(`[SIMPLE] Reply deferred after ${Date.now() - startTime}ms`);
    
    // Just send a simple message - no embeds, no data fetching, no processing
    const message = [
      '✅ **Bot is working!**',
      `📍 Environment: ${process.env.NODE_ENV || 'unknown'}`,
      `⚡ Response time: ${Date.now() - startTime}ms`,
      `🧠 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      `🌐 Base URL: ${process.env.FFU_DATA_BASE_URL ? '✅ Set' : '❌ Missing'}`,
    ].join('\n');
    
    console.log('[SIMPLE] Sending simple response...');
    await interaction.editReply({ content: message });
    console.log(`[SIMPLE] SUCCESS! Response sent after ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('[SIMPLE] ERROR:', error);
    console.error('[SIMPLE] Error stack:', error.stack);
    
    try {
      await interaction.editReply({
        content: `❌ Simple test failed: ${error.message}`,
        ephemeral: true
      });
    } catch (replyError) {
      console.error('[SIMPLE] Failed to send error reply:', replyError);
    }
  }
}