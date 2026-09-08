const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mission = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'generated', 'lesson-10-family-mission.json'),
  'utf8',
));
const canonicalImageRoot = path.resolve(__dirname, '..', '..', 'Lessons', 'Lesson1', 'images');

const VERIFIED_IMAGE_SHA256 = {
  M01: ['a1_u1_reunion_01_people_path.webp', '4c2dbee291020ac81183a143f87bbeaef4cd5942168fd0b1e02882cbd875440d'],
  M02: ['a1_u1_reunion_02_four_people_search.webp', '8f2fbd5f6d04710c79198806a091153ecb623af997fe5b993fd4260b2e5c988c'],
  M03: ['a1_u1_reunion_03_pronoun_arrival.webp', '2ba7e77c318737c0accdf0ecdc5e4752e5e27a4c39be618c6e0a2b81d9d1caae'],
  M04: ['a1_u1_reunion_04_age_groups.webp', 'ac64c4c7a06cab195262d3bb6c3b287ac87a07fe8f98d6181b179d6bedfba470'],
  M05: ['a1_u1_reunion_05_babies.webp', '7359e52c1cdaa7a269b33a687c3efb392be7ed84460e48d84a05aa56e4b28c57'],
  M06: ['a1_u1_reunion_06_brother_sister.webp', '931c4ee5c9e8df39cd96c256e76ba7de8e75d4c9dc750c637b640a44e8c97aa4'],
  M07: ['a1_u1_reunion_07_sibling_pairs.webp', 'a14ace84e538ee28a8f53f2c50efe7feb1c077c2e8e004f8b6e1ec1995095361'],
  M08: ['a1_u1_reunion_08_parents.webp', 'c14e389eae679dd4e457a5e69ba6c1f3ec4d91df03dcc0ca7bd9aae4fcb1fda9'],
  M09: ['a1_u1_reunion_09_generations.webp', 'bff0af324aaf917dddb67d09dd23cd1810166c09a112183a5498367d339dc279'],
  M10: ['a1_u1_reunion_10_eat_drink.webp', '6f8290f57437167b406e0cf88a175ee356656b051dd105bf49ddcb2f8c93b59d'],
  M11: ['a1_u1_reunion_11_read_write.webp', '59e4dc7b07a765b78b129954688b262b2e536c43098be59a3241043256f82b61'],
  M12: ['a1_u1_reunion_12_run_swim.webp', '75654b650d43a6cfbb191fa301fce9321d9db34badb0470901e610802aa9d0a1'],
  M13: ['a1_u1_reunion_13_sit_sleep.webp', 'efef7094991a79e1eb56683e018a9cfd8eefec1926b08bcf1eac912098f0f331'],
  M14: ['a1_u1_reunion_14_play_study.webp', '50c0c3c6b769b4d80310915c4102f6c9007a01d4768312179a43f8dc785b990f'],
  M15: ['a1_u1_reunion_15_work_cook_talk.webp', '34e35c1738a33cf2fa1bfd4dc79fb048ecbfe1893835c38c1206dfead70d47b2'],
  M16: ['a1_u1_reunion_16_not_eating.webp', 'c05aa7bf34c88d40605a3dbcedbf405a7124b60547d3a965c14b767706d36df0'],
  M17: ['a1_u1_reunion_17_not_reading.webp', 'fd26ff80779249181a82251748cb89fc6024bfbf93bcbd0d3ed0f867bb710514'],
  M18: ['a1_u1_reunion_18_not_running.webp', '14255acdb5e0139909fff8b41aaec47436b7f5643a3c0b415d17505301446612'],
};

