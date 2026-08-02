/**
 * =====================================================
 * BUTTON INTERACTION HANDLERS - ULTRA PREMIUM
 * =====================================================
 */

const { getLogger } = require('../utils/logger');
const { EMOJIS } = require('../config/constants');
const { getServiceById } = require('../config/services');
const { query } = require('../database/hybridPool');

const logger = getLogger();

function registerButtonHandlers(client) {
  logger.info('ButtonHandlers', 'Button handlers registered');
}

async function handleButton(interaction) {
  const customId = interaction.customId;

  try {
    if (customId.startsWith('gen_free_') || customId.startsWith('gen_premium_')) {
      await handleGenButton(interaction);
    } else if (customId === 'verify_user') {
      await handleVerifyButton(interaction);
    } else if (customId === 'verify_manual') {
      await handleVerifyManual(interaction);
    } else if (customId.startsWith('manual_accept_')) {
      await handleManualAccept(interaction);
    } else if (customId.startsWith('manual_reject_')) {
      await handleManualReject(interaction);
    } else if (customId === 'ticket_create') {
      await handleTicketButton(interaction);
    } else if (customId === 'ticket_close') {
      await handleTicketClose(interaction);
    } else if (customId === 'shop_order_boosts') {
      await handleShopOrder(interaction);
    } else if (customId.startsWith('shop_submit_payment_')) {
      await handleShopSubmitPayment(interaction);
    } else if (customId.startsWith('shop_approve_')) {
      await handleShopApprove(interaction);
    } else if (customId.startsWith('shop_reject_')) {
      await handleShopReject(interaction);
    } else if (customId.startsWith('config_')) {
      const configHandler = require('../commands/config');
      await configHandler.handleConfigButton(interaction);
    } else {
      logger.warn('ButtonHandlers', `Unknown button: ${customId}`);
    }
  } catch (error) {
    logger.error('ButtonHandlers', `Error handling button ${customId}`, { error: error.message });
    
    const reply = {
      content: `${EMOJIS.ERROR} An error occurred: ${error.message}`,
      flags: 64
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}

async function handleGenButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  const parts = interaction.customId.split('_');
  const tier = parts[1];
  const serviceId = parts.slice(2).join('_');

  if (tier === 'premium' && !interaction.member.roles.cache.has('1532346926425444474')) {
    return interaction.editReply({
      content: "🖕 Va te faire foutre, t'as pas le rôle Premium ! Achète-le sur le shop avant de cliquer ici."
    });
  }

  const service = getServiceById(serviceId);
  if (!service) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} Service not found!`
    });
  }

  const stockResult = await query('SELECT COUNT(*) as count FROM combos WHERE service_id = $1', [serviceId]);
  const stock = stockResult.rows[0]?.count || 0;

  if (stock === 0) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} **${service.label}** is currently out of stock!\n${EMOJIS.INFO} Come back later.`
    });
  }

  const comboResult = await query(
    'SELECT id, combo, account_info FROM combos WHERE service_id = $1 ORDER BY id ASC LIMIT 1',
    [serviceId]
  );

  if (!comboResult.rows || comboResult.rows.length === 0) {
    return interaction.editReply({
      content: `${EMOJIS.ERROR} Cannot retrieve an account right now.`
    });
  }

  const account = comboResult.rows[0];
  await query('DELETE FROM combos WHERE id = $1', [account.id]);

  try {
    const dmEmbed = {
      title: `${EMOJIS.SUCCESS} ${service.label} - Account Generated`,
      description: [
        `**${service.label}**`,
        '',
        '```',
        account.combo,
        '```',
        '',
        account.account_info ? `ℹ️ **Info:** ${account.account_info}` : '',
        '',
        `${EMOJIS.INFO} **Tips:**`,
        `• Change the password as soon as possible`,
        `• Do not share this account`,
        `• Leave your feedback in #proof!`,
        '',
        `**Stock remaining:** ${stock - 1}`
      ].filter(Boolean).join('\n'),
      color: tier === 'premium' ? 0xFFD700 : 0x2B2D31,
      footer: { text: 'LS・Shop & Gen Generator' },
      timestamp: new Date().toISOString()
    };

    await interaction.user.send({ embeds: [dmEmbed] });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **${service.label}** sent via DM!\n${EMOJIS.INFO} Check your direct messages.`
    });

    logger.info('Gen', `Account generated for ${interaction.user.tag}`, {
      service: serviceId,
      tier,
      guild: interaction.guild?.id
    });
    
    if (interaction.guild) {
      const { sendDiscordLog } = require('../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Account Generated',
        `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Service:** ${service.label}\n**Tier:** ${tier === 'premium' ? '👑 Premium' : '🆓 Free'}`,
        tier === 'premium' ? 0xFFD700 : 0x5865F2
      );
    }

  } catch (dmError) {
    logger.error('Gen', 'Could not send DM', { error: dmError.message });
    
    await query(
      'INSERT INTO combos (service_id, combo, account_info) VALUES ($1, $2, $3)',
      [serviceId, account.combo, account.account_info]
    );

    await interaction.editReply({
      content: `${EMOJIS.ERROR} Could not send you a DM!\n${EMOJIS.INFO} Check that your DMs are enabled.`
    });
  }
}

async function handleVerifyButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  const member = interaction.member;
  const verifiedRoleId = '1532346852203040768';

  if (member.roles.cache.has(verifiedRoleId)) {
    return interaction.editReply({
      content: `${EMOJIS.SUCCESS} You are already verified!`
    });
  }

  try {
    await member.roles.add(verifiedRoleId);
    const membresRoleId = '1532391228040282232';
    await member.roles.add(membresRoleId).catch(() => {});
    
    const notRegisteredRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
    if (notRegisteredRole) {
      await member.roles.remove(notRegisteredRole).catch(() => {});
    }
    
    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} **Verification successful!**\n${EMOJIS.INFO} Welcome to LS・Shop & Gen!`
    });

    logger.info('Verify', `User verified: ${member.user.tag}`, {
      guild: interaction.guild.id,
      user: member.id
    });
    
    if (interaction.guild) {
      const { sendDiscordLog } = require('../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Member Verified',
        `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Type:** Automatic Verification`,
        0x57F287
      );
    }
  } catch (error) {
    logger.error('Verify', 'Verification failed', { error: error.message });
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Error during verification.`
    });
  }
}

async function handleVerifyManual(interaction) {
  await interaction.reply({
    content: `${EMOJIS.SUCCESS} Your manual verification request has been sent to the staff. Please wait.`,
    flags: 64
  });

  const logChannelId = '1532375665544925408';
  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const embed = new EmbedBuilder()
    .setTitle('👀 Manual Verification Request')
    .setDescription(`**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Account Created:** <t:${Math.floor(interaction.user.createdAt.getTime() / 1000)}:R>`)
    .setColor(0xFEE75C)
    .setTimestamp();

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`manual_accept_${interaction.user.id}`)
    .setLabel('✅ Accept')
    .setStyle(ButtonStyle.Success);
  
  const rejectBtn = new ButtonBuilder()
    .setCustomId(`manual_reject_${interaction.user.id}`)
    .setLabel('❌ Reject')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  await logChannel.send({ embeds: [embed], components: [row] });
}

async function handleManualAccept(interaction) {
  const userId = interaction.customId.split('_')[2];
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  
  const { EmbedBuilder } = require('discord.js');
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x57F287)
    .setDescription(interaction.message.embeds[0].description + `\n\n✅ **Accepted by:** ${interaction.user}`);

  await interaction.update({ embeds: [embed], components: [] });

  if (member) {
    const verifiedRoleId = '1532346852203040768';
    const membresRoleId = '1532391228040282232';
    await member.roles.add(verifiedRoleId).catch(() => {});
    await member.roles.add(membresRoleId).catch(() => {});
    
    const notRegisteredRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
    if (notRegisteredRole) {
      await member.roles.remove(notRegisteredRole).catch(() => {});
    }

    await member.send(`✅ You have been manually verified by staff. Welcome!`).catch(() => {});
    
    const { sendDiscordLog } = require('../utils/discordLogger');
    await sendDiscordLog(
      interaction.guild,
      'Member Verified',
      `**User:** ${member.user} (\`${member.user.id}\`)\n**Type:** Manual Verification\n**Staff:** ${interaction.user}`,
      0x57F287
    );
  }
}

