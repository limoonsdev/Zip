const fs = require('fs');
const readline = require('readline');
const { Readable } = require('stream');

function buildServiceKeywords(services) {
  return services.map((service) => {
    const labelKeyword = service.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idKeyword = service.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      id: service.id,
      keywords: [labelKeyword, idKeyword]
    };
  });
}

async function parseUlpReadable(readable, services, addCombosFn, onProgress) {
  const input = typeof readable?.getReader === 'function'
    ? Readable.fromWeb(readable)
    : readable;

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  let linesProcessed = 0;
  let validFound = 0;
  let combosByService = {};

  const ulpRegex = /^(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})(?:\/.*?)?:([^:]+):(.+)$/;
  const serviceKeywords = buildServiceKeywords(services);

  for await (const rawLine of rl) {
    linesProcessed++;
    const line = rawLine.trim();
    const match = line.match(ulpRegex);

    if (match) {
      const domain = match[1].toLowerCase();
      const username = match[2];
      const password = match[3];

      let targetService = null;
      for (const serviceKeyword of serviceKeywords) {
        if (serviceKeyword.keywords.some((keyword) => keyword && domain.includes(keyword))) {
          targetService = serviceKeyword.id;
          break;
        }
      }

      if (targetService) {
        if (!combosByService[targetService]) combosByService[targetService] = [];
        combosByService[targetService].push(`${username}:${password}`);
        validFound++;
      }
    }

    if (validFound > 0 && validFound % 5000 === 0) {
      await flushBatches(combosByService, addCombosFn);
      combosByService = {};
      if (onProgress) onProgress(linesProcessed, validFound);
    }

    if (linesProcessed % 100000 === 0) {
      if (onProgress) onProgress(linesProcessed, validFound);
    }
  }

  await flushBatches(combosByService, addCombosFn);
  if (onProgress) onProgress(linesProcessed, validFound);

  return { linesProcessed, validFound };
}

async function parseUlpStream(fileUrl, services, addCombosFn, onProgress) {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Echec du telechargement ULP: ${response.statusText}`);
  }
  return parseUlpReadable(response.body, services, addCombosFn, onProgress);
}

async function parseUlpFile(filePath, services, addCombosFn, onProgress) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  return parseUlpReadable(stream, services, addCombosFn, onProgress);
}

async function flushBatches(combosByService, addCombosFn) {
  for (const [serviceId, combos] of Object.entries(combosByService)) {
    if (combos.length > 0) {
      await addCombosFn(serviceId, combos);
    }
  }
}

module.exports = {
  parseUlpReadable,
  parseUlpStream,
  parseUlpFile
};
