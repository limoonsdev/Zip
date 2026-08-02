const { EmbedBuilder } = require('discord.js');
const { getOrCreateGuildConfig } = require('../database/models');
const { COLORS } = require('../config/constants');
const { getLogger } = require('./logger');

const logger = getLogger();

/**
 * Send a log message to the configured Discord channel
 * @param {import('discord.js').Guild} guild - The Discord guild
 * @param {string} action - The action title (e.g., 'Account Generated')
 * @param {string} description - Detailed description
 * @param {string} color - Hex color for the embed
 */
async function sendDiscordLog(guild, action, description, color = COLORS.INFO) {
  try {
    if (!guild) return;

    const guildConfig = await getOrCreateGuildConfig(guild.id);
    const config = guildConfig.config_data || {};
    const logChannelId = config.log_channel;

    if (!logChannelId) return;

    const channel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`📝 Log: ${action}`)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    logger.error('DiscordLogger', 'Failed to send Discord log', { error: error.message });
  }
}

module.exports = { sendDiscordLog };
