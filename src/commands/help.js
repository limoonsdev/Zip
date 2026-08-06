/**
 * =====================================================
 * /HELP COMMAND
 * =====================================================
 * Displays help information about bot commands.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

/**
 * Command definition
 */
const command = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show help information')
  .setDMPermission(true);

/**
 * Execute command
 */
async function execute(interaction) {
  try {
    const embed = new EmbedBuilder()
      .setColor(0x0984E3)
      .setTitle('📋 PrimeGen Bot - Help')
      .setDescription('Here are all available commands:')
      .addFields(
        {
          name: '/gen',
          value: 'Generate credentials for a service\n`/gen <service>`',
          inline: false
        },
        {
          name: '/check',
          value: 'Check if credentials are valid\n`/check <service> <email:password>`',
          inline: false
        },
        {
          name: '/stats',
          value: 'View your personal statistics\n`/stats`',
          inline: false
        },
        {
          name: '/services',
          value: 'View available services\n`/services [category]`',
          inline: false
        },
        {
          name: '/prime-restock',
          value: 'Restock Prime stock with TXT/ULP file (Staff)\n`/prime-restock <fichier> <service>`',
          inline: false
        }
      )
      .addFields(
        {
          name: '💡 Tips',
          value: '• Free tier users have access to free services\n• Premium users unlock all services\n• Status required: .gg/primegen',
          inline: false
        }
      )
      .setFooter({ text: 'PrimeGen Bot v2.5' })
      .setTimestamp();

    logger.debug('Command', 'Help command executed', {
      user: interaction.user.tag
    });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (error) {
    logger.error('Command', 'Error in help command', { error: error.message });
    await interaction.reply({
      content: '❌ An error occurred while displaying help.',
      ephemeral: true
    });
  }
}

module.exports = {
  command,
  execute
};
