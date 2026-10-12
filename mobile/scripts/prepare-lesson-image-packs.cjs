// Build-time only. Metro runs this for dev, OTA export and native builds.
// The committed index pins exact bytes. A stale index fails instead of changing media.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function prepareLessonImagePacks(mobileRoot = path.resolve(__dirname, '..')) {
  const index = JSON.parse(fs.readFileSync(path.join(mobileRoot, 'src/generated/bundled-image-packs.json'), 'utf8'));
  if (index.version !== 1) throw new Error('Unsupported lesson image pack version.');
  const output = path.join(mobileRoot, 'assets/lesson-image-packs');
  fs.mkdirSync(output, { recursive: true });
  const members = new Map(Object.keys(index.packs).map(key => [key, []]));
  for (const [name, entry] of Object.entries(index.images)) {
    if (path.basename(name) !== name || !/^[a-zA-Z0-9_-]+\.webp$/.test(name) ||
        !members.has(entry.pack) || !Number.isSafeInteger(entry.offset) || entry.offset < 0 ||
        !Number.isSafeInteger(entry.size) || entry.size <= 0 || entry.width <= 0 || entry.height <= 0) {
      throw new Error(`Invalid packed image entry: ${name}`);
    }
    members.get(entry.pack).push([name, entry]);
  }
  for (const [key, pack] of Object.entries(index.packs)) {
    if (pack.file !== `lesson-images-${key}.bin` || !/^[0-9a-f]{2}-\d+$/.test(key) ||
        !Number.isSafeInteger(pack.size) || pack.size <= 0 || pack.size > 8 * 1024 * 1024) {
      throw new Error(`Invalid lesson image pack: ${key}`);
    }
    let offset = 0;
    const chunks = members.get(key).sort((a, b) => a[1].offset - b[1].offset).map(([name, entry]) => {
      const bytes = fs.readFileSync(path.join(mobileRoot, 'assets/lesson-assets', name));
      if (entry.offset !== offset || entry.size !== bytes.length || sha256(bytes) !== entry.sha256 ||
          crypto.createHash('md5').update(bytes).digest('hex') !== entry.md5) {
        throw new Error(`Stale lesson image pack index for ${name}; run the mobile content exporter.`);
      }
      offset += bytes.length;
      return bytes;
    });
    const bytes = Buffer.concat(chunks);
    if (bytes.length !== pack.size || sha256(bytes) !== pack.sha256) {
      throw new Error(`Invalid lesson image pack checksum: ${key}`);
    }
    const destination = path.join(output, pack.file);
    if (fs.existsSync(destination) && sha256(fs.readFileSync(destination)) === pack.sha256) continue;
    const temporary = `${destination}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporary, bytes);
      fs.renameSync(temporary, destination);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return index;
}

if (require.main === module) {
  const index = prepareLessonImagePacks();
  console.log(`Packed ${Object.keys(index.images).length} unchanged images into ${Object.keys(index.packs).length} offline assets.`);
}
module.exports = { prepareLessonImagePacks };
