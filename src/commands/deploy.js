/**
 * =====================================================
 * DEPLOY COMMAND - ULTRA PREMIUM EDITION
 * =====================================================
 * Deploy ultra-styled panels with custom emojis
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { COLORS, EMOJIS, PANEL_BANNER_URL } = require('../config/constants');
const { getServicesByTier, getAllServices } = require('../config/services');
const { query } = require('../database/hybridPool');
const { getOrFetchEmoji } = require('../services/emojiManager');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('deploy')
  .setDescription('🚀 Deploy generation panels (Free & Premium)')
  .setDefaultMemberPermissions('8') // Administrator permission
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Type of panel to deploy')
      .setRequired(true)
      .addChoices(
        { name: '💎 Basic Panel (Free & Premium)', value: 'basic_panel' },
        { name: '💎 Prime Panel', value: 'gen_prime' },
        { name: '📦 Prime Stock Panel', value: 'prime_stock' },
        { name: '✅ Verification Panel', value: 'verification' },
        { name: '🎫 Ticket Panel', value: 'ticket' },
        { name: '📊 Status Panel', value: 'status' },
        { name: '📦 Stock Panel', value: 'stock' },
        { name: '❓ FAQ Panel', value: 'faq' },
        { name: '🛒 Shop Panel', value: 'shop' }
      ))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel to deploy the panel in')
      .setRequired(true));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    if (!channel.isTextBased()) {
      return interaction.editReply({
        content: `${EMOJIS.ERROR} This channel is not a text channel!`
      });
    }

    let panelsToDeploy = [];

    switch (type) {
    case 'basic_panel': {
      panelsToDeploy = await buildBasicPanels(interaction.guild);
      break;
    }
    case 'gen_prime': {
      panelsToDeploy = await buildPrimePanel(interaction.guild);
      break;
    }
    case 'prime_stock': {
      panelsToDeploy.push(await buildPrimeStockPanel(interaction.guild));
      break;
    }
    case 'verification': {
      panelsToDeploy.push(buildVerificationPanel());
      break;
    }
    case 'ticket': {
      panelsToDeploy.push(buildTicketPanel());
      break;
    }
    case 'status': {
      const { buildStatusEmbed } = require('../services/panelManager');
      panelsToDeploy.push({ embed: await buildStatusEmbed(interaction.guild), components: [] });
      break;
    }
    case 'stock': {
      panelsToDeploy.push(await buildStockPanel(interaction.guild));
      break;
    }
    case 'faq': {
      panelsToDeploy.push(buildFAQPanel());
      break;
    }
    case 'shop': {
      panelsToDeploy.push(await buildShopPanel());
      break;
    }
    }

    const messageIds = [];
    for (const panel of panelsToDeploy) {
      const msg = await channel.send({ embeds: [panel.embed || panel.embeds[0]], components: panel.components || [] });
      messageIds.push(msg.id);
    }

    // Register panels for auto-update (Prime panel no longer auto-updates to reduce spam)
    if (['status', 'stock', 'basic_panel'].includes(type) && messageIds.length > 0) {
      const { registerPanel } = require('../services/panelManager');
      const { getOrCreateGuildPanels, updateGuildPanels } = require('../database/models');
      // Pass the array of message IDs, identifying the group by the first ID
      registerPanel(messageIds, channel.id, interaction.guild.id, type, interaction.client);
      
      try {
        const panels = await getOrCreateGuildPanels(interaction.guild.id);
        const panelsData = panels.panels_data || {};
        panelsData[type] = {
          channelId: channel.id,
          messageIds: messageIds,
          updatedAt: new Date().toISOString()
        };
        await updateGuildPanels(interaction.guild.id, panelsData);
      } catch (err) {
        logger.error('Deploy', 'Failed to save panel to DB', { error: err.message });
      }
    }

    logger.info('Deploy', `Panel ${type} deployed`, {
      guild: interaction.guild.id,
      channel: channel.id,
      message: messageIds[0] || 'none',
      user: interaction.user.id,
      autoUpdate: ['status', 'stock', 'basic_panel'].includes(type)
    });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **${type}** panel successfully deployed in ${channel}!\n` +
        (['status', 'stock', 'basic_panel'].includes(type) ? `${EMOJIS.INFO} Auto-update activated (every 5 seconds)` : '')
    });

  } catch (error) {
    logger.error('Deploy', 'Deploy command failed', { error: error.message, stack: error.stack, errors: error.errors });
    const reply = {
      content: `${EMOJIS.ERROR} Error during deployment: ${error.message}`
    };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply({ ...reply, flags: 64 });
    }
  }
}

/**
 * Build ultra-styled basic generation panel with custom emojis - NO ASCII (Supports multiple messages)
 */
