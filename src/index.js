/**
 * =====================================================
 * NEWGEN BOT - MAIN ENTRY POINT v2.5
 * =====================================================
 * Discord bot for credential management with modular
 * architecture, proper error handling, and logging.
 *
 * New Features:
 * - Hybrid database (PostgreSQL + SQLite fallback)
 * - /deploy command for panel deployment
 * - /config command with interactive configuration
 * - Auto-import service emojis from assets
 * - Advanced cooldown system (50s, 1m, 1h format)
 * - Complete verification system
 * - Security features and member tracking
 *
 * Version: 2.5.0
 * License: ISC
 */

require('dotenv').config();

const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize configuration and logging
const { initializeConfig } = require('./config/config');
const { initLogger, getLogger } = require('./utils/logger');

// Initialize config
const config = initializeConfig();

// Initialize logger
initLogger({
  level: config.logging.level,
  isDev: config.server.isDevelopment
});

const logger = getLogger();

// Import event handlers
const { handleReady } = require('./handlers/ready');
const { handleInteraction } = require('./handlers/interaction');

// Import interaction handlers
const { registerButtonHandlers } = require('./handlers/buttonHandlers');
const { registerSelectHandlers } = require('./handlers/selectHandlers');
const { registerModalHandlers } = require('./handlers/modalHandlers');
const { registerInviteHandlers } = require('./handlers/inviteHandlers');

// =====================================================
// BOT INITIALIZATION
// =====================================================

class NextGenBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites
      ]
    });

    this.commands = new Collection();
    this.buttonHandlers = new Collection();
    this.selectHandlers = new Collection();
    this.roleSelectHandlers = new Collection();
    this.modalHandlers = new Collection();

    // Attach collections to client for easy access
    this.client.commands = this.commands;
    this.client.buttonHandlers = this.buttonHandlers;
    this.client.selectHandlers = this.selectHandlers;
    this.client.roleSelectHandlers = this.roleSelectHandlers;
    this.client.modalHandlers = this.modalHandlers;
  }

  /**
   * Load commands from directory
   */
  async loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

    logger.info('Bot', `Loading ${commandFiles.length} commands...`);

    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        const module = require(filePath);

        if (!module.command || !module.execute) {
          logger.warn('Bot', `Command ${file} is missing required properties`);
          continue;
        }

        this.commands.set(module.command.name, module);
        logger.debug('Bot', `Loaded command: ${module.command.name}`);
      } catch (error) {
        logger.error('Bot', `Failed to load command ${file}`, { error: error.message });
      }
    }

    logger.info('Bot', `✅ Loaded ${this.commands.size} commands`);
  }

  /**
   * Register slash commands with Discord
   */
  async registerSlashCommands() {
    try {
      logger.info('Bot', 'Registering slash commands with Discord...');

      const commands = this.commands.map(cmd => cmd.command.toJSON());
      const rest = new REST({ version: '10' }).setToken(config.bot.token);

      const data = await rest.put(
        Routes.applicationCommands(config.bot.clientId),
        { body: commands }
      );

      logger.info('Bot', `✅ Registered ${data.length} slash commands`);
    } catch (error) {
      logger.error('Bot', 'Failed to register slash commands', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    logger.info('Bot', 'Setting up event listeners...');

    // Ready event (use clientReady instead of deprecated ready)
    this.client.once('clientReady', async () => {
      try {
        await handleReady(this.client);
        
        // Load emojis for the first guild (or main guild)
        const guild = this.client.guilds.cache.first();
        if (guild) {
          const { loadServiceEmojis } = require('./services/emojiManager');
          await loadServiceEmojis(guild);
        }
      } catch (error) {
        logger.error('Bot', 'Error in ready handler', { error: error.message });
      }
    });

    // Presence Update event for custom status and tags
    this.client.on('presenceUpdate', (oldPresence, newPresence) => {
      const { handlePresenceUpdate } = require('./handlers/presenceHandlers');
      handlePresenceUpdate(oldPresence, newPresence).catch(error => {
        logger.error('Bot', 'Error in presence update handler', { error: error.message });
      });
    });

    // Interaction event
    this.client.on('interactionCreate', (interaction) => {
      handleInteraction(interaction).catch(error => {
        logger.error('Bot', 'Error in interaction handler', { error: error.message });
      });
    });

    // Register specialized handlers
    registerButtonHandlers(this.client);
    registerSelectHandlers(this.client);
    registerModalHandlers(this.client);
    registerInviteHandlers(this.client);

    // Autocomplete handling
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isAutocomplete()) return;

      const command = this.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error('Bot', `Autocomplete error for ${interaction.commandName}`, {
          error: error.message
        });
      }
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Bot', 'Client error', { error: error.message });
    });

    this.client.on('warn', (warning) => {
      logger.warn('Bot', 'Client warning', { warning });
    });

    logger.info('Bot', '✅ Event listeners setup complete');
  }

  /**
   * Connect to Discord
   */
  async connect() {
    try {
      logger.info('Bot', 'Connecting to Discord...');
      await this.client.login(config.bot.token);
      
      // Set global reference for web server
      global.discordClient = this.client;
      
      logger.info('Bot', '✅ Bot started successfully');
      
      // Start web server for OAuth2
      const { startServer } = require('./web/server');
      const webPort = process.env.WEB_PORT || 3000;
      
      try {
        await startServer(webPort);
        logger.info('Bot', `✅ Web server started on port ${webPort}`);
      } catch (error) {
        logger.warn('Bot', `⚠️  Web server failed to start: ${error.message}`);
      }
      
    } catch (error) {
      logger.error('Bot', 'Failed to connect to Discord', { error: error.message });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Bot', 'Shutting down gracefully...');

    try {
      // Stop all panel updates
      const { stopAllPanels } = require('./services/panelManager');
      stopAllPanels();

      // Close database connection
      const { closeHybridDB } = require('./database/hybridPool');
      await closeHybridDB();

      // Destroy Discord client
      this.client.destroy();

      logger.info('Bot', '✅ Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Bot', 'Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      logger.info('Bot', '🚀 Starting PrimeGen Bot v2.5.0');
      logger.info('Bot', '✨ New features: Deploy panels, Config UI, Emoji manager, Hybrid DB');

      // Load and register commands
      await this.loadCommands();
      await this.registerSlashCommands();

      // Setup event listeners
      this.setupEventListeners();

      // Connect to Discord
      await this.connect();

      logger.info('Bot', '✅ Bot started successfully');
    } catch (error) {
      logger.error('Bot', 'Failed to start bot', { error: error.message });
      await this.shutdown();
    }
  }
}

// =====================================================
// APPLICATION ENTRY POINT
// =====================================================

async function main() {
  try {
    const bot = new NextGenBot();
    await bot.start();

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Bot', 'SIGTERM signal received');
      bot.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('Bot', 'SIGINT signal received');
      bot.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Bot', 'Uncaught exception', { error: error.message });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Bot', 'Unhandled rejection', { error: String(reason) });
    });
  } catch (error) {
    logger.error('Bot', 'Fatal error in main', { error: error.message });
    process.exit(1);
  }
}

// Start the application
main();

module.exports = { NextGenBot };
