const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const courseContract = require('./courseContract.cjs');
const test = require('node:test');
const crypto = require('node:crypto');
const { missionVoiceProgress, missionChallengeLabel, missionFinale } = require('../src/missionPresentation.js');
const { fitMissionHeadScene } = require('../src/missionTargetInteraction.js');
const root = path.resolve(__dirname, '../..');

test('web and mobile share exact mission presentation and target algorithms', () => {
  for (const name of ['missionPresentation', 'missionTargetInteraction']) {
    assert.equal(
      fs.readFileSync(path.join(root, 'mobile/src', name + '.js'), 'utf8').replaceAll('\r', ''),
      fs.readFileSync(path.join(root, 'frontend/lib', name + '.cjs'), 'utf8').replaceAll('\r', ''),
    );
  }
});

test('every canonical mission counts actual voice gates, including interleaved gates', () => {
  const missions = [];
  for (let unit = 1; unit <= 7; unit++) {
    const dir = path.join(root, 'backend/lessons', 'unit_' + unit);
    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.yaml'))) {
      const source = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, '');
      if (!/"experience_type":\s*"mission"/.test(source)) continue;
      const lesson = JSON.parse(source);
      if (lesson.experience_type !== 'mission') continue;
      missions.push(lesson);
      const finalCard = lesson.cards.at(-1);
      assert.deepEqual(missionFinale(lesson), {
        imageUrl: finalCard.options.find(option => option.id === finalCard.correct_option_id)?.image_url || finalCard.prompt_image_url || '',
        phrase: finalCard.prompt,
      });
      if (unit === 1) {
        assert.equal(missionFinale(lesson).imageUrl, '/lesson-assets/a1_u1_reunion_22_family_arrival.webp');
        assert.equal(missionFinale(lesson).phrase, 'They are a family.');
      } else {
        assert.doesNotMatch(missionFinale(lesson).imageUrl, /a1_u1_reunion/);
        const progress = missionVoiceProgress(lesson, lesson.cards.length - 1);
        assert.doesNotMatch(progress.heading, /CELEBRACIÓN/);
        assert.notEqual(progress.successLabel, 'ENTRADA ACTIVADA');
      }
      const gateIndexes = lesson.cards.flatMap((card, i) => card.mission_game?.kind === 'voice-gate' ? [i] : []);
      lesson.cards.forEach((card, i) => {
        const progress = missionVoiceProgress(lesson, i);
        if (card.mission_game?.kind !== 'voice-gate') assert.equal(progress, null);
        else {
          assert.equal(progress.step, gateIndexes.indexOf(i) + 1, lesson.id);
          assert.equal(progress.total, gateIndexes.length, lesson.id);
        }
      });
    }
  }
  assert.equal(missions.length, courseContract.unitCount);
  const listen = { mission_game: { kind: 'action-hunt' } };
  const voice = { mission_game: { kind: 'voice-gate', cues: [{ text: 'Where is it?' }] } };
  const lesson = { cards: [listen, voice, listen, voice], mission: { voice_heading: 'LLEGA AL PARQUE', voice_instruction: 'Confirma el camino con tu voz' } };
  assert.deepEqual(missionVoiceProgress(lesson, 3), {
    question: 'Where is it?', step: 2, total: 2,
    heading: 'LLEGA AL PARQUE', instruction: 'Confirma el camino con tu voz',
    successLabel: 'ENTRADA ACTIVADA',
  });
  assert.equal(missionVoiceProgress(null, 0), null);
  assert.equal(missionVoiceProgress(lesson, 20), null);
});

test('only an actual guided demonstration is labeled first challenge', () => {
  assert.equal(missionChallengeLabel({ kind: 'guided-search', tutorial_mode: 'guided-no-fail' }), 'PRIMER RETO');
  assert.equal(missionChallengeLabel({ kind: 'guided-search' }), 'ESCUCHA Y ENCUENTRA');
});

test('group capsules follow reviewed members rather than translated display labels', () => {
  const single = { id: 'single', label_es: 'Abuela', rect: { x: .1, y: .2, width: .2, height: .6 },
    head_anchors: [{ x: .2, y: .2 }], accepted_option_ids: ['single'] };
  const pair = { id: 'pair', label_es: 'Padres caminando', rect: { x: .5, y: .2, width: .4, height: .6 },
    head_anchors: [{ x: .6, y: .2 }, { x: .8, y: .2 }], accepted_option_ids: ['pair'] };
  for (const [width, height] of [[328, 410], [650, 190], [960, 430]]) {
    const frame = fitMissionHeadScene(width, height, [single, pair]);
    assert.ok(frame);
    assert.equal(frame.markers[0].collective, false);
    assert.equal(frame.markers[1].collective, true);
    assert.equal(frame.markers[1].heads.length, 2);
    assert.ok(frame.markers[1].width > frame.markers[0].width);
  }
});