async function handleManualReject(interaction) {
  const userId = interaction.customId.split('_')[2];
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  
  const { EmbedBuilder } = require('discord.js');
  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xED4245)
    .setDescription(interaction.message.embeds[0].description + `\n\n❌ **Rejected by:** ${interaction.user}`);

  await interaction.update({ embeds: [embed], components: [] });

  if (member) {
    await member.send(`❌ Your manual verification request was rejected.`).catch(() => {});
  }
}

async function handleTicketButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    // Check if category exists, or create it
    let ticketCategory = interaction.guild.channels.cache.find(c => c.type === 4 && c.name.toLowerCase().includes('ticket'));
    
    if (!ticketCategory) {
      ticketCategory = await interaction.guild.channels.create({
        name: '🎫 TICKETS',
        type: 4, // 4 is Category
      });
    }

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0,
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        }
      ]
    });

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const { COLORS, PANEL_BANNER_URL } = require('../config/constants');

    const ticketEmbed = new EmbedBuilder()
      .setTitle(`🎫 Ticket - ${interaction.user.username}`)
      .setDescription(
        `**Welcome to your ticket, ${interaction.user}!**\n\n` +
        `> 💡 **Please describe your request in detail.**\n` +
        `> ⏳ A staff member will be with you shortly.\n\n` +
        `*Click the button below when you are ready to close this ticket.*`
      )
      .setColor(COLORS.INFO)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setImage(PANEL_BANNER_URL)
      .setFooter({ text: 'LS・Shop & Gen Support' })
      .setTimestamp();
      
    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [closeBtn] });

    await interaction.editReply({
      content: `${EMOJIS.SUCCESS} Ticket created: ${ticketChannel}`
    });

    logger.info('Ticket', `Ticket created by ${interaction.user.tag}`, {
      guild: interaction.guild.id,
      channel: ticketChannel.id
    });
    
    const { sendDiscordLog } = require('../utils/discordLogger');
    await sendDiscordLog(
      interaction.guild,
      'Ticket Created',
      `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Channel:** ${ticketChannel}`,
      COLORS.INFO
    );
  } catch (error) {
    logger.error('Ticket', 'Ticket creation failed', { error: error.message });
    await interaction.editReply({
      content: `${EMOJIS.ERROR} Error during ticket creation.`
    });
  }
}

