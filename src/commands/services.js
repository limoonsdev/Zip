/**
 * =====================================================
 * /SERVICES COMMAND
 * =====================================================
 * Displays available services.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SERVICES } = require('../config/services');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

/**
 * Command definition
 */
const command = new SlashCommandBuilder()
  .setName('services')
  .setDescription('View available services')
  .setDMPermission(true);

/**
 * Execute command
 */
async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    let services = SERVICES;

    // Group by tier
    const freeServices = services.filter(s => s.tier === 'free');
    const premiumServices = services.filter(s => s.tier === 'premium');
    const primeServices = services.filter(s => s.tier === 'prime');

    const embed = new EmbedBuilder()
      .setColor(0x2F3136)
      .setTitle('📱 Available Services')
      .setDescription('All available services');

    // Free services
    if (freeServices.length > 0) {
      const freeList = freeServices
        .map(s => `✅ ${s.label}`)
        .join('\n');

      embed.addFields({
        name: `🟢 Free Tier (${freeServices.length})`,
        value: freeList,
        inline: false
      });
    }

    // Premium services
    if (premiumServices.length > 0) {
      const premiumList = premiumServices
        .map(s => `👑 ${s.label}`)
        .join('\n');

      embed.addFields({
        name: `💜 Premium Tier (${premiumServices.length})`,
        value: premiumList,
        inline: false
      });
    }

    // Prime services
    if (primeServices.length > 0) {
      const primeList = primeServices
        .map(s => `💎 ${s.label}`)
        .join('\n');

      embed.addFields({
        name: `💠 Prime Tier (${primeServices.length})`,
        value: primeList,
        inline: false
      });
    }

    embed.setFooter({ 
      text: `Total: ${services.length} services | Use /info <service> for details` 
    }).setTimestamp();

    logger.debug('Command', 'Services command executed', {
      user: interaction.user.tag
    });

    await interaction.editReply({
      embeds: [embed]
    });
  } catch (error) {
    logger.error('Command', 'Error in services command', { error: error.message });
    await interaction.editReply({
      content: '❌ An error occurred while displaying services.'
    });
  }
}

module.exports = {
  command,
  execute
};
