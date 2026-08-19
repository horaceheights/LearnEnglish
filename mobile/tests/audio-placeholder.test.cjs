const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '../src/config.ts');
const configSource = fs.readFileSync(configPath, 'utf8');

assert.match(
  configSource,
  /export function sanitizeCourseAudioText/,
  'Course audio must pass through the shared placeholder sanitizer.',
);

assert.match(
  configSource,
  /replace\(\/\\s\*_\{2,\}\\s\*\[\.,!\?\]\?\/g, ' \.\.\. '\)/,
  'Visual underscore blanks must become silent ellipsis pauses.',
);

assert.match(
  configSource,
  /text: spokenText/,
  'Raw lesson prompt text must never be sent directly to the course-audio endpoint.',
);

console.log('Course audio placeholder checks passed.');
