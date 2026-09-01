const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const generatedRoot = path.join(root, 'mobile', 'src', 'generated');
const canonicalRoot = path.join(root, 'Lessons', 'Lesson1', 'images');
const mobileRoot = path.join(root, 'mobile', 'assets', 'lesson-assets');
const frontendRoot = path.join(root, 'frontend', 'public', 'lesson-assets');
const imageSourcesPath = path.join(root, 'mobile', 'src', 'lessonImageSources.ts');
const reviewPath = path.join(root, 'docs', 'product', 'a1-four-card-media-review.json');
const allowPendingReview = process.argv.includes('--allow-pending-review');
const validDispositions = new Set(['center-crop-approved', 'dedicated-four-card-reframe']);

function filename(imageUrl) {
  return String(imageUrl || '').split(/[?#]/, 1)[0].split('/').pop();
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function optionVariants() {
  const source = fs.readFileSync(imageSourcesPath, 'utf8');
  const body = source.match(/const OPTION_MEDIA_VARIANTS:[^=]+?=\s*\{([\s\S]*?)\n\};/);
  assert.ok(body, 'OPTION_MEDIA_VARIANTS must remain readable by the audit');
  return Object.fromEntries(
    [...body[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map((match) => [match[1], match[2]]),
  );
}

function fourCardAssets() {
  const variants = optionVariants();
  const assets = new Set();
  for (const lessonName of fs.readdirSync(generatedRoot)) {
    if (!/^lesson-.*\.json$/.test(lessonName)) continue;
    const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, lessonName), 'utf8'));
    for (const card of lesson.cards || []) {
      const options = card.options || [];
      if (options.length !== 4 || !options.every((option) => option.image_url)) continue;
      for (const option of options) {
        const sourceName = filename(option.image_url);
        assets.add(variants[sourceName] || sourceName);
      }
    }
  }
  return [...assets].sort();
}

function summarize(values, limit = 12) {
  const preview = values.slice(0, limit).join(', ');
  return values.length > limit ? `${preview}, and ${values.length - limit} more` : preview;
}

function loadStructurallyValidReview() {
  assert.ok(fs.existsSync(reviewPath), 'the four-card semantic-crop review manifest is required');
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  assert.equal(review.schema_version, 1);
  assert.equal(review.portrait_viewport, '4:5');
  assert.equal(review.master_ratio, '3:2');
  assert.ok(review.assets && typeof review.assets === 'object' && !Array.isArray(review.assets));

  for (const [asset, record] of Object.entries(review.assets)) {
    assert.ok(record && typeof record === 'object' && !Array.isArray(record), `${asset} has an invalid review record`);
    assert.match(record.sha256, /^[0-9a-f]{64}$/, `${asset} has an invalid review hash`);
    assert.ok(validDispositions.has(record.disposition), `${asset} has an invalid review disposition`);
    if (asset.endsWith('_four-card.webp')) {
      assert.equal(record.disposition, 'dedicated-four-card-reframe', `${asset} must be reviewed as a dedicated reframe`);
    }
  }
  return review;
}

function currentReviewIssues(review) {
  const currentAssets = fourCardAssets();
  const reviewedAssets = Object.keys(review.assets).sort();
  const currentSet = new Set(currentAssets);
  const reviewedSet = new Set(reviewedAssets);
  const missingReviews = currentAssets.filter((asset) => !reviewedSet.has(asset));
  const staleReviews = reviewedAssets.filter((asset) => !currentSet.has(asset));
  const staleHashes = [];

  for (const asset of currentAssets) {
    const canonical = path.join(canonicalRoot, asset);
    const mobile = path.join(mobileRoot, asset);
    const frontend = path.join(frontendRoot, asset);
    assert.ok(fs.existsSync(canonical), `${asset} is missing from canonical lesson media`);
    assert.ok(fs.existsSync(mobile), `${asset} is missing from bundled mobile media`);
    assert.ok(fs.existsSync(frontend), `${asset} is missing from frontend media`);

    const currentHash = sha256(canonical);
    assert.equal(sha256(mobile), currentHash, `${asset} mobile copy differs from canonical`);
    assert.equal(sha256(frontend), currentHash, `${asset} frontend copy differs from canonical`);

    const record = review.assets[asset];
    if (record && record.sha256 !== currentHash) staleHashes.push(asset);
  }

  const issues = [];
  if (missingReviews.length) {
    issues.push(`${missingReviews.length} assets have no crop review (${summarize(missingReviews)})`);
  }
  if (staleReviews.length) {
    issues.push(`${staleReviews.length} review records are no longer used (${summarize(staleReviews)})`);
  }
  if (staleHashes.length) {
    issues.push(`${staleHashes.length} assets changed after crop review (${summarize(staleHashes)})`);
  }
  return issues;
}

test('every effective four-card image has a current semantic-crop review', (t) => {
  const review = loadStructurallyValidReview();
  const issues = currentReviewIssues(review);
  if (!issues.length) return;

  const message = `Four-card semantic-crop review is pending: ${issues.join('; ')}.`;
  if (allowPendingReview) {
    const warning = `PREVIEW ONLY — ${message} Production remains blocked until the manifest is current.`;
    console.warn(warning);
    t.diagnostic(warning);
    return;
  }

  assert.fail(message);
});

test('dedicated four-card reframes are not reused by smaller option sets', () => {
  for (const lessonName of fs.readdirSync(generatedRoot)) {
    if (!/^lesson-.*\.json$/.test(lessonName)) continue;
    const lesson = JSON.parse(fs.readFileSync(path.join(generatedRoot, lessonName), 'utf8'));
    for (const card of lesson.cards || []) {
      for (const option of card.options || []) {
        if (filename(option.image_url).endsWith('_four-card.webp')) {
          assert.equal(card.options.length, 4, `${lesson.id} ${card.slide_id} leaks a four-card reframe`);
        }
      }
    }
  }
});
