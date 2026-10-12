const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const test = require('node:test');
const ts = require('typescript');
const { prepareLessonImagePacks } = require('../scripts/prepare-lesson-image-packs.cjs');
const mobile = path.resolve(__dirname, '..');
const index = prepareLessonImagePacks(mobile);
const digest = (bytes, algorithm = 'sha256') => crypto.createHash(algorithm).update(bytes).digest('hex');

// Run the production TS resolver against actual files. This models the existing
// Expo 57 File API (including moveSync changing its receiver's URI).
function runtime(t, { assetUnavailable = false, badPack = false, writeFailure = false } = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spanglish-image-pack-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const stats = { bytesRead: 0, openHandles: 0, writes: 0 };
  const controls = { assetUnavailable, badPack, writeFailure };
  class File {
    constructor(...parts) {
      this.filename = path.join(...parts.map(part => part.filename ?? (part.startsWith('file:') ? fileURLToPath(part) : part)));
    }
    get uri() { return pathToFileURL(this.filename).href; }
    get exists() { return fs.existsSync(this.filename); }
    get size() { return this.exists ? fs.statSync(this.filename).size : 0; }
    get lastModified() { return this.exists ? fs.statSync(this.filename).mtimeMs : null; }
    get md5() { return this.exists ? digest(fs.readFileSync(this.filename), 'md5') : null; }
    write(bytes) {
      stats.writes++;
      if (controls.writeFailure) {
        fs.writeFileSync(this.filename, bytes.slice(0, 10));
        throw new Error('disk full');
      }
      fs.writeFileSync(this.filename, bytes);
    }
    delete() { fs.unlinkSync(this.filename); }
    moveSync(destination) {
      fs.renameSync(this.filename, destination.filename);
      this.filename = destination.filename;
    }
    open(mode) {
      assert.equal(mode, 'r', 'installed packs must be opened read-only on both platforms');
      const fd = fs.openSync(this.filename, 'r');
      stats.openHandles++;
      return {
        offset: 0,
        readBytes(length) {
          stats.bytesRead += length;
          const bytes = Buffer.alloc(length);
          const count = fs.readSync(fd, bytes, 0, length, this.offset);
          this.offset += count;
          if (controls.badPack) bytes[0] ^= 255;
          return bytes.subarray(0, count);
        },
        close() { fs.closeSync(fd); stats.openHandles--; },
      };
    }
  }
  class Directory extends File {
    create() { fs.mkdirSync(this.filename, { recursive: true }); }
  }
  const dependencies = {
    'expo-file-system': { File, Directory, FileMode: { ReadOnly: 'r' }, Paths: { cache: temporary } },
    'expo-asset': {
      Asset: { fromModule: (filename) => ({
        async downloadAsync() {
          assert.ok(filename.startsWith(path.join(mobile, 'assets/lesson-image-packs')), 'only bundled packs may be requested');
          if (controls.assetUnavailable) throw new Error('asset unavailable');
          // This is an installed update asset, so no network access is needed.
          return { localUri: pathToFileURL(filename).href };
        },
      }) },
    },
    './generated/bundled-image-packs.json': index,
    './lessonImagePacks': { LESSON_IMAGE_PACKS: Object.fromEntries(
      Object.entries(index.packs).map(([key, pack]) => [key, path.join(mobile, 'assets/lesson-image-packs', pack.file)]),
    ) },
    './config': { absoluteMediaUrl: (url) => 'https://cdn.learnspanglish.app' + url },
  };
  function load(relative) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(mobile, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, {
      exports,
      require: name => {
        assert.ok(Object.hasOwn(dependencies, name), 'Unexpected dependency: ' + name);
        return dependencies[name];
      },
    }, { filename: relative });
    return exports;
  }
  const service = load('src/packedLessonImages.ts');
  dependencies['./packedLessonImages'] = service;
  return { service, sources: load('src/lessonImageSources.ts'), temporary, stats, controls };
}

test('every approved still round-trips through its actual pack and production resolver offline', async t => {
  const { service, sources, stats } = runtime(t);
  const preparing = service.preparePackedLessonImages();
  assert.equal(service.preparePackedLessonImages(), preparing, 'concurrent startup calls share the same preparation');
  await preparing;
  assert.equal(stats.bytesRead, 0, 'startup must not unpack or read the whole course into JS memory');
  const packRequires = fs.readFileSync(path.join(mobile, 'src/lessonImagePacks.ts'), 'utf8');
  for (const pack of Object.values(index.packs)) {
    assert.ok(packRequires.includes(`require('../assets/lesson-image-packs/${pack.file}')`));
    const bytes = fs.readFileSync(path.join(mobile, 'assets/lesson-image-packs', pack.file));
    assert.equal(bytes.length, pack.size);
    assert.equal(digest(bytes), pack.sha256);
  }
  for (const [name, entry] of Object.entries(index.images)) {
    const source = sources.lessonImageSource('/lesson-assets/' + name + '?revision=1#image');
    assert.ok(source.uri.startsWith('file://'));
    assert.deepEqual([source.width, source.height], [entry.width, entry.height], 'retain original framing metadata');
    const bytes = fs.readFileSync(fileURLToPath(source.uri));
    assert.equal(digest(bytes), entry.sha256);
    assert.ok(bytes.equals(fs.readFileSync(path.join(mobile, 'assets/lesson-assets', name))), name);
    assert.ok(bytes.equals(fs.readFileSync(path.join(mobile, '../Lessons/Lesson1/images', name))), name);
  }
  const read = stats.bytesRead;
  for (const name of Object.keys(index.images)) sources.lessonImageSource('/lesson-assets/' + name);
  assert.equal(stats.bytesRead, read, 'rerenders must reuse verified files');
  assert.equal(stats.openHandles, 0);
});

