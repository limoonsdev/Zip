/**
 * =====================================================
 * VALIDATION UTILITIES
 * =====================================================
 * Centralized input validation functions for email,
 * passwords, domains, and other user inputs.
 */

const CONSTANTS = require('../config/constants');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return CONSTANTS.VALIDATION.EMAIL_REGEX.test(email.trim());
}

/**
 * Validate password length and format
 * @param {string} password - Password to validate
 * @returns {object} {valid: boolean, error: string|null}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH) {
    return { 
      valid: false, 
      error: `Password too short (min: ${CONSTANTS.VALIDATION.MIN_PASSWORD_LENGTH} chars)` 
    };
  }

  if (password.length > CONSTANTS.VALIDATION.MAX_PASSWORD_LENGTH) {
    return { 
      valid: false, 
      error: `Password too long (max: ${CONSTANTS.VALIDATION.MAX_PASSWORD_LENGTH} chars)` 
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate domain format
 * @param {string} domain - Domain to validate
 * @returns {boolean} True if valid domain
 */
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  return CONSTANTS.VALIDATION.DOMAIN_REGEX.test(domain.trim());
}

/**
 * Validate combo format (email:password)
 * @param {string} combo - Combo string
 * @returns {object} {valid: boolean, email: string|null, password: string|null, error: string|null}
 */
function validateCombo(combo) {
  if (!combo || typeof combo !== 'string') {
    return { 
      valid: false, 
      email: null, 
      password: null, 
      error: 'Combo is required' 
    };
  }

  const parts = combo.split(':');
  if (parts.length !== 2) {
    return { 
      valid: false, 
      email: null, 
      password: null, 
      error: 'Combo must be in format: email:password' 
    };
  }

  const [email, password] = parts;

  const emailValid = validateEmail(email);
  if (!emailValid) {
    return { 
      valid: false, 
      email: null, 
      password: null, 
      error: 'Invalid email format' 
    };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return { 
      valid: false, 
      email: null, 
      password: null, 
      error: passwordCheck.error 
    };
  }

  return { 
    valid: true, 
    email: email.trim(), 
    password: password.trim(), 
    error: null 
  };
}

/**
 * Validate ULP line format (domain:email:password)
 * @param {string} line - ULP line
 * @returns {object} {valid: boolean, domain: string|null, email: string|null, password: string|null}
 */
function validateULPLine(line) {
  if (!line || typeof line !== 'string') {
    return { valid: false, domain: null, email: null, password: null };
  }

  const parts = line.split(':');
  if (parts.length < 3) {
    return { valid: false, domain: null, email: null, password: null };
  }

  const domain = parts[0].toLowerCase();
  const email = parts[1];
  const password = parts.slice(2).join(':'); // Handle passwords with colons

  // Validate components
  if (!validateDomain(domain) || !validateEmail(email) || !password) {
    return { valid: false, domain: null, email: null, password: null };
  }

  return { 
    valid: true, 
    domain: domain.trim(), 
    email: email.trim(), 
    password: password.trim() 
  };
}

/**
 * Sanitize input string (remove dangerous characters)
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>"'%;()&+]/g, '') // Remove dangerous chars
    .slice(0, 1000); // Limit length
}

/**
 * Validate user ID format
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  return /^\d{15,20}$/.test(userId);
}

/**
 * Validate Discord channel ID
 * @param {string} channelId - Channel ID to validate
 * @returns {boolean} True if valid
 */
function validateChannelId(channelId) {
  if (!channelId || typeof channelId !== 'string') return false;
  return /^\d{15,20}$/.test(channelId);
}

/**
 * Validate Discord role ID
 * @param {string} roleId - Role ID to validate
 * @returns {boolean} True if valid
 */
function validateRoleId(roleId) {
  if (!roleId || typeof roleId !== 'string') return false;
  return /^\d{15,20}$/.test(roleId);
}

/**
 * Batch validate multiple combos
 * @param {string[]} combos - Array of combo strings
 * @returns {object} {valid: Array, invalid: Array}
 */
function validateComboBatch(combos) {
  const valid = [];
  const invalid = [];

  if (!Array.isArray(combos)) {
    return { valid: [], invalid: [combos] };
  }

  combos.forEach((combo, index) => {
    const result = validateCombo(combo);
    if (result.valid) {
      valid.push({ index, combo, email: result.email, password: result.password });
    } else {
      invalid.push({ index, combo, error: result.error });
    }
  });

  return { valid, invalid };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateDomain,
  validateCombo,
  validateULPLine,
  sanitizeInput,
  validateUserId,
  validateChannelId,
  validateRoleId,
  validateComboBatch
};
