/**
 * =====================================================
 * DATABASE CONNECTION POOL
 * =====================================================
 * PostgreSQL connection pool with error handling,
 * connection monitoring, and graceful shutdown.
 */

const { Pool } = require('pg');
const { CONFIG } = require('../config/config');
const { getLogger } = require('../utils/logger');

let pool = null;

/**
 * Initialize database connection pool
 */
async function initializePool() {
  try {
    const logger = getLogger();
    logger.info('Database', 'Initializing connection pool...');

    pool = new Pool(CONFIG.database.pool);

    // Add error handler
    pool.on('error', (err) => {
      logger.error('Database', 'Unexpected error on idle client', { error: err.message });
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    logger.info('Database', '✅ Connection pool initialized successfully', {
      max: CONFIG.database.pool.max,
      min: CONFIG.database.pool.min
    });

    return pool;
  } catch (error) {
    const logger = getLogger();
    logger.error('Database', 'Failed to initialize connection pool', { error: error.message });
    throw error;
  }
}

/**
 * Get database pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
async function query(text, params = []) {
  const logger = getLogger();
  
  try {
    const result = await getPool().query(text, params);
    logger.debug('Database', 'Query executed', { text: text.slice(0, 50) });
    return result;
  } catch (error) {
    logger.error('Database', 'Query execution failed', { 
      error: error.message, 
      query: text.slice(0, 100)
    });
    throw error;
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const client = await getPool().connect();
  const logger = getLogger();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    logger.debug('Database', 'Transaction committed');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database', 'Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool
 */
async function closePool() {
  if (!pool) return;

  try {
    const logger = getLogger();
    await pool.end();
    logger.info('Database', 'Connection pool closed');
    pool = null;
  } catch (error) {
    const logger = getLogger();
    logger.error('Database', 'Error closing connection pool', { error: error.message });
  }
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  if (!pool) return null;

  return {
    totalConnections: pool.totalCount,
    availableConnections: pool.availableCount,
    waitingRequests: pool.waitingCount,
    max: CONFIG.database.pool.max,
    min: CONFIG.database.pool.min
  };
}

/**
 * Health check for database
 */
async function healthCheck() {
  try {
    const result = await query('SELECT 1');
    return { healthy: true, timestamp: new Date() };
  } catch (error) {
    return { healthy: false, error: error.message, timestamp: new Date() };
  }
}

module.exports = {
  initializePool,
  getPool,
  query,
  transaction,
  closePool,
  getPoolStats,
  healthCheck
};
