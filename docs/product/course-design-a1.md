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

The A1 track now contains seven implemented units of ten lessons each. Unit 1,
`People, Family, and Actions`, begins the sequence with `1.1 Meet the People`,
then grows those people into actions, groups, family roles, contrasts, and identity questions.

What it does well:

- starts with concrete visual meaning instead of grammar explanation
- uses high-frequency nouns: `boy`, `girl`, `man`, `woman`
- introduces a useful sentence pattern: `The boy is running.`
- repeats one structure across multiple people and actions
- keeps the task simple: match English prompt to picture

What the shared engine now adds across the track:

- prompt and answer audio with stage-specific timing
- intentional cumulative construction: earlier vocabulary returns inside richer language and situations, not as copied review cards in the next lesson
- varied distractors covered by fail-closed semantic contracts; formal human approvals remain pending
- canonical YAML authoring with generated mobile snapshots
- Speak and Use production after recognition and listening practice

## A1 Course Spine

### Unit 1: People, Family, and Actions

Goal: Understand simple subject + action sentences.

Lessons:

1. 1.1 Meet the People: `a`, `boy`, `girl`, `man`, `woman`, `he`, `she`, `is`; build `He/She is a ...` identity sentences before actions are introduced
2. 1.2 People in Action: `the`, `eating`, `drinking`, `reading`, `writing`; reuse `he` and `she` only inside fuller action sentences
3. 1.3 Two People: They and Are: `and`, `they`, `are`, `running`, `sitting`, `swimming`, `sleeping`
4. 1.4 Children and Siblings: `a family`, `baby/babies`, `child/children`, `brother/brothers`, `sister/sisters`
5. 1.5 Parents and Grandparents: `an`, `adult/adults`, `father`, `mother`, `parents`, `grandfather`, `grandmother`, `grandparents`, `grandchildren`
6. 1.6 Family Actions: `playing`, `studying`, `working`, `cooking`, `talking`
7. 1.7 What They Are Not Doing: use `not` to contrast each visible action with a true negative statement
8. 1.8 Who Is He? Who Are They?: identity questions and short answers
9. 1.9 Unit 1 Story Review: comprehensive retrieval with no new vocabulary and only newly authored scenes and combinations
10. 1.10 Family Scene Mission: complete one family-card challenge by following clues, recording captions, building family words from parts, and ordering final sentences

Core patterns:

- `The boy is running.`
- `He is eating.`
- `She is writing.`
- `The boy and the girl are running.`
- `They are running.`
- `He is not cooking.`
- `Who are they? They are the parents.`

Lessons 1.1 through 1.10 now implement the approved cumulative restructuring. Lessons 1.2 through 1.8 each contain 42 cards in a `10 Learn / 10 Recognize / 8 Listen / 7 Speak / 7 Use` rhythm. Lesson 1.9 expands to 54 cards so its new three-part story can retrieve the unit broadly without replaying earlier content-image pairs. Lesson 1.10 closes the unit with a shorter 32-step family-card mission and nine mission-only scenes; its Use stage progresses from draggable/tappable word parts to ordered sentence tiles and a final family resolution.

### Unit 2: Places, Objects, Numbers, and Colors

Goal: Introduce familiar places, transport, and objects, then count, locate, and describe them. Unit 1 supplies people and actions; Unit 2 adds place and location language so those earlier subjects and actions can now form longer sentences such as `The girl is running in the park.`

Lessons:

1. 2.1 Places Around Me
2. 2.2 Streets and Transportation
3. 2.3 Common Objects
4. 2.4 What Is It?
5. 2.5 This and That
6. 2.6 Numbers 1-10
7. 2.7 Basic Colors
8. 2.8 Count and Describe
9. 2.9 Unit 2 Review
10. 2.10 Around Me Mission

Core patterns:

- `It is a bank.`
- `What is it? It is a book.`
- `This is a pen. That is a bag.`
- `Three green books.`

### Unit 3: Me and Other People

Goal: Exchange basic personal information and describe oneself or another person with tightly supported A1 questions and answers.

Lessons:

1. 3.1 Greetings and Names
2. 3.2 I, You, and We
3. 3.3 Am, Is, and Are
4. 3.4 Age
5. 3.5 Countries and Nationalities
6. 3.6 Professions
7. 3.7 My, Your, His, and Her
8. 3.8 Have and Has
9. 3.9 Unit 3 Review
10. 3.10 Introduction Mission

Core patterns:

- `What is your name? My name is Ana.`
- `How old are you? I am twenty.`
- `Where are you from? I am from Mexico.`
- `What do you do? I am a teacher.`
- `She has a phone.`

### Unit 4: Home and Daily Life

Goal: Identify rooms and home objects, locate them, and describe a supported daily routine with days and whole-hour times.

Lessons:

