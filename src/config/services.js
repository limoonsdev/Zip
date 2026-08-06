/**
 * =====================================================
 * SERVICE CATALOG
 * =====================================================
 * Complete list of all supported services with their
 * configurations, emojis, and tier assignments.
 */

const { ButtonStyle } = require('discord.js');

/**
 * Complete service catalog (35+ services)
 */
const SERVICES = [
  // Streaming Services
  { id: 'paramount', label: 'Paramount+', emojiName: 'ng_paramount', defaultEmoji: '🎬', iconUrl: 'https://play-lh.googleusercontent.com/O5QHZxy2pkxwHrjU3Omd_1jdIYk_pZQexy2VVEDBDhaXgNhvZV7wjhfN_0kLUrQfCKFsaGbQbVm8usyrc-yBGhI', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'disney', label: 'Disney+', emojiName: 'ng_disney', defaultEmoji: '🏰', iconUrl: 'https://store-images.s3.amazonaws.com/image/apps.14187.14495311847124170.7646206e-bd82-4cf0-8b8c-d06a67bc302c.2e474878-acb7-4afb-a503-c2a1a32feaa8?h=210', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'netflix', label: 'Netflix', emojiName: 'ng_netflix', defaultEmoji: '🍿', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Netflix_2015_N_logo.svg/512px-Netflix_2015_N_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'primevideo', label: 'Amazon Prime Video', emojiName: 'ng_primevideo', defaultEmoji: '🎬', iconUrl: 'https://img.icons8.com/color/512/amazon-prime-video.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'hbomax', label: 'HBO Max', emojiName: 'ng_hbomax', defaultEmoji: '🟣', iconUrl: 'https://img.icons8.com/color/512/hbo.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'crunchyroll', label: 'Crunchyroll', emojiName: 'ng_crunchyroll', defaultEmoji: '🍿', iconUrl: 'https://img.icons8.com/color/512/crunchyroll.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'adn', label: 'ADN', emojiName: 'ng_adn', defaultEmoji: '🍥', iconUrl: 'https://m.media-amazon.com/images/I/51s-YfZ2TlS.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'dazn', label: 'DAZN', emojiName: 'ng_dazn', defaultEmoji: '⚽', iconUrl: 'https://raw.githubusercontent.com/limoonsdev/Zip/main/assets/dazn.png', style: ButtonStyle.Secondary, tier: 'premium' },
  
  // Music Services
  { id: 'spotify', label: 'Spotify', emojiName: 'ng_spotify', defaultEmoji: '🎵', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/512px-Spotify_icon.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'deezer', label: 'Deezer', emojiName: 'ng_deezer', defaultEmoji: '🎧', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968841.png', style: ButtonStyle.Secondary, tier: 'free' },
  
  // Gaming Services
  { id: 'fortnite', label: 'Fortnite', emojiName: 'ng_fortnite', defaultEmoji: '🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'valorant', label: 'Valorant', emojiName: 'ng_valorant', defaultEmoji: '🎯', iconUrl: 'https://img.icons8.com/color/512/valorant.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'steam', label: 'Steam', emojiName: 'ng_steam', defaultEmoji: '🎮', iconUrl: 'https://img.icons8.com/color/512/steam.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'epicgames', label: 'Epic Games', emojiName: 'ng_epicgames', defaultEmoji: '🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Epic_Games_logo.svg/512px-Epic_Games_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'battlenet', label: 'Battle.net', emojiName: 'ng_battlenet', defaultEmoji: '⚔️', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Battle.net_Logo.svg/512px-Battle.net_Logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'xbox', label: 'Xbox', emojiName: 'ng_xbox', defaultEmoji: '🟢', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Xbox_one_logo.svg/500px-Xbox_one_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'psn', label: 'PlayStation Network', emojiName: 'ng_psn', defaultEmoji: '🟦', iconUrl: 'https://cdn-icons-png.flaticon.com/512/5968/5968875.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'roblox', label: 'Roblox', emojiName: 'ng_roblox', defaultEmoji: '🧱', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Roblox_player_icon_black.svg/512px-Roblox_player_icon_black.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'minecraft', label: 'Minecraft', emojiName: 'ng_minecraft', defaultEmoji: '⛏️', iconUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Minecraft_cover.png/220px-Minecraft_cover.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'leagueoflegends', label: 'League of Legends', emojiName: 'ng_lol', defaultEmoji: '⚔️', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/512px-League_of_Legends_2019_vector.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'ea', label: 'EA / Origin', emojiName: 'ng_ea', defaultEmoji: '🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Electronic-Arts-Logo.svg/512px-Electronic-Arts-Logo.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'ubisoft', label: 'Ubisoft Connect', emojiName: 'ng_ubisoft', defaultEmoji: '🌀', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Ubisoft_logo.svg/512px-Ubisoft_logo.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'genshin', label: 'Genshin Impact', emojiName: 'ng_genshin', defaultEmoji: '🌟', iconUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Genshin_Impact_logo.svg/512px-Genshin_Impact_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'rockstar', label: 'Rockstar Games', emojiName: 'ng_rockstar', defaultEmoji: '⭐', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Rockstar_Games_Logo.svg/512px-Rockstar_Games_Logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'nintendo', label: 'Nintendo Switch', emojiName: 'ng_nintendo', defaultEmoji: '🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Nintendo_Switch_Core_Logo_and_Text_mark.svg/512px-Nintendo_Switch_Core_Logo_and_Text_mark.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  
  // Prime Gaming Services
  { id: 'fortnite_prime', label: 'Fortnite (Prime)', emojiName: 'ng_fortnite', defaultEmoji: '👑🎮', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png', style: ButtonStyle.Success, tier: 'prime' },
  { id: 'valorant_prime', label: 'Valorant (Prime)', emojiName: 'ng_valorant', defaultEmoji: '👑🎯', iconUrl: 'https://img.icons8.com/color/512/valorant.png', style: ButtonStyle.Success, tier: 'prime' },
  
  // VPN Services
  { id: 'nordvpn', label: 'NordVPN', emojiName: 'ng_nordvpn', defaultEmoji: '🛡️', iconUrl: 'https://img.icons8.com/color/512/nordvpn.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'expressvpn', label: 'ExpressVPN', emojiName: 'ng_expressvpn', defaultEmoji: '🚀', iconUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-expressvpn-3442898-2875376.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'mullvadvpn', label: 'MullvadVPN', emojiName: 'ng_mullvadvpn', defaultEmoji: '🔒', iconUrl: 'https://mullvad.net/press/MullvadVPN_logo_Round_RGB_Color_negative.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'protonvpn', label: 'ProtonVPN', emojiName: 'ng_protonvpn', defaultEmoji: '🔐', iconUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-protonvpn-3442907-2875385.png', style: ButtonStyle.Secondary, tier: 'premium' },
  
  // Email Services
  { id: 'gmail', label: 'Google Mail', emojiName: 'ng_gmail', defaultEmoji: '📧', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/512px-Gmail_icon_%282020%29.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'hotmail', label: 'Hotmail', emojiName: 'ng_hotmail', defaultEmoji: '✉️', iconUrl: 'https://img.icons8.com/color/512/microsoft-outlook-2019.png', style: ButtonStyle.Secondary, tier: 'free' },
  
  // Other Services
  { id: 'duolingo', label: 'Duolingo', emojiName: 'ng_duolingo', defaultEmoji: '🦉', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Duolingo_logo.svg/512px-Duolingo_logo.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'mega', label: 'Mega.nz', emojiName: 'ng_mega', defaultEmoji: 'Ⓜ️', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/MEGA_logo.svg/512px-MEGA_logo.svg.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'ebay', label: 'Ebay', emojiName: 'ng_ebay', defaultEmoji: '🛒', iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/512px-EBay_logo.svg.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'paypal', label: 'PayPal', emojiName: 'ng_paypal', defaultEmoji: '💳', iconUrl: 'https://img.icons8.com/color/512/paypal.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'tiktok', label: 'TikTok', emojiName: 'ng_tiktok', defaultEmoji: '🎵', iconUrl: 'https://img.icons8.com/color/512/tiktok.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'twitter', label: 'Twitter / X', emojiName: 'ng_twitter', defaultEmoji: '𝕏', iconUrl: 'https://img.icons8.com/color/512/twitter--v1.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'reddit', label: 'Reddit', emojiName: 'ng_reddit', defaultEmoji: '🤖', iconUrl: 'https://img.icons8.com/color/512/reddit.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'patreon', label: 'Patreon', emojiName: 'ng_patreon', defaultEmoji: '🎨', iconUrl: 'https://img.icons8.com/color/512/patreon.png', style: ButtonStyle.Secondary, tier: 'free' },
  { id: 'elevenlabs', label: 'ElevenLabs AI', emojiName: 'ng_elevenlabs', defaultEmoji: '🎙️', iconUrl: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/sound-wave-3351989-2810811.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'wondershare', label: 'Wondershare', emojiName: 'ng_wondershare', defaultEmoji: '🎬', iconUrl: 'https://img.icons8.com/color/512/video-editing.png', style: ButtonStyle.Secondary, tier: 'premium' },
  { id: 'pizzahut', label: 'Pizza Hut', emojiName: 'ng_pizzahut', defaultEmoji: '🍕', iconUrl: 'https://cdn-icons-png.flaticon.com/512/732/732238.png', style: ButtonStyle.Secondary, tier: 'free' }
];

/**
 * Get service by ID
 */
function getServiceById(serviceId) {
  return SERVICES.find(s => s.id === serviceId) || null;
}

/**
 * Get services by tier
 */
function getServicesByTier(tier) {
  return SERVICES.filter(s => s.tier === tier);
}

/**
 * Get all services
 */
function getAllServices() {
  return SERVICES;
}

/**
 * Get service count
 */
function getServiceCount() {
  return SERVICES.length;
}

/**
 * Check if service exists
 */
function serviceExists(serviceId) {
  return SERVICES.some(s => s.id === serviceId);
}

module.exports = {
  SERVICES,
  getServiceById,
  getServicesByTier,
  getAllServices,
  getServiceCount,
  serviceExists
};
