/**
 * =====================================================
 * VERIFIED COMMAND - LIST VERIFIED USERS
 * =====================================================
 * View all verified users via OAuth2
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLogger } = require('../utils/logger');
const { EMOJIS, COLORS, PANEL_BANNER_URL } = require('../config/constants');
const { query } = require('../database/hybridPool');

const logger = getLogger();

const command = new SlashCommandBuilder()
  .setName('verified')
  .setDescription('👥 View verified users')
  .setDefaultMemberPermissions('8') // Administrator
  .addIntegerOption(option =>
    option.setName('page')
      .setDescription('Page to display (default: 1)')
      .setMinValue(1)
      .setRequired(false))
  .addBooleanOption(option =>
    option.setName('refresh')
      .setDescription('Refresh and assign roles')
      .setRequired(false));

async function execute(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    const page = interaction.options.getInteger('page') || 1;
    const refresh = interaction.options.getBoolean('refresh') || false;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM verified_users');
    const totalUsers = parseInt(countResult.rows[0]?.total || 0);
    const totalPages = Math.ceil(totalUsers / pageSize);

    if (totalUsers === 0) {
      return interaction.editReply({
        content: `${EMOJIS.INFO} No verified users at the moment.\n\n` +
          '**Verification link:**\n' +
          `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&scope=identify+guilds.join`
      });
    }

    // Get users for this page
    const result = await query(
      'SELECT user_id, username, discriminator, avatar, verified_at, scope FROM verified_users ORDER BY verified_at DESC LIMIT $1 OFFSET $2',
      [pageSize, offset]
    );

    // Refresh roles if requested
    let refreshedCount = 0;
    if (refresh) {
      const roleId = process.env.VERIFIED_ROLE_ID;
      if (roleId) {
        for (const user of result.rows) {
          try {
            const member = await interaction.guild.members.fetch(user.user_id);
            if (member && !member.roles.cache.has(roleId)) {
              await member.roles.add(roleId);
              refreshedCount++;
            }
          } catch (error) {
            // User not in guild
          }
        }
      }
    }

    // Build user list
    let userList = '';
    for (let i = 0; i < result.rows.length; i++) {
      const user = result.rows[i];
      const num = offset + i + 1;
      const verifiedDate = new Date(user.verified_at).toLocaleDateString('fr-FR');
      
      userList += `**${num}.** ${user.username}#${user.discriminator}\n`;
      userList += `   └ ID: \`${user.user_id}\` | Verified: ${verifiedDate}\n\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle('👥 Verified Users')
      .setDescription(
        `**Total: ${totalUsers} users**\n` +
        `Page ${page}/${totalPages}\n\n` +
        userList +
        (refresh ? `\n✅ ${refreshedCount} roles refreshed` : '')
      )
      .setColor(COLORS.SUCCESS)
      .setImage(PANEL_BANNER_URL)
      .setFooter({ 
        text: `PrimeGen - OAuth2 Verification System • Page ${page}/${totalPages}`,
        iconURL: 'https://i.goopics.net/2eukvn.gif'
      })
      .setTimestamp();

    // Add verification link
    embed.addFields({
      name: '🔗 Verification Link',
      value: `[Click here to verify yourself](https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&scope=identify+guilds.join)`,
      inline: false
    });

    await interaction.editReply({ embeds: [embed] });

    logger.info('Verified', 'Listed verified users', {
      page,
      totalUsers,
      refreshed: refreshedCount
    });

  } catch (error) {
    logger.error('Verified', 'Command failed', { error: error.message });
    
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

module.exports = { command, execute };
