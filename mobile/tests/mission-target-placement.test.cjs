const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mission = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'generated', 'lesson-10-family-mission.json'),
  'utf8',
));

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
    M05: {
      'one-baby': [0.30, 0.34],
      'three-babies': [0.69, 0.34],
      'boy': [0.25, 0.69],
      'children': [0.70, 0.69],
    },
    // a1_u1_reunion_06_brother_sister.webp
    M06: {
      'brother': [0.33, 0.55],
      'sister': [0.66, 0.55],
      'father': [0.09, 0.30],
      'mother': [0.90, 0.30],
    },
    // a1_u1_reunion_07_sibling_pairs.webp
    M07: {
      'brothers': [0.23, 0.52],
      'sisters': [0.77, 0.52],
      'parents': [0.50, 0.18],
      'grandparents': [0.50, 0.70],
    },
    // a1_u1_reunion_08_parents.webp
    M08: {
      'father': [0.32, 0.45],
      'mother': [0.68, 0.45],
      'parents': [0.50, 0.82],
      'children': [0.50, 0.18],
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

test('every mission tap target still sits on the subject it names', () => {
  const checked = [];
  for (const card of mission.cards) {
    const game = card.mission_game;
    if (!game || game.kind === 'voice-gate') continue;

    const expected = VERIFIED_CENTRES[card.slide_id];
    assert.ok(expected, `${card.slide_id} has no verified target placement on record.`);

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
