/**
 * =====================================================
 * GOFILE DOWNLOAD & PROCESSING SERVICE
 * =====================================================
 * Handles Gofile link processing, file downloads,
 * archive extraction, and ULP parsing.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const { createWriteStream } = require('fs');
const { finished } = require('stream/promises');
const { pathToFileURL } = require('url');
const { path7za } = require('7zip-bin');
const { getLogger } = require('../utils/logger');
const CONSTANTS = require('../config/constants');

const logger = getLogger();

/**
 * Classify item by filename
 */
function classifyItem(item) {
  const relativePath = (item.relativePath || '').replace(/\\/g, '/');
  const baseName = path.basename(relativePath);
  const lowerName = baseName.toLowerCase();

  if (CONSTANTS.FILES.TEXT_FILE_REGEX.test(lowerName)) {
    return {
      type: 'text',
      key: relativePath,
      label: baseName
    };
  }

  const numberedSplitMatch = lowerName.match(/^(.*\.(?:zip|7z|rar))\.(\d{3})$/i);
  if (numberedSplitMatch) {
    const archiveName = numberedSplitMatch[1];
    const volume = Number(numberedSplitMatch[2]);
    return {
      type: 'split-part',
      key: path.join(path.dirname(relativePath), archiveName),
      archiveName,
      label: archiveName,
      volume,
      primary: volume === 1
    };
  }

  const rarPartMatch = lowerName.match(/^(.*)\.part(\d+)\.rar$/i);
  if (rarPartMatch) {
    const archiveName = `${rarPartMatch[1]}.rar`;
    const volume = Number(rarPartMatch[2]);
    return {
      type: 'split-part',
      key: path.join(path.dirname(relativePath), archiveName),
      archiveName,
      label: archiveName,
      volume,
      primary: volume === 1
    };
  }

  if (CONSTANTS.FILES.ARCHIVE_FILE_REGEX.test(lowerName)) {
    return {
      type: 'archive',
      key: relativePath,
      label: baseName
    };
  }

  return {
    type: 'skip',
    key: relativePath,
    label: baseName
  };
}

/**
 * Download file from URL
 */
async function downloadFile(url, destinationPath, onProgress = null) {
  logger.info('Gofile', `Downloading file from ${url}`);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, async (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      const file = createWriteStream(destinationPath);

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (onProgress) {
          onProgress({
            downloaded: downloadedSize,
            total: totalSize,
            percentage: Math.floor((downloadedSize / totalSize) * 100)
          });
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        logger.info('Gofile', 'File download completed');
        resolve();
      });

      file.on('error', (error) => {
        fs.unlink(destinationPath, () => {});
        reject(error);
      });
    }).on('error', reject);
  });
}

/**
 * Extract archive using 7-Zip
 */
async function extractArchive(archivePath, extractPath, onProgress = null) {
  logger.info('Gofile', `Extracting archive: ${archivePath}`);

  return new Promise((resolve, reject) => {
    const process = spawn(path7za, [
      'x',
      archivePath,
      `-o${extractPath}`,
      '-y'
    ]);

    let lastProgress = 0;

    process.stdout.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/(\d+)%/);
      if (match) {
        const progress = parseInt(match[1]);
        if (progress > lastProgress) {
          lastProgress = progress;
          if (onProgress) {
            onProgress({ percentage: progress, status: 'extracting' });
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      logger.debug('Gofile', `7z stderr: ${data}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.info('Gofile', 'Archive extraction completed');
        resolve();
      } else {
        reject(new Error(`7z extraction failed with code ${code}`));
      }
    });

    process.on('error', reject);
  });
}

/**
 * Get all text files from directory recursively
 */
function getTextFiles(dirPath) {
  const textFiles = [];

  function walkDir(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (CONSTANTS.FILES.TEXT_FILE_REGEX.test(file.toLowerCase())) {
        textFiles.push(fullPath);
      }
    });
  }

  walkDir(dirPath);
  return textFiles;
}

/**
 * Cleanup temporary directory
 */
async function cleanupTempDir(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return;

  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        await cleanupTempDir(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }

    fs.rmdirSync(dirPath);
    logger.info('Gofile', `Cleaned up temp directory: ${dirPath}`);
  } catch (error) {
    logger.warn('Gofile', 'Failed to cleanup temp directory', { 
      error: error.message 
    });
  }
}

/**
 * Process Gofile content
 */
async function processGofileContent(items, onProgress = null) {
  logger.info('Gofile', 'Processing Gofile content');

  const tasks = [];
  const tempDir = path.join(os.tmpdir(), `gofile-${Date.now()}`);

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Process each item
    for (const item of items || []) {
      const classification = classifyItem(item);

      if (classification.type === 'text') {
        tasks.push({
          type: 'parse_text',
          path: item.link,
          label: classification.label
        });
      } else if (classification.type === 'archive') {
        tasks.push({
          type: 'download_extract',
          path: item.link,
          label: classification.label,
          archivePath: path.join(tempDir, classification.label)
        });
      }
    }

    logger.info('Gofile', `Found ${tasks.length} tasks to process`);

    return {
      tasks,
      tempDir,
      cleanup: async () => {
        await cleanupTempDir(tempDir);
      }
    };
  } catch (error) {
    await cleanupTempDir(tempDir);
    throw error;
  }
}

/**
 * Load Gofile module dynamically (for ES module support)
 */
async function loadGofileModule() {
  try {
    const modulePath = require.resolve('gofile-dl/src/gofile-dl.mjs');
    return import(pathToFileURL(modulePath).href);
  } catch (error) {
    logger.warn('Gofile', 'Failed to load gofile-dl module', { 
      error: error.message 
    });
    return null;
  }
}

module.exports = {
  classifyItem,
  downloadFile,
  extractArchive,
  getTextFiles,
  cleanupTempDir,
  processGofileContent,
  loadGofileModule
};