// Every centre below was read off the shipped artwork by eye on 2026-09-07 and
// matched to the person or group the cue names. A mission dot is drawn at the
// centre of its rect, so a centre that drifts onto a neighbour marks the wrong
// person correct and teaches the opposite of the lesson. Regenerating the hero
// images means re-checking these against the new pixels, not nudging them until
// this file passes.
const VERIFIED_CENTRES = {
    // a1_u1_reunion_01_people_path.webp
    M01: {
      'boy': [0.16, 0.66],
      'girl': [0.82, 0.63],
      'man': [0.38, 0.40],
      'woman': [0.64, 0.40],
    },
    // a1_u1_reunion_02_four_people_search.webp
    M02: {
      'boy': [0.14, 0.66],
      'girl': [0.84, 0.66],
      'man': [0.38, 0.40],
      'woman': [0.64, 0.40],
    },
    // a1_u1_reunion_03_pronoun_arrival.webp
    M03: {
      'boy': [0.21, 0.56],
      'man': [0.37, 0.52],
      'girl': [0.66, 0.57],
      'woman': [0.79, 0.53],
    },
    // a1_u1_reunion_04_age_groups.webp
    M04: {
      'boy': [0.19, 0.50],
      'girl': [0.31, 0.52],
      'man': [0.67, 0.46],
      'woman': [0.80, 0.48],
      'children': [0.25, 0.88],
      'adults': [0.73, 0.88],
    },
    // a1_u1_reunion_05_babies.webp
    // Rechecked 2026-09-08: babies above canopies, children below upper bodies.
    M05: {
      'one-baby': [0.31, 0.13],
      'three-babies': [0.69, 0.13],
      'boy': [0.25, 0.85],
      'children': [0.73, 0.85],
    },
    // a1_u1_reunion_06_brother_sister.webp
    M06: {
      'father': [0.235, 0.43],
      'brother': [0.415, 0.45],
      'sister': [0.615, 0.45],
      'mother': [0.795, 0.43],
    },
    // a1_u1_reunion_07_sibling_pairs.webp
    M07: {
      'parents': [0.275, 0.255],
      'grandparents': [0.685, 0.25],
      'brothers': [0.385, 0.68],
      'sisters': [0.63, 0.68],
    },
    // a1_u1_reunion_08_parents.webp
    M08: {
      'father': [0.25, 0.35],
      'mother': [0.36, 0.51],
      'parents': [0.305, 0.66],
      'children': [0.72, 0.55],
    },
    // a1_u1_reunion_09_generations.webp
    M09: {
      'grandfather': [0.14, 0.48],
      'grandmother': [0.29, 0.50],
      'grandparents': [0.21, 0.88],
      'grandchildren': [0.75, 0.55],
    },
    // a1_u1_reunion_10_eat_drink.webp
    M10: {
      'eating': [0.24, 0.35],
      'drinking': [0.76, 0.35],
      'reading': [0.28, 0.72],
      'sitting': [0.72, 0.72],
    },
    // a1_u1_reunion_11_read_write.webp
    M11: {
      'reading': [0.13, 0.51],
      'writing': [0.36, 0.51],
      'talking': [0.65, 0.49],
      'drinking': [0.87, 0.47],
    },
    // a1_u1_reunion_12_run_swim.webp
    M12: {
      'running': [0.16, 0.48],
      'swimming': [0.45, 0.61],
      'sitting': [0.70, 0.52],
      'talking': [0.88, 0.36],
    },
    // a1_u1_reunion_13_sit_sleep.webp
    M13: {
      'sitting': [0.17, 0.54],
      'sleeping': [0.43, 0.54],
      'reading': [0.69, 0.53],
      'working': [0.90, 0.52],
    },
    // a1_u1_reunion_14_play_study.webp
    M14: {
      'playing': [0.13, 0.57],
      'studying': [0.39, 0.55],
      'reading': [0.65, 0.55],
      'talking': [0.88, 0.43],
    },
    // a1_u1_reunion_15_work_cook_talk.webp
    M15: {
      'working': [0.12, 0.52],
      'cooking': [0.35, 0.42],
      'talking': [0.63, 0.47],
      'reading': [0.87, 0.52],
    },
    // a1_u1_reunion_16_not_eating.webp
    M16: {
      'drinking': [0.17, 0.45],
      'eating': [0.41, 0.45],
      'reading': [0.64, 0.45],
      'sitting': [0.86, 0.45],
    },
    // a1_u1_reunion_17_not_reading.webp
    M17: {
      'writing': [0.16, 0.47],
      'reading': [0.39, 0.47],
      'talking': [0.62, 0.47],
      'cooking': [0.85, 0.43],
    },
    // a1_u1_reunion_18_not_running.webp
    M18: {
      'sitting': [0.15, 0.59],
      'running': [0.37, 0.49],
      'talking': [0.60, 0.47],
      'playing': [0.84, 0.55],
    },
};

const TOLERANCE = 0.04;

function centre(target) {
  return [
    target.rect.x + target.rect.width / 2,
    target.rect.y + target.rect.height / 2,
  ];
}

test('every mission tap target retains its visually reviewed subject association', () => {
  const checked = [];
  for (const card of mission.cards) {
    const game = card.mission_game;
    if (!game || game.kind === 'voice-gate') continue;

    const expected = VERIFIED_CENTRES[card.slide_id];
    assert.ok(expected, `${card.slide_id} has no verified target placement on record.`);
    const [imageName, expectedImageSha256] = VERIFIED_IMAGE_SHA256[card.slide_id] || [];
    assert.ok(imageName, `${card.slide_id} has no visually verified image bytes on record.`);
    const actualImageSha256 = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(canonicalImageRoot, imageName)))
      .digest('hex');
    assert.equal(
      actualImageSha256,
      expectedImageSha256,
      `${card.slide_id} artwork changed; visually re-check every target before updating its image hash.`,
    );

    for (const target of game.targets) {
      const want = expected[target.id];
      assert.ok(want, `${card.slide_id} target "${target.id}" has no verified centre on record.`);
      const [x, y] = centre(target);
      assert.ok(
        Math.abs(x - want[0]) <= TOLERANCE && Math.abs(y - want[1]) <= TOLERANCE,
        `${card.slide_id} target "${target.id}" moved to (${x.toFixed(2)}, ${y.toFixed(2)}); `
        + `the artwork puts it at (${want[0]}, ${want[1]}). Re-check the image before changing this.`,
      );
      checked.push(`${card.slide_id}.${target.id}`);
    }

    const recorded = Object.keys(expected).sort();
    const actual = game.targets.map((target) => target.id).sort();
    assert.deepEqual(actual, recorded, `${card.slide_id} target set changed; re-verify against the artwork.`);
  }
  assert.ok(checked.length >= 74, `Expected the full mission scene audit, checked only ${checked.length}.`);
});

// The dot for a distractor must not land on the person a cue asks for, or the
// learner is punished for tapping the right face.
test('no two mission dots crowd the same spot', () => {
  for (const card of mission.cards) {
    const game = card.mission_game;
    if (!game || game.kind === 'voice-gate') continue;
    const points = game.targets.map((target) => [target.id, centre(target)]);
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const [aId, [ax, ay]] = points[i];
        const [bId, [bx, by]] = points[j];
        const separation = Math.max(Math.abs(ax - bx), Math.abs(ay - by));
        assert.ok(
          separation >= 0.1,
          `${card.slide_id}: "${aId}" and "${bId}" are ${separation.toFixed(3)} apart; `
          + 'two dots that close cannot be told apart on a phone.',
        );
      }
    }
  }
});
