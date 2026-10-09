const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const helperPath = path.join(__dirname, '../src/nativeAuthRedirect.ts');
const code = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadRedirect(manifest, updateScheme = 'spanglish-preview') {
  const exports = {};
  const nativeRequests = [];
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'expo') return { requireNativeModule: nativeName => {
      nativeRequests.push(nativeName);
      assert.equal(nativeName, 'ExponentConstants');
      return { manifest };
    } };
    if (name === 'expo-constants') return { default: { expoConfig: { scheme: updateScheme } } };
    throw new Error('Unexpected dependency: ' + name);
  } }, { filename: helperPath });
  return { redirect: exports.getNativeAuthRedirectUrl, nativeRequests };
}

for (const scheme of ['spanglish', 'spanglish-preview', 'spanglish-dev']) {
  for (const format of ['android JSON', 'iOS object']) {
    test(scheme + ' returns to its installed binary after a Preview OTA (' + format + ')', () => {
      const config = { scheme, android: { package: 'com.gorre.spanglish' } };
      const loaded = loadRedirect(format === 'android JSON' ? JSON.stringify(config) : config);
      assert.equal(loaded.redirect(), scheme + '://auth-callback');
      assert.deepEqual(loaded.nativeRequests, ['ExponentConstants']);
    });
  }
}

test('a configured scheme array uses the embedded app scheme', () => {
  assert.equal(loadRedirect({ scheme: ['spanglish', 'com.gorre.spanglish'] }).redirect(), 'spanglish://auth-callback');
});

test('missing, malformed and unsupported native schemes fail without an OTA fallback', () => {
  for (const manifest of [undefined, null, {}, '{bad json', 'null', { scheme: [] }, { scheme: 'https' }, { scheme: 'other-app' }]) {
    assert.throws(loadRedirect(manifest).redirect);
  }
});

test('AccountGate explicitly passes the native redirect to hosted auth inside its recovery path', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/AccountGate.tsx'), 'utf8');
  assert.match(source, /import \{ getNativeAuthRedirectUrl \} from ['"]\.\.\/nativeAuthRedirect['"]/);
  assert.match(source, /try \{ await startHostedAuth\(\{ mode, redirectUrl: getNativeAuthRedirectUrl\(\) \}\); \}/);
  assert.match(source, /catch \{ setError\(/);
  assert.match(source, /finally \{ setBusy\(false\); \}/);
  assert.doesNotMatch(source, /expoConfig|makeRedirectUri/);
});