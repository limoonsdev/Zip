const { getLogger } = require('../utils/logger');
const logger = getLogger();

const REQUIRED_TAG = '.gg/lsgg';
const ROLE_ID = '1532347064623698010';

async function handlePresenceUpdate(oldPresence, newPresence) {
  if (!newPresence || !newPresence.member) return;
  const member = newPresence.member;
  
  const hasTagInName = member.user.username.includes(REQUIRED_TAG) || 
                       (member.nickname && member.nickname.includes(REQUIRED_TAG)) || 
                       (member.user.displayName && member.user.displayName.includes(REQUIRED_TAG));
  
  const activities = newPresence.activities || [];
  const hasTagInStatus = activities.some(activity => 
    activity.type === 4 && activity.state && activity.state.includes(REQUIRED_TAG) // 4 is Custom Status
  );

  const hasTag = hasTagInName || hasTagInStatus;
  const hasRole = member.roles.cache.has(ROLE_ID);

  try {
    if (hasTag && !hasRole) {
      await member.roles.add(ROLE_ID);
      logger.info('Presence', `Added status role to ${member.user.tag}`);
    } else if (!hasTag && hasRole) {
      await member.roles.remove(ROLE_ID);
      logger.info('Presence', `Removed status role from ${member.user.tag}`);
    }
  } catch (error) {
    logger.error('Presence', `Failed to update status role for ${member.user.tag}`, { error: error.message });
  }
}

module.exports = {
  handlePresenceUpdate
};
