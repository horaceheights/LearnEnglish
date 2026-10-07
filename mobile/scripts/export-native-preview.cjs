const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function assertNativeExport(outputDirectory) {
  const metadata = JSON.parse(fs.readFileSync(path.join(outputDirectory, 'metadata.json'), 'utf8'));
  const platforms = Object.keys(metadata.fileMetadata || {}).sort();
  if (platforms.join(',') !== 'android,ios') {
    throw new Error('Preview export must contain exactly Android and iOS.');
  }
  for (const platform of platforms) {
    const files = metadata.fileMetadata[platform];
    if (!files.bundle || !Array.isArray(files.assets)) {
      throw new Error(`Incomplete ${platform} export metadata.`);
    }
    // Expo counts the launch bundle as an asset in each platform's update.
    const assetCount = files.assets.length + 1;
    if (assetCount > 1000) {
      throw new Error(`${platform} export contains ${assetCount} assets including its launch bundle; Expo permits at most 1000 per update. Remove unused bundle dependencies before publishing.`);
    }
    for (const relativePath of [files.bundle, ...files.assets.map(asset => asset.path)]) {
      if (typeof relativePath !== 'string' || !relativePath) throw new Error('Missing export file path.');
      const absolutePath = path.resolve(outputDirectory, relativePath.replace(/\\/g, '/'));
      const relative = path.relative(path.resolve(outputDirectory), absolutePath);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(absolutePath).isFile()) {
        throw new Error(`Missing or invalid ${platform} export file.`);
      }
    }
  }
}

function exportNativePreview({
  outputDirectory = path.resolve(__dirname, '../dist'),
  environment = process.env,
  run = spawnSync,
} = {}) {
  if (environment.APP_VARIANT !== 'preview' || !/^[0-9a-f]{40}$/.test(environment.GITHUB_SHA || '') ||
      environment.EXPO_PUBLIC_RELEASE_COMMIT !== environment.GITHUB_SHA) {
    throw new Error('Native Preview export requires the Preview variant and exact GitHub commit.');
  }
  const result = run(process.execPath, [
    require.resolve('expo/bin/cli'), 'export',
    '--platform', 'android', '--platform', 'ios',
    '--output-dir', outputDirectory, '--source-maps', '--dump-assetmap', '--clear',
  ], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...environment, EXPO_NO_DOTENV: '1', CI: 'true' },
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) throw new Error('Native Preview export failed.', { cause: result.error });
  assertNativeExport(outputDirectory);
}

if (require.main === module) {
  try {
    exportNativePreview();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { assertNativeExport, exportNativePreview };
