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

test('every effective four-card image has a current semantic-crop review', () => {
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  assert.equal(review.portrait_viewport, '4:5');
  assert.deepEqual(fourCardAssets(), Object.keys(review.assets).sort());

  for (const [asset, record] of Object.entries(review.assets)) {
    const canonical = path.join(canonicalRoot, asset);
    const mobile = path.join(mobileRoot, asset);
    const frontend = path.join(frontendRoot, asset);
    assert.equal(sha256(canonical), record.sha256, `${asset} changed and needs crop review`);
    assert.equal(sha256(mobile), record.sha256, `${asset} mobile copy is stale`);
    if (record.disposition === 'dedicated-four-card-reframe') {
      assert.equal(sha256(frontend), record.sha256, `${asset} frontend copy is stale`);
    }
  }
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
