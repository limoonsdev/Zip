/**
 * =====================================================
 * DATABASE MODELS
 * =====================================================
 * CRUD operations and data access layer for all
 * database tables.
 */

const { query } = require('./hybridPool');
const { getLogger } = require('../utils/logger');

// =====================================================
// COMBOS
// =====================================================

/**
 * Add combos to database
 */
async function addCombos(serviceId, combos) {
  const logger = getLogger();
  
  try {
    const promises = combos.map(combo => {
      const [email] = combo.split(':');
      return query(
        `INSERT INTO combos (service_id, combo, email) 
         VALUES ($1, $2, $3)
         ON CONFLICT (combo) DO NOTHING`,
        [serviceId, combo, email]
      );
    });

    await Promise.all(promises);
    logger.info('Database', `Added ${combos.length} combos for ${serviceId}`);
    return { success: true, count: combos.length };
  } catch (error) {
    logger.error('Database', 'Failed to add combos', { error: error.message });
    throw error;
  }
}

/**
 * Get combo by ID
 */
async function getComboById(id) {
  const result = await query(
    'SELECT * FROM combos WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get combos by service ID
 */
async function getCombosByService(serviceId, limit = 10) {
  const result = await query(
    `SELECT * FROM combos 
     WHERE service_id = $1 
     ORDER BY quality_score DESC, created_at DESC 
     LIMIT $2`,
    [serviceId, limit]
  );
  return result.rows;
}

/**
 * Update combo quality score
 */
async function updateComboQuality(comboId, qualityScore, isVerified = false) {
  const result = await query(
    `UPDATE combos 
     SET quality_score = $1, is_verified = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $3`,
    [qualityScore, isVerified, comboId]
  );
  const selectResult = await query('SELECT * FROM combos WHERE id = $1', [comboId]);
  return selectResult.rows[0];
}

/**
 * Count combos by service
 */
async function countCombosByService(serviceId) {
  const result = await query(
    'SELECT COUNT(*) as count FROM combos WHERE service_id = $1',
    [serviceId]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Delete old combos (cleanup)
 */
async function deleteOldCombos(daysOld = 30) {
  const result = await query(
    `DELETE FROM combos 
     WHERE created_at < NOW() - INTERVAL '${daysOld} days'
     AND is_verified = FALSE`,
    []
  );
  return result.rowCount;
}

// =====================================================
// FEEDBACK
// =====================================================

/**
 * Add feedback
 */
async function addFeedback(serviceId, comboId, isWorking, userId, rating = null) {
  const result = await query(
    `INSERT INTO feedback (service_id, combo_id, is_working, user_id, rating)
     VALUES ($1, $2, $3, $4, $5)`,
    [serviceId, comboId, isWorking, userId, rating]
  );
  return {};
}

/**
 * Get feedback for combo
 */
async function getFeedbackForCombo(comboId) {
  const result = await query(
    'SELECT * FROM feedback WHERE combo_id = $1 ORDER BY created_at DESC',
    [comboId]
  );
  return result.rows;
}

/**
 * Get feedback statistics by service
 */
async function getFeedbackStats(serviceId) {
  const result = await query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN is_working THEN 1 ELSE 0 END) as working,
       SUM(CASE WHEN is_working THEN 0 ELSE 1 END) as not_working,
       AVG(rating) as avg_rating
     FROM feedback 
     WHERE service_id = $1`,
    [serviceId]
  );
  return result.rows[0];
}

// =====================================================
// USER HISTORY
// =====================================================

/**
 * Add user history entry
 */
async function addUserHistory(userId, serviceId, action, details = {}) {
  const result = await query(
    `INSERT INTO user_history (user_id, service_id, action, details)
     VALUES ($1, $2, $3, $4)`,
    [userId, serviceId, action, JSON.stringify(details)]
  );
  return {};
}

/**
 * Get user history
 */
async function getUserHistory(userId, limit = 50) {
  const result = await query(
    `SELECT * FROM user_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// =====================================================
// GUILD CONFIG
// =====================================================

/**
 * Get or create guild config
 */
async function getOrCreateGuildConfig(guildId) {
  let result = await query(
    'SELECT * FROM guild_configs WHERE guild_id = $1',
    [guildId]
  );

  if (result.rows.length === 0) {
    const defaultConfig = {
      cooldown_free: 600000,
      cooldown_premium: 60000,
      daily_limit_free: 10,
      daily_limit_premium: 50,
      role_free: null,
      role_premium: null,
      verified_role: null,
      verification_enabled: false,
      antiraid_enabled: false,
      vpn_check: false,
      log_channel: null
    };

    await query(
      `INSERT INTO guild_configs (guild_id, config_data)
       VALUES ($1, $2)`,
      [guildId, JSON.stringify(defaultConfig)]
    );
    result = await query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
  }

  return result.rows[0];
}

/**
 * Update guild config
 */
async function updateGuildConfig(guildId, configData) {
  // Get existing config first
  const existing = await getOrCreateGuildConfig(guildId);
  const currentConfig = existing.config_data || {};
  
  // Merge with new data
  const newConfig = { ...currentConfig, ...configData };

  const result = await query(
    `UPDATE guild_configs 
     SET config_data = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE guild_id = $2`,
    [JSON.stringify(newConfig), guildId]
  );
  const selectResult = await query('SELECT * FROM guild_configs WHERE guild_id = $1', [guildId]);
  return selectResult.rows[0];
}

// =====================================================
// GUILD PANELS
// =====================================================

/**
 * Get or create guild panels
 */
async function getOrCreateGuildPanels(guildId) {
  let result = await query(
    'SELECT * FROM guild_panels WHERE guild_id = $1',
    [guildId]
  );

  if (result.rows.length === 0) {
    await query(
      `INSERT INTO guild_panels (guild_id, panels_data)
       VALUES ($1, $2)`,
      [guildId, JSON.stringify({})]
    );
    result = await query('SELECT * FROM guild_panels WHERE guild_id = $1', [guildId]);
  }

  return result.rows[0];
}

/**
 * Update guild panels
 */
async function updateGuildPanels(guildId, panelsData) {
  const result = await query(
    `UPDATE guild_panels 
     SET panels_data = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE guild_id = $2`,
    [JSON.stringify(panelsData), guildId]
  );
  const selectResult = await query('SELECT * FROM guild_panels WHERE guild_id = $1', [guildId]);
  return selectResult.rows[0];
}

/**
 * Set panel (shorthand for update)
 */
async function setPanel(guildId, panelType, channelId, messageId) {
  const panels = await getOrCreateGuildPanels(guildId);
  const panelsData = panels.panels_data || {};
  
  panelsData[panelType] = {
    channelId,
    messageId,
    createdAt: new Date().toISOString()
  };

  return await updateGuildPanels(guildId, panelsData);
}

// =====================================================
// PROOF SUBMISSIONS
// =====================================================

/**
 * Submit proof
 */
async function submitProof(userId, serviceId, proofUrl) {
  const result = await query(
    `INSERT INTO proof_submissions (user_id, service_id, proof_url)
     VALUES ($1, $2, $3)`,
    [userId, serviceId, proofUrl]
  );
  return {};
}

/**
 * Get pending proofs
 */
async function getPendingProofs(limit = 50) {
  const result = await query(
    `SELECT * FROM proof_submissions 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Review proof
 */
async function reviewProof(proofId, status, reviewerId, comment = '') {
  const result = await query(
    `UPDATE proof_submissions 
     SET status = $1, reviewer_id = $2, review_comment = $3, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $4`,
    [status, reviewerId, comment, proofId]
  );
  const selectResult = await query('SELECT * FROM proof_submissions WHERE id = $1', [proofId]);
  return selectResult.rows[0];
}

// =====================================================
// USERS
// =====================================================

/**
 * Get or create user
 */
async function getOrCreateUser(userId, username = '') {
  let result = await query(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    await query(
      `INSERT INTO users (user_id, username)
       VALUES ($1, $2)`,
      [userId, username]
    );
    result = await query('SELECT * FROM users WHERE user_id = $1', [userId]);
  }

  return result.rows[0];
}

/**
 * Update user stats
 */
async function updateUserStats(userId, checkCount = 0, genCount = 0) {
  const result = await query(
    `UPDATE users 
     SET total_combos_checked = total_combos_checked + $1,
         total_combos_generated = total_combos_generated + $2,
         last_activity = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $3`,
    [checkCount, genCount, userId]
  );
  const selectResult = await query('SELECT * FROM users WHERE user_id = $1', [userId]);
  return selectResult.rows[0];
}

// =====================================================
// AUDIT LOGS
// =====================================================

/**
 * Log audit event
 */
async function logAuditEvent(userId, action, resourceType, resourceId, details = {}, ipAddress = '') {
  const result = await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
  );
  return {};
}

/**
 * Get audit logs
 */
async function getAuditLogs(filters = {}, limit = 100) {
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (filters.userId) {
    sql += ` AND user_id = $${params.length + 1}`;
    params.push(filters.userId);
  }

  if (filters.action) {
    sql += ` AND action = $${params.length + 1}`;
    params.push(filters.action);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

module.exports = {
  // Combos
  addCombos,
  getComboById,
  getCombosByService,
  updateComboQuality,
  countCombosByService,
  deleteOldCombos,
  
  // Feedback
  addFeedback,
  getFeedbackForCombo,
  getFeedbackStats,
  
  // User History
  addUserHistory,
  getUserHistory,
  
  // Guild Config
  getOrCreateGuildConfig,
  updateGuildConfig,
  
  // Guild Panels
  getOrCreateGuildPanels,
  updateGuildPanels,
  setPanel,
  
  // Proof Submissions
  submitProof,
  getPendingProofs,
  reviewProof,
  
  // Users
  getOrCreateUser,
  updateUserStats,
  
  // Audit Logs
  logAuditEvent,
  getAuditLogs
};
