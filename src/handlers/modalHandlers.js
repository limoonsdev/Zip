/**
 * =====================================================
 * MODAL HANDLERS
 * =====================================================
 * Centralized modal submit handlers
 */

const { getLogger } = require('../utils/logger');
const logger = getLogger();

/**
 * Register all modal handlers
 */
function registerModalHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    const { customId } = interaction;

    try {
      // Config modals
      if (customId.startsWith('config_modal_')) {
        const config = require('../commands/config');
        return await config.handleModalSubmit(interaction);
      }

      // Suggestion modal
      if (customId === 'suggestion_modal') {
        const title = interaction.fields.getTextInputValue('suggestion_title');
        const desc = interaction.fields.getTextInputValue('suggestion_desc');
        
        try {
          let suggestionChannel;
          try {
            suggestionChannel = await client.channels.fetch('1533148690544463922');
          } catch (e) {
            suggestionChannel = interaction.channel;
          }
          
          if (suggestionChannel) {
            const { EmbedBuilder } = require('discord.js');
            const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
            
            const embed = new EmbedBuilder()
              .setTitle(`💡 New Suggestion: ${title}`)
              .setDescription(`**Description:**\n${desc}`)
              .setColor(COLORS.INFO)
              .setAuthor({ 
                name: interaction.user.tag, 
                iconURL: interaction.user.displayAvatarURL() 
              })
              .setImage(PANEL_BANNER_URL)
              .setFooter({ text: 'LS・Shop & Gen • Suggestions' })
              .setTimestamp();
              
            await suggestionChannel.send({ embeds: [embed] });
            
            return await interaction.reply({
              content: '✅ Thank you! Your suggestion has been successfully submitted.',
              ephemeral: true
            });
          }
        } catch (err) {
          logger.error('ModalHandler', 'Failed to send suggestion', { error: err.message });
          return await interaction.reply({
            content: '❌ Failed to submit your suggestion. Please try again later.',
            ephemeral: true
          });
        }
      }

      // Announce modal
      if (customId === 'announce_modal') {
        const titleEn = interaction.fields.getTextInputValue('announce_title_en');
        const descEn = interaction.fields.getTextInputValue('announce_desc_en');
        const titleFr = interaction.fields.getTextInputValue('announce_title_fr');
        const descFr = interaction.fields.getTextInputValue('announce_desc_fr');
        
        try {
          let announceChannel;
          try {
            announceChannel = await client.channels.fetch('1533150308602220786');
          } catch (e) {
            announceChannel = interaction.channel;
          }
          
          if (announceChannel) {
            const { EmbedBuilder } = require('discord.js');
            const { COLORS, PANEL_BANNER_URL } = require('../config/constants');
            
            const embed = new EmbedBuilder()
              .setTitle('📢 LS・Shop & Gen - Announcement')
              .setDescription(
                `🇬🇧 **${titleEn}**\n${descEn}\n\n` +
                `🇫🇷 **${titleFr}**\n${descFr}`
              )
              .setColor(COLORS.INFO)
              .setAuthor({ 
                name: interaction.guild.name, 
                iconURL: interaction.guild.iconURL() 
              })
              .setImage(PANEL_BANNER_URL)
              .setTimestamp();
              
            await announceChannel.send({ content: '@everyone', embeds: [embed] });
            
            return await interaction.reply({
              content: '✅ Announcement successfully sent!',
              ephemeral: true
            });
          }
        } catch (err) {
          logger.error('ModalHandler', 'Failed to send announcement', { error: err.message });
          return await interaction.reply({
            content: '❌ Failed to send announcement. Please check channel permissions.',
            ephemeral: true
          });
        }
      }

      // Shop Order Modal
      if (customId === 'shop_order_modal') {
        await interaction.deferReply({ flags: 64 });
        
        const quantityStr = interaction.fields.getTextInputValue('boost_quantity');
        const durationStr = interaction.fields.getTextInputValue('boost_duration');
        
        const quantity = parseInt(quantityStr, 10);
        const duration = parseInt(durationStr, 10);
        
        if (isNaN(quantity) || quantity <= 0 || isNaN(duration) || (duration !== 1 && duration !== 3)) {
          return await interaction.editReply({
            content: '❌ Invalid input! Quantity must be > 0 and duration must be 1 or 3 months.'
          });
        }
        
        // Calculate price based on duration and quantity (Placeholder prices: 1 month = $2/boost, 3 months = $5/boost)
        // If the user specifies real prices, we'll update this via config later.
        const pricePerBoost = duration === 1 ? 2.0 : 5.0;
        const totalPrice = (quantity * pricePerBoost).toFixed(2);
        
        try {
          const { query } = require('../database/hybridPool');
          const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
          const { COLORS } = require('../config/constants');
          
          const orderId = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
          const robuxRate = parseFloat(process.env.SHOP_ROBUX_RATE || '100');
          const robuxPrice = Math.ceil(totalPrice * robuxRate);
          
          const paypalEmail = process.env.SHOP_PAYPAL_EMAIL || 'your-paypal@email.com';
          const robuxUrl = process.env.SHOP_ROBUX_URL || 'https://roblox.com/gamepass-link';
          
          // Insert pending order into database
          await query(
            'INSERT INTO orders (user_id, product, quantity, duration, price, currency, payment_proof, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [interaction.user.id, 'Discord Server Boosts', quantity, duration, totalPrice, 'EUR', orderId, 'PENDING_PAYMENT']
          );
          
          const embed = new EmbedBuilder()
            .setTitle('🛒 Checkout - LS・Shop & Gen')
            .setDescription(`You are ordering **${quantity}x Boosts** for **${duration} Month(s)**.\n\n` +
              '**Total to pay:**\n' +
              `💶 **${totalPrice} EUR** (PayPal / Rewarble)\n` +
              `💎 **${robuxPrice} Robux** (Roblox Gamepass)\n\n` +
              '### Payment Methods:\n' +
              `1️⃣ **PayPal:** Send \`${totalPrice} EUR\` via 'Friends & Family' to: \`${paypalEmail}\`\n` +
              `2️⃣ **Rewarble:** Prepare a Rewarble Giftcard worth \`${totalPrice} EUR\`\n` +
              `3️⃣ **Robux:** Buy this Gamepass for \`${robuxPrice} Robux\`: [Click Here](${robuxUrl})\n\n` +
              '*After paying, click the button below to submit your proof (Transaction ID, Code, or Username).*'
            )
            .setColor(COLORS.INFO)
            .setFooter({ text: `Order ID: ${orderId}` });
            
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`shop_submit_payment_${orderId}`)
              .setLabel('Submit Payment Proof')
              .setEmoji('📤')
              .setStyle(ButtonStyle.Primary)
          );
          
          return await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
          logger.error('Shop', 'Order creation failed', { error: error.message });
          return await interaction.editReply({
            content: `❌ Failed to create order: ${error.message}`
          });
        }
      }

      // Shop Submit Proof Modal
      if (customId.startsWith('shop_proof_modal_')) {
        const orderId = customId.replace('shop_proof_modal_', '');
        await interaction.deferReply({ flags: 64 });
        
        const method = interaction.fields.getTextInputValue('payment_method');
        const proof = interaction.fields.getTextInputValue('payment_proof');
        
        try {
          const { query } = require('../database/hybridPool');
          const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
          const { COLORS } = require('../config/constants');
          
          const orderDb = await query('SELECT * FROM orders WHERE paypal_order_id = $1', [orderId]);
          const order = orderDb.rows[0];
          
          if (!order) return interaction.editReply({ content: '❌ Order not found.' });
          
          // Disable the button on original message
          if (interaction.message) {
            await interaction.message.edit({ components: [] }).catch(() => {});
          }
          
          // Update order status to manual verification
          await query(
            'UPDATE orders SET payment_method = $1, payment_proof = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = $4',
            [method, proof, 'PENDING_VERIFICATION', orderId]
          );
          
          const embed = new EmbedBuilder()
            .setTitle('✅ Proof Submitted')
            .setDescription('Your payment proof has been transmitted to the staff.\nPlease wait patiently while we verify it.')
            .setColor(COLORS.SUCCESS);
            
          await interaction.editReply({ embeds: [embed] });
          
          // Notify Staff in the SAME ticket
          const staffEmbed = new EmbedBuilder()
            .setTitle('🚨 ORDER VERIFICATION REQUIRED')
            .setDescription(
              'A customer has submitted a payment proof for their order.\n\n' +
              `👤 **Customer:** <@${order.user_id}>\n` +
              `🆔 **Order ID:** \`${orderId}\`\n` +
              `📦 **Product:** \`${order.product}\`\n` +
              `💰 **Amount Due:** \`${order.price}€\`\n\n` +
              '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              `💳 **Payment Method:** \`${method}\`\n` +
              `🧾 **Proof / Code:** \n\`\`\`\n${proof}\n\`\`\`\n\n` +
              '⚠️ *Please verify this payment carefully before clicking Approve.*'
            )
            .setColor(COLORS.WARNING)
            .setFooter({ text: 'LS・Staff System' })
            .setTimestamp();
            
          const staffRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`shop_approve_${orderId}`)
              .setLabel('Approve')
              .setEmoji('✅')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`shop_reject_${orderId}`)
              .setLabel('Reject')
              .setEmoji('❌')
              .setStyle(ButtonStyle.Danger)
          );
            
          await interaction.channel.send({ content: '@here A staff member must verify this payment.', embeds: [staffEmbed], components: [staffRow] });
          
          return;
        } catch (error) {
          logger.error('Shop', 'Proof submission failed', { error: error.message });
          return await interaction.editReply({ content: `❌ Failed to submit proof: ${error.message}` });
        }
      }

      logger.debug('ModalHandler', `Unhandled modal: ${customId}`);

      // Prime Stock Upload Modal
      if (customId === 'prime_stock_upload_modal') {
        await interaction.deferReply({ flags: 64 });

        const serviceId = interaction.fields.getTextInputValue('prime_service').toLowerCase().trim();
        const accountsInput = interaction.fields.getTextInputValue('prime_accounts');

        // Validate service
        const { getServiceById } = require('../config/services');
        const service = getServiceById(serviceId);

        if (!service || service.tier !== 'prime') {
          return await interaction.editReply({
            content: '❌ Invalid Prime service! Use: fortnite_prime or valorant_prime'
          });
        }

        // Parse accounts
        const accounts = accountsInput.split('\n').map(a => a.trim()).filter(Boolean);

        if (accounts.length === 0) {
          return await interaction.editReply({
            content: '❌ No valid accounts provided!'
          });
        }

        const { query } = require('../database/hybridPool');
        const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
        const { getOrFetchEmoji } = require('../services/emojiManager');

        let added = 0;
        let failed = 0;

        for (const combo of accounts) {
          if (!combo.includes(':')) {
            failed++;
            continue;
          }

          try {
            const [email] = combo.split(':');
            await query(
              'INSERT INTO combos (service_id, combo, email, quality_score) VALUES ($1, $2, $3, $4) ON CONFLICT (combo) DO NOTHING',
              [serviceId, combo, email, 100] // Prime gets quality score 100
            );
            added++;
          } catch (error) {
            failed++;
          }
        }

        // Get new stock count
        const stockResult = await query(
          'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
          [serviceId]
        );
        const totalStock = stockResult.rows[0]?.count || 0;

        // Get service emoji
        const serviceEmoji = await getOrFetchEmoji(interaction.guild, service);

        const embed = {
          title: '✅ Prime Stock Uploaded',
          description: `**Service**\n${serviceEmoji} ${service.label}\n\n**Summary**\n✅ Added: \`${added}\`\n❌ Failed: \`${failed}\`\n\n📦 New Total: \`${totalStock}\``,
          color: COLORS.SUCCESS,
          image: { url: PANEL_BANNER_URL },
          footer: {
            text: 'LS・Shop & Gen - Prime Stock Manager',
            iconURL: 'https://i.goopics.net/24ejy6.gif'
          },
          timestamp: new Date().toISOString()
        };

        await interaction.editReply({ embeds: [embed] });

        logger.info('PrimeStock', `Prime stock uploaded for ${serviceId}`, {
          service: serviceId,
          added,
          failed,
          totalStock,
          user: interaction.user.tag
        });
      }
    } catch (error) {
      logger.error('ModalHandler', 'Error handling modal', { 
        customId, 
        error: error.message 
      });

      try {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      } catch (e) {
        // Ignore reply errors
      }
    }
  });

  logger.info('ModalHandlers', 'Modal handlers registered');
}

module.exports = {
  registerModalHandlers
};
