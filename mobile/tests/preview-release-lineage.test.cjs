const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptsRoot = path.resolve(__dirname, '../scripts');
const guardSource = fs.readFileSync(path.join(scriptsRoot, 'release-guard.ps1'), 'utf8');
const publishSource = fs.readFileSync(path.join(scriptsRoot, 'publish-preview.ps1'), 'utf8');

assert.match(
  guardSource,
  /function Assert-PreviewReleaseLineage[\s\S]*?origin\/codex\/restore-complete-a1-preview[\s\S]*?merge-base --is-ancestor \$canonicalBranch HEAD/,
  'Preview publishing must require the canonical full-course release lineage.',
);
assert.match(
  publishSource,
  /Assert-PreviewReleaseLineage[\s\S]*?Assert-CleanReleaseCommit/,
  'The Preview publisher must verify release lineage before publishing.',
);

console.log('Preview release lineage checks passed.');
