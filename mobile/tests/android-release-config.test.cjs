const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const configureApp = require('../app.config');
const { default: withBuildProperties } = require('expo-build-properties');

test('every Android variant generates the narrow Clerk compatibility rule while retaining shrinking', async (t) => {
  const previousVariant = process.env.APP_VARIANT;
  const previousArm64 = process.env.SPANGLISH_ARM64_ONLY;
  t.after(() => {
    for (const [key, value] of [['APP_VARIANT', previousVariant], ['SPANGLISH_ARM64_ONLY', previousArm64]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  for (const variant of ['production', 'preview', 'development']) {
    for (const arm64 of ['0', '1']) {
      process.env.APP_VARIANT = variant;
      process.env.SPANGLISH_ARM64_ONLY = arm64;
      const config = configureApp({ config: {
        name: 'SpanGlish', slug: 'spanglish', scheme: 'spanglish',
        android: { package: 'app.learnspanglish' },
        ios: { bundleIdentifier: 'app.learnspanglish' },
      } });
      const [, properties] = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties');
      const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spanglish-android-config-'));
      t.after(() => {
        assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
        return fs.rm(root, { recursive: true, force: true });
      });
      await fs.mkdir(path.join(root, 'app'));
      const rulesPath = path.join(root, 'app', 'proguard-rules.pro');
      const originalRules = '-keep class example.Existing { *; }\n';
      await fs.writeFile(rulesPath, originalRules);

      const nativeConfig = withBuildProperties(config, properties);
      const modRequest = { platformProjectRoot: root, platform: 'android' };
      // Run Expo's real native-file writer twice: prebuild must preserve existing
      // rules and must not accumulate suppressions on repeated configuration.
      await nativeConfig.mods.android.dangerous({ ...nativeConfig, modRequest });
      await nativeConfig.mods.android.dangerous({ ...nativeConfig, modRequest });
      const rules = await fs.readFile(rulesPath, 'utf8');
      assert.ok(rules.startsWith(originalRules));
      assert.deepEqual(rules.split('\n').filter((line) => /^-dontwarn\b/.test(line)), ['-dontwarn kotlin.MustUseReturnValues']);
      const gradleConfig = await nativeConfig.mods.android.gradleProperties({ ...nativeConfig, modRequest, modResults: [] });
      const gradleProperties = Object.fromEntries(gradleConfig.modResults.filter((entry) => entry.type === 'property').map(({ key, value }) => [key, value]));
      assert.equal(gradleProperties['android.enableMinifyInReleaseBuilds'], 'true');
      assert.equal(gradleProperties['android.enableShrinkResourcesInReleaseBuilds'], 'true');
      assert.equal(gradleProperties.reactNativeArchitectures, arm64 === '1' ? 'arm64-v8a' : undefined);
      assert.equal(gradleProperties['android.kotlinVersion'], undefined);
    }
  }
});
