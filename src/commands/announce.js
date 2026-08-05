const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('📢 Create a new bilingual announcement')
  .setDefaultMemberPermissions('8'); // Admin only

async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('announce_modal')
    .setTitle('Create Announcement');

  const titleEn = new TextInputBuilder()
    .setCustomId('announce_title_en')
    .setLabel('Title (English)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: New Update!')
    .setRequired(true)
    .setMaxLength(100);

  const descEn = new TextInputBuilder()
    .setCustomId('announce_desc_en')
    .setLabel('Description (English)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('English announcement text...')
    .setRequired(true)
    .setMaxLength(1500);

  const titleFr = new TextInputBuilder()
    .setCustomId('announce_title_fr')
    .setLabel('Title (French)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Nouvelle Mise à jour!')
    .setRequired(true)
    .setMaxLength(100);

  const descFr = new TextInputBuilder()
    .setCustomId('announce_desc_fr')
    .setLabel('Description (French)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Texte de l\'annonce en français...')
    .setRequired(true)
    .setMaxLength(1500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleEn),
    new ActionRowBuilder().addComponents(descEn),
    new ActionRowBuilder().addComponents(titleFr),
    new ActionRowBuilder().addComponents(descFr)
  );

  await interaction.showModal(modal);
}

module.exports = { command, execute };
