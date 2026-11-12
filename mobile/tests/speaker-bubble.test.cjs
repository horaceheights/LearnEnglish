// The speaker bubble (user decision, 2026-11-12): a bubble marks who is talking in a lesson photo
// that shows two or more people. These checks pin the shared rules, the crop geometry, the reviewed
// registry and both clients.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.join(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const registry = JSON.parse(read('mobile/src/photoSpeakers.json'));
const mod = { exports: {} };
new Function('exports', 'module', 'require', ts.transpileModule(read('mobile/src/speakerBubble.ts'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText)(mod.exports, mod, request => {
  assert.equal(request, './photoSpeakers.json');
  return registry;
});
const { bubbleLayout, cardHasCastLine, lineSpeaker, optionSpeaker, speakerAnchor, CAST_SPEAKERS } = mod.exports;

const courses = JSON.parse(read('mobile/src/generated/all-courses.json'));
// Lessons whose photos have been reviewed for the bubble. A rebuilt lesson joins this list when its
// photos are registered (docs/product/new-content-engine.md); A1 photos follow in a later sweep.
const REGISTERED_LESSONS = [1, 2, 3, 4, 5, 6].map(n => `a1plus-unit-1-lesson-1-${n}`);
const lessons = courses.filter(lesson => REGISTERED_LESSONS.includes(lesson.id));
const cardImages = card => [card.prompt_image_url, ...(card.options || []).map(option => option.image_url),
  ...['audio_turns', 'answer_audio_turns', 'success_audio_turns'].flatMap(key => (card[key] || []).map(turn => turn.image_url))]
  .filter(Boolean);
const g05 = Object.keys(registry.photos).find(url => url.includes('a1plus-unit-1-g05-'));

test('the bubble follows the centred cover crop and hides a crown that is cropped away', () => {
  // A 3:2 frame shows the whole photo: the tail ends just above the crown.
  const full = bubbleLayout({ x: 0.5, y: 0.3 }, 300, 200);
  assert.ok(full);
  assert.ok(Math.abs(full.left + full.tailX - 150) < 1);
  assert.ok(full.top + full.height + full.tail <= 60 && full.top + full.height + full.tail > 50);
  // A 4:5 grid cell keeps only the middle 53% of the width.
  assert.equal(bubbleLayout({ x: 0.2, y: 0.2 }, 160, 200), null);
  assert.equal(bubbleLayout({ x: 0.8, y: 0.2 }, 160, 200), null);
  const cell = bubbleLayout({ x: 0.5, y: 0.2 }, 160, 200);
  assert.ok(cell && Math.abs(cell.left + cell.tailX - 80) < 1);
  // A crown at the top edge keeps the bubble inside the frame; so does one at a side.
  for (const anchor of [{ x: 0.5, y: 0.01 }, { x: 0.01, y: 0.3 }, { x: 0.99, y: 0.3 }]) {
    const layout = bubbleLayout(anchor, 300, 200);
    assert.ok(layout.top >= 2 && layout.left >= 2 && layout.left + layout.width <= 298, JSON.stringify(anchor));
  }
  assert.equal(bubbleLayout({ x: 0.5, y: 0.5 }, 0, 0), null);
  assert.equal(bubbleLayout(null, 300, 200), null);
});

test('only a pictured cast member who is talking gets a bubble, never narration or a mission', () => {
  assert.deepEqual([...CAST_SPEAKERS], ['ana', 'luis', 'sofia', 'diego']);
  assert.ok(speakerAnchor(g05, 'luis'));
  for (const role of ['teacher', 'co-teacher', 'male-character', null, undefined]) assert.equal(speakerAnchor(g05, role), null);
  // Ana is not in Luis's photo.
  assert.equal(speakerAnchor(g05, 'ana'), null);
  const single = Object.keys(registry.photos).find(url => url.includes('a1plus-unit-1-q01-'));
  assert.equal(speakerAnchor(single, 'luis'), null, 'a one-person photo already shows who is talking');
  assert.equal(speakerAnchor('/lesson-assets/unregistered.webp', 'luis'), null);

  const card = { stage: 'Recognize', audio_speaker: null, answer_audio_speaker: 'luis' };
  assert.equal(lineSpeaker(card, null), 'luis');
  assert.equal(lineSpeaker({ ...card, audio_speaker: 'co-teacher' }, null), 'co-teacher');
  assert.equal(lineSpeaker(card, { speaker_role: 'ana' }), 'ana', 'the turn that is playing names the speaker');
  for (const mission of [{ ...card, mission_game: { kind: 'voice-gate' } }, { ...card, interaction_type: 'mission-decision' }]) {
    assert.equal(lineSpeaker(mission, null), null);
    assert.equal(cardHasCastLine(mission), false);
  }
});

test('each photo in a picture choice marks its own speaker, so a bubble never singles out the answer', () => {
  const choice = { stage: 'Listen', audio_turns: [{ speaker_role: 'ana' }, { speaker_role: 'diego' }] };
  assert.equal(cardHasCastLine(choice), true);
  assert.equal(optionSpeaker(choice, g05), 'luis');
  assert.equal(optionSpeaker({ stage: 'Recognize', audio_speaker: 'co-teacher' }, g05), null, 'narration marks no one');
  // A1+ 1.5 R9 *I have one brother.*: Diego's, Ana's and Luis's photos each mark their own speaker.
  const r9 = lessons.find(l => l.id === 'a1plus-unit-1-lesson-1-5').cards.find(c => c.slide_id === 'R9');
  const marked = r9.options.map(option => optionSpeaker(r9, option.image_url));
  assert.deepEqual([...marked].sort(), ['ana', 'diego', 'luis']);
  for (const option of r9.options) assert.ok(speakerAnchor(option.image_url, optionSpeaker(r9, option.image_url)));
});

test('A1+ 1.5 R10: the bubble shows that Luis, on the right, says This is my older brother.', () => {
  const r10 = lessons.find(l => l.id === 'a1plus-unit-1-lesson-1-5').cards.find(c => c.slide_id === 'R10');
  assert.equal(r10.prompt_image_url, g05);
  const anchor = speakerAnchor(r10.prompt_image_url, lineSpeaker(r10, null));
  assert.ok(anchor && anchor.x > 0.5, 'Luis stands on the right; his older brother on the left');
});

test('the registry is reviewed, bound to the exact runtime images and covers every registered lesson photo', () => {
  assert.equal(registry.version, 1);
  for (const [url, photo] of Object.entries(registry.photos)) {
    assert.match(url, /^\/lesson-assets\/[^/]+\.webp$/);
    const file = path.join(root, 'Lessons/Lesson1/images', url.slice('/lesson-assets/'.length));
    assert.ok(fs.existsSync(file), url);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), photo.sha256, `${url} changed: review its speakers again`);
    assert.ok(Number.isInteger(photo.people) && photo.people >= 1, url);
    assert.ok(photo.observed.length >= 20, url);
    for (const [role, anchor] of Object.entries(photo.anchors)) {
      assert.ok(CAST_SPEAKERS.includes(role), `${url} ${role}`);
      assert.ok(anchor.x > 0 && anchor.x < 1 && anchor.y > 0 && anchor.y < 1, `${url} ${role}`);
    }
    if (photo.people === 1) assert.deepEqual([photo.owner, photo.anchors], [null, {}], url);
    if (photo.owner) assert.ok(photo.anchors[photo.owner], `${url}: the owner needs an anchor`);
  }
  const used = new Set(lessons.flatMap(lesson => lesson.cards.flatMap(cardImages)));
  assert.equal(lessons.length, REGISTERED_LESSONS.length);
  for (const url of used) assert.ok(registry.photos[url], `${url} has no reviewed speakers`);
});

