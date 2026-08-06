/**
 * =====================================================
 * PRIME-RESTOCK COMMAND - PRIMEGEN EDITION
 * =====================================================
 * Restock Prime stock using attached file (TXT/ULP)
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');
const { getAllServices, getServiceById, getServicesByTier } = require('../config/services');
const { getOrFetchEmoji } = require('../services/emojiManager');
const fs = require('fs');
const path = require('path');
const https = require('https');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('prime-restock')
  .setDescription('💎 Restock Prime stock with TXT/ULP file (Staff)')
  .setDefaultMemberPermissions('8') // Administrator
  .addAttachmentOption(option =>
    option.setName('fichier')
      .setDescription('The TXT/ULP file containing email:password combos')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Service Prime to restock')
      .setRequired(true)
      .setAutocomplete(true));

async function execute(interaction) {
  let tempFile = null;
  try {
    await interaction.deferReply({ flags: 64 });

    const attachment = interaction.options.getAttachment('fichier');
    const serviceId = interaction.options.getString('service').toLowerCase();

    // Validate service
    const service = getServiceById(serviceId);
    if (!service) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Service **${serviceId}** not found!`
      });
    }

    if (!attachment) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} **No file attached!**`
      });
    }

    const fileName = attachment.name.toLowerCase();
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.ulp')) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Invalid file format! Use .txt or .ulp`
      });
    }

    if (attachment.size > 10 * 1024 * 1024) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} File too large! (max 10MB)`
      });
    }

    // Download file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFile = path.join(tempDir, `prime_${Date.now()}_${attachment.name}`);
    await downloadFile(attachment.url, tempFile);

    await interaction.editReply({
      content: `${EMOJIS.INFO} File downloaded. Parsing combos...`
    });

    const combos = await parseComboFile(tempFile);

    if (combos.length === 0) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return interaction.editReply({
        content: `${EMOJIS.ERROR} No valid combos found in file!`
      });
    }

    let added = 0;
    let failed = 0;
    const batchSize = 1000;

    for (let i = 0; i < combos.length; i += batchSize) {
      const batch = combos.slice(i, i + batchSize);

      for (const combo of batch) {
        try {
          const email = combo.includes(':') ? combo.split(':')[0] : combo;
          await query(
            'INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4) ON CONFLICT (combo) DO NOTHING',
            [serviceId, combo, email, 100] // Quality score 100 for Prime
          );
          added++;
        } catch (error) {
          failed++;
        }
      }

      const progress = Math.min(100, Math.round((i + batch.length) / combos.length * 100));
      await interaction.editReply({
        content: `${EMOJIS.INFO} Importing Prime combos...\n` +
          `📊 Progress: ${progress}%\n` +
          `✅ Added: ${added}\n` +
          `❌ Failed: ${failed}`
      });
    }

    // Clean up temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

    // Get total stock
    const stockResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
      [serviceId]
    );
    const totalStock = stockResult.rows[0]?.count || 0;

    const serviceEmoji = await getOrFetchEmoji(interaction.guild, service);

    const embed = new EmbedBuilder()
      .setTitle('💎 PrimeGen - Prime Restock Complete')
      .setDescription(
        '**Service Prime**\n' +
        `${serviceEmoji} ${service.label}\n\n` +
        '**Fichier Source**\n' +
        `📄 ${attachment.name}\n\n` +
        '**Résultats**\n' +
        `✅ Ajoutés: \`${added.toLocaleString()}\`\n` +
        `❌ Échecs: \`${failed.toLocaleString()}\`\n\n` +
        '**Stock Total**\n' +
        `💎 \`${totalStock.toLocaleString()}\` comptes Prime disponibles`
      )
      .setColor('#FFD700')
      .setImage(PANEL_BANNER_URL)
      .setFooter({
        text: '💎 PrimeGen - Prime Restock System',
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });

    logger.info('PrimeRestock', `Prime restock completed for ${serviceId}`, {
      service: serviceId,
      added,
      failed,
      totalStock,
      user: interaction.user.tag
    });

  } catch (error) {
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    logger.error('PrimeRestock', 'Prime restock failed', { error: error.message });
    const reply = { content: `${EMOJIS.ERROR} Error: ${error.message}` };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply({ ...reply, flags: 64 });
    }
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function parseComboFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const combos = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0 && colonIndex < trimmed.length - 1) {
      combos.push(trimmed);
    }
  }

  return combos;
}

async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused().toLowerCase();
  const primeServices = getServicesByTier('prime');
  const allServices = getAllServices();

  let choices = primeServices
    .filter(s => s.id.includes(focusedValue) || s.label.toLowerCase().includes(focusedValue))
    .map(s => ({ name: `💎 ${s.label}`, value: s.id }));

  if (choices.length < 25) {
    const otherChoices = allServices
      .filter(s => s.tier !== 'prime' && (s.id.includes(focusedValue) || s.label.toLowerCase().includes(focusedValue)))
      .map(s => ({ name: `${s.defaultEmoji} ${s.label}`, value: s.id }));

    choices = [...choices, ...otherChoices].slice(0, 25);
  }

  await interaction.respond(choices);
}

module.exports = {
  command,
  execute,
  autocomplete
};
