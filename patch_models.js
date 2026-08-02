const fs = require('fs');
let code = fs.readFileSync('src/database/models.js', 'utf8');

// 1. updateComboQuality
code = code.replace(
    /async function updateComboQuality\(comboId, qualityScore, isVerified = false\) \{\s*const result = await query\(\s*UPDATE combos \s*SET quality_score = \, is_verified = \, updated_at = CURRENT_TIMESTAMP \s*WHERE id = \\s*RETURNING \*,\s*\[qualityScore, isVerified, comboId\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function updateComboQuality(comboId, qualityScore, isVerified = false) {
  await query(
    \UPDATE combos 
     SET quality_score = , is_verified = , updated_at = CURRENT_TIMESTAMP 
     WHERE id = \,
    [qualityScore, isVerified, comboId]
  );
  const result = await query('SELECT * FROM combos WHERE id = ', [comboId]);
  return result.rows[0];
}
);

// 2. addFeedback
code = code.replace(
    /async function addFeedback\(serviceId, comboId, isWorking, userId, rating = null\) \{\s*const result = await query\(\s*INSERT INTO feedback \(service_id, combo_id, is_working, user_id, rating\)\s*VALUES \(\, \, \, \, \\)\s*RETURNING \*,\s*\[serviceId, comboId, isWorking, userId, rating\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function addFeedback(serviceId, comboId, isWorking, userId, rating = null) {
  await query(
    \INSERT INTO feedback (service_id, combo_id, is_working, user_id, rating)
     VALUES (, , , , )\,
    [serviceId, comboId, isWorking, userId, rating]
  );
  const result = await query('SELECT * FROM feedback WHERE combo_id =  AND user_id =  ORDER BY created_at DESC LIMIT 1', [comboId, userId]);
  return result.rows[0];
}
);

// 3. addUserHistory
code = code.replace(
    /async function addUserHistory\(userId, serviceId, action, details = \{\}\) \{\s*const result = await query\(\s*INSERT INTO user_history \(user_id, service_id, action, details\)\s*VALUES \(\, \, \, \\)\s*RETURNING \*,\s*\[userId, serviceId, action, JSON\.stringify\(details\)\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function addUserHistory(userId, serviceId, action, details = {}) {
  await query(
    \INSERT INTO user_history (user_id, service_id, action, details)
     VALUES (, , , )\,
    [userId, serviceId, action, JSON.stringify(details)]
  );
  const result = await query('SELECT * FROM user_history WHERE user_id =  ORDER BY created_at DESC LIMIT 1', [userId]);
  return result.rows[0];
}
);

// 4. getOrCreateGuildConfig
code = code.replace(
    /if \(result\.rows\.length === 0\) \{\s*const defaultConfig = \{\s*cooldown_free: 30000,\s*cooldown_premium: 10000,\s*daily_limit_free: 10,\s*daily_limit_premium: 50,\s*role_free: null,\s*role_premium: null\s*\};\s*result = await query\(\s*INSERT INTO guild_configs \(guild_id, config_data\)\s*VALUES \(\, \\)\s*RETURNING \*,\s*\[guildId, JSON\.stringify\(defaultConfig\)\]\s*\);\s*\}/,
    if (result.rows.length === 0) {
    const defaultConfig = {
      cooldown_free: 30000,
      cooldown_premium: 10000,
      daily_limit_free: 10,
      daily_limit_premium: 50,
      role_free: null,
      role_premium: null
    };
    await query(
      \INSERT INTO guild_configs (guild_id, config_data)
       VALUES (, )\,
      [guildId, JSON.stringify(defaultConfig)]
    );
    result = await query('SELECT * FROM guild_configs WHERE guild_id = ', [guildId]);
  }
);

// 5. updateGuildConfig
code = code.replace(
    /async function updateGuildConfig\(guildId, newConfig\) \{\s*const result = await query\(\s*UPDATE guild_configs \s*SET config_data = \, updated_at = CURRENT_TIMESTAMP \s*WHERE guild_id = \\s*RETURNING \*,\s*\[JSON\.stringify\(newConfig\), guildId\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function updateGuildConfig(guildId, newConfig) {
  await query(
    \UPDATE guild_configs 
     SET config_data = , updated_at = CURRENT_TIMESTAMP 
     WHERE guild_id = \,
    [JSON.stringify(newConfig), guildId]
  );
  const result = await query('SELECT * FROM guild_configs WHERE guild_id = ', [guildId]);
  return result.rows[0];
}
);

// 6. getOrCreateGuildPanels
code = code.replace(
    /if \(result\.rows\.length === 0\) \{\s*result = await query\(\s*INSERT INTO guild_panels \(guild_id, panels_data\)\s*VALUES \(\, \\)\s*RETURNING \*,\s*\[guildId, JSON\.stringify\(\{\}\)\]\s*\);\s*\}/,
    if (result.rows.length === 0) {
    await query(
      \INSERT INTO guild_panels (guild_id, panels_data)
       VALUES (, )\,
      [guildId, JSON.stringify({})]
    );
    result = await query('SELECT * FROM guild_panels WHERE guild_id = ', [guildId]);
  }
);

// 7. updateGuildPanels
code = code.replace(
    /async function updateGuildPanels\(guildId, panelsData\) \{\s*const result = await query\(\s*UPDATE guild_panels \s*SET panels_data = \, updated_at = CURRENT_TIMESTAMP \s*WHERE guild_id = \\s*RETURNING \*,\s*\[JSON\.stringify\(panelsData\), guildId\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function updateGuildPanels(guildId, panelsData) {
  await query(
    \UPDATE guild_panels 
     SET panels_data = , updated_at = CURRENT_TIMESTAMP 
     WHERE guild_id = \,
    [JSON.stringify(panelsData), guildId]
  );
  const result = await query('SELECT * FROM guild_panels WHERE guild_id = ', [guildId]);
  return result.rows[0];
}
);

// 8. addProofSubmission
code = code.replace(
    /async function addProofSubmission\(userId, serviceId, proofUrl\) \{\s*const result = await query\(\s*INSERT INTO proof_submissions \(user_id, service_id, proof_url\)\s*VALUES \(\, \, \\)\s*RETURNING \*,\s*\[userId, serviceId, proofUrl\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function addProofSubmission(userId, serviceId, proofUrl) {
  await query(
    \INSERT INTO proof_submissions (user_id, service_id, proof_url)
     VALUES (, , )\,
    [userId, serviceId, proofUrl]
  );
  const result = await query('SELECT * FROM proof_submissions WHERE user_id =  ORDER BY created_at DESC LIMIT 1', [userId]);
  return result.rows[0];
}
);

// 9. updateProofStatus
code = code.replace(
    /async function updateProofStatus\(proofId, status, reviewerId, comment = null\) \{\s*const result = await query\(\s*UPDATE proof_submissions \s*SET status = \, reviewer_id = \, review_comment = \, reviewed_at = CURRENT_TIMESTAMP\s*WHERE id = \\s*RETURNING \*,\s*\[status, reviewerId, comment, proofId\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function updateProofStatus(proofId, status, reviewerId, comment = null) {
  await query(
    \UPDATE proof_submissions 
     SET status = , reviewer_id = , review_comment = , reviewed_at = CURRENT_TIMESTAMP
     WHERE id = \,
    [status, reviewerId, comment, proofId]
  );
  const result = await query('SELECT * FROM proof_submissions WHERE id = ', [proofId]);
  return result.rows[0];
}
);

// 10. getOrCreateUser
code = code.replace(
    /if \(result\.rows\.length === 0\) \{\s*result = await query\(\s*INSERT INTO users \(user_id, username\)\s*VALUES \(\, \\)\s*RETURNING \*,\s*\[userId, username\]\s*\);\s*\}/,
    if (result.rows.length === 0) {
    await query(
      \INSERT INTO users (user_id, username)
       VALUES (, )\,
      [userId, username]
    );
    result = await query('SELECT * FROM users WHERE user_id = ', [userId]);
  }
);

// 11. updateUserStats
code = code.replace(
    /async function updateUserStats\(userId, checkCount = 0, genCount = 0\) \{\s*const result = await query\(\s*UPDATE users \s*SET total_combos_checked = total_combos_checked \+ \,\s*total_combos_generated = total_combos_generated \+ \,\s*last_activity = CURRENT_TIMESTAMP,\s*updated_at = CURRENT_TIMESTAMP\s*WHERE user_id = \\s*RETURNING \*,\s*\[checkCount, genCount, userId\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function updateUserStats(userId, checkCount = 0, genCount = 0) {
  await query(
    \UPDATE users 
     SET total_combos_checked = total_combos_checked + ,
         total_combos_generated = total_combos_generated + ,
         last_activity = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = \,
    [checkCount, genCount, userId]
  );
  const result = await query('SELECT * FROM users WHERE user_id = ', [userId]);
  return result.rows[0];
}
);

// 12. logAuditEvent
code = code.replace(
    /async function logAuditEvent\(userId, action, resourceType, resourceId, details = \{\}, ipAddress = ''\) \{\s*const result = await query\(\s*INSERT INTO audit_logs \(user_id, action, resource_type, resource_id, details, ip_address\)\s*VALUES \(\, \, \, \, \, \\)\s*RETURNING \*,\s*\[userId, action, resourceType, resourceId, JSON\.stringify\(details\), ipAddress\]\s*\);\s*return result\.rows\[0\];\s*\}/,
    sync function logAuditEvent(userId, action, resourceType, resourceId, details = {}, ipAddress = '') {
  await query(
    \INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
     VALUES (, , , , , )\,
    [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
  );
  const result = await query('SELECT * FROM audit_logs WHERE user_id =  ORDER BY created_at DESC LIMIT 1', [userId]);
  return result.rows[0];
}
);

fs.writeFileSync('src/database/models.js', code);
console.log('models.js patched!');