test('a bubble on a four-picture grid card never points outside the centred 4:5 crop', () => {
  let checked = 0;
  for (const lesson of lessons) for (const card of lesson.cards) {
    if ((card.options || []).filter(option => option.image_url).length !== 4) continue;
    for (const option of card.options) {
      const anchor = speakerAnchor(option.image_url, optionSpeaker(card, option.image_url));
      if (!anchor) continue;
      checked++;
      assert.ok(anchor.x > 0.2333 && anchor.x < 0.7667, `${lesson.id} ${card.slide_id} ${option.image_url}`);
    }
  }
  assert.ok(checked > 0);
});

test('both clients draw the bubble from the shared rules, never as an image', () => {
  const option = read('mobile/src/components/OptionMediaImage.tsx');
  assert.match(option, /<SpeakerBubble anchor=\{speakerAnchor\(imageUrl, speakerRole\)\} speaking=\{speaking\} \/>/);
  const bubble = read('mobile/src/components/SpeakerBubble.tsx');
  assert.doesNotMatch(bubble, /import \{[^}]*\bImage\b[^}]*\} from 'react-native'/, 'teaching-photo-slot counts one Image per photo');
  assert.doesNotMatch(bubble, /<Image\b/);
  assert.match(bubble, /pointerEvents="none"/);
  const screen = read('mobile/src/screens/LessonScreen.tsx');
  assert.match(screen, /const visualSpeakerRole = currentCard \? lineSpeaker\(currentCard, activeVisualTurn\) : null;/);
  const card = read('mobile/src/components/LessonCardView.tsx');
  assert.match(card, /speakerRole=\{card\.options\.length === 1 \? speakerRole : optionSpeaker\(card, option\.image_url\)\}/);
  const web = read('frontend/components/LessonPlayer.js');
  assert.match(web, /import \{ lineSpeaker, optionSpeaker \} from '\.\.\/\.\.\/mobile\/src\/speakerBubble';/);
  assert.match(web, /const visualSpeakerRole = currentCard \? lineSpeaker\(currentCard, playingVisualTurn\) : null;/);
  assert.match(web, /speakerRole=\{currentCard\.options\.length === 1 \? visualSpeakerRole : optionSpeaker\(currentCard, option\.image_url\)\}/);
  assert.equal((web.match(/<SpeakerBubble /g) || []).length, 2);
  assert.match(read('frontend/components/SentenceConstruction.js'), /<SpeakerBubble imageUrl=\{imageUrl\} speakerRole=\{speakerRole\} \/>/);
  assert.match(read('frontend/components/SpeakerBubble.js'), /from '\.\.\/\.\.\/mobile\/src\/speakerBubble'/);
});
