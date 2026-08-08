const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('server-list')
  .setDescription('Affiche la liste des serveurs où se trouve le bot et permet de le faire quitter.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guilds = Array.from(interaction.client.guilds.cache.values());
  
  if (guilds.length === 0) {
    return interaction.editReply('Le bot n\\'est sur aucun serveur (étrange...).');
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🌐 Serveurs du Bot (${guilds.length})`)
    .setDescription('Voici la liste des serveurs où le bot est actuellement présent. Sélectionnez un serveur dans le menu ci-dessous pour le gérer.')
    .setTimestamp();

  // Show up to 25 guilds in the select menu
  const options = guilds.slice(0, 25).map(g => ({
    label: g.name.substring(0, 100),
    description: `Membres: ${g.memberCount} | ID: ${g.id}`.substring(0, 100),
    value: g.id
  }));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('server_list_select')
    .setPlaceholder('Sélectionnez un serveur...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = {
  command,
  execute
};
