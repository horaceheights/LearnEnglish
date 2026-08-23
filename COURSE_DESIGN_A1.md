# A1 Course Design

Audience: Spanish-speaking beginners learning English through visual immersion, light guidance, and repeated recognition practice.

Product direction: Start with image-first comprehension. Use Spanish for onboarding, reassurance, and optional help, but keep the lesson experience primarily in English.

## A1 Outcome

By the end of A1, learners should be able to recognize, understand, and produce simple English for familiar everyday situations:

- identify common people, objects, places, foods, colors, numbers, and actions
- understand short present-tense sentences supported by context
- answer simple questions about identity, location, preference, possession, and routine
- build short sentences with `be`, `have`, `like`, `want`, and common action verbs
- follow simple classroom/app instructions
- begin listening and pronunciation practice with high-frequency words and phrases

## Current Track Check

Unit 1, `People, Family, and Actions`, is the first of seven planned A1 units. It uses ten stepped lessons. The approved rebuild starts with `1.1 People and Core Actions`, followed by the narrower `1.2 He and She` lesson.

What it does well:

- starts with concrete visual meaning instead of grammar explanation
- uses high-frequency nouns: `boy`, `girl`, `man`, `woman`
- introduces a useful sentence pattern: `The boy is running.`
- repeats one structure across multiple people and actions
- keeps the task simple: match English prompt to picture

What to add next:

- audio for every prompt
- a small number of review cards that mix old and new vocabulary
- more distractor variety over time, not only same action with different person
- an authoring format so lessons are not hardcoded in Python
- lightweight production practice after recognition is stable

## A1 Course Spine

### Unit 1: People, Family, and Actions

Goal: Understand simple subject + action sentences.

Lessons:

1. 1.1 People and Core Actions: `boy`, `girl`, `man`, `woman`; `running`, `walking`, `sitting`, `standing`; `the`, `is`
2. 1.2 He and She: `he`, `she`; `eating`, `drinking`, `reading`, `writing`; singular noun-to-pronoun substitution
3. 1.3 Two People: They and Are: `and`, `they`, `are`; `swimming`, `sleeping`
4. 1.4 Children and Siblings: `a family`, `baby/babies`, `child/children`, `brother/brothers`, `sister/sisters`
5. 1.5 Parents and Grandparents: `an adult/adults`, `father`, `mother`, `parents`, `grandfather`, `grandmother`, `grandparents`
6. 1.6 Family Actions: `playing`, `studying`, `working`, `cooking`, `talking`
7. 1.7 Is, Are, and Not: affirmative and negative `be` for one person and groups
8. 1.8 Who Is He? Who Are They?: identity questions and short answers
9. 1.9 Unit 1 Spiral Review: mixed retrieval with no new vocabulary
10. 1.10 Family Scene Mission: identify people, describe actions, and answer a `Who` question from one scene

Core patterns:

- `The boy is running.`
- `He is eating.`
- `She is writing.`
- `The boy and the girl are running.`
- `They are running.`
- `He is not cooking.`
- `Who are they? They are the parents.`

### Unit 2: Places, Objects, Numbers, And Colors

Goal: Identify familiar surroundings and describe visible objects with simple A1 language.

Lessons:

1. 2.1 Places Around Me: `park`, `school`, `store`, `house`, `restaurant`, `hospital`, `it`
2. 2.2 Streets and Transportation: `street`, `bridge`, `bus`, `car`, `bike`
3. 2.3 Common Objects: `book`, `pen`, `phone`, `bag`, `chair`, `table`
4. 2.4 What Is It?: `what`; `What is it?`
5. 2.5 This and That: `this`, `that`, taught through visual foreground/background evidence
6. 2.6 Numbers 1-10: `one` through `ten`
7. 2.7 Basic Colors: `red`, `blue`, `green`, `yellow`, `black`, `white`
8. 2.8 Count and Describe: plural objects and number + color + noun order
9. 2.9 Unit 2 Review: mixed retrieval with no new language
10. 2.10 Around Me Mission: integrated retrieval from one coherent neighborhood scene

Core patterns:

- `It is a book.`
- `What is it?`
- `This is a bag.`
- `That is a chair.`
- `Two blue cars.`
- `Four yellow pens.`

