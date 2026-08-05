const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const { once } = require('events');
const { createWriteStream } = require('fs');
const { finished } = require('stream/promises');
const { pathToFileURL } = require('url');
const { path7za } = require('7zip-bin');
const { parseUlpFile } = require('./ulp_parser');

const MAX_REDIRECTS = 10;
const DOWNLOAD_PROGRESS_INTERVAL_MS = 1500;
const TEXT_FILE_REGEX = /\.(txt|ulp|log|csv)$/i;
const ARCHIVE_FILE_REGEX = /\.(zip|7z|rar)$/i;

let gofileModulePromise = null;

function normalizeRelativePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

async function loadGofileModule() {
  if (!gofileModulePromise) {
    const modulePath = require.resolve('gofile-dl/src/gofile-dl.mjs');
    gofileModulePromise = import(pathToFileURL(modulePath).href);
  }
  return gofileModulePromise;
}

async function emit(onEvent, event) {
  if (typeof onEvent === 'function') {
    await onEvent(event);
  }
}

function classifyItem(item) {
  const relativePath = normalizeRelativePath(item.relativePath);
  const baseName = path.posix.basename(relativePath);
  const lowerName = baseName.toLowerCase();

  if (TEXT_FILE_REGEX.test(lowerName)) {
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
      key: path.posix.join(path.posix.dirname(relativePath), archiveName),
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
      key: path.posix.join(path.posix.dirname(relativePath), archiveName),
      archiveName,
      label: archiveName,
      volume,
      primary: volume === 1
    };
  }

  if (ARCHIVE_FILE_REGEX.test(lowerName)) {
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

function buildTaskPlan(items) {
  const tasks = [];
  const skipped = [];
  const splitGroups = new Map();

  items.forEach((item, index) => {
    const meta = classifyItem(item);

    if (meta.type === 'text' || meta.type === 'archive') {
      tasks.push({
        type: meta.type,
        label: meta.label,
        sortIndex: index,
        items: [item]
      });
      return;
    }

    if (meta.type === 'split-part') {
      if (!splitGroups.has(meta.key)) {
        splitGroups.set(meta.key, {
          type: 'split-archive',
          label: meta.label,
          sortIndex: index,
          parts: [],
          hasPrimary: false
        });
      }

      const group = splitGroups.get(meta.key);
      group.parts.push({
        ...item,
        volume: meta.volume,
        primary: meta.primary
      });
      group.hasPrimary = group.hasPrimary || meta.primary;
      return;
    }

    skipped.push(item.relativePath);
  });

  for (const group of splitGroups.values()) {
    if (!group.hasPrimary) {
      skipped.push(...group.parts.map((part) => part.relativePath));
      continue;
    }

    group.parts.sort((a, b) => a.volume - b.volume);
    tasks.push({
      type: 'split-archive',
      label: group.label,
      sortIndex: group.sortIndex,
      items: group.parts
    });
  }

  tasks.sort((a, b) => a.sortIndex - b.sortIndex);

  return { tasks, skipped };
}

async function getGofileDownloadPlan(gofileUrl) {
  const gofile = await loadGofileModule();
  const contentId = gofile.extractContentId(gofileUrl);
  const shareUrl = `https://gofile.io/d/${contentId}`;
  const payload = await gofile.scrapeShareTree({
    shareUrl,
    quiet: true
  });

  const rootName = payload.root?.name?.trim()
    ? gofile.sanitizeComponent(payload.root.name)
    : gofile.sanitizeComponent(contentId);

  return {
    token: payload.token,
    items: gofile.listDownloadsFromContent(payload.root, rootName, true)
  };
}

function requestWithRedirects(url, token, userAgent, redirectCount = 0) {
  const requestUrl = new URL(url);
  const transport = requestUrl.protocol === 'http:' ? http : https;
  const headers = {
    'User-Agent': userAgent,
    'Referer': 'https://gofile.io/'
  };

  if (token) {
    headers.Cookie = `accountToken=${token}`;
  }

  return new Promise((resolve, reject) => {
    const request = transport.get(requestUrl, { headers }, (response) => {
      const statusCode = response.statusCode || 0;
      const location = response.headers.location;

      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        response.resume();
        if (redirectCount >= MAX_REDIRECTS) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }

        resolve(
          requestWithRedirects(new URL(location, requestUrl).toString(), token, userAgent, redirectCount + 1)
        );
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Download impossible (${statusCode}) for ${url}`));
        return;
      }

      resolve(response);
    });

    request.on('error', reject);
  });
}

async function downloadItem(item, destinationPath, token, userAgent, onEvent, context) {
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  const tmpPath = `${destinationPath}.part`;
  const response = await requestWithRedirects(item.url, token, userAgent);
  const file = createWriteStream(tmpPath);
  const totalBytes = Number(response.headers['content-length'] || item.size || 0);
  let downloadedBytes = 0;
  let lastProgressAt = 0;

  try {
    await emit(onEvent, {
      type: 'download-start',
      ...context,
      fileName: path.basename(item.relativePath),
      totalBytes
    });

    for await (const chunk of response) {
      downloadedBytes += chunk.length;

      if (!file.write(chunk)) {
        await once(file, 'drain');
      }

      if (Date.now() - lastProgressAt >= DOWNLOAD_PROGRESS_INTERVAL_MS) {
        lastProgressAt = Date.now();
        await emit(onEvent, {
          type: 'download-progress',
          ...context,
          fileName: path.basename(item.relativePath),
          downloadedBytes,
          totalBytes
        });
      }
    }
  } finally {
    file.end();
  }

  await finished(file);
  await fs.promises.rename(tmpPath, destinationPath);

  await emit(onEvent, {
    type: 'download-complete',
    ...context,
    fileName: path.basename(item.relativePath),
    downloadedBytes,
    totalBytes
  });

  return destinationPath;
}

function run7zip(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(path7za, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`7z extraction failed (${code}): ${stderr || stdout || 'no output'}`));
    });
  });
}

async function extractArchive(archivePath, outputDir) {
  await fs.promises.mkdir(outputDir, { recursive: true });
  await run7zip(['x', archivePath, `-o${outputDir}`, '-y', '-bb0', '-bso0', '-bsp0']);
}

async function collectFilesRecursively(directoryPath) {
  const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFilesRecursively(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function cleanupPaths(pathsToDelete) {
  for (const targetPath of pathsToDelete) {
    if (!targetPath) continue;
    await fs.promises.rm(targetPath, { recursive: true, force: true }).catch(() => {});
  }
}

async function processTextFiles(textFiles, services, addCombosFn, onEvent, totals, context) {
  const sortedFiles = [...textFiles].sort((a, b) => a.localeCompare(b));

  for (const textFilePath of sortedFiles) {
    await emit(onEvent, {
      type: 'parse-file-start',
      ...context,
      fileName: path.basename(textFilePath)
    });

    const stats = await parseUlpFile(
      textFilePath,
      services,
      addCombosFn,
      async (linesProcessed, validFound) => {
        await emit(onEvent, {
          type: 'parse-file-progress',
          ...context,
          fileName: path.basename(textFilePath),
          fileLinesProcessed: linesProcessed,
          fileValidFound: validFound,
          totalLinesProcessed: totals.linesProcessed + linesProcessed,
          totalValidFound: totals.validFound + validFound
        });
      }
    );

    totals.linesProcessed += stats.linesProcessed;
    totals.validFound += stats.validFound;

    await emit(onEvent, {
      type: 'parse-file-complete',
      ...context,
      fileName: path.basename(textFilePath),
      fileLinesProcessed: stats.linesProcessed,
      fileValidFound: stats.validFound,
      totalLinesProcessed: totals.linesProcessed,
      totalValidFound: totals.validFound
    });
  }
}

async function processTask(task, taskIndex, tasksTotal, workspaceRoot, token, userAgent, services, addCombosFn, onEvent, totals) {
  const safeLabel = task.label.replace(/[^a-zA-Z0-9._-]/g, '_');
  const taskDir = path.join(workspaceRoot, `${String(taskIndex).padStart(3, '0')}_${safeLabel}`);
  const downloadsDir = path.join(taskDir, 'downloads');
  const extractedDir = path.join(taskDir, 'extracted');
  const context = {
    taskIndex,
    tasksTotal,
    taskLabel: task.label
  };

  await emit(onEvent, {
    type: 'task-start',
    ...context
  });

  await fs.promises.mkdir(downloadsDir, { recursive: true });

  try {
    if (task.type === 'text') {
      const item = task.items[0];
      const localFilePath = path.join(downloadsDir, path.basename(item.relativePath));
      await downloadItem(item, localFilePath, token, userAgent, onEvent, context);
      await processTextFiles([localFilePath], services, addCombosFn, onEvent, totals, context);
    } else {
      const downloadedFiles = [];

      for (const item of task.items) {
        const localFilePath = path.join(downloadsDir, path.basename(item.relativePath));
        downloadedFiles.push(
          await downloadItem(item, localFilePath, token, userAgent, onEvent, context)
        );
      }

      const primaryArchivePath = task.type === 'split-archive'
        ? downloadedFiles[0]
        : downloadedFiles[0];

      await emit(onEvent, {
        type: 'extract-start',
        ...context,
        archiveName: path.basename(primaryArchivePath)
      });

      await extractArchive(primaryArchivePath, extractedDir);

      const extractedFiles = await collectFilesRecursively(extractedDir);
      const textFiles = extractedFiles.filter((filePath) => TEXT_FILE_REGEX.test(filePath));

      await emit(onEvent, {
        type: 'extract-complete',
        ...context,
        archiveName: path.basename(primaryArchivePath),
        extractedTextFiles: textFiles.length
      });

      if (!textFiles.length) {
        throw new Error(`No ULP text file found in ${task.label}`);
      }

      await processTextFiles(textFiles, services, addCombosFn, onEvent, totals, context);
    }

    await emit(onEvent, {
      type: 'task-complete',
      ...context,
      totalLinesProcessed: totals.linesProcessed,
      totalValidFound: totals.validFound
    });
  } finally {
    await emit(onEvent, {
      type: 'cleanup-start',
      ...context
    });
    await cleanupPaths([taskDir]);
    await emit(onEvent, {
      type: 'cleanup-complete',
      ...context
    });
  }
}

async function processGofileUlp({ gofileUrl, services, addCombosFn, onEvent }) {
  const gofile = await loadGofileModule();
  const workspaceRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nextgen-gofile-ulp-'));
  const totals = {
    linesProcessed: 0,
    validFound: 0
  };

  try {
    await emit(onEvent, {
      type: 'discover-start',
      gofileUrl
    });

    const { token, items } = await getGofileDownloadPlan(gofileUrl);
    const { tasks, skipped } = buildTaskPlan(items);

    await emit(onEvent, {
      type: 'discover-complete',
      gofileUrl,
      filesDiscovered: items.length,
      tasksTotal: tasks.length,
      skippedFiles: skipped.length
    });

    for (let index = 0; index < tasks.length; index++) {
      await processTask(
        tasks[index],
        index + 1,
        tasks.length,
        workspaceRoot,
        token,
        gofile.USER_AGENT,
        services,
        addCombosFn,
        onEvent,
        totals
      );
    }

    return {
      filesDiscovered: items.length,
      tasksProcessed: tasks.length,
      skippedFiles: skipped.length,
      linesProcessed: totals.linesProcessed,
      validFound: totals.validFound
    };
  } finally {
    await cleanupPaths([workspaceRoot]);
  }
}

module.exports = {
  processGofileUlp
};
