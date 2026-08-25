const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const mobileScreenSource = fs.readFileSync(mobileScreenPath, 'utf8');
const webPlayerSource = fs.readFileSync(webPlayerPath, 'utf8');

assert.match(
  mobileScreenSource,
  /function lessonLocationLabel\(lesson: Lesson\): string[\s\S]*?unit_id[\s\S]*?sub_lesson_id[\s\S]*?UNIT \$\{unitNumber\} \| LESSON \$\{lessonNumber\}/,
  'Mobile lesson context must come from canonical unit and sub-lesson metadata.',
);

assert.match(
  mobileScreenSource,
  /<Text numberOfLines=\{1\} style=\{styles\.lessonLocation\}>[\s\S]*?\{lessonLocation\}[\s\S]*?<Text accessibilityRole="header" style=\{\[styles\.stage/,
  'Mobile must render unit and lesson context directly above the stage label.',
);

assert.match(
  webPlayerSource,
  /function lessonLocationLabel\(lesson\)[\s\S]*?unit_id[\s\S]*?sub_lesson_id[\s\S]*?UNIT \$\{unitNumber\} \| LESSON \$\{lessonNumber\}/,
  'Web lesson context must come from canonical unit and sub-lesson metadata.',
);

assert.ok(
  (webPlayerSource.match(/\{lessonLocationLabel\(activeLesson\)\}/g) || []).length >= 2,
  'Web must show lesson context in both standard and compact lesson headers.',
);

console.log('Lesson context header checks passed.');
