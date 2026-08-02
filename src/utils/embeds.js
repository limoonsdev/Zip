/**
 * =====================================================
 * DISCORD EMBED BUILDERS
 * =====================================================
 * Reusable embed templates for consistent UI across
 * all bot responses and interactions.
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Color palette
 */
const COLORS = {
  PRIMARY: 0x2F3136,
  SUCCESS: 0x00B894,
  ERROR: 0xFF7675,
  WARNING: 0xFFBE00,
  INFO: 0x0984E3,
  PREMIUM: 0x9B59B6,
  GOLD: 0xF39C12
};

/**
 * Create a success embed
 */
function createSuccessEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create an error embed
 */
function createErrorEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create a warning embed
 */
function createWarningEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create an info embed
 */
function createInfoEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create a premium feature embed
 */
function createPremiumEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.PREMIUM)
    .setTitle(`👑 ${title}`)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create a generic embed
 */
function createEmbed(title, description, color = COLORS.PRIMARY, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

  fields.forEach(field => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline !== false
    });
  });

  return embed;
}

/**
 * Create a service info embed
 */
function createServiceEmbed(service, description = '') {
  const descText = description || `Service: **${service.label}**\nCategory: **${service.category}**\nTier: **${service.tier}**`;
  
  return new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(`📱 ${service.label}`)
    .setDescription(descText)
    .setTimestamp();
}

/**
 * Create a checking result embed
 */
function createCheckResultEmbed(service, email, results) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`🔍 Check Results - ${service.label}`)
    .setDescription(`Email: \`${email}\``)
    .addFields(
      {
        name: 'Status',
        value: results.working ? '✅ Working' : '❌ Not Working',
        inline: true
      },
      {
        name: 'Quality Score',
        value: `${results.quality || 0}/100`,
        inline: true
      },
      {
        name: 'Details',
        value: results.message || 'No additional details',
        inline: false
      }
    )
    .setTimestamp();

  if (results.metadata) {
    embed.addFields({
      name: 'Metadata',
      value: `\`\`\`json\n${JSON.stringify(results.metadata, null, 2).slice(0, 1000)}\`\`\``,
      inline: false
    });
  }

  return embed;
}

/**
 * Create a progress embed
 */
function createProgressEmbed(title, current, total, description = '') {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 20;
  const filledLength = Math.floor((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;
  
  const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`⏳ ${title}`)
    .setDescription(description || `Progress: ${percentage}%`)
    .addFields(
      {
        name: 'Progress',
        value: `\`[${progressBar}] ${percentage}%\``,
        inline: false
      },
      {
        name: 'Items',
        value: `${current} / ${total}`,
        inline: true
      }
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an error log embed
 */
function createErrorLogEmbed(error, context = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle('🚨 Error Occurred')
    .setDescription(`\`\`\`${error.message || error}\`\`\``)
    .addFields(
      {
        name: 'Stack',
        value: `\`\`\`${(error.stack || '').slice(0, 500)}\`\`\``,
        inline: false
      }
    )
    .setTimestamp();

  if (Object.keys(context).length > 0) {
    embed.addFields({
      name: 'Context',
      value: `\`\`\`json\n${JSON.stringify(context, null, 2).slice(0, 500)}\`\`\``,
      inline: false
    });
  }

  return embed;
}

/**
 * Create a list embed with pagination support
 */
function createListEmbed(title, items, pageNum = 1, itemsPerPage = 10) {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const start = (pageNum - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = items.slice(start, end);

  const embed = new EmbedBuilder()
    .setColor(COLORS.PRIMARY)
    .setTitle(`${title} (Page ${pageNum}/${totalPages})`)
    .setDescription(pageItems.map((item, idx) => `${start + idx + 1}. ${item}`).join('\n'))
    .setFooter({ text: `Page ${pageNum}/${totalPages}` })
    .setTimestamp();

  return embed;
}

module.exports = {
  COLORS,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  createInfoEmbed,
  createPremiumEmbed,
  createEmbed,
  createServiceEmbed,
  createCheckResultEmbed,
  createProgressEmbed,
  createErrorLogEmbed,
  createListEmbed
};