test('option variants retain 3:2 dimensions and cache loss/corruption repair offline', async t => {
  const { service, sources, temporary, stats } = runtime(t);
  await service.preparePackedLessonImages();
  const variants = [...fs.readFileSync(path.join(mobile, 'src/lessonImageSources.ts'), 'utf8')
    .matchAll(/'([^']+\.webp)': '([^']+\.webp)'/g)];
  for (const [, name, variant] of variants) {
    if (!index.images[variant]) continue;
    const source = sources.lessonOptionImageSource('/lesson-assets/' + name);
    assert.equal(digest(fs.readFileSync(fileURLToPath(source.uri))), index.images[variant].sha256);
    assert.ok(Math.abs(source.width / source.height - 1.5) < 0.005);
  }
  const [name, entry] = Object.entries(index.images)[0];
  const source = service.packedLessonImageSource(name);
  const destination = fileURLToPath(source.uri);
  fs.writeFileSync(destination, Buffer.alloc(entry.size)); // Same size, different bytes.
  fs.utimesSync(destination, new Date(), new Date(Date.now() + 5000));
  const before = stats.bytesRead;
  service.packedLessonImageSource(name);
  assert.equal(stats.bytesRead - before, entry.size, 'only the required image is read');
  assert.equal(digest(fs.readFileSync(destination)), entry.sha256);
  fs.unlinkSync(destination);
  fs.writeFileSync(path.join(path.dirname(destination), entry.sha256 + '.partial'), 'interrupted');
  service.packedLessonImageSource(name);
  assert.equal(digest(fs.readFileSync(destination)), entry.sha256);
  assert.ok(!fs.readdirSync(path.dirname(destination)).some(name => name.endsWith('.partial')));
  fs.rmSync(path.join(temporary, 'spanglish-packed-images-v1'), { recursive: true });
  service.packedLessonImageSource(name);
  assert.equal(digest(fs.readFileSync(destination)), entry.sha256);
});

test('failed preparation can retry; incomplete/corrupt writes never expose an image or leak handles', async t => {
  const { service, controls, temporary, stats } = runtime(t, { assetUnavailable: true });
  const name = Object.keys(index.images)[0];
  assert.throws(() => service.packedLessonImageSource(name), /preparan/);
  await assert.rejects(service.preparePackedLessonImages(), /unavailable/);
  controls.assetUnavailable = false;
  await service.preparePackedLessonImages();
  controls.badPack = true;
  assert.throws(() => service.packedLessonImageSource(name), /verificar/);
  assert.equal(stats.openHandles, 0);
  assert.deepEqual(fs.readdirSync(path.join(temporary, 'spanglish-packed-images-v1')), []);
  controls.badPack = false;
  controls.writeFailure = true;
  assert.throws(() => service.packedLessonImageSource(name), /disk full/);
  assert.equal(stats.openHandles, 0);
  assert.deepEqual(fs.readdirSync(path.join(temporary, 'spanglish-packed-images-v1')), []);
  controls.writeFailure = false;
  assert.ok(fs.existsSync(fileURLToPath(service.packedLessonImageSource(name).uri)));
});

test('build-time packaging rejects stale bytes and malformed ranges instead of publishing them', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'spanglish-image-index-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  fs.mkdirSync(path.join(temporary, 'src/generated'), { recursive: true });
  fs.mkdirSync(path.join(temporary, 'assets/lesson-assets'), { recursive: true });
  const [name, entry] = Object.entries(index.images)[0];
  const bytes = fs.readFileSync(path.join(mobile, 'assets/lesson-assets', name));
  const fixture = { version: 1, images: { [name]: { ...entry, offset: 0 } },
    packs: { [entry.pack]: { file: index.packs[entry.pack].file, size: bytes.length, sha256: digest(bytes) } } };
  const indexFile = path.join(temporary, 'src/generated/bundled-image-packs.json');
  fs.writeFileSync(indexFile, JSON.stringify(fixture));
  fs.writeFileSync(path.join(temporary, 'assets/lesson-assets', name), bytes);
  assert.doesNotThrow(() => prepareLessonImagePacks(temporary));
  fs.writeFileSync(path.join(temporary, 'assets/lesson-assets', name), Buffer.alloc(bytes.length));
  assert.throws(() => prepareLessonImagePacks(temporary), /Stale/);
  fixture.images[name].offset = -1;
  fs.writeFileSync(indexFile, JSON.stringify(fixture));
  assert.throws(() => prepareLessonImagePacks(temporary), /Invalid packed image entry/);
});
