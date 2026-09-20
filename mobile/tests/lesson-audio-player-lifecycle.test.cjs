const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/screens/LessonScreen.tsx'),
  'utf8',
);

test('ordinary lesson clips reuse the observed player through Completa', () => {
  const playback = source.split('const playAudioSource = useCallback(')[1]
    ?.split('const playAudio = useCallback(')[0];
  assert.ok(playback, 'Find the ordinary course-audio playback path.');
  assert.match(source, /const \[audioPlayer\] = useState\(\(\) => createAudioPlayer\(null/);
  assert.match(source, /const audioPlayerStatus = useAudioPlayerStatus\(audioPlayer\)/);
  assert.match(playback, /const player = audioPlayerRef\.current;\s*player\.pause\(\);\s*player\.replace\(source\);[\s\S]*?player\.play\(\)/);
  assert.doesNotMatch(playback, /createAudioPlayer\(|setAudioPlayer\(|retiredAudioPlayersRef/,
    'Each prompt and answer must not allocate another native player.');
  assert.match(source, /audioPlayerRef\.current\.release\(\)/,
    'Release the stable player when the lesson closes.');
});
