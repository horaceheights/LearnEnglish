// The course's expected shape, from the versioned release-integrity manifest.
// Unit size follows content (approved 2026-09-23): tests read the pinned counts
// here instead of assuming 70 lessons or ten lessons per unit.
const fs = require('node:fs');
const path = require('node:path');

const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'release-integrity.json'), 'utf8'));
const lessonsByUnit = Object.freeze({ ...manifest.catalog.lessonsByUnit });

module.exports = Object.freeze({
  lessonCount: manifest.catalog.lessonCount,
  unitCount: manifest.catalog.unitCount,
  lessonsByUnit,
});
