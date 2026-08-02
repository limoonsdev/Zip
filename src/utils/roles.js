/**
 * =====================================================
 * DISCORD ROLES & PERMISSIONS UTILITIES
 * =====================================================
 * Functions for role management, permission checks,
 * and role assignment logic.
 */

const { PermissionFlagsBits } = require('discord.js');
const CONSTANTS = require('../config/constants');

/**
 * Get user roles
 */
function getUserRoles(member) {
  if (!member || !member.roles) return [];
  return Array.from(member.roles.cache.keys());
}

/**
 * Check if user has role
 */
function hasRole(member, roleId) {
  if (!member || !member.roles) return false;
  return member.roles.cache.has(roleId);
}

/**
 * Check if user is verified
 */
function isVerified(member) {
  return hasRole(member, CONSTANTS.ROLES.VERIFIED);
}

/**
 * Check if user is premium
 */
function isPremium(member) {
  const premiumRoles = [
    CONSTANTS.ROLES.PREMIUM_FR,
    CONSTANTS.ROLES.PREMIUM_EN
  ];
  return premiumRoles.some(roleId => hasRole(member, roleId));
}

/**
 * Check if user is booster
 */
function isBooster(member) {
  return hasRole(member, CONSTANTS.ROLES.BOOSTER);
}

/**
 * Check if user is admin
 */
function isAdmin(member) {
  if (!member || !member.permissions) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Check if user is moderator
 */
function isModerator(member) {
  if (!member || !member.permissions) return false;
  return member.permissions.has(PermissionFlagsBits.ManageMessages) ||
         member.permissions.has(PermissionFlagsBits.KickMembers) ||
         member.permissions.has(PermissionFlagsBits.BanMembers);
}

/**
 * Get user tier
 */
function getUserTier(member) {
  if (isPremium(member)) return CONSTANTS.TIERS.PREMIUM;
  if (hasRole(member, CONSTANTS.ROLES.FREEGEN_FR) || 
      hasRole(member, CONSTANTS.ROLES.FREEGEN_EN)) {
    return CONSTANTS.TIERS.FREE;
  }
  return null;
}

/**
 * Check if user has access to service
 */
function hasServiceAccess(member, serviceTier) {
  const userTier = getUserTier(member);
  
  if (!userTier) return false;
  
  if (serviceTier === CONSTANTS.TIERS.FREE) return true;
  if (serviceTier === CONSTANTS.TIERS.PREMIUM) return userTier === CONSTANTS.TIERS.PREMIUM;
  
  return false;
}

/**
 * Get user language from roles
 */
function getUserLanguage(member) {
  if (hasRole(member, CONSTANTS.ROLES.FREEGEN_FR) ||
      hasRole(member, CONSTANTS.ROLES.PREMIUM_FR) ||
      hasRole(member, CONSTANTS.ROLES.MEMBER_FR)) {
    return 'fr';
  }
  return 'en';
}

/**
 * Add role to member
 */
async function addRoleToMember(member, roleId) {
  try {
    if (!hasRole(member, roleId)) {
      await member.roles.add(roleId);
      return { success: true, message: 'Role added' };
    }
    return { success: false, message: 'Role already assigned' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Remove role from member
 */
async function removeRoleFromMember(member, roleId) {
  try {
    if (hasRole(member, roleId)) {
      await member.roles.remove(roleId);
      return { success: true, message: 'Role removed' };
    }
    return { success: false, message: 'Role not assigned' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Assign tier role
 */
async function assignTierRole(member, tier) {
  const language = getUserLanguage(member);
  
  let roleId = null;
  if (tier === CONSTANTS.TIERS.FREE) {
    roleId = language === 'fr' ? 
      CONSTANTS.ROLES.FREEGEN_FR : 
      CONSTANTS.ROLES.FREEGEN_EN;
  } else if (tier === CONSTANTS.TIERS.PREMIUM) {
    roleId = language === 'fr' ? 
      CONSTANTS.ROLES.PREMIUM_FR : 
      CONSTANTS.ROLES.PREMIUM_EN;
  }

  if (!roleId) return { success: false, message: 'Invalid tier' };

  return addRoleToMember(member, roleId);
}

/**
 * Create or get role
 */
async function getOrCreateRole(guild, roleName, options = {}) {
  try {
    // Try to find existing role
    let role = guild.roles.cache.find(r => r.name === roleName);
    
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: options.color || 0x2F3136,
        hoist: options.hoist !== false,
        ...options
      });
    }

    return role;
  } catch (error) {
    throw new Error(`Failed to get/create role: ${error.message}`);
  }
}

/**
 * Setup guild roles
 */
async function setupGuildRoles(guild) {
  const roles = {
    verified: await getOrCreateRole(guild, 'Verified', { color: 0x00B894 }),
    booster: await getOrCreateRole(guild, 'Booster', { color: 0xF39C12 }),
    freegenFR: await getOrCreateRole(guild, 'FreeGen FR', { color: 0x0984E3 }),
    freegenEN: await getOrCreateRole(guild, 'FreeGen EN', { color: 0x0984E3 }),
    premiumFR: await getOrCreateRole(guild, 'Premium FR', { color: 0x9B59B6 }),
    premiumEN: await getOrCreateRole(guild, 'Premium EN', { color: 0x9B59B6 })
  };

  return roles;
}

module.exports = {
  getUserRoles,
  hasRole,
  isVerified,
  isPremium,
  isBooster,
  isAdmin,
  isModerator,
  getUserTier,
  hasServiceAccess,
  getUserLanguage,
  addRoleToMember,
  removeRoleFromMember,
  assignTierRole,
  getOrCreateRole,
  setupGuildRoles
};
