/**
 * =====================================================
 * ULP FILE PARSER SERVICE
 * =====================================================
 * Parses domain:email:password format files with
 * service matching and batch processing.
 */

const fs = require('fs');
const readline = require('readline');
const { Readable } = require('stream');
const { getServiceById } = require('../config/services');
const { getLogger } = require('../utils/logger');
const { validateULPLine } = require('../utils/validation');

const logger = getLogger();

/**
 * Build service keywords for matching
 */
function buildServiceKeywords(services) {
  return services.map(service => {
    const labelKeyword = service.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idKeyword = service.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const keywords = [labelKeyword, idKeyword];
    const domainKeywords = service.domains.map(d => d.split('.')[0].toLowerCase());
    
    return {
      id: service.id,
      keywords: [...new Set([...keywords, ...domainKeywords])]
    };
  });
}

/**
 * Find matching service by domain
 */
function findServiceByDomain(domain, serviceKeywords) {
  domain = domain.toLowerCase();

  for (const service of serviceKeywords) {
    if (service.keywords.some(keyword => 
      keyword && domain.includes(keyword)
    )) {
      return service.id;
    }
  }

  return null;
}

/**
 * Parse ULP from readable stream
 */
async function parseULPStream(readable, services, onProgress = null) {
  const input = typeof readable?.getReader === 'function'
    ? Readable.fromWeb(readable)
    : readable;

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  let linesProcessed = 0;
  let validFound = 0;
  const combosByService = {};

  const serviceKeywords = buildServiceKeywords(services);
  const ULP_REGEX = /^(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})(?:\/.*?)?:([^:]+):(.+)$/;

  try {
    for await (const rawLine of rl) {
      linesProcessed++;
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) continue;

      const match = line.match(ULP_REGEX);

      if (match) {
        const domain = match[1].toLowerCase();
        const username = match[2];
        const password = match[3];

        // Validate components
        const validation = validateULPLine(line);
        if (!validation.valid) continue;

        // Find matching service
        const targetService = findServiceByDomain(domain, serviceKeywords);

        if (targetService) {
          if (!combosByService[targetService]) {
            combosByService[targetService] = [];
          }
          combosByService[targetService].push(`${username}:${password}`);
          validFound++;

          // Progress callback every 5000 combos
          if (validFound % 5000 === 0 && onProgress) {
            onProgress({ 
              linesProcessed, 
              validFound,
              type: 'progress'
            });
          }
        }
      }

      // Progress callback every 100k lines
      if (linesProcessed % 100000 === 0 && onProgress) {
        onProgress({ 
          linesProcessed, 
          validFound,
          type: 'line_progress'
        });
      }
    }

    // Final progress
    if (onProgress) {
      onProgress({ 
        linesProcessed, 
        validFound,
        type: 'complete'
      });
    }

    logger.info('Parser', 'ULP parsing completed', { 
      linesProcessed, 
      validFound,
      servicesFound: Object.keys(combosByService).length
    });

    return { 
      linesProcessed, 
      validFound, 
      combosByService 
    };
  } catch (error) {
    logger.error('Parser', 'ULP parsing failed', { error: error.message });
    throw error;
  }
}

/**
 * Parse ULP from file
 */
async function parseULPFile(filePath, services, onProgress = null) {
  logger.info('Parser', `Starting to parse ULP file: ${filePath}`);

  try {
    const fileSize = fs.statSync(filePath).size;
    logger.debug('Parser', `File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    return await parseULPStream(stream, services, onProgress);
  } catch (error) {
    logger.error('Parser', 'File parsing failed', { 
      error: error.message,
      file: filePath
    });
    throw error;
  }
}

/**
 * Parse ULP from URL
 */
async function parseULPUrl(url, services, onProgress = null) {
  logger.info('Parser', `Starting to parse ULP from URL: ${url}`);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await parseULPStream(response.body, services, onProgress);
  } catch (error) {
    logger.error('Parser', 'URL parsing failed', { 
      error: error.message,
      url
    });
    throw error;
  }
}

/**
 * Parse ULP from text content
 */
async function parseULPText(content, services, onProgress = null) {
  logger.info('Parser', 'Starting to parse ULP from text content');

  try {
    const stream = Readable.from([content]);
    return await parseULPStream(stream, services, onProgress);
  } catch (error) {
    logger.error('Parser', 'Text parsing failed', { 
      error: error.message
    });
    throw error;
  }
}

/**
 * Batch flush combos to callback
 */
async function flushCombos(combosByService, addCombosFn) {
  const promises = Object.entries(combosByService).map(([serviceId, combos]) => {
    if (combos.length > 0) {
      return addCombosFn(serviceId, combos);
    }
  });

  return Promise.all(promises);
}

module.exports = {
  buildServiceKeywords,
  findServiceByDomain,
  parseULPStream,
  parseULPFile,
  parseULPUrl,
  parseULPText,
  flushCombos
};
