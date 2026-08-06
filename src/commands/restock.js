/**
 * =====================================================
 * RESTOCK COMMAND - ULTRA EDITION
 * =====================================================
 * Support TXT files, ULP files, and GoFile links
 */

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');
const { getAllServices, getServiceById } = require('../config/services');
const { getOrFetchEmoji } = require('../services/emojiManager');
const fs = require('fs');
const path = require('path');
const https = require('https');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('restock')
  .setDescription('📦 Mass restock with TXT, ULP or GoFile')
  .setDefaultMemberPermissions('8') // Administrator
  .addStringOption(option =>
    option.setName('service')
      .setDescription('Service to restock (e.g., netflix, spotify)')
      .setRequired(true)
      .setAutocomplete(true))
  .addStringOption(option =>
    option.setName('source')
      .setDescription('Source type')
      .setRequired(true)
      .addChoices(
        { name: '📄 TXT/ULP file (attach)', value: 'file' },
        { name: '🔗 GoFile link', value: 'gofile' }
      ))
  .addAttachmentOption(option =>
    option.setName('file')
      .setDescription('The TXT/ULP file containing combos')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('gofile_url')
      .setDescription('GoFile URL (if source = gofile)')
      .setRequired(false));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const serviceId = interaction.options.getString('service').toLowerCase();
    const source = interaction.options.getString('source');
    const gofileUrl = interaction.options.getString('gofile_url');
    const qualityScore = 50;
    const autoCheck = false;

    // Validate service
    const service = getServiceById(serviceId);
    if (!service) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} Service **${serviceId}** not found!`
      });
    }

    if (source === 'file') {
      await handleFileRestock(interaction, serviceId, service);
    } else if (source === 'gofile') {
      if (!gofileUrl) {
        return interaction.editReply({
          content: `${EMOJIS.ERROR} GoFile URL required!`
        });
      }
      await handleGofileRestock(interaction, serviceId, service, gofileUrl);
    }

  } catch (error) {
    logger.error('Restock', 'Command failed', { error: error.message });
    
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

/**
 * Handle file restock (TXT/ULP)
 */
async function handleFileRestock(interaction, serviceId, service) {
  const attachment = interaction.options.getAttachment('file')
    || interaction.options.getMessage('message')?.attachments?.first() 
    || interaction.message?.attachments?.first();

  if (!attachment) {
    await interaction.editReply({
      content: `${EMOJIS.ERROR} **No file attached!**\n\n` +
        `${EMOJIS.INFO} Use this command by attaching a TXT or ULP file.\n` +
        'Format: `email:password` (one per line)'
    });
    return;
  }

  const fileName = attachment.name.toLowerCase();
  if (!fileName.endsWith('.txt') && !fileName.endsWith('.ulp')) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} Invalid format! Use .txt or .ulp`
    });
  }

  // Check file size (max 10MB Discord limit)
  if (attachment.size > 10 * 1024 * 1024) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} File too large! (max 10MB)\n` +
        `${EMOJIS.INFO} Use GoFile for large files.`
    });
  }

  // Download file
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `${Date.now()}_${attachment.name}`);

  try {
    await downloadFile(attachment.url, tempFile);

    // Update progress
    await interaction.editReply({
      content: `${EMOJIS.INFO} Download complete! Analysis in progress...\n` +
        `📄 File: ${attachment.name}\n` +
        `📊 Size: ${(attachment.size / 1024).toFixed(2)} KB`
    });

    // Parse file
    const combos = await parseComboFile(tempFile);

    if (combos.length === 0) {
      fs.unlinkSync(tempFile);
      return interaction.editReply({
        content: `${EMOJIS.ERROR} No valid combo found!`
      });
    }

    // Add to database
    let added = 0;
    let failed = 0;
    const batchSize = 1000;

    for (let i = 0; i < combos.length; i += batchSize) {
      const batch = combos.slice(i, i + batchSize);
      
      for (const combo of batch) {
        try {
          const email = combo.includes(':') ? combo.split(':')[0] : combo;
          await query(
            'INSERT INTO combos (service_id, combo, email) VALUES ($1, $2, $3)',
            [serviceId, combo, email]
          );
          added++;
        } catch (error) {
          failed++;
        }
      }

      // Update progress every batch
      const progress = Math.min(100, Math.round((i + batch.length) / combos.length * 100));
      const statusMsg = `${EMOJIS.INFO} Import in progress...\n` +
        `📊 Progress: ${progress}%\n` +
        `✅ Added: ${added}\n` +
        `❌ Failed: ${failed}`;

      await interaction.editReply({ content: statusMsg });
    }

    // Get final stock
    const stockResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
      [serviceId]
    );
    const totalStock = stockResult.rows[0]?.count || 0;

    // Delete temp file
    fs.unlinkSync(tempFile);

    // Get service emoji
    const serviceEmoji = await getOrFetchEmoji(interaction.guild, service);

    const embed = new EmbedBuilder()
      .setTitle('✅ Restock Complete')
      .setDescription(
        '**Service**\n' +
        `${serviceEmoji} ${service.label}\n\n` +
        '**Source File**\n' +
        `📄 ${attachment.name}\n\n` +
        '**Results**\n' +
        `✅ Added: \`${added.toLocaleString()}\`\n` +
        `❌ Failed: \`${failed.toLocaleString()}\`\n\n` +
        '**Total Stock**\n' +
        `📦 ${totalStock.toLocaleString()} accounts available`
      )
      .setColor(COLORS.SUCCESS)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ 
        text: 'PrimeGen - Restock System',
        iconURL: 'https://i.goopics.net/7uwmmu.gif'
      })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });

    logger.info('Restock', `File restock completed for ${serviceId}`, {
      service: serviceId,
      added,
      failed,
      totalStock
    });

  } catch (error) {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    throw error;
  }
}

