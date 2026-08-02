/**
 * =====================================================
 * CONFIGURATION LOADER & VALIDATOR
 * =====================================================
 * Loads environment variables with validation and
 * provides configuration object for entire application.
 */

require('dotenv').config();

const CONSTANTS = require('./constants');

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'DATABASE_URL'
];

/**
 * Validate that all required environment variables are set
 */
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n📋 Please copy .env.example to .env and fill in the required values.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables loaded');
}

/**
 * Application configuration object
 */
const CONFIG = {
  // Bot Configuration
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    prefix: process.env.PREFIX || '!'
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    externalUrl: process.env.EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`,
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production'
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: CONSTANTS.DATABASE.POOL_MIN,
      max: CONSTANTS.DATABASE.POOL_MAX,
      idleTimeoutMillis: CONSTANTS.DATABASE.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: CONSTANTS.DATABASE.STATEMENT_TIMEOUT_MS
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || CONSTANTS.LOGGING.DEFAULT_LEVEL,
    isDev: (process.env.NODE_ENV || 'development') === 'development'
  },

  // Optional API Keys (with fallback values)
  api: {
    groqApiKey: process.env.GROQ_API_KEY || null,
    cerebrasApiKey: process.env.CEREBRAS_API_KEY || null
  },

  // Feature Flags
  features: {
    enableProxyRotation: process.env.ENABLE_PROXY_ROTATION !== 'false',
    enableTranslations: process.env.ENABLE_TRANSLATIONS !== 'false',
    enableChecking: process.env.ENABLE_CHECKING !== 'false',
    enableLogging: process.env.ENABLE_LOGGING !== 'false'
  },

  // Constants reference
  constants: CONSTANTS,

  // Callback URL for OAuth
  get callbackUrl() {
    return `${this.server.externalUrl}/callback`;
  }
};

/**
 * Initialize configuration
 */
function initializeConfig() {
  try {
    validateEnvironment();
    console.log(`🔧 Configuration loaded (${CONFIG.server.nodeEnv} mode)`);
    return CONFIG;
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    process.exit(1);
  }
}

module.exports = {
  CONFIG,
  initializeConfig,
  validateEnvironment
};