1. 4.1 Rooms at Home
2. 4.2 Furniture and Home Objects
3. 4.3 Where Things Are
4. 4.4 There Is and There Are
5. 4.5 Morning Routine
6. 4.6 Everyday Verbs
7. 4.7 Simple Present
8. 4.8 Days and Time
9. 4.9 Unit 4 Review
10. 4.10 My Day Mission

Core patterns:

- `The book is on the table.`
- `There are two chairs in the kitchen.`
- `I wake up in the morning.`
- `We study every day.`
- `It is seven o'clock.`

### Unit 5: Food, Drinks, and Shopping

Goal: Identify food and drinks, state preferences and needs, understand simple prices, and complete a short supported café exchange.

Lessons:

1. 5.1 Fruits
2. 5.2 Food and Drinks
3. 5.3 Food Quantities
4. 5.4 Likes and Dislikes
5. 5.5 Wants and Needs
6. 5.6 Meals
7. 5.7 Prices
8. 5.8 Ordering Politely
9. 5.9 Unit 5 Review
10. 5.10 Café Mission

Core patterns:

- `I like apples. I do not like fish.`
- `She wants water. He needs bread.`
- `How much is it? It is five dollars.`
- `Coffee, please. Yes, thank you.`

### Unit 6: Around Town

Goal: Find familiar services, describe their location, follow simple directions, ask for help, and understand whole-hour transport schedules.

Lessons:

1. 6.1 Buildings and Services
2. 6.2 Transportation
3. 6.3 Where Is It?
4. 6.4 Location Words
5. 6.5 Simple Directions
6. 6.6 Can and Cannot
7. 6.7 Simple Requests
8. 6.8 Schedules
9. 6.9 Unit 6 Review
10. 6.10 Town Mission

Core patterns:

- `Where is the bank? It is next to the store.`
- `Go straight. Turn right.`
- `You can cross the street.`
- `Excuse me. Can you help me?`
- `The bus leaves at eight.`

### Unit 7: Everyday Needs and A1 Integration

Goal: Describe basic body, feelings, clothing, and weather needs; handle simple invitations; and use memorized help phrases in a final A1 mission.

Lessons:

1. 7.1 The Body
2. 7.2 Feelings and Needs
3. 7.3 Clothing
4. 7.4 Weather
5. 7.5 Clothes for the Weather
6. 7.6 Hobbies and Free Time
7. 7.7 Invitations and Responses
8. 7.8 Help and Important Phrases
9. 7.9 Complete A1 Review
10. 7.10 A1 Final Mission

Core patterns:

- `My eyes. My hands.`
- `How are you? I am tired.`
- `It is cold. I need a jacket.`
- `Do you want to play? Yes, thank you.`
- `I do not understand. Please repeat.`

## Lesson Design Template

Each A1 lesson should follow this shape:

1. Meaning anchor: show clear images with one word or one phrase.
2. Controlled recognition: choose the image that matches the prompt.
3. Pattern repetition: reuse the same sentence shape with swapped vocabulary.
4. Contrast: add near distractors only after the learner has seen clear examples.
5. Cumulative construction: combine useful earlier language with the lesson's new element to create a richer utterance or situation.
6. Optional help: give Spanish support only when the learner asks or repeatedly misses.

Current restructuring target:

- at least 40 total cards for each restructured standard `Learn -> Recognize -> Listen -> Speak -> Use` lesson; Lesson 1.1 establishes a 42-card pilot while later lessons retain their baseline counts until reviewed one at a time
- new vocabulary is limited by the lesson contract rather than introduced incidentally through distractors
- lessons 1-8 may reuse earlier vocabulary only as part of the current lesson's larger construction, meaning, contrast, or situation; they do not insert standalone prior-lesson review cards
- lesson 9 is the unit's comprehensive no-new-language review, while lesson 10 is a distinct applied story or challenge rather than another review

### Ten-lesson unit rhythm

- Lessons 1-8 form one forward-moving construction chain. A unit can progress from subjects to actions, then places or objects, then attributes such as colors and quantities, so familiar words do more work each time they return.
- Vocabulary and grammar may move between lessons 1-8 of the same unit when needed for that chain. Every moved item carries its prerequisite, declared teaching target, and downstream dependency with it; old lesson boundaries never outrank understandable story flow, but later-unit language does not move forward without a separate curriculum decision.
- Introduce the small supporting words needed to make the story grammatical before using them in a cumulative sentence. Articles, pronouns, forms of `be`, prepositions, and place or object nouns are teaching content, not invisible glue. Unit 1 may grow `girl` into `The girl is running.` Unit 2 then introduces `park` and `in the park` before expanding it to `The girl is running in the park.`
- Within every lesson, the slides form a linked chain rather than a collection of cards about the same topic. Each slide continues, answers, applies, contrasts, deepens, or resolves the previous slide and creates a natural reason for the following slide; this applies across section boundaries as well as within a section.
- Learn, Recognize, Listen, Speak, and Use preserve the same reviewed concept or story order. Each section changes the learner's task and may compress or deepen the arc, but it does not reshuffle its subjects, events, or logic. Every restructured lesson also varies direction, option depth, modality, and construction where those interactions fit the stage.
- Repetition in lessons 1-8 is repetition with growth: keep the useful vocabulary, but change the combination, sentence structure, communicative purpose, scene, or required response. Do not copy a prior teaching or assessment card into the next lesson merely to review it.
- Lesson 9 retrieves at least 70 percent of the unit's declared vocabulary, grammar/functions, and communicative mastery targets from lessons 1-8. It may be longer than a standard lesson when needed, uses no new language, and presents newly authored images, combinations, prompts, and setups. It may use clearly separated story stations, but it must not replay the same content-image pair from the lessons it reviews.
- Lesson 10 is the unit-closing mission: one coherent story, practical goal, or challenge in which learned language is the tool for succeeding. It is not a second review deck. Every interaction advances the mission, and the ending provides a clear sense of resolution and readiness for the next unit.
- Lesson 10 uses light, language-centered gamification to break the lessons 1-8 rhythm without turning the course into a reward loop. Depending on the unit, learners may manipulate syllable or word-part tiles to form words and then manipulate words to form useful sentences inside the mission.

