const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');

const command = new SlashCommandBuilder()
  .setName('drop')
  .setDescription('🎁 Drop accounts/combos in the channel')
  .setDefaultMemberPermissions('8') // Admin
  .addStringOption(option => 
    option.setName('service')
      .setDescription('The service name (e.g., Netflix)')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('combo')
      .setDescription('The combo to drop (e.g., email:password)')
      .setRequired(true));

async function execute(interaction) {
  const service = interaction.options.getString('service');
  const combo = interaction.options.getString('combo');
  
  const embed = new EmbedBuilder()
    .setTitle(`🎁 NEW DROP : ${service.toUpperCase()}`)
    .setDescription(
      '**A new free account has just appeared!**\n\n' +
      `> 🎮 **Service:** ${service}\n` +
      `> 🔑 **Account:** ||${combo}||\n\n` +
      '*First come, first served! Don\'t forget to leave a #proof if you got it.*'
    )
    .setColor(COLORS.BOOST)
    .setImage(PANEL_BANNER_URL)
    .setTimestamp();
    
  await interaction.reply({ content: '@here 🎁 **EXCLUSIVE DROP**', embeds: [embed] });
}

module.exports = { command, execute };