async function buildBasicPanels(guild) {
  // Get all free and premium services
  const services = [...getServicesByTier('free'), ...getServicesByTier('premium')];
  
  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep services that have stock > 0
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0);

  const panels = [];
  
  if (availableServices.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('✨ PRIMEGEN BASIC')
      .setDescription('**Aucun service n\'est disponible pour le moment !**\n\nRevenez plus tard lors du prochain réassort.')
      .setColor(COLORS.FREE)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: '✨ PrimeGen • Basic Access', iconURL: 'https://i.goopics.net/2eukvn.gif' })
      .setTimestamp();
    return [{ embed, components: [] }];
  }
  
  // Split services into chunks of 25 (Discord max components per message)
  for (let i = 0; i < availableServices.length; i += 25) {
    const chunk = availableServices.slice(i, i + 25);
    
    // Build service list with emojis for the description
    // Format nicely as a blockquote grid
    let serviceList = '> ';
    let count = 0;
    for (const service of chunk.slice(0, 12)) {
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : (emoji?.toString() || service.defaultEmoji);
      serviceList += `${emojiStr} **${service.label}**  `;
      count++;
      if (count % 3 === 0 && count < 12) serviceList += '\n> ';
    }
    if (chunk.length > 12) serviceList += `\n> *... and ${chunk.length - 12} other services below*`;
    
    const titleSuffix = i > 0 ? ` (Part ${Math.floor(i/25) + 1})` : '';

    // Ultra-styled embed WITHOUT ASCII
    const embed = new EmbedBuilder()
      .setTitle(`✨ PRIMEGEN BASIC${titleSuffix}`)
      .setDescription(
        i === 0 ? (
          '### 🎁 Free & Premium Access\n\n' +
          '> 🔄 Stock updated **in real time**\n' +
          '> 🌍 Access to a wide catalog of services\n' +
          '> 💬 Remember to leave a **#proof**\n' +
          '> 💎 Support: `.gg/primegen`\n\n' +
          '### 📦 Available Services\n' +
          `${serviceList}\n\n` +
          '**👇 Click a button below to generate!**'
        ) : (
          '### 📦 More services...\n\n' +
          `${serviceList}\n\n` +
          '**👇 Click a button below to generate!**'
        )
      )
      .setColor(COLORS.FREE)
      .setFooter({ 
        text: '✨ PrimeGen • Basic Access' + titleSuffix,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();
      
    // Only add banner to the first message to prevent chat clutter
    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    // Create buttons with CUSTOM emojis
    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      // Get or create custom emoji
      const emoji = await getOrFetchEmoji(guild, service);
      
      const stockCount = stockData[service.id] || 0;
      
      const button = new ButtonBuilder()
        .setCustomId(`gen_${service.tier}_${service.id}`)
        .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
        .setStyle(service.tier === 'premium' ? ButtonStyle.Primary : ButtonStyle.Secondary);

      // Set emoji (custom object or default string)
      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      // Start new row after 5 buttons
      if (buttonCount % 5 === 0 || buttonCount === chunk.length) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }
    
    panels.push({ embed, components });
  }

  return panels;
}

/**
 * Build ultra-styled verification panel - OAUTH2 LINK
 */