### Unit 3: Food, Drink, Likes, And Wants

Goal: Understand simple preference and need sentences.

Lessons:

1. Food: `apple`, `bread`, `rice`, `egg`, `chicken`, `fish`
2. Drinks: `water`, `milk`, `coffee`, `tea`, `juice`
3. Likes: `I like...`, `I do not like...`
4. Wants: `I want...`, `She wants...`

Core patterns:

- `I like apples.`
- `He wants water.`
- `She is eating bread.`

### Unit 4: Home, Classroom, And Location

Goal: Understand simple places and location phrases.

Lessons:

1. Rooms: `kitchen`, `bedroom`, `bathroom`, `living room`, `classroom`
2. Classroom Objects: `desk`, `door`, `window`, `board`, `computer`
3. Location Words: `in`, `on`, `under`, `next to`
4. Where Questions

Core patterns:

- `The book is on the table.`
- `The boy is in the kitchen.`
- `Where is the phone?`

### Unit 5: Daily Life And Routines

Goal: Understand simple present-tense routine sentences.

Lessons:

1. Morning Routine: `wake up`, `brush`, `wash`, `eat`, `go`
2. School And Work: `study`, `work`, `listen`, `speak`, `write`
3. Time Anchors: `morning`, `afternoon`, `night`, `today`
4. Simple Routine Review

Core patterns:

- `I wake up in the morning.`
- `She studies English.`
- `He goes to school.`

### Unit 6: Personal Information And Simple Conversation

Goal: Handle very short personal exchanges.

Lessons:

1. Greetings: `hello`, `good morning`, `goodbye`
2. Names: `My name is...`, `What is your name?`
3. Feelings: `happy`, `sad`, `tired`, `hungry`, `thirsty`
4. Review Conversation

Core patterns:

- `My name is Ana.`
- `I am tired.`
- `How are you?`

## Lesson Design Template

Each A1 lesson should follow this shape:

1. Meaning anchor: show clear images with one word or one phrase.
2. Controlled recognition: choose the image that matches the prompt.
3. Pattern repetition: reuse the same sentence shape with swapped vocabulary.
4. Contrast: add near distractors only after the learner has seen clear examples.
5. Review: mix two or three earlier items into the lesson.
6. Optional help: give Spanish support only when the learner asks or repeatedly misses.

Recommended lesson size:

- 8-14 new cards for a five-minute lesson
- 16-24 cards for a 10-15 minute lesson
- 4-8 review cards when a lesson builds on earlier vocabulary

## Difficulty Ramp

Early A1:

- picture-to-English recognition
- two choices
- one grammar pattern at a time
- concrete nouns and visible actions

Middle A1:

- three or four choices
- mixed old and new vocabulary
- simple question prompts
- small contrasts like `he/she`, `in/on`, singular/plural

Late A1:

- sentence building from word tiles
- short listening prompts without text
- simple speaking imitation
- short answer selection for everyday questions

## Authoring Requirements

Before building many more lessons, add a lesson authoring format with these fields:

- lesson id, title, level, unit, goal
- new vocabulary
- review vocabulary
- cards with prompt, stage, correct option, choices, image assets, and optional audio
- optional Spanish hint/help text
- tags for skill type: recognition, listening, speaking, production, review

This should replace hardcoded card generation after the next one or two prototype lessons.

## Asset Guidelines

Images should be:

- clear and literal
- consistent in style within one lesson
- easy to distinguish at mobile size
- named in lowercase with hyphens or underscores consistently
- complete for each person/object/action combination used by generated cards

Avoid:

- tiny details that decide the answer
- culturally confusing scenes
- decorative or atmospheric images
- too many new visual variables in one card

## Current Unit 1 Build

The approved Unit 1 rebuild now includes all ten roadmap lessons:

| Lesson | Scope | Build status |
| --- | --- | --- |
| `1.1` | People and Core Actions | Complete |
| `1.2` | He and She | Complete |
| `1.3` | Two People: They and Are | Complete |
| `1.4` | Children and Siblings | Complete |
| `1.5` | Parents and Grandparents | Complete |
| `1.6` | Family Actions | Complete |
| `1.7` | Is, Are, and Not | Complete |
| `1.8` | Who Is He? Who Are They? | Complete |
| `1.9` | Unit 1 Spiral Review | Complete |
| `1.10` | Family Scene Mission | Complete |

