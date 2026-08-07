/**
 * =====================================================
 * PANEL MANAGER - AUTO UPDATE SYSTEM
 * =====================================================
 * Manages active panels and auto-updates them every 5 seconds
 */

const { EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { COLORS, EMOJIS, PANEL_BANNER_URL } = require('../config/constants');
const { getAllServices } = require('../config/services');
const { query } = require('../database/hybridPool');

const logger = getLogger();

// Store active panels: { messageId: { channelId, guildId, type, interval } }
const activePanels = new Map();

/**
 * Get or fetch custom emoji
 */
async function getOrFetchEmoji(guild, service) {
  if (!guild) return service.defaultEmoji;

  const existingEmoji = guild.emojis.cache.find(e => e.name === service.emojiName);
  if (existingEmoji) {
    return existingEmoji;
  }

  try {
    const attachmentUrl = `https://raw.githubusercontent.com/limoonsdev/Zip/main/assets/${service.id}.png`;
    const newEmoji = await guild.emojis.create({
      attachment: attachmentUrl,
      name: service.emojiName
    });
    return newEmoji;
  } catch (error) {
    return service.defaultEmoji;
  }
}

/**
 * Build ultra-styled status panel with custom Up/Down emojis
 */
async function buildStatusEmbed(guild) {
  const services = getAllServices();

  // Custom status emojis
  const EMOJI_UP = '<a:servicesup:1532399539187617792>';
  const EMOJI_DOWN = '<a:servicesdown:1532399527418400988>';

  let description = '**💻 Systems Status**\n';
  description += `${EMOJI_UP} 🤖 **Discord Bot** • \`Online\`\n`;
  description += `${EMOJI_UP} ⚙️ **Backend API** • \`Online\`\n`;
  description += `${EMOJI_UP} 💾 **Database** • \`Online\`\n\n`;

  const embed = new EmbedBuilder()
    .setTitle('📊 PrimeGen • Systems Status')
    .setDescription(description)
    .addFields(
      {
        name: '⏱️ Update',
        value: 'Automatic every 5 seconds',
        inline: true
      }
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: `PrimeGen • Systems Manager • ${new Date().toLocaleTimeString('fr-FR')}`,
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  return embed;
}

/**
 * Register a panel for auto-update
 */
function registerPanel(messageIdInput, channelId, guildId, type, client) {
  // Only update supported panels
  if (!['status', 'stock', 'basic_panel', 'gen_prime', 'prime_stock'].includes(type)) {
    return;
  }

  const msgIds = Array.isArray(messageIdInput) ? messageIdInput : [messageIdInput];
  const groupId = msgIds[0];

  // Clear existing interval if any
  if (activePanels.has(groupId)) {
    clearInterval(activePanels.get(groupId).interval);
  }

  const panelData = {
    channelId,
    guildId,
    type,
    isUpdating: false,
    interval: null
  };
  activePanels.set(groupId, panelData);

  // Create update interval (5 seconds)
  panelData.interval = setInterval(async () => {
    if (panelData.isUpdating) {
      logger.debug('PanelManager', `Skipping update for ${groupId}, previous update still in progress.`);
      return;
    }

    panelData.isUpdating = true;
    try {
      const guild = await client.guilds.fetch(guildId);
      const channel = await guild.channels.fetch(channelId);

      // Build new payloads based on panel type
      let newPanels = [];
      if (type === 'status') {
        newPanels = [{ embed: await buildStatusEmbed(guild), components: [] }];
      } else if (type === 'stock') {
        const { buildStockPanel } = require('../commands/deploy');
        const stockPanel = await buildStockPanel(guild);
        newPanels = [{ embed: stockPanel.embed, components: stockPanel.components }];
      } else if (type === 'basic_panel') {
        const { buildBasicPanels } = require('../commands/deploy');
        newPanels = await buildBasicPanels(guild);
      } else if (type === 'gen_prime') {
        const { buildPrimePanel } = require('../commands/deploy');
        newPanels = await buildPrimePanel(guild);
      } else if (type === 'prime_stock') {
        const { buildPrimeStockPanel } = require('../commands/deploy');
        const primeStockPanel = await buildPrimeStockPanel(guild);
        newPanels = [{ embed: primeStockPanel.embed, components: primeStockPanel.components }];
      }

      // Update each message
      for (let i = 0; i < msgIds.length; i++) {
        if (!newPanels[i]) continue;
        const msgId = msgIds[i];
        try {
          const message = await channel.messages.fetch(msgId);
          await message.edit({ embeds: [newPanels[i].embed], components: newPanels[i].components });
        } catch (err) {
          if (err.code === 10008) { // Unknown Message
            logger.warn('PanelManager', `Message ${msgId} not found, unregistering panel group ${groupId}`);
            unregisterPanel(groupId);
            break;
          }
        }
      }

      logger.debug('PanelManager', `Updated ${type} panel group`, { groupId });
    } catch (error) {
      logger.error('PanelManager', `Failed to update panel group ${groupId}`, { error: error.message });
    } finally {
      panelData.isUpdating = false;
    }
  }, 5000); // 5 seconds

  logger.info('PanelManager', `Registered ${type} panel group for auto-update`, { groupId });
}

/**
 * Unregister a panel
 */
function unregisterPanel(messageId) {
  const panel = activePanels.get(messageId);
  if (panel) {
    clearInterval(panel.interval);
    activePanels.delete(messageId);
    logger.info('PanelManager', 'Unregistered panel', { messageId });
  }
}

/**
 * Get active panels count
 */
function getActivePanelsCount() {
  return activePanels.size;
}

/**
 * Stop all panels
 */
function stopAllPanels() {
  for (const [messageId, panel] of activePanels.entries()) {
    clearInterval(panel.interval);
  }
  activePanels.clear();
  logger.info('PanelManager', 'Stopped all panels');
}

module.exports = {
  buildStatusEmbed,
  registerPanel,
  unregisterPanel,
  getActivePanelsCount,
  stopAllPanels
};
