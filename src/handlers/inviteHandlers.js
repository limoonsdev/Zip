/**
 * =====================================================
 * INVITE TRACKER HANDLERS
 * =====================================================
 * Tracks guild invites to determine who invited a user
 */

const { getLogger } = require('../utils/logger');
const { query } = require('../database/hybridPool');
const { EmbedBuilder } = require('discord.js');
const { COLORS, PANEL_BANNER_URL } = require('../config/constants');

const logger = getLogger();
const invitesCache = new Map();
const WELCOME_CHANNEL_ID = '1532367061974519998';

/**
 * Helper to update user invites
 */
async function addInviteStat(userId, field, increment = 1) {
  try {
    const res = await query('SELECT user_id FROM user_invites WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) {
      await query('INSERT INTO user_invites (user_id) VALUES ($1)', [userId]);
    }
    await query(`UPDATE user_invites SET ${field} = ${field} + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [increment, userId]);
  } catch (err) {
    logger.error('InviteTracker', `Failed to update invite stat ${field} for ${userId}`, { error: err.message });
  }
}

/**
 * Get total user invites
 */
async function getInviteStats(userId) {
  try {
    const res = await query('SELECT * FROM user_invites WHERE user_id = $1', [userId]);
    if (res.rows.length > 0) {
      const stats = res.rows[0];
      const regular = parseInt(stats.regular) || 0;
      const fake = parseInt(stats.fake) || 0;
      const bonus = parseInt(stats.bonus) || 0;
      const leaves = parseInt(stats.leaves) || 0;
      const total = regular + bonus - leaves;
      return { regular, fake, bonus, leaves, total };
    }
  } catch (err) {
    logger.error('InviteTracker', `Failed to get invite stats for ${userId}`, { error: err.message });
  }
  return { regular: 0, fake: 0, bonus: 0, leaves: 0, total: 0 };
}

/**
 * Initialize invite cache for a guild
 */
async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
    logger.debug('InviteTracker', `Cached ${invites.size} invites for ${guild.name}`);
  } catch (err) {
    logger.warn('InviteTracker', `Failed to cache invites for ${guild.name}: ${err.message}`);
  }
}

/**
 * Register all invite tracker handlers
 */
function registerInviteHandlers(client) {
  // Cache invites when bot is ready
  client.on('ready', async () => {
    for (const [id, guild] of client.guilds.cache) {
      await cacheGuildInvites(guild);
    }
    logger.info('InviteTracker', 'Advanced invite tracking initialized');
  });

  // Track new invites
  client.on('inviteCreate', invite => {
    const guildInvites = invitesCache.get(invite.guild.id);
    if (guildInvites) {
      guildInvites.set(invite.code, invite.uses);
    }
  });

  // Track deleted invites
  client.on('inviteDelete', invite => {
    const guildInvites = invitesCache.get(invite.guild.id);
    if (guildInvites) {
      guildInvites.delete(invite.code);
    }
  });

  // Track user joins
  client.on('guildMemberAdd', async member => {
    const guild = member.guild;
    
    // Add "not registered" role
    try {
      const notRegisteredRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'not registered' || r.name.toLowerCase() === 'unverified');
      if (notRegisteredRole) {
        await member.roles.add(notRegisteredRole);
      }
    } catch (err) {
      logger.warn('InviteTracker', `Failed to assign not registered role to ${member.user.tag}: ${err.message}`);
    }

    const oldInvites = invitesCache.get(guild.id) || new Map();
    let newInvites;
    
    try {
      newInvites = await guild.invites.fetch();
    } catch (err) {
      logger.error('InviteTracker', 'Failed to fetch invites on member add', { error: err.message });
      return;
    }
    
    // Find the invite that was used
    const inviteUsed = newInvites.find(i => i.uses > (oldInvites.get(i.code) || 0));
    
    // Update cache
    invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));

    // Determine if fake (account < 7 days old)
    const accountAgeMs = Date.now() - member.user.createdAt.getTime();
    const isFake = accountAgeMs < (7 * 24 * 60 * 60 * 1000);
    
    let inviterId = null;
    let inviterUser = null;

    if (inviteUsed && inviteUsed.inviter) {
      inviterId = inviteUsed.inviter.id;
      inviterUser = inviteUsed.inviter;

      // Update DB
      try {
        await query('INSERT INTO invited_users (user_id, inviter_id, is_fake) VALUES ($1, $2, $3)', [member.user.id, inviterId, isFake]);
        if (isFake) {
          await addInviteStat(inviterId, 'fake');
        } else {
          await addInviteStat(inviterId, 'regular');
        }
      } catch (err) {
        logger.error('InviteTracker', 'DB insert failed', { error: err.message });
      }
    }
    
    // Target specific welcome channel
    const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
    
    if (welcomeChannel) {
      let description = `Welcome to **${guild.name}**, ${member}!\n\n`;
      
      if (inviterUser) {
        const stats = await getInviteStats(inviterId);
        description += `> 📨 **Invited by:** ${inviterUser} (\`${inviterId}\`)\n`;
        description += `> 📊 **Invites:** \`${stats.total}\` (**${stats.regular}** ✅ | **${stats.fake}** 💩 | **${stats.leaves}** ❌)\n`;
        if (isFake) {
          description += '> ⚠️ **Warning:** This account is less than 7 days old (Fake).';
        }
      } else {
        description += '> 📨 **Invited by:** Unknown / Vanity URL\n';
      }
      
      description += `\n*Account created: <t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R>*`;

      const embed = new EmbedBuilder()
        .setTitle('👋 New Member Joined!')
        .setDescription(description)
        .setColor(COLORS.INFO)
        .setThumbnail(member.user.displayAvatarURL())
        .setImage(PANEL_BANNER_URL)
        .setFooter({ text: `Member #${guild.memberCount}` })
        .setTimestamp();
        
      try {
        await welcomeChannel.send({ content: `${member}`, embeds: [embed] });
      } catch (err) {
        logger.warn('InviteTracker', `Failed to send welcome message: ${err.message}`);
      }
    }
    
    logger.info('InviteTracker', `User joined: ${member.user.tag}`, { inviter: inviterId, isFake });
  });

  // Track user leaves
  client.on('guildMemberRemove', async member => {
    try {
      const res = await query('SELECT inviter_id, is_fake FROM invited_users WHERE user_id = $1', [member.user.id]);
      if (res.rows.length > 0) {
        const inviterId = res.rows[0].inviter_id;
        const isFake = res.rows[0].is_fake === 1 || res.rows[0].is_fake === true;
        
        // If they were not fake, we add a leave. If they were fake, it doesn't affect regular count.
        if (!isFake) {
          await addInviteStat(inviterId, 'leaves');
        }
        
        // Send leave message in the same channel (optional but good for advanced tracker)
        const guild = member.guild;
        const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (welcomeChannel) {
          const stats = await getInviteStats(inviterId);
          const embed = new EmbedBuilder()
            .setTitle('👋 Member Left')
            .setDescription(`**${member.user.tag}** left the server.\n\n> They were invited by <@${inviterId}> who now has \`${stats.total}\` invites.`)
            .setColor(COLORS.ERROR)
            .setTimestamp();
          await welcomeChannel.send({ embeds: [embed] });
        }
      }
    } catch (err) {
      logger.error('InviteTracker', 'Failed to process user leave', { error: err.message });
    }
  });
}

module.exports = {
  registerInviteHandlers
};