test('remaining-unit target endpoints are pinned to visually inspected image bytes', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/qa/units-2-7-mission-target-reviews.json'), 'utf8'));
  for (const review of registry.reviews) {
    const unit = review.lesson_id.match(/^lesson-([2-7])-/)[1];
    const lesson = JSON.parse(fs.readFileSync(path.join(root, `backend/lessons/unit_${unit}`, review.lesson_id + '.yaml'), 'utf8'));
    const card = lesson.cards.find(card => card.slide_id === review.slide_id);
    assert.equal(path.basename(card.prompt_image_url), review.filename);
    for (const imageDir of ['Lessons/Lesson1/images', 'frontend/public/lesson-assets', 'mobile/assets/lesson-assets']) {
      const bytes = fs.readFileSync(path.join(root, imageDir, review.filename));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), review.sha256, review.filename);
    }
    for (const [id, anchors] of Object.entries(review.targets)) {
      const target = card.mission_game.targets.find(target => target.id === id);
      assert.deepEqual(target.head_anchors, anchors, id);
      assert.equal(card.mission_game.cues.filter(cue => cue.target_id === id).length, 1);
    }
    for (const [width, height] of [[328, 410], [650, 190], [960, 430]]) {
      const frame = fitMissionHeadScene(width, height, card.mission_game.targets);
      assert.ok(frame && frame.height <= height);
      for (const [id, anchors] of Object.entries(review.targets)) {
        const marker = frame.markers.find(marker => marker.id === id);
        assert.equal(marker.collective, anchors.length > 1);
        assert.equal(marker.heads.length, anchors.length);
        assert.ok(marker.x >= 0 && marker.y >= 0 && marker.x + marker.width <= width && marker.y + marker.height <= height);
      }
    }
  }
});

test('meal recap targets keep full 48dp touch and pulse bounds clear of faces on phones', () => {
  const lesson = JSON.parse(fs.readFileSync(path.join(root,
    'backend/lessons/unit_5/lesson-5-10-cafe-mission.yaml'), 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(root,
    'docs/qa/units-2-7-mission-target-reviews.json'), 'utf8'));
  const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const id of ['M12', 'M12L', 'M12D']) {
    const card = lesson.cards.find(card => card.slide_id === id);
    if (id === 'M12') {
      assert.equal(card.mission_game.cues[0].text, 'I eat two eggs for breakfast.');
      assert.equal(card.mission_game.cues[2].text, 'I eat an egg for breakfast.');
      assert.equal(card.mission_game.targets[0].label_es, 'Como dos huevos en el desayuno.');
    }
    const review = registry.reviews.find(item => item.lesson_id === lesson.id && item.slide_id === id);
    assert.ok(review, id + ' needs an exact-image crown review');
    const bytes = fs.readFileSync(path.join(root, 'Lessons/Lesson1/images', review.filename));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), review.sha256);
    assert.equal(card.mission_game.targets.length, 4);
    for (const [width, height] of [[284, 330], [328, 410], [374, 500], [480, 190], [650, 190], [840, 230]]) {
      const frame = fitMissionHeadScene(width, height, card.mission_game.targets);
      assert.ok(frame && frame.height <= height, `${id}: ${width}x${height}`);
      assert.ok(Math.abs(frame.imageWidth / frame.imageHeight - 1.5) < 0.0001);
      const faces = frame.markers.flatMap(marker => marker.heads).map(head => ({
        x: head.x - frame.imageWidth * .04, y: head.y,
        width: frame.imageWidth * .08, height: frame.imageHeight * .16,
      }));
      for (const marker of frame.markers) {
        assert.equal(marker.collective, false);
        assert.ok(marker.width >= 48 && marker.height >= 48);
        assert.ok(marker.x >= 0 && marker.y >= 0
          && marker.x + marker.width <= width && marker.y + marker.height <= height);
        assert.ok(38 * 1.12 <= marker.width && 38 * 1.12 <= marker.height,
          'the maximum individual pulse stays inside its touch target');
        assert.equal(marker.heads.length, 1);
        const crown = review.targets[marker.id][0];
        assert.ok(Math.abs(marker.heads[0].x - (frame.imageX + crown.x * frame.imageWidth)) < .001);
        assert.ok(Math.abs(marker.heads[0].y - (frame.imageY + crown.y * frame.imageHeight)) < .001);
        for (const face of faces) assert.ok(!overlap(marker, face), `${id}: marker covers a face`);
        for (const other of frame.markers) if (marker.id !== other.id)
          assert.ok(!overlap(marker, other), `${id}: touch targets overlap`);
      }
    }
  }
});
