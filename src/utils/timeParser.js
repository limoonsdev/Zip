/**
 * =====================================================
 * TIME PARSER UTILITY
 * =====================================================
 * Parse time strings like "50s", "1m", "1h", "2d"
 */

/**
 * Parse time string to milliseconds
 * @param {string} timeStr - Time string (e.g., "50s", "1m", "1h", "2d")
 * @returns {number|null} Milliseconds or null if invalid
 */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const match = timeStr.trim().match(/^(\d+(?:\.\d+)?)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days)?$/i);
  
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  const multipliers = {
    's': 1000,
    'sec': 1000,
    'second': 1000,
    'seconds': 1000,
    'm': 60000,
    'min': 60000,
    'minute': 60000,
    'minutes': 60000,
    'h': 3600000,
    'hour': 3600000,
    'hours': 3600000,
    'd': 86400000,
    'day': 86400000,
    'days': 86400000
  };

  if (!multipliers[unit]) return null;

  return Math.floor(value * multipliers[unit]);
}

/**
 * Format milliseconds to human-readable string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted string
 */
function formatTime(ms) {
  if (!ms || ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Validate time string
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} True if valid
 */
function isValidTime(timeStr) {
  return parseTime(timeStr) !== null;
}

module.exports = {
  parseTime,
  formatTime,
  isValidTime
};