Every lesson uses the same `Learn -> Recognize -> Listen -> Speak -> Use` journey. The checked-in lesson builder and automated tests enforce the sequence, intentional card counts, vocabulary boundaries, bidirectional image/text recognition, audio-only listening choices, speaking cards, interactive completion, and valid media references.

The previously built family lessons supply approved assets and cards for the new `1.4` through `1.7` sequence. `Places Around Me` leaves Unit 1 and becomes the start of Unit 2.

Standalone `1.3 Pronunciation Practice` has been removed. Pronunciation practice now lives inside each sub-lesson as one of the standard lesson sections.

## Current Unit 2 Build

Unit 2 is `Places, Objects, Numbers, and Colors`. It builds directly on Unit 1's people, actions, singular `is`, and identity frames, but it does not introduce location prepositions or `where` yet.

| Lesson | Scope | New language | Speaking outcome | Build status |
| --- | --- | --- | --- | --- |
| `2.1` | Places Around Me | park, school, store, house, restaurant, hospital, it | Identify five places and retrieve one Unit 1 action sentence | Complete |
| `2.2` | Streets and Transportation | street, bridge, bus, car, bike | Identify all five surroundings/transport items | Complete |
| `2.3` | Common Objects | book, pen, phone, bag, chair, table | Identify six familiar objects | Complete |
| `2.4` | What Is It? | what; `What is it?` | Produce six supported question-answer exchanges | Complete |
| `2.5` | This and That | this, that | Contrast four foreground/background object statements using visual depth cues | Complete |
| `2.6` | Numbers 1-10 | one through ten | Repeat six sampled number words; recycle the rest in later lessons | Complete |
| `2.7` | Basic Colors | red, blue, green, yellow, black, white | Produce six short color statements | Complete |
| `2.8` | Count and Describe | books, pens, phones, bags, cars | Produce ordered number + color + noun phrases | Complete |
| `2.9` | Unit 2 Review | no new language | Retrieve six mixed Unit 2 outcomes | Complete |
| `2.10` | Around Me Mission | no new language | Deliver six model-supported mission utterances from one coherent scene | Complete |

The dependency chain is intentional:

`Unit 1 people/actions -> place identity -> transport identity -> object identity -> What questions -> this/that -> numbers -> colors -> number + color + noun -> review -> mission`

Every lesson uses `Learn -> Recognize -> Listen -> Speak -> Use`. Early cards use two choices before four; recognition connects images and language in both directions; listening includes hidden-text image choices and, after the pattern is secure, limited audio-to-text retrieval. The Use stage permits both sentence completion and supported question/phrase choice.

Unit 2 recycling is encoded in `docs/product/unit-2-curriculum.json`. Each new-language lesson continues its words or function into active recognition, listening, speaking, or Use, then samples the dependency again in later lessons, the mixed review, and the final mission. The current lesson-pass criterion remains 80 percent. Longitudinal item mastery and adaptive spaced repetition remain engine work; curriculum recycling must not be described as a replacement for that future learner model.

Unit 2 images use clear adult-oriented photography or realistic rendering. The hospital is identified by `H` and a medical symbol without spelling the answer; the restaurant relies on visual dining cues without a word label. Numbers use realistic brushed-metal numerals with exact gold-star quantities, not plain dots or cartoon numbers. The final mission uses crops from one coherent neighborhood master scene so learners keep context while each answer remains unambiguous.

Every Unit 2 card includes its exact contextual Spanish translation for the established translation gesture. Wrong-answer hints point learners to the relevant evidence—place features, object shape, foreground/background, exact count, color, or English number-color-noun order—without introducing untaught location sentences.

## Next Curriculum Decision

Review all ten Unit 2 lessons in Expo Preview, with special attention to phone-size image clarity, exact counts, this/that depth cues, long phrase choices, audio pacing, pronunciation retries, and the final mission. Do not begin Unit 3 implementation until Unit 2 review findings are incorporated into the shared curriculum guardrails.
