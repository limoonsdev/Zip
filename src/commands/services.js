/**
 * =====================================================
 * /SERVICES COMMAND
 * =====================================================
 * Displays available services and categories.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SERVICES, getCategories, getServicesByCategory } = require('../config/services');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

/**
 * Command definition
 */
const command = new SlashCommandBuilder()
  .setName('services')
  .setDescription('View available services')
  .addStringOption(option =>
    option
      .setName('category')
      .setDescription('Filter by category')
      .setRequired(false)
      .setAutocomplete(true)
  )
  .setDMPermission(true);

/**
 * Execute command
 */
async function execute(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const category = interaction.options.getString('category');
    let services = SERVICES;

    if (category) {
      services = getServicesByCategory(category);
    }

    // Group by tier
    const freeServices = services.filter(s => s.tier === 'free');
    const premiumServices = services.filter(s => s.tier === 'premium');

    const embed = new EmbedBuilder()
      .setColor(0x2F3136)
      .setTitle('📱 Available Services')
      .setDescription(category ? `Category: **${category}**` : 'All available services');

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

    embed.setFooter({ 
      text: `Total: ${services.length} services | Use /info <service> for details` 
    }).setTimestamp();

    logger.debug('Command', 'Services command executed', {
      user: interaction.user.tag,
      category: category || 'all'
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

/**
 * Handle autocomplete
 */
async function autocomplete(interaction) {
  const categories = getCategories();
  const focusedValue = interaction.options.getFocused(true);
  
  const filtered = categories.filter(c =>
    c.toLowerCase().startsWith(focusedValue.value.toLowerCase())
  );

  await interaction.respond(
    filtered.map(choice => ({
      name: choice,
      value: choice
    }))
  );
}

module.exports = {
  command,
  execute,
  autocomplete
};
