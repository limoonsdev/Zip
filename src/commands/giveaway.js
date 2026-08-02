const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('🎉 Start a basic giveaway')
  .setDefaultMemberPermissions('8')
  .addStringOption(option =>
    option.setName('lot')
      .setDescription('What is up for grabs')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('duree')
      .setDescription('The duration (e.g., 1h, 24h)')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('gagnants')
      .setDescription('Number of winners')
      .setRequired(false));

async function execute(interaction) {
  const lot = interaction.options.getString('lot');
  const duree = interaction.options.getString('duree');
  const gagnants = interaction.options.getInteger('gagnants') || 1;
  
  const embed = new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY LS・SHOP & GEN`)
    .setDescription(
      `**Participate for a chance to win:**\n\n` +
      `> 🎁 **Prize:** ${lot}\n` +
      `> ⏱️ **Duration:** ${duree}\n` +
      `> 🏆 **Winner(s):** ${gagnants}\n\n` +
      `**To participate:**\n` +
      `React with 🎉 under this message!`
    )
    .setColor(COLORS.PREMIUM)
    .setImage(PANEL_BANNER_URL)
    .setTimestamp();
    
  const message = await interaction.reply({ content: '@everyone 🎉 **NEW GIVEAWAY**', embeds: [embed], fetchReply: true });
  await message.react('🎉');
}

module.exports = { command, execute };
