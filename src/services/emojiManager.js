/**
 * =====================================================
 * EMOJI MANAGER - Auto-import from assets
 * =====================================================
 * Automatically imports service icons as emojis
 */

const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const { getLogger } = require('../utils/logger');

const logger = getLogger();
const emojiCache = new Map();

/**
 * Load and upload emojis from assets folder
 */
async function loadServiceEmojis(guild) {
  if (!guild) {
    logger.warn('EmojiManager', 'No guild provided, skipping emoji upload');
    return emojiCache;
  }

  const assetsDir = path.join(process.cwd(), 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    logger.warn('EmojiManager', 'Assets directory not found');
    return emojiCache;
  }

  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png'));
  
  if (files.length === 0) {
    logger.warn('EmojiManager', 'No PNG files found in assets/');
    return emojiCache;
  }

  logger.info('EmojiManager', `Found ${files.length} service icons`);

  // Get existing emojis
  const existingEmojis = await guild.emojis.fetch().catch(() => new Map());

  for (const file of files) {
    try {
      const serviceName = path.basename(file, '.png');
      const emojiName = `service_${serviceName}`;

      // Check if emoji already exists
      const existingEmoji = existingEmojis.find(e => e.name === emojiName);
      
      if (existingEmoji) {
        emojiCache.set(serviceName, existingEmoji.toString());
        logger.debug('EmojiManager', `Emoji already exists: ${emojiName}`);
        continue;
      }

      // Check emoji limit
      if (existingEmojis.size >= 50) {
        logger.warn('EmojiManager', 'Server emoji limit reached (50)');
        break;
      }

      // Upload emoji
      const filePath = path.join(assetsDir, file);
      const emoji = await guild.emojis.create({
        attachment: filePath,
        name: emojiName,
        reason: 'Service icon auto-import'
      });

      emojiCache.set(serviceName, emoji.toString());
      logger.info('EmojiManager', `Uploaded emoji: ${emojiName}`);

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('EmojiManager', `Failed to upload emoji for ${file}`, { 
        error: error.message 
      });
    }
  }

  logger.info('EmojiManager', `✅ Emoji cache loaded: ${emojiCache.size} emojis`);
  return emojiCache;
}

/**
 * Get or fetch custom emoji from guild
 * This is the MAIN function used by all commands
 */
async function getOrFetchEmoji(guild, service) {
  if (!guild) return service.defaultEmoji;

  // Check if guild has emoji permissions
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
    logger.warn('EmojiManager', `No emoji permissions in guild ${guild.id}`);
    return service.defaultEmoji;
  }

  // Try to find existing emoji
  const existingEmoji = guild.emojis.cache.find(e => e.name === service.emojiName || e.name === `service_${service.id}`);
  if (existingEmoji) {
    return existingEmoji;
  }

  // Try to create it from GitHub
  try {
    const attachmentUrl = `https://raw.githubusercontent.com/limoonsdev/Zip/main/assets/${service.id}.png`;
    
    const newEmoji = await guild.emojis.create({
      attachment: attachmentUrl,
      name: service.emojiName,
      reason: 'PrimeGen service icon'
    });
    
    logger.info('EmojiManager', `Created custom emoji: ${service.emojiName}`);
    return newEmoji;
  } catch (error) {
    logger.warn('EmojiManager', `Could not create emoji ${service.emojiName}`, { error: error.message });
    return service.defaultEmoji;
  }
}

/**
 * Get emoji for service
 */
function getServiceEmoji(serviceName) {
  return emojiCache.get(serviceName) || '📦';
}

/**
 * Get all emojis
 */
function getAllEmojis() {
  return Object.fromEntries(emojiCache);
}

/**
 * Clear emoji cache
 */
function clearEmojiCache() {
  emojiCache.clear();
  logger.info('EmojiManager', 'Emoji cache cleared');
}

module.exports = {
  loadServiceEmojis,
  getOrFetchEmoji,  // ← EXPORTED NOW!
  getServiceEmoji,
  getAllEmojis,
  clearEmojiCache
};