function buildVerificationPanel() {
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://limoon-space.cloud/callback';
  const OAUTH2_URL = redirectUri.replace(/\/callback\/?$/, '');

  const embed = new EmbedBuilder()
    .setTitle('✅ PrimeGen Verification')
    .setDescription(
      '**Welcome to PrimeGen!**\n\n' +
      'To access all channels and features:\n\n' +
      '✅ Click the button below\n' +
      '🎁 Automatic Verified role assignment\n' +
      '⚡ Instant access to all channels\n' +
      '👑 Unlock all features\n\n' +
      'Ready? Click now!'
    )
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '✅ PrimeGen Verification • Secure & Instant',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setLabel('✅ Verify Me')
    .setStyle(ButtonStyle.Link)
    .setURL(OAUTH2_URL);

  const manualVerifyBtn = new ButtonBuilder()
    .setCustomId('verify_manual')
    .setLabel('❓ Doesn\'t work? Click here!')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button, manualVerifyBtn);

  return { embed, components: [row] };
}

/**
 * Build ultra-styled ticket panel - NO ASCII
 */
function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Support PrimeGen')
    .setDescription(
      '**Need assistance or information?**\n\n' +
      '> 💳 **Purchases & Orders** (Payment issue, delivery)\n' +
      '> ♻️ **Replacements** (Defective account, warranty)\n' +
      '> 🤝 **Partnerships** (Collab, YouTube, TikTok)\n' +
      '> ❓ **General Questions** (How to generate, VIP)\n\n' +
      '*Our team usually replies in under 5 minutes.*\n' +
      '**👇 Click the button below to open a ticket!**'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '🎫 PrimeGen Support • Available 24/7',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId('ticket_create')
    .setLabel('📩 Open a Ticket')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(button);

  return { embed, components: [row] };
}

async function buildStockPanel(guild) {
  const { query } = require('../database/hybridPool');
  
  let totalStock = 0;
  
  const categories = {
    '🎬 STREAMING': ['netflix', 'disney', 'paramount', 'hbomax', 'primevideo', 'crunchyroll', 'adn', 'dazn'],
    '🎮 GAMING': ['steam', 'epicgames', 'fortnite', 'valorant', 'xbox', 'psn', 'battlenet', 'roblox'],
    '🛡️ VPN': ['nordvpn', 'expressvpn', 'mullvadvpn', 'protonvpn'],
    '🎵 MUSIC': ['spotify', 'deezer'],
    '📧 OTHERS': ['gmail', 'hotmail', 'paypal', 'ebay', 'duolingo', 'mega']
  };

  const allServices = getAllServices();
  const stockData = {};
  
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      stockData[row.service_id] = count;
      totalStock += count;
    }
  } catch (err) {
    // Ignore DB errors
  }
  
  let description = `**Total Accounts Available:** \`${totalStock}\`\n\n`;

  for (const [categoryName, serviceIds] of Object.entries(categories)) {
    description += `**${categoryName}**\n`;
    for (const serviceId of serviceIds) {
      const service = allServices.find(s => s.id === serviceId);
      if (!service) continue;

      const count = stockData[service.id] || 0;
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : `<:${emoji.name}:${emoji.id}>`;
      
      description += `> ${emojiStr} **${service.label}:** \`${count}\`\n`;
    }
    description += '\n';
  }
  
  const embed = new EmbedBuilder()
    .setTitle('📦 PrimeGen - Live Stock')
    .setDescription(description)
    .setColor(COLORS.SUCCESS)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '📦 PrimeGen Stock • Auto Updates',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();
    
  return { embed, components: [] };
}

/**
 * Build ultra-styled FAQ panel
 */
