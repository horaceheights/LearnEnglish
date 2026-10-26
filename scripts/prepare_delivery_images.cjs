#!/usr/bin/env node
'use strict';

// Deterministic format packaging only. Originals and the authored source are
// read-only; replacements must be named explicitly in the supplied manifest.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('../frontend/node_modules/sharp');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8').replace(/^\uFEFF/, ''));
function contained(root, relative) {
  const resolved = path.resolve(root, relative);
  if (path.isAbsolute(relative) || !resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Path escapes source: ${relative}`);
  }
  return resolved;
}
function writeNew(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && !fs.readFileSync(file).equals(bytes)) {
    throw new Error(`Refusing to replace staged bytes: ${file}`);
  }
  fs.writeFileSync(file, bytes);
}

async function prepare(sourcePath, mediaRoot, configPath, outputRoot) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const source = read(sourcePath);
  const config = read(configPath);
  if (!config.sourceVersion || !config.revision || !config.scope) throw new Error('Version metadata required');
  const configRoot = path.dirname(path.resolve(configPath));
  const records = [];
  const replacements = config.replacements || {};
  for (const key of Object.keys(replacements)) {
    if (!source.assets[key]) throw new Error(`Unknown replacement ${key}`);
  }
  for (const [id, original] of Object.entries(source.assets)) {
    const replacement = replacements[id];
    const input = replacement ? contained(configRoot, replacement.file) : contained(mediaRoot, original.file);
    const bytes = fs.readFileSync(input);
    if (hash(bytes) !== (replacement?.sha256 || original.sha256)) throw new Error(`Source hash mismatch: ${id}`);
    if (replacement && (!replacement.sourcePage || !replacement.license || !replacement.author)) {
      throw new Error(`Missing replacement license: ${id}`);
    }
    const meta = await sharp(bytes).metadata();
    if (meta.pages > 1) throw new Error(`Animated/multipage source: ${id}`);
    let pipeline = sharp(bytes);
    if (replacement?.maxDimension) {
      pipeline = pipeline.resize({width: replacement.maxDimension, height: replacement.maxDimension,
        fit: 'inside', withoutEnlargement: true});
    }
    const raster = await pipeline.ensureAlpha().raw().toBuffer({resolveWithObject: true});
    const rendered = await sharp(raster.data, {raw: raster.info}).webp({lossless: true, effort: 6}).toBuffer();
    const decoded = await sharp(rendered).ensureAlpha().raw().toBuffer();
    if (!decoded.equals(raster.data)) throw new Error(`Lossless conversion changed pixels: ${id}`);
    const outputHash = hash(rendered);
    const filename = `images/${id}-${outputHash.slice(0, 16)}.webp`;
    writeNew(contained(outputRoot, filename), rendered);
    records.push({id, original: {...original}, replacement: replacement || null,
      sourceSha256: hash(bytes), sourceDimensions: [meta.width, meta.height],
      output: filename, sha256: outputHash, dimensions: [raster.info.width, raster.info.height],
      operation: replacement?.maxDimension ? 'fit-inside-resize-and-lossless-webp' :
        meta.format === 'svg' ? 'svg-rasterization-and-lossless-webp' : 'lossless-webp',
      crop: 'none', decodedPixelIdentity: true, renderer: sharp.versions});
    source.assets[id] = {...original, file: filename, sha256: outputHash,
      width: raster.info.width, height: raster.info.height,
      ...(replacement ? {title: replacement.title} : {})};
  }
  const matched = new Set();
  for (const lesson of source.lessons) {
    for (const card of lesson.cards) {
      const update = config.contextUpdates?.[card.id];
      if (update) {
        if (card.context_es !== update.before) throw new Error(`Context changed: ${card.id}`);
        card.context_es = update.after;
        matched.add(card.id);
      }
      const renames = config.optionRenames?.[card.id];
      if (renames) {
        for (const [before, after] of Object.entries(renames)) {
          const option = card.options?.find(item => item.id === before);
          if (!option || card.options.some(item => item.id === after)) throw new Error(`Invalid option rename: ${card.id}`);
          option.id = after;
          if (card.answer === before) card.answer = after;
          if (card.feedbackByOption?.[before]) {
            card.feedbackByOption[after] = card.feedbackByOption[before];
            delete card.feedbackByOption[before];
          }
        }
      }
    }
  }
  if (matched.size !== Object.keys(config.contextUpdates || {}).length) throw new Error('Unknown context card');
  function copyRecordings(value) {
    if (Array.isArray(value)) return value.forEach(copyRecordings);
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if ((key === 'audio' || key === 'audioReceipt') && typeof item === 'string') {
        const bytes = fs.readFileSync(contained(mediaRoot, item));
        if (key === 'audio' && hash(bytes) !== value.audioSha256) throw new Error('Audio checksum mismatch');
        writeNew(contained(outputRoot, item), bytes);
      } else copyRecordings(item);
    }
  }
  copyRecordings(source.lessons);
  Object.assign(source, {sourceVersion: config.sourceVersion, revision: config.revision, scope: config.scope});
  const serialize = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
  writeNew(path.join(outputRoot, 'unit-preview-content.json'), serialize(source));
  writeNew(path.join(outputRoot, 'image-conversion-records.json'), serialize({
    schema: 'delivery-image-conversions/1', sourceFileSha256: hash(sourceBytes),
    configurationSha256: hash(fs.readFileSync(configPath)), records,
    semanticReview: 'pending; pixel identity and format checks are not semantic approval'
  }));
  process.stdout.write(JSON.stringify({images: records.length, replacements: Object.keys(replacements).length,
    sourceVersion: source.sourceVersion, installed: false}) + '\n');
}
if (require.main === module) {
  if (process.argv.length !== 6) throw new Error('Usage: node prepare_delivery_images.cjs SOURCE MEDIA_ROOT CONFIG OUTPUT');
  prepare(...process.argv.slice(2)).catch(error => {console.error(error); process.exitCode = 1;});
}
module.exports = {prepare};
