/**
 * =====================================================
 * MIGRATION 003 - VERIFIED USERS TABLE
 * =====================================================
 * Store Discord OAuth2 verified users
 */

async function up(db) {
  await db.run(`
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

  // Create index for fast lookups
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_verified_users_verified_at 
    ON verified_users(verified_at DESC)
  `);

  console.log('✅ Migration 003: verified_users table created');
}

async function down(db) {
  await db.run('DROP INDEX IF EXISTS idx_verified_users_verified_at');
  await db.run('DROP TABLE IF EXISTS verified_users');
  console.log('✅ Migration 003: verified_users table dropped');
}

module.exports = { up, down };