function buildFAQPanel() {
  const embed = new EmbedBuilder()
    .setTitle('❓ PrimeGen - Frequently Asked Questions (FAQ)')
    .setDescription(
      '**Welcome to the FAQ! Here are answers to the most common questions:**\n\n' +
      '> ⚡ **How do I generate an account?**\n' +
      '> Go to the free or premium generator channel and click the button for the service you want.\n\n' +
      '> ⏱️ **Is there a cooldown?**\n' +
      '> Yes! Free users have a longer cooldown between generations. Premium users have a much shorter or zero cooldown. (Check `/help` for your status!)\n\n' +
      '> 👑 **How do I get Premium?**\n' +
      '> You can buy Premium to unlock exclusive services, bypass cooldowns, and get instant priority delivery. Open a ticket to purchase!\n\n' +
      '> ❌ **My generated account doesn\'t work!**\n' +
      '> Free accounts are community-provided and can sometimes die fast. For guaranteed high-quality accounts, use the **Premium** generator. If you purchased something and it doesn\'t work, open a **Ticket**.\n\n' +
      '> 💬 **Why should I leave a #proof?**\n' +
      '> Leaving proofs helps us maintain trust and sometimes earns you rewards! Plus, it\'s nice to say thanks.\n\n' +
      '*Still have questions? Feel free to open a ticket!*'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '❓ PrimeGen • Knowledge Base',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();
    
  return { embed, components: [] };
}

/**
 * Build Shop Panel
 */
async function buildShopPanel() {
  const { StringSelectMenuBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('🛒 PrimeGen - Auto Shop')
    .setDescription(
      '**Welcome to our Automated Shop!** 🚀\n\n' +
      'Here you can purchase Discord Server Boosts instantly.\n' +
      'Our system supports **PayPal**, **Rewarble**, and **Robux**.\n\n' +
      '**How it works:**\n' +
      '1️⃣ Select your desired package from the menu below.\n' +
      '2️⃣ Follow the payment instructions (PayPal, Giftcard, or Gamepass).\n' +
      '3️⃣ Click **Submit Payment Proof** to verify your order.\n\n' +
      '> ⚡ Secure, Fast, and Reliable!'
    )
    .setColor(COLORS.INFO)
    .setImage(PANEL_BANNER_URL)
    .setFooter({ text: 'PrimeGen • Multi-Payment System' })
    .setTimestamp();

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('shop_package_select')
      .setPlaceholder('🛒 Select a Boost Package to Order...')
      .addOptions([
        {
          label: '14 Boosts (1 Month)',
          description: 'Price: 3.60 EUR',
          value: 'pkg_14b_1m'
        },
        {
          label: '28 Boosts (1 Month)',
          description: 'Price: 5.60 EUR',
          value: 'pkg_28b_1m'
        },
        {
          label: '14 Boosts (3 Months)',
          description: 'Price: 9.00 EUR',
          value: 'pkg_14b_3m'
        }
      ])
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create')
      .setLabel('Contact Support')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [selectRow, buttonRow] };
}

/**
 * Build Prime Panel - Only Fortnite High Quality & Valorant Medium Quality
 */
async function buildPrimePanel(guild) {
  const services = getServicesByTier('prime');

  // Fetch stock data for button labels
  const { query } = require('../database/hybridPool');
  const stockData = {};
  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      stockData[row.service_id] = parseInt(row.count, 10) || 0;
    }
  } catch (error) {
    // Silently continue if stock fetch fails
  }

  // Only keep services that have stock > 0
  const availableServices = services.filter(service => (stockData[service.id] || 0) > 0);

  const panels = [];

  if (availableServices.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('💎 PRIMEGEN PRIME')
      .setDescription('**Aucun service Prime n\'est disponible pour le moment !**\n\nRevenez plus tard lors du prochain réassort.')
      .setColor('#FFD700')
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: '💎 PrimeGen Prime • Ultra Exclusive', iconURL: 'https://i.goopics.net/2eukvn.gif' })
      .setTimestamp();
    return [{ embed, components: [] }];
  }

  // Split services into chunks of 25 (Discord max components per message)
  for (let i = 0; i < availableServices.length; i += 25) {
    const chunk = availableServices.slice(i, i + 25);

    // Build service list with emojis for the description
    let serviceList = '> ';
    let count = 0;
    for (const service of chunk.slice(0, 12)) {
      const emoji = await getOrFetchEmoji(guild, service);
      const emojiStr = typeof emoji === 'string' ? emoji : (emoji?.toString() || service.defaultEmoji);
      serviceList += `${emojiStr} **${service.label}**  `;
      count++;
      if (count % 3 === 0 && count < 12) serviceList += '\n> ';
    }
    if (chunk.length > 12) serviceList += `\n> *... and ${chunk.length - 12} other services below*`;

    const titleSuffix = i > 0 ? ` (Part ${Math.floor(i/25) + 1})` : '';

    // Ultra-styled embed WITHOUT ASCII
    const embed = new EmbedBuilder()
      .setTitle(`💎 PRIMEGEN PRIME${titleSuffix}`)
      .setDescription(
        i === 0 ? (
          '### 👑 Prime Access\n\n' +
          '> ⚡ **No queue** nor ads\n' +
          '> 🏆 Guaranteed **High/Medium quality** accounts\n' +
          '> 📩 **Instant** delivery in DMs\n' +
          '> 💎 24/7 Priority Support\n\n' +
          '### 📦 Prime Services\n' +
          `${serviceList}\n\n` +
          '**👇 Click a button below to generate!**'
        ) : (
          '### 📦 More Prime services...\n\n' +
          `${serviceList}\n\n` +
          '**👇 Click a button below to generate!**'
        )
      )
      .setColor('#FFD700') // Gold color for Prime
      .setFooter({ 
        text: '💎 PrimeGen Prime • Ultra Exclusive' + titleSuffix,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();

    // Only add banner to the first message to prevent chat clutter
    if (i === 0) {
      embed.setImage(PANEL_BANNER_URL);
    }

    // Create buttons with CUSTOM emojis
    const components = [];
    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;

    for (const service of chunk) {
      // Get or create custom emoji
      const emoji = await getOrFetchEmoji(guild, service);

      const stockCount = stockData[service.id] || 0;

      const button = new ButtonBuilder()
        .setCustomId(`gen_prime_${service.id}`)
        .setLabel(`${service.label.substring(0, 60)} [${stockCount}]`)
        .setStyle(ButtonStyle.Success);

      // Set emoji (custom object or default string)
      if (typeof emoji === 'string') {
        button.setEmoji(emoji);
      } else if (emoji && emoji.id) {
        button.setEmoji(emoji.id);
      }

      currentRow.addComponents(button);
      buttonCount++;

      // Start new row after 5 buttons
      if (buttonCount % 5 === 0 || buttonCount === chunk.length) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }

    panels.push({ embed, components });
  }

  return panels;
}

/**
 * Build Prime Stock Panel - Shows stock for Prime services (Restock via /prime-restock)
 */
async function buildPrimeStockPanel(guild) {
  const { query } = require('../database/hybridPool');

  let totalStock = 0;

  const primeServices = getServicesByTier('prime');
  const stockData = {};

  try {
    const result = await query('SELECT service_id, COUNT(*) as count FROM combos GROUP BY service_id');
    for (const row of result.rows) {
      const count = parseInt(row.count, 10) || 0;
      stockData[row.service_id] = count;
      totalStock += count;
    }
  } catch (err) {
    // Ignore DB errors
  }

  let description = `**💎 Prime Total Accounts Available:** \`${totalStock}\`\n\n`;

  for (const service of primeServices) {
    const count = stockData[service.id] || 0;
    const emoji = await getOrFetchEmoji(guild, service);
    const emojiStr = typeof emoji === 'string' ? emoji : `<:${emoji.name}:${emoji.id}>`;

    description += `> ${emojiStr} **${service.label}**: \`${count}\`\n`;
  }

  description += '\n> 💎 *Prime accounts are premium quality with better stats and longevity*\n' +
    '> 🔒 *Restock is strictly restricted to staff using `/prime-restock`*';

  const embed = new EmbedBuilder()
    .setTitle('💎 PrimeGen - Prime Stock Panel')
    .setDescription(description)
    .setColor('#FFD700')
    .setImage(PANEL_BANNER_URL)
    .setFooter({ 
      text: '💎 PrimeGen Prime Stock • Auto Updates Every 5s',
      iconURL: 'https://i.goopics.net/2eukvn.gif'
    })
    .setTimestamp();

  return { embed, components: [] };
}

module.exports = { command, execute, buildBasicPanels, buildPrimePanel, buildPrimeStockPanel, buildStockPanel, buildFAQPanel, buildShopPanel };
