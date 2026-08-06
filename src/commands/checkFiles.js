const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { getAllServices } = require('../config/services');

const command = new SlashCommandBuilder()
  .setName('checkfiles')
  .setDescription('📁 Mass check combos from a file (Admin)')
  .setDefaultMemberPermissions('8') // Administrator
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Service to check (e.g., netflix)')
      .setRequired(true)
      .setAutocomplete(true))
  .addAttachmentOption(option =>
    option.setName('file')
      .setDescription('TXT file with combos (email:password)')
      .setRequired(true));

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🚧 AlphaChecker (Coming Soon)')
    .setDescription(`> ${EMOJIS.INFO} **The advanced file checking system is currently under development.**\n> It will be available very soon with premium proxies and ultra-fast validation!`)
    .setColor(COLORS.WARNING)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'PrimeGen - Under Construction' });

  await interaction.reply({ embeds: [embed], flags: 64 });
}

async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const allServices = getAllServices();
  
  const choices = allServices
    .filter(service => service.id.includes(focusedValue) || service.label.toLowerCase().includes(focusedValue))
    .slice(0, 25)
    .map(service => ({ name: `${service.defaultEmoji} ${service.label}`, value: service.id }));
    
  await interaction.respond(choices);
}

module.exports = {
  command,
  execute,
  autocomplete
};
