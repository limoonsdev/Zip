/**
 * =====================================================
 * READY EVENT HANDLER
 * =====================================================
 * Handles bot initialization when it connects to Discord.
 */

const { getLogger } = require('../utils/logger');
const { runMigrations } = require('../database/migrations');
const { initializeHybridDB } = require('../database/hybridPool');

const logger = getLogger();

/**
 * Handle ready event
 */
async function handleReady(client) {
  try {
    logger.info('Ready', `✅ Bot is ready! Logged in as ${client.user.tag}`);
    logger.info('Ready', `Connected to ${client.guilds.cache.size} guild(s)`);

    // Initialize hybrid database (PostgreSQL or SQLite fallback)
    logger.info('Ready', 'Initializing database...');
    const dbInfo = await initializeHybridDB();
    logger.info('Ready', `✅ Database initialized (${dbInfo.type})`);
    
    await runMigrations();
    logger.info('Ready', '✅ Database migrations complete');

    // Set bot status
    await client.user.setPresence({
      activities: [{ name: '.gg/primegen', type: 3 }],
      status: 'online'
    });
    logger.info('Ready', 'Bot status updated');

    // Restore panels
    try {
      const { query } = require('../database/hybridPool');
      const { registerPanel } = require('../services/panelManager');
      const panelsResult = await query('SELECT guild_id, panels_data FROM guild_panels');
      
      let restoredCount = 0;
      for (const row of panelsResult.rows) {
        const guildId = row.guild_id;
        const panelsData = row.panels_data || {};
        
        for (const [type, data] of Object.entries(panelsData)) {
          // Fallback check: data might just have messageId if saved by old code
          const msgIds = data.messageIds || (data.messageId ? [data.messageId] : null);
          if (data && data.channelId && msgIds && msgIds.length > 0) {
            registerPanel(msgIds, data.channelId, guildId, type, client);
            restoredCount++;
          }
        }
      }
      logger.info('Ready', `Restored ${restoredCount} auto-updating panels`);
    } catch (err) {
      logger.error('Ready', 'Failed to restore panels', { error: err.message });
    }

    // Log stats
    const stats = {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      channels: client.channels.cache.size,
      commands: client.commands?.size || 0,
      readyAt: client.readyAt.toISOString()
    };

    logger.info('Ready', 'Bot initialization complete', stats);

    // Display startup banner
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║         ⚡ PRIMEGEN BOT v2.5 ULTRA - READY ⚡                 ║');
    console.log('║                                                               ║');
    console.log('║               🎨 Ultra-Styled Panels System                   ║');
    console.log('║               ⚡ Auto-Update Every 5 Seconds                  ║');
    console.log('║               🎯 Custom Emojis Everywhere                     ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  🤖 Bot User: ${client.user.tag}`);
    console.log(`  🌐 Guilds: ${stats.guilds}`);
    console.log(`  👥 Users: ${stats.users}`);
    console.log(`  📋 Commands: ${stats.commands}`);
    console.log(`  💾 Database: ${dbInfo.type.toUpperCase()}`);
    console.log('  🎨 Features: Custom Emojis • Auto-Update • Ultra Design');
    console.log('');
    console.log('  ✅ All systems operational!');
    console.log('');
  } catch (error) {
    logger.error('Ready', 'Failed to initialize bot', { error: error.message });
    throw error;
  }
}

module.exports = { handleReady };
