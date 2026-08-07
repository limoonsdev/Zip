/**
 * =====================================================
 * DATABASE MIGRATIONS
 * =====================================================
 * Handles database schema creation and updates.
 */

const { query } = require('./hybridPool');
const { getLogger } = require('../utils/logger');

/**
 * Run all migrations
 */
async function runMigrations() {
  const logger = getLogger();
  logger.info('Database', 'Running migrations...');

  try {
    await createCombosTable();
    await createFeedbackTable();
    await createUserHistoryTable();
    await createGuildConfigsTable();
    await createGuildPanelsTable();
    await createProofSubmissionsTable();
    await createUsersTable();
    await createProxyHealthTable();
    await createAuditLogsTable();
    await createInviteTrackerTables();
    await createOrdersTable();
    await createVerifiedUsersTable();

    // Create indexes
    await createIndexes();

    logger.info('Database', '✅ All migrations completed successfully');
  } catch (error) {
    logger.error('Database', 'Migration failed', { error: error.message });
    throw error;
  }
}

/**
 * Create combos table
 */
async function createCombosTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS combos (
      id SERIAL PRIMARY KEY,
      service_id VARCHAR(50) NOT NULL,
      combo TEXT NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL,
      quality_score INTEGER DEFAULT 0,
      is_verified BOOLEAN DEFAULT FALSE,
      last_checked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await query("ALTER TABLE combos ADD COLUMN email VARCHAR(255) DEFAULT ''");
  } catch (e) {
    // Column may already exist
  }
}

/**
 * Create feedback table
 */
async function createFeedbackTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      service_id VARCHAR(50) NOT NULL,
      combo_id INTEGER REFERENCES combos(id) ON DELETE CASCADE,
      is_working BOOLEAN NOT NULL,
      user_id VARCHAR(20) NOT NULL,
      rating INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create user history table
 */
async function createUserHistoryTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS user_history (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      service_id VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create guild configs table
 */
async function createGuildConfigsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL UNIQUE,
      language VARCHAR(10) DEFAULT 'en',
      config_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await query('ALTER TABLE guild_configs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {}
}

/**
 * Create guild panels table
 */
async function createGuildPanelsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS guild_panels (
      id SERIAL PRIMARY KEY,
      guild_id VARCHAR(20) NOT NULL UNIQUE,
      panels_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await query('ALTER TABLE guild_panels ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  } catch (e) {}
}

/**
 * Create proof submissions table
 */
async function createProofSubmissionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS proof_submissions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      service_id VARCHAR(50) NOT NULL,
      proof_url TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      reviewer_id VARCHAR(20),
      review_comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP
    )
  `);
}

/**
 * Create users table
 */
async function createUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL UNIQUE,
      username VARCHAR(255),
      total_combos_checked INTEGER DEFAULT 0,
      total_combos_generated INTEGER DEFAULT 0,
      last_activity TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create proxy health table
 */
async function createProxyHealthTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS proxy_health (
      id SERIAL PRIMARY KEY,
      proxy_address VARCHAR(255) NOT NULL UNIQUE,
      is_working BOOLEAN DEFAULT TRUE,
      last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      failure_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create audit logs table
 */
async function createAuditLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20),
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50),
      resource_id VARCHAR(100),
      details JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create invite tracker tables
 */
async function createInviteTrackerTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS user_invites (
      user_id VARCHAR(20) PRIMARY KEY,
      regular INTEGER DEFAULT 0,
      fake INTEGER DEFAULT 0,
      leaves INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS invited_users (
      user_id VARCHAR(20) PRIMARY KEY,
      inviter_id VARCHAR(20) NOT NULL,
      is_fake BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Create indexes for performance
 */
async function createIndexes() {
  const logger = getLogger();

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_combos_service ON combos(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_combos_email ON combos(email)',
    'CREATE INDEX IF NOT EXISTS idx_combos_created ON combos(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_feedback_service ON feedback(service_id)',
    'CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_proof_submissions_status ON proof_submissions(status)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_invited_users_inviter ON invited_users(inviter_id)'
  ];

  for (const indexSql of indexes) {
    try {
      await query(indexSql);
    } catch (error) {
      logger.warn('Database', 'Index creation skipped (may already exist)', { 
        error: error.message 
      });
    }
  }
}

/**
 * Create orders table
 */
async function createOrdersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(20) NOT NULL,
      product VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      paypal_order_id VARCHAR(100),
      payment_method VARCHAR(50),
      payment_proof VARCHAR(255),
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await query('ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50)');
  } catch (e) {
    // Column may already exist
  }

  try {
    await query('ALTER TABLE orders ADD COLUMN payment_proof VARCHAR(255)');
  } catch (e) {
    // Column may already exist
  }

  try {
    await query('ALTER TABLE orders ADD COLUMN paypal_order_id VARCHAR(100)');
  } catch (e) {
    // Column may already exist
  }
}

module.exports = {
  runMigrations,
  createCombosTable,
  createFeedbackTable,
  createUserHistoryTable,
  createGuildConfigsTable,
  createGuildPanelsTable,
  createProofSubmissionsTable,
  createUsersTable,
  createProxyHealthTable,
  createAuditLogsTable,
  createInviteTrackerTables,
  createIndexes,
  createVerifiedUsersTable
};

/**
 * Create verified users table
 */
async function createVerifiedUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS verified_users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      discriminator TEXT NOT NULL,
      avatar TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_type TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      scope TEXT NOT NULL,
      verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