## Difficulty Ramp

Early A1:

- picture-to-English recognition
- two choices
- one grammar pattern at a time
- concrete nouns and visible actions

Middle A1:

- at most three choices when answers are text tiles; image choices may use four after smaller contrasts are established
- earlier vocabulary combined into new, larger meanings and situations
- simple question prompts
- small contrasts like `he/she`, `in/on`, singular/plural

Late A1:

- sentence building from word tiles
- short listening prompts without text
- simple speaking imitation
- short answer selection for everyday questions

## Authoring Requirements

Canonical lesson files use these fields:

- lesson id, title, level, unit, goal
- new vocabulary
- review vocabulary
- cards with prompt, stage, correct option, choices, image assets, and optional audio
- optional Spanish hint/help text
- tags for skill type: recognition, listening, speaking, production, review

Units 2-7 are reproducibly generated from the approved course canvas, then exported into embedded mobile Preview snapshots. Automated checks keep the canonical lesson files, five-stage sequence, dependencies, translations, assets, answers, and mobile snapshots synchronized.

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
| `1.1` | Meet the People | 42-card pilot ready for learner review |
| `1.2` | People in Action | 42-card cumulative rebuild ready for learner review |
| `1.3` | Two People: They and Are | 42-card cumulative rebuild ready for learner review |
| `1.4` | Children and Siblings | 42-card cumulative rebuild ready for learner review |
| `1.5` | Parents and Grandparents | 42-card cumulative rebuild ready for learner review |
| `1.6` | Family Actions | 42-card cumulative rebuild ready for learner review |
| `1.7` | What They Are Not Doing | 42-card cumulative rebuild ready for learner review |
| `1.8` | Who Is He? Who Are They? | 42-card cumulative rebuild ready for learner review |
| `1.9` | Unit 1 Story Review | 54-card fresh-scene review ready for learner review |
| `1.10` | Family Scene Mission | 32-card applied family-card mission ready for learner review |

Every lesson uses the same `Learn -> Recognize -> Listen -> Speak -> Use` journey. The checked-in Unit 1 builder preserves 1.1 while reproducibly generating 1.2 through 1.10. Automated checks enforce the story sequence, intentional card counts, vocabulary boundaries, bidirectional image/text recognition, audio-only listening choices, speaking cards, multi-word completion, valid media, the fresh-scene boundary for the comprehensive review, and the distinct ordered mission contract for 1.10.

The previously built family lessons supply the existing assets and cards for the new `1.4` through `1.7` sequence. `Places Around Me` leaves Unit 1 and becomes the start of Unit 2.

Standalone `1.3 Pronunciation Practice` has been removed. Pronunciation practice now lives inside each sub-lesson as one of the standard lesson sections.

## Current Build and Review Status

The canonical A1 track now contains seven units with ten lessons per unit. Every lesson follows `Learn -> Recognize -> Listen -> Speak -> Use`, declares its prerequisite, and culminates in a speaking outcome. Lessons 1-8 move forward by incorporating earlier vocabulary into richer constructions rather than inserting standalone review cards. Lesson 9 of each unit is a comprehensive no-new-language review using fresh scenarios and covering at least 70 percent of the unit's declared mastery targets; lesson 10 is a coherent, lightly gamified mission that integrates the unit's functions in one applied story or challenge.

The course menu presents the seven-unit big picture first. Selecting a unit reveals only that unit's ten lessons, with an explicit return to the all-units view. This navigation mirrors the curriculum hierarchy and keeps the 70-lesson roadmap browsable without flattening it into one long list.

The next pedagogical decision is the post-Preview mastery policy: define the observable pass thresholds for each stage, the number and timing of delayed recycling attempts, and whether a failed mission blocks progression or schedules targeted review while allowing the learner to continue.
