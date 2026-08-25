const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const diagnosticsPath = path.resolve(__dirname, '../src/diagnostics.ts');
const diagnosticsSource = fs.readFileSync(diagnosticsPath, 'utf8');

assert.match(
  diagnosticsSource,
  /sockettimeoutexception/i,
  'Remote media socket timeouts must be treated as transient connectivity failures.',
);

assert.doesNotMatch(
  diagnosticsSource,
  /Sentry\.mobileReplayIntegration\(/,
  'Session Replay must remain disabled while replay quota failures pollute error reporting.',
);

assert.doesNotMatch(
  diagnosticsSource,
  /replays(?:OnError|Session)SampleRate\s*:/,
  'Session Replay sampling must not restart without an explicit diagnostics decision.',
);

assert.match(
  diagnosticsSource,
  /appHangTimeoutInterval:\s*4/,
  'Native hang detection must ignore brief iOS keyboard cold starts.',
);

assert.doesNotMatch(
  diagnosticsSource,
  /enableAppHangTracking:\s*false/,
  'Serious native app hangs must remain observable.',
);

console.log('Diagnostics noise checks passed.');
