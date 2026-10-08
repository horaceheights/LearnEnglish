const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lessonScreenPath = path.resolve(__dirname, '../src/screens/LessonScreen.tsx');
const webPlayerPath = path.resolve(__dirname, '../../frontend/components/LessonPlayer.js');
const lessonScreenSource = fs.readFileSync(lessonScreenPath, 'utf8');
const webPlayerSource = fs.readFileSync(webPlayerPath, 'utf8');

const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lessonVocabulary.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(api);
const words = (text, vocabulary) => api.vocabularyParts(text, vocabulary).filter(part => part.highlighted).map(part => part.text);
assert.deepEqual(words('There is a computer. It is blue. There are two chairs.', ['there is', 'there are']), ['There', 'is', 'There', 'are']);
assert.deepEqual(words('The man is in the kitchen.', ['he', 'in']), ['in']);
assert.deepEqual(words('There is. There is!', ['there is']), ['There', 'is', 'There', 'is']);
assert.equal(api.vocabularyParts('They’re here.\nThere are two.', ["they're", 'there are']).map(part => part.text).join(''), 'They’re here.\nThere are two.');
const construction = api.constructionVocabulary([{text:'There'}, {slot:0}, {text:'two'}, {text:'chairs.'}], {correct_option_ids:['are'], options:[{id:'are',label:'are'}]}, ['there are']);
assert.deepEqual([...construction.optionIds], ['are']);
assert.deepEqual([...construction.scaffoldIndexes], [0]);
assert.match(lessonScreenSource, /currentCard\?\.stage === 'Learn'[\s\S]*vocabularyParts/, 'Only introduction animation is Learn-only.');
assert.match(lessonScreenSource, /highlighted && currentCard.stage !== 'Learn'/, 'Static yellow emphasis continues after Learn.');
assert.match(webPlayerSource, /vocabularyParts\(displayText, activeLesson.vocabulary/, 'Both clients use full authored phrase matching.');
assert.match(
  lessonScreenSource,
  /<Animated\.Text[\s\S]*styles\.newVocabulary/,
  'New vocabulary must render through the shared animated text treatment.',
);
assert.match(
  lessonScreenSource,
  /duration: 900/,
  'New vocabulary animation must be brief and play once.',
);
assert.match(
  lessonScreenSource,
  /hasNewVocabularyInPrompt \|\| reduceMotion/,
  'Reduced-motion learners must not receive the stretch animation.',
);
assert.match(
  lessonScreenSource,
  /lesson\.id === 'lesson-7-is-are-not' && normalizedPart === 'not'/,
  'Lesson 1.7 must retain a visible focus on not after its initial Learn cards.',
);
assert.match(
  lessonScreenSource,
  /fontSize: promptFontSize \* 1\.22/,
  'The focused not must be larger than the surrounding sentence.',
);
assert.match(
  webPlayerSource,
  /fontSize: "1\.18em"[\s\S]*?activeLesson\?\.id === "lesson-7-is-are-not" && normalizedPart === "not"/,
  'Web lesson prompts must retain the same larger not focus as native Preview.',
);

console.log('New-vocabulary emphasis checks passed.');

const alternatives = api.constructionVocabulary([{text:'There'}, {slot:0}, {text:'two chairs.'}], {
  correct_option_ids:['are'], options:[{id:'are',label:'are'}, {id:'is',label:'is'}, {id:'have',label:'have'}],
}, ['there is', 'there are']);
assert.deepEqual([...alternatives.optionIds].sort(), ['are','is'], 'Both target alternatives must be yellow, so emphasis never reveals the right answer.');

assert.deepEqual(words('At the café.', ['café']), ['café']);
