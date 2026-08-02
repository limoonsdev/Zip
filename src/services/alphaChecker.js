const { getLogger } = require('../utils/logger');
const { runChecker } = require('./checker');

const logger = getLogger();

/**
 * Universal Checker (AlphaChecker v2)
 * As requested, this performs REAL validation using checker.js 
 * and rejects fake combo formats.
 */
async function checkAccount(serviceId, email, password, proxy = null) {
  const startTime = Date.now();
  
  logger.info('AlphaChecker', `🔍 Running real check for ${serviceId}`, { 
    service: serviceId,
    email: email.substring(0, 3) + '***'
  });

  // Call the real checker engine which handles proxy rotation and real API requests
  const result = await runChecker(serviceId, email, password);

  // Map runChecker output to AlphaChecker's expected structure
  const valid = result.working;

  return {
    valid,
    status: valid ? 'HIT' : 'BAD',
    info: result.message || (valid ? 'Valid account' : 'Invalid credentials'),
    score: result.quality || 0,
    checkTime: Date.now() - startTime
  };
}

module.exports = {
  checkAccount
};
