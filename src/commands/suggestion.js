const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('suggestion')
  .setDescription('💡 Submit a suggestion for the bot or server');

async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('suggestion_modal')
    .setTitle('Submit a Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('suggestion_title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Add Netflix premium')
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('suggestion_desc')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your suggestion in detail...')
    .setRequired(true)
    .setMaxLength(1000);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(descInput);

  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

module.exports = { command, execute };
