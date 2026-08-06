/**
 * =====================================================
 * SELECT MENU HANDLERS
 * =====================================================
 */

const { getLogger } = require('../utils/logger');
const logger = getLogger();

function registerSelectHandlers(client) {
  logger.info('SelectHandlers', 'Registering select menu handlers...');

  // Config select handler
  client.selectHandlers.set('config_select_category', async (interaction) => {
    try {
      const { handleCategorySelection } = require('../commands/config');
      await handleCategorySelection(interaction);
    } catch (error) {
      logger.error('SelectHandlers', 'Config category selection failed', { error: error.message });
      
      const reply = {
        content: '❌ An error occurred while processing your selection.',
        ephemeral: true
      };
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  // Shop package select handler
  client.selectHandlers.set('shop_package_select', async (interaction) => {
    try {
      await interaction.deferReply({ flags: 64 });
      
      const selection = interaction.values[0];
      let quantity = 0, duration = 0, totalPrice = 0, robuxPrice = 0, product = '', robuxUrl = '';
      
      switch (selection) {
      case 'pkg_14b_1m':
        quantity = 14; duration = 1; totalPrice = 3.60; robuxPrice = 515;
        product = '14x Discord Server Boosts (1 Month)';
        robuxUrl = 'https://www.roblox.com/fr/game-pass/1933119505/LS-Shop-14-Boost-Robux-1-Month';
        break;
      case 'pkg_28b_1m':
        quantity = 28; duration = 1; totalPrice = 5.60; robuxPrice = 800;
        product = '28x Discord Server Boosts (1 Month)';
        robuxUrl = 'https://www.roblox.com/fr/game-pass/1933701407/LS-Shop-28-Boost-Robux-1-Month';
        break;
      case 'pkg_14b_3m':
        quantity = 14; duration = 3; totalPrice = 9.00; robuxPrice = 1300;
        product = '14x Discord Server Boosts (3 Months)';
        robuxUrl = 'https://www.roblox.com/fr/game-pass/1933623398/LS-Shop-14-Boost-Robux-3-Month';
        break;
      case 'pkg_robux_1000':
        quantity = 1000; duration = 0; totalPrice = 1.79; robuxPrice = 1429; // ~1429 after 30% tax if needed, but not required to display. We'll just set it.
        product = '1000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1200':
        quantity = 1200; duration = 0; totalPrice = 2.15; robuxPrice = 1715;
        product = '1200 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1400':
        quantity = 1400; duration = 0; totalPrice = 2.51; robuxPrice = 2000;
        product = '1400 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_1800':
        quantity = 1800; duration = 0; totalPrice = 3.22; robuxPrice = 2572;
        product = '1800 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_2000':
        quantity = 2000; duration = 0; totalPrice = 3.58; robuxPrice = 2858;
        product = '2000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_robux_4000':
        quantity = 4000; duration = 0; totalPrice = 7.16; robuxPrice = 5715;
        product = '4000 Robux';
        robuxUrl = 'N/A';
        break;
      case 'pkg_nitro_1m':
        quantity = 1; duration = 1; totalPrice = 3.60; robuxPrice = 0;
        product = 'Discord Nitro 1 Month (Gift Link)';
        robuxUrl = 'N/A';
        break;
      default:
        return interaction.editReply({ content: '❌ Unknown package selected.' });
      }
      
      const { query } = require('../database/hybridPool');
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
      const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
      
      const orderId = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const paypalLink = process.env.SHOP_PAYPAL_ME || 'Ask staff for PayPal address';
      
      // Create a ticket for the order
      let ticketCategory = interaction.guild.channels.cache.find(c => c.type === 4 && c.name.toLowerCase().includes('order'));
      if (!ticketCategory) {
        ticketCategory = await interaction.guild.channels.create({
          name: '🛒 ORDERS',
          type: 4
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `order-${interaction.user.username}`,
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
      
      // Insert pending order into database
      await query(
        'INSERT INTO orders (user_id, product, quantity, duration, price, currency, paypal_order_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [interaction.user.id, product, quantity, duration, totalPrice, 'EUR', orderId, 'PENDING_PAYMENT']
      );
      
      const embed = new EmbedBuilder()
        .setTitle('💳 SECURE CHECKOUT')
        .setDescription(
          'Thank you for choosing **PrimeGen**! You are about to purchase:\n' +
          `> 📦 **Product:** \`${product}\`\n` +
          `> 💶 **Price (EUR):** \`${totalPrice.toFixed(2)}€\`\n` +
          `> 💎 **Price (R$):** \`${robuxPrice} Robux\`\n\n` +
          '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '### 💳 CHOOSE YOUR PAYMENT METHOD:\n\n' +
          '🔵 **PAYPAL**\n' +
          `${paypalLink.startsWith('http') ? `> 🔗 [**Click Here to Pay via PayPal**](${paypalLink})` : `> 📧 Send to: \`${paypalLink}\``}\n` +
          '> *Use "Friends & Family" to avoid delays.*\n\n' +
          '🟡 **REWARBLE GIFTCARD**\n' +
          `> 🎫 Prepare a Rewarble Giftcard worth \`${totalPrice.toFixed(2)}€\`.\n\n` +
          '🟢 **ROBUX (GAMEPASS / GIFTCARD)**\n' +
          (robuxUrl === 'N/A' ? `> 🛒 **Please ask staff in this ticket for the Gamepass/Payment link.**\n\n` : `> 🛒 [**Click Here to Buy the Gamepass**](${robuxUrl})\n\n`) +
          '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '✅ **Once paid, click the `📤 Submit Payment Proof` button below!**\n' +
          '*(We will ask for your Transaction ID, Giftcard Code, or Roblox Username).*'
        )
        .setImage(PANEL_BANNER_URL || null)
        .setColor(COLORS.INFO)
        .setFooter({ text: `Order ID: ${orderId} • PrimeGen` })
        .setTimestamp();
        
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_submit_payment_${orderId}`)
          .setLabel('Submit Payment Proof')
          .setEmoji('📤')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_close')
          .setLabel('Cancel Order')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
      );
      
      await ticketChannel.send({ content: `<@${interaction.user.id}> | A staff member will be with you shortly to assist with your order.`, embeds: [embed], components: [row] });
      
      return await interaction.editReply({ content: `✅ Your order ticket has been created: <#${ticketChannel.id}>` });
      
    } catch (error) {
      logger.error('SelectHandlers', 'Shop package selection failed', { error: error.message });
      return await interaction.editReply({ content: `❌ An error occurred: ${error.message}` });
    }
  });

  logger.info('SelectHandlers', '✅ Select menu handlers registered');
}

module.exports = {
  registerSelectHandlers
};