async function handleTicketClose(interaction) {
  await interaction.deferReply();
  
  try {
    await interaction.editReply('🔒 Closing ticket in 3 seconds...');
    
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (err) {
        logger.error('Ticket', 'Failed to delete ticket channel', { error: err.message });
      }
    }, 3000);
    
    logger.info('Ticket', `Ticket closed by ${interaction.user.tag}`, {
      channel: interaction.channel.name
    });
    
    if (interaction.guild) {
      const { sendDiscordLog } = require('../utils/discordLogger');
      await sendDiscordLog(
        interaction.guild,
        'Ticket Closed',
        `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n**Channel:** ${interaction.channel.name}`,
        0xED4245
      );
    }
  } catch (error) {
    logger.error('Ticket', 'Error closing ticket', { error: error.message });
  }
}

// ==========================================
// SHOP HANDLERS
// ==========================================

async function handleShopOrder(interaction) {
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('shop_order_modal')
    .setTitle('Order Discord Boosts');

  const quantityInput = new TextInputBuilder()
    .setCustomId('boost_quantity')
    .setLabel('How many boosts? (e.g., 2, 14)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(3);

  const durationInput = new TextInputBuilder()
    .setCustomId('boost_duration')
    .setLabel('Duration in months? (1 or 3)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(2);

  modal.addComponents(
    new ActionRowBuilder().addComponents(quantityInput),
    new ActionRowBuilder().addComponents(durationInput)
  );

  await interaction.showModal(modal);
}

async function handleShopSubmitPayment(interaction) {
  const orderId = interaction.customId.replace('shop_submit_payment_', '');
  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`shop_proof_modal_${orderId}`)
    .setTitle('Submit Payment Proof');

  const methodInput = new TextInputBuilder()
    .setCustomId('payment_method')
    .setLabel('Payment Method (PayPal, Rewarble, Robux)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const proofInput = new TextInputBuilder()
    .setCustomId('payment_proof')
    .setLabel('Transaction ID / Giftcard Code / Username')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(200);

  modal.addComponents(
    new ActionRowBuilder().addComponents(methodInput),
    new ActionRowBuilder().addComponents(proofInput)
  );

  await interaction.showModal(modal);
}

async function handleShopApprove(interaction) {
  const dbId = interaction.customId.replace('shop_approve_', '');
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const { query } = require('../database/hybridPool');
    const { EmbedBuilder } = require('discord.js');
    const { COLORS } = require('../config/constants');
    
    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [dbId]);
    const order = orderDb.rows[0];
    
    if (!order || order.status !== 'PENDING_VERIFICATION') {
      return interaction.editReply({ content: '❌ Order not found or already processed.' });
    }
    
    await query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $2', ['COMPLETED', dbId]);
    
    // Disable buttons on the original message and update staff embed
    const msg = interaction.message;
    const staffEmbed = new EmbedBuilder()
      .setTitle('✅ VERIFIED BY STAFF')
      .setDescription(`This payment was successfully verified by <@${interaction.user.id}>.\nOrder ID: \`${dbId}\``)
      .setColor(COLORS.SUCCESS)
      .setTimestamp();
    await msg.edit({ embeds: [staffEmbed], components: [] });
    
    // DM the user
    try {
      const user = await interaction.client.users.fetch(order.user_id);
      const embed = new EmbedBuilder()
      .setTitle('✅ PAYMENT APPROVED')
      .setDescription(`Congratulations <@${order.user_id}>! 🎉\n\nYour payment for **${order.product}** has been successfully verified.\nYour order will now be processed by our automated system!`)
      .setColor(COLORS.SUCCESS)
      .setImage(require('../config/constants').PANEL_BANNER_URL || null)
      .setFooter({ text: `Order ID: ${dbId} • LS・Shop & Gen` })
      .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {} // Ignore if DMs are closed
    
    await interaction.editReply({ content: `✅ Order #${order.payment_proof} approved successfully!` });
  } catch (error) {
    await interaction.editReply({ content: `❌ Error: ${error.message}` });
  }
}

async function handleShopReject(interaction) {
  const dbId = interaction.customId.replace('shop_reject_', '');
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const { query } = require('../database/hybridPool');
    const { EmbedBuilder } = require('discord.js');
    const { COLORS } = require('../config/constants');
    
    const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [dbId]);
    const order = orderDb.rows[0];
    
    if (!order || order.status !== 'PENDING_VERIFICATION') {
      return interaction.editReply({ content: '❌ Order not found or already processed.' });
    }
    
    await query('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $2', ['REJECTED', dbId]);
    
    // Disable buttons on the original message and update staff embed
    const msg = interaction.message;
    const staffEmbed = new EmbedBuilder()
      .setTitle('❌ REJECTED BY STAFF')
      .setDescription(`This payment was rejected by <@${interaction.user.id}>.\nOrder ID: \`${dbId}\``)
      .setColor(COLORS.ERROR)
      .setTimestamp();
    await msg.edit({ embeds: [staffEmbed], components: [] });
    
    // DM the user
    try {
      const user = await interaction.client.users.fetch(order.user_id);
      const embed = new EmbedBuilder()
      .setTitle('❌ PAYMENT REJECTED')
      .setDescription(`Hello <@${order.user_id}>,\n\nUnfortunately, your payment for **${order.product}** could not be verified or was invalid.\nIf you believe this is an error, please open a regular support ticket.`)
      .setColor(COLORS.ERROR)
      .setFooter({ text: `Order ID: ${dbId} • LS・Shop & Gen` })
      .setTimestamp();
      await user.send({ embeds: [embed] });
    } catch (e) {} // Ignore if DMs are closed
    
    await interaction.editReply({ content: `❌ Order #${order.payment_proof} rejected successfully!` });
  } catch (error) {
    await interaction.editReply({ content: `❌ Error: ${error.message}` });
  }
}

module.exports = {
  registerButtonHandlers,
  handleButton
};
