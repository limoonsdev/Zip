/**
 * =====================================================
 * HYBRID DATABASE SYSTEM (PostgreSQL + SQLite Fallback)
 * =====================================================
 * Automatically uses PostgreSQL if available, falls back to SQLite
 */

const { getLogger } = require('../utils/logger');
const logger = getLogger();

let dbType = null;
let pgPool = null;
let sqliteDb = null;

/**
 * Initialize hybrid database
 */
async function initializeHybridDB() {
  // Try PostgreSQL first
  try {
    const { Pool } = require('pg');
    const { CONFIG } = require('../config/config');
    
    pgPool = new Pool({
      connectionString: CONFIG.database.url,
      ...CONFIG.database.pool
    });

    // Test connection with timeout
    const testPromise = pgPool.connect().then(client => {
      return client.query('SELECT 1').then(() => {
        client.release();
        return true;
      });
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );

    await Promise.race([testPromise, timeoutPromise]);

    dbType = 'postgresql';
    logger.info('Database', '✅ PostgreSQL connected successfully');
    return { type: 'postgresql', pool: pgPool };
  } catch (pgError) {
    logger.warn('Database', '⚠️  PostgreSQL unavailable, using SQLite fallback', { 
      reason: pgError.message 
    });

    // Close PostgreSQL pool if it was created
    if (pgPool) {
      try {
        await pgPool.end();
      } catch (e) { /* ignore */ }
      pgPool = null;
    }

    // Fallback to SQLite
    try {
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const fs = require('fs');
      
      const dbPath = path.join(process.cwd(), 'data', 'newgen.db');
      
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create SQLite database (promisified)
      sqliteDb = await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
          if (err) {
            logger.error('Database', 'Failed to create SQLite database', { error: err.message });
            reject(err);
          } else {
            logger.info('Database', 'SQLite database file created/opened', { path: dbPath });
            resolve(db);
          }
        });
      });

      // Enable WAL mode for better performance
      await new Promise((resolve, reject) => {
        sqliteDb.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) {
            logger.warn('Database', 'Could not enable WAL mode', { error: err.message });
            resolve(); // Continue anyway
          } else {
            logger.info('Database', 'WAL mode enabled');
            resolve();
          }
        });
      });
      
      dbType = 'sqlite';
      logger.info('Database', '✅ SQLite initialized successfully', { path: dbPath });
      return { type: 'sqlite', db: sqliteDb };
    } catch (sqliteError) {
      logger.error('Database', '❌ Failed to initialize any database', { 
        error: sqliteError.message 
      });
      throw new Error('No database available');
    }
  }
}

/**
 * Execute query (universal interface)
 */
async function query(sql, params = []) {
  if (dbType === 'postgresql') {
    return await pgPool.query(sql, params);
  } else if (dbType === 'sqlite') {
    // Convert PostgreSQL placeholders ($1, $2) to SQLite (?, ?)
    let sqliteSql = sql;
    
    // Replace $1, $2, etc. with ?
    for (let i = params.length; i > 0; i--) {
      sqliteSql = sqliteSql.replace(new RegExp(`\\$${i}`, 'g'), '?');
    }

    return new Promise((resolve, reject) => {
      const lowerSql = sqliteSql.trim().toLowerCase();
      
      if (lowerSql.startsWith('select') || lowerSql.startsWith('pragma')) {
        // SELECT query
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) {
            logger.error('Database', 'SQLite SELECT error', { error: err.message, sql: sqliteSql });
            reject(err);
          } else {
            resolve({ rows: rows || [] });
          }
        });
      } else {
        // INSERT, UPDATE, DELETE, CREATE TABLE, etc.
        sqliteDb.run(sqliteSql, params, function(err) {
          if (err) {
            logger.error('Database', 'SQLite WRITE error', { error: err.message, sql: sqliteSql });
            reject(err);
          } else {
            resolve({ 
              rows: [], 
              rowCount: this.changes,
              lastID: this.lastID
            });
          }
        });
      }
    });
  } else {
    throw new Error('Database not initialized');
  }
}

/**
 * Get database type
 */
function getDatabaseType() {
  return dbType;
}

/**
 * Close database connection
 */
async function closeHybridDB() {
  if (pgPool) {
    await pgPool.end();
    logger.info('Database', 'PostgreSQL connection closed');
  }
  if (sqliteDb) {
    await new Promise((resolve, reject) => {
      sqliteDb.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info('Database', 'SQLite connection closed');
  }
}

module.exports = {
  initializeHybridDB,
  query,
  getDatabaseType,
  closeHybridDB
};
