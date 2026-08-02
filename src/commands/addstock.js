/**
 * =====================================================
 * ADDSTOCK COMMAND
 * =====================================================
 * Quick command to add test accounts to the database
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');
const { getAllServices } = require('../config/services');
const { getOrFetchEmoji } = require('../services/emojiManager');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('addstock')
  .setDescription('📦 Add accounts to stock (Admin)')
  .setDefaultMemberPermissions('8') // Administrator
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Service (e.g.: netflix, spotify, steam)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('accounts')
      .setDescription('Accounts (format: email:pass, comma-separated)')
      .setRequired(true));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 }); // Ephemeral

    const serviceId = interaction.options.getString('service').toLowerCase();
    const accountsInput = interaction.options.getString('accounts');
    const qualityScore = 50;

    // Validate service
    const services = getAllServices();
    const service = services.find(s => s.id === serviceId);
    
    if (!service) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Service **${serviceId}** not found!\n\n` +
          `Available services: ${services.map(s => s.id).join(', ')}`
      });
    }

    // Parse accounts
    const accounts = accountsInput.split(',').map(a => a.trim()).filter(Boolean);

    if (accounts.length === 0) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} No valid accounts found!`
      });
    }

    // Add to database
    let added = 0;
    let failed = 0;

    for (const combo of accounts) {
      if (!combo.includes(':')) {
        failed++;
        continue;
      }

      try {
        await query(
          'INSERT INTO combos (service_id, combo, quality_score) VALUES ($1, $2, $3)',
          [serviceId, combo, qualityScore]
        );
        added++;
      } catch (error) {
        logger.error('AddStock', `Failed to add combo for ${serviceId}`, { error: error.message });
        failed++;
      }
    }

    // Get new stock count
    const stockResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
      [serviceId]
    );
    const totalStock = stockResult.rows[0]?.count || 0;

    // Get service emoji
    const serviceEmoji = await getOrFetchEmoji(interaction.guild, service);

    const embed = new EmbedBuilder()
      .setTitle(`✅ Stock Added`)
      .setDescription(
        `**Service**\n` +
        `${serviceEmoji} ${service.label}\n\n` +
        `**Summary**\n` +
        `✅ Added: \`${added}\`\n` +
        `❌ Failed: \`${failed}\`\n\n` +
        `📦 New Total: \`${totalStock}\``
      )
      .setColor(COLORS.SUCCESS)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ 
        text: 'LS・Shop & Gen - Stock Manager',
        iconURL: 'https://i.goopics.net/24ejy6.gif'
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info('AddStock', `Stock added for ${serviceId}`, {
      service: serviceId,
      added,
      failed,
      totalStock,
      user: interaction.user.tag
    });

  } catch (error) {
    logger.error('AddStock', 'Command failed', { error: error.message });
    
    const reply = {
      content: `${EMOJIS.ERROR} Error: ${error.message}`
    };

    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply({ ...reply, flags: 64 });
    }
  }
}

module.exports = { command, execute };
