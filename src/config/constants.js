/**
 * =====================================================
 * DISCORD BOT CONSTANTS
 * =====================================================
 * Centralized configuration for all bot IDs, limits,
 * and hardcoded values to avoid magic numbers.
 */

const CONSTANTS = {
  // =====================================================
  // DISCORD ROLE IDs (Replace with your actual IDs)
  // =====================================================
  ROLES: {
    VERIFIED: '1532346852203040768',
    BOOSTER: '1532347027441057812',
    FREEGEN_FR: '1532347064623698010',
    FREEGEN_EN: '1532375181220118548',
    MEMBER_FR: '1532391228040282232',
    MEMBER_EN: '1532375178364063856',
    PREMIUM_FR: '1532346926425444474',
    PREMIUM_EN: '1532375179408310344'
  },

  CHANNELS: {
    LOGS: '1532375665544925408',
    REVIEWS: '1532367074125545673'
  },

  // =====================================================
  // SERVICE TIERS & ACCESS CONTROL
  // =====================================================
  TIERS: {
    FREE: 'free',
    PREMIUM: 'premium',
    VIP: 'vip'
  },

  // =====================================================
  // UI LIMITS (Discord API constraints)
  // =====================================================
  UI: {
    MAX_ACTION_ROWS: 5,
    MAX_SELECT_OPTIONS: 25,
    MAX_BUTTONS_PER_ROW: 5,
    MAX_EMBED_FIELDS: 25,
    EMBED_FIELD_VALUE_LIMIT: 1024,
    SELECT_MENU_PLACEHOLDER_LIMIT: 100
  },

  // =====================================================
  // TIMEOUT & RETRY CONFIGURATION
  // =====================================================
  TIMEOUTS: {
    CHECKER_REQUEST: 10000, // 10 seconds for credential checks
    STEAM_TIMEOUT: 10000, // Steam auth timeout
    GOFILE_DOWNLOAD: 300000, // 5 minutes for file downloads
    RETRY_ATTEMPTS: 3,
    RETRY_BACKOFF_MS: 1000 // Base retry delay (exponential)
  },

  // =====================================================
  // COMBO & CHECKING CONFIGURATION
  // =====================================================
  CHECKING: {
    MAX_COMBOS_PER_CHECK: 10, // Limit combo checks per request
    BATCH_SIZE: 5000, // ULP parsing batch size
    PROGRESS_INTERVAL_MS: 1500, // Progress update frequency
    QUALITY_SCORE_WEIGHTS: {
      verified: 100,
      premium: 75,
      working: 50,
      unverified: 25
    }
  },

  // =====================================================
  // CRON SCHEDULES
  // =====================================================
  CRON: {
    VIP_RESTOCK_CHECK: '*/5 * * * *', // Every 5 minutes
    DATABASE_CLEANUP: '0 2 * * *', // 2 AM daily
    PROXY_HEALTH_CHECK: '*/30 * * * *' // Every 30 minutes
  },

  // =====================================================
  // SECURITY & VALIDATION
  // =====================================================
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    DOMAIN_REGEX: /^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})$/,
    MIN_PASSWORD_LENGTH: 3,
    MAX_PASSWORD_LENGTH: 256
  },

  // =====================================================
  // FILE PROCESSING
  // =====================================================
  FILES: {
    TEXT_FILE_REGEX: /\.(txt|ulp|log|csv)$/i,
    ARCHIVE_FILE_REGEX: /\.(zip|7z|rar)$/i,
    MAX_FILE_SIZE_MB: 500,
    TEMP_DIR_CLEANUP_MS: 300000 // 5 minutes
  },

  // =====================================================
  // RATE LIMITING
  // =====================================================
  RATE_LIMIT: {
    COMBO_CHECK_PER_USER: 50, // Per hour
    GEN_REQUEST_PER_USER: 10, // Per hour
    COOLDOWN_MS: 3600000 // 1 hour
  },

  // =====================================================
  // DATABASE CONFIGURATION
  // =====================================================
  DATABASE: {
    POOL_MIN: 2,
    POOL_MAX: 10,
    IDLE_TIMEOUT_MS: 30000,
    STATEMENT_TIMEOUT_MS: 30000
  },

  // =====================================================
  // LOGGING
  // =====================================================
  LOGGING: {
    LEVELS: ['error', 'warn', 'info', 'debug'],
    DEFAULT_LEVEL: 'info',
    MAX_FILE_SIZE: 10485760, // 10MB
    MAX_FILES: 5
  }
};

module.exports = CONSTANTS;

// =====================================================
// DESIGN & UI CONSTANTS (ULTRA-PREMIUM)
// =====================================================
const PANEL_BANNER_URL = 'https://i.goopics.net/2eukvn.gif';

const COLORS = {
  FREE: '#2B2D31',        // Dark grey
  PREMIUM: '#FFD700',     // Gold  
  SUCCESS: '#57F287',     // Green
  ERROR: '#ED4245',       // Red
  WARNING: '#FEE75C',     // Yellow
  INFO: '#5865F2',        // Blurple
  BOOST: '#F47FFF'        // Pink
};

const EMOJIS = {
  SUCCESS: '✅', ERROR: '❌', WARNING: '⚠️', INFO: 'ℹ️',
  GENERATE: '🎁', CHECK: '🔍', DEPLOY: '🚀', CONFIG: '⚙️',
  STOCK: '📦', PREMIUM: '👑', FREE: '✨', BOOST: '🚀', VERIFY: '✅',
  USERS: '👥', TIME: '⏱️', RATE: '📊', COOLDOWN: '⏳',
  STREAMING: '🎬', GAMING: '🎮', VPN: '🛡️', MUSIC: '🎵', EMAIL: '📧',
  UP: '<:up:1532399539187617792>', DOWN: '<:down:1532399527418400988>'
};

module.exports.PANEL_BANNER_URL = PANEL_BANNER_URL;
module.exports.COLORS = COLORS;
module.exports.EMOJIS = EMOJIS;