/**
 * Handle GoFile restock (large files)
 */
async function handleGofileRestock(interaction, serviceId, service, gofileUrl) {
  await interaction.editReply({
    content: `${EMOJIS.INFO} **GoFile processing in progress...**\n\n` +
      `🔗 URL: ${gofileUrl}\n` +
      `📦 Service: ${service.label}\n\n` +
      `${EMOJIS.WARNING} This can take several minutes for large files!`
  });

  try {
    const { processGofileUlp } = require('../../gofile_ulp');
    const services = getAllServices();

    let totalAdded = 0;
    let currentFile = '';
    let currentProgress = 0;

    const result = await processGofileUlp({
      gofileUrl,
      services: services.map(s => s.id),
      addCombosFn: async (combos) => {
        for (const combo of combos) {
          try {
            await query(
              'INSERT INTO combos (service_id, combo, quality_score, account_info) VALUES ($1, $2, $3, $4)',
              [serviceId, combo.combo, 50, null]
            );
            totalAdded++;
          } catch (error) {
            // Ignore duplicates
          }
        }
        return combos.length;
      },
      onEvent: async (event) => {
        if (event.type === 'download-start') {
          currentFile = event.fileName;
          await interaction.editReply({
            content: `${EMOJIS.INFO} **Downloading...**\n` +
              `📄 File: ${event.fileName}\n` +
              `📊 Size: ${(event.totalBytes / 1024 / 1024).toFixed(2)} MB`
          }).catch(() => {});
        } else if (event.type === 'parse-file-progress') {
          currentProgress = event.fileLinesProcessed;
          if (currentProgress % 10000 === 0) {
            await interaction.editReply({
              content: `${EMOJIS.INFO} **Analysis in progress...**\n` +
                `📄 File: ${currentFile}\n` +
                `📊 Lines: ${currentProgress}\n` +
                `✅ Valid: ${event.fileValidFound}\n` +
                `📦 Total added: ${totalAdded}`
            }).catch(() => {});
          }
        }
      }
    });

    // Get final stock
    const stockResult = await query(
      'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
      [serviceId]
    );
    const totalStock = stockResult.rows[0]?.count || 0;

    const embed = new EmbedBuilder()
      .setTitle(`${EMOJIS.SUCCESS} GoFile Restock Complete - ${service.label}`)
      .setDescription(
        '╔═══════════════════════════════════════╗\n' +
        '║   **GOFILE IMPORT SUCCESSFUL**       ║\n' +
        '╚═══════════════════════════════════════╝\n\n' +
        '🔗 **Source:** GoFile\n' +
        `📦 **Service:** ${service.label}\n\n` +
        `📁 **Files processed:** ${result.tasksProcessed}\n` +
        `📊 **Lines analyzed:** ${result.linesProcessed}\n` +
        `✅ **Accounts added:** ${totalAdded}\n` +
        '📊 **Quality score:** 50/100\n\n' +
        `${EMOJIS.STOCK} **Total stock:** ${totalStock} accounts`
      )
      .setColor(COLORS.SUCCESS)
      .setFooter({ text: 'PrimeGen GoFile Restock System', iconURL: 'https://i.goopics.net/7uwmmu.gif' })
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });

    logger.info('Restock', `GoFile restock completed for ${serviceId}`, {
      service: serviceId,
      added: totalAdded,
      totalStock,
      files: result.tasksProcessed
    });

  } catch (error) {
    logger.error('Restock', 'GoFile restock failed', { error: error.message });
    throw error;
  }
}

/**
 * Download file from URL
 */
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

/**
 * Parse combo file (TXT/ULP)
 */
async function parseComboFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const combos = [];

  // Regex: email:password or user:pass
  const comboRegex = /^([^:]+):([^:]+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const match = trimmed.match(comboRegex);
    if (match) {
      combos.push(trimmed);
    }
  }

  return combos;
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
