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
   - Completa progression: U1-U3 are ordinary completion; U4-U7 construct all words of `He is a man.`, `A man. He is a man.`, `She is a woman.`, and `A woman. She is a woman.`. Construction plays the full English model with replay and provides only the required word occurrences. Keep words on one line by widening tiles and wrapping whole tiles into rows. Preserve the 42-card sequence.
2. 1.2 People in Action: `the`, `eating`, `drinking`, `reading`, `writing`; reuse `he` and `she` only inside fuller action sentences
3. 1.3 Two People: They and Are: `and`, `they`, `are`, `running`, `sitting`, `swimming`, `sleeping`
4. 1.4 Children and Siblings: `a family`, `baby/babies`, `child/children`, `brother/brothers`, `sister/sisters`
5. 1.5 Parents and Grandparents: `an`, `adult/adults`, `father`, `mother`, `parents`, `grandfather`, `grandmother`, `grandparents`, `grandchildren`
6. 1.6 Family Actions: `playing`, `studying`, `working`, `cooking`, `talking`
7. 1.7 What They Are Not Doing: use `not` to contrast each visible action with a true negative statement
8. 1.8 Who Is He? Who Are They?: identity questions and short answers
9. 1.9 Unit 1 Story Review: comprehensive retrieval with no new vocabulary and only newly authored scenes and combinations
10. 1.10 ¡Todos a la celebración!: complete one continuous 22-beat adventure by finding the missing people, connecting their family relationships, following all thirteen action clues, correcting false reports with `not`, answering all three `Who ...?` forms, and bringing everyone to the celebration

Core patterns:

- `The boy is running.`
- `He is eating.`
- `She is writing.`
- `The boy and the girl are running.`
- `They are running.`
- `He is not cooking.`
- `Who are they? They are the parents.`

Lessons 1.1 through 1.10 follow the approved cumulative restructuring. Lessons 1.2 through 1.7 each contain 42 cards in a `10 Learn / 10 Recognize / 8 Listen / 7 Speak / 7 Use` rhythm. Lesson 1.8 contains 50 cards, ten per section, with separate visitor-question and family-portrait answer pairs for all five identities. Lesson 1.9 expands to 54 cards so its new three-part story can retrieve the unit broadly without replaying earlier content-image pairs. Lesson 1.10 closes the unit with the continuous `¡Todos a la celebración!` adventure rather than another five-section deck. The learner finds people, connects family relationships, follows action clues, repairs false reports, answers `Who ...?` questions, and visibly brings everyone to one final celebration. The successful path retrieves all 46 vocabulary targets introduced in Lessons 1.1-1.8, including all thirteen actions and all three Unit 1 `Who` forms, while adding no assessed English. The rejected family-album and film-studio concepts, their imagery, and their tile-first workflows are not reusable starting points for this mission.

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
- Lesson 10 uses light, language-centered gamification to break the lessons 1-8 rhythm without turning the course into a reward loop. Its interactions follow the story and may include finding a person in a scene, connecting relationships, sorting, tracing, correcting a false clue, listening, and speaking. Word-part or sentence tiles are optional tools for a mission whose story genuinely calls for them; they are never the default mission identity or a reason to turn a mission into another exercise deck.
- Mission lessons declare `experience_type: mission`, a positive `content_revision`, a presentation contract, ordered chapters, and one chapter ID per card. They retain internal stage values only to select engine behavior; the learner sees one continuous mission with beat progress, not the standard five-stage journey or section picker.
- Unit 1 Lesson 1.10 has exactly 22 contiguous beats. Its successful-path language covers the exact 46-item union of vocabulary introduced in Lessons 1.1-1.8—including all thirteen actions plus `Who is he?`, `Who is she?`, and `Who are they?`—without using unintroduced English. Each beat advances the same celebration story and uses a fresh, unambiguous hero still whose exact file hash is absent from Lessons 1.1-1.9, every other mission beat, and both rejected Lesson 1.10 concepts.
- Lesson 1.10's fixed narrative map is `find-the-people` (beats 1-3), `connect-the-family` (4-9), `follow-the-actions` (10-15), `repair-the-clues` (16-18), and `welcome-everyone` (19-22). These chapters are acts in one uninterrupted adventure, not tabs, replayable lesson sections, or resets of mission state.

### Unit 1 Lesson 1.10 mission contract

The learner-facing title is `¡Todos a la celebración!`. A family celebration is about to begin, but everyone has not yet arrived. Learned English is the tool for finding each person, establishing the family connections, following what they are doing, correcting broken reports, answering the greeter, and bringing the whole family together. There is no album, film set, studio production, syllable opening, or repeated sentence-order board.

The opening plays the distinct 3.2-second acoustic mission cue, shows the three objectives `Encuentra personas`, `Sigue sus acciones`, and `Reúne a la familia`, and speaks this briefing in Spanish before enabling Start: `La celebración está por comenzar y todavía faltan invitados. Escucha cada frase, encuentra a las personas y descubre qué están haciendo. Al final responderás en voz alta para abrir la celebración. Primero practicaremos juntos.` Beat 1 begins as a guided, nonpunitive example: the learner hears `A boy.` and learns once that a pulsing point selects a person, then practices the other three visible people before the beat advances. During active play, the current mechanic remains visible in concise Spanish but is not narrated; the assessed audio is always English, finishes before input unlocks, and can be repeated with the speaker button.

The story order below stays fixed, but listening cues inside each scene are shuffled on each fresh run. Only the initial guided `A boy.` cue stays first; replay, retries, and rotation preserve the current permutation. Every cue retains its exact English audio and target binding. Correct dots give immediate sound and visual feedback, then leave a 2.2-second feedback beat before the next clue. Markers sit above the reviewed heads, with one pointer per person in a group and measured headroom where the scene edge is too close; neither faces nor neighboring controls may be covered.

Phone landscape has its own compact side-panel presentation of these same listening beats. Navigation, mission progress, simple directions, replay, and feedback occupy the panel; the complete uncropped scene and its markers receive the full safe-area height beside it. The standard full-width header and QA toolbar must not remain stacked above that panel. An options sheet retains help and QA controls. Portrait keeps its approved presentation, and rotation never starts another clue sequence or discards solved people.

For standing pairs that also have an individual dot for each member, the shared capsule sits between their chests instead of creating a third overhead control. This applies to the children/adults in beat 4, parents in beat 8, and grandparents in beat 9. Reviewed normalized chest anchors preserve the exact image fit and individual overhead dots. These capsules omit long head pointers; all group-only targets, including beat 5, retain the approved overhead treatment. Both orientations keep the complete touch bounds away from faces.

The 22 beats have these fixed responsibilities:

1. Guided person search for `A boy.`
2. Searchlight sequence for `A girl.`, `A man.`, and `A woman.`
3. Hear four complete `he/she + is` descriptions and find each matching person among equal candidates.
4. Hear the six child/adult singular and plural descriptions one at a time and find the matching person or group.
5. Find one baby, three babies, the boy, and the children group through their complete singular and plural descriptions.
6. Find the father, brother, sister, and mother from their complete English relationship sentences.
7. Find the parents, grandparents, brothers, and sisters groups from the plural relationship sentences.
8. Find the father, mother, parents, and children, using round individual targets and wider group targets.
9. Find grandfather, grandmother, grandparents, and grandchildren without overlapping valid targets.
10. Find all four visible actions: `eating`, `drinking`, `reading`, and `sitting`.
11. Find all four visible actions: `reading`, `writing`, `talking`, and `drinking`.
12. Find all four visible actions: `running`, `swimming`, `sitting`, and `talking`.
13. Find all four visible actions: `sitting`, `sleeping`, `reading`, and `working`.
14. Find all four visible actions: `playing`, `studying`, `reading`, and `talking`.
15. Find all four visible actions: `working`, `cooking`, `talking`, and `reading`.
16. Use the full contrast `He is not eating. He is drinking.` and then practice the remaining `eating`, `reading`, and `sitting` targets. The drinker, eater and reader stand with visible straight legs; only the empty-handed fourth man is seated, so each complete clue identifies one person.
17. Use the full contrast `She is not reading. She is writing.` and then practice the remaining `reading`, `talking`, and `cooking` targets.
18. Use the full contrast `They are not running. They are sitting.` and then practice the remaining `running`, `talking`, and `playing` groups.
19. A visitor looks at the learner and indicates the father while asking `Who is he?`. Cut to the closer father shot, show `He is the father.`, and assess the learner pronouncing the written sentence.
20. Ask `Who is she?` while the visitor indicates the grandmother; switch to her closer view and show `She is the grandmother.` for the learner to pronounce.
21. Ask `Who are they?` while the visitor indicates both parents; switch to their closer view and show `They are the parents.` for pronunciation.
22. Ask `Who are they?` while the visitor indicates the whole family; switch to the group view and show `They are a family.` for pronunciation to open the celebration.

Updated 2026-09-08 by explicit user request: these four voice gates focus on pronouncing a written answer, superseding unaided recall. Only the question plays before recording, including on replay and retry. After the question, display the complete English answer with `Lee la frase en voz alta.` during microphone preparation and recording. Keep the answer visible while scoring and in the same contained feedback panel afterward; do not play an answer model or add a duplicate word bank. Both orientations remain scroll-free. The two shots retain the same people, clothing, and location, and real pronunciation grading remains unchanged.

Beats 10-15 mix pronouns with family-role subjects already learned in Unit 1. In beat 15, the four cues are `The grandmother is working.`, `The father is cooking.`, `The sisters are talking.`, and `The grandfather is reading.`; beat 12 correctly identifies the seated boy as `The boy is sitting.` Both cue types remain in the mission, bound to the visible actions rather than inferred from filenames.

The successful-path coverage is exact and auditable: beats 1-2 cover `a`, `boy`, `girl`, `man`, and `woman`; beat 3 covers `he`, `she`, `is`, `they`, and `are`; beats 4-5 cover `the`, `and`, `an`, `child`, `children`, `adult`, `adults`, `baby`, and `babies`; beats 6-9 cover `brother`, `brothers`, `sister`, `sisters`, `father`, `mother`, `parents`, `grandfather`, `grandmother`, `grandparents`, and `grandchildren`; beats 10-15 cover all thirteen learned actions; beats 16-18 cover `not`; beats 19-21 cover `who` and all three question forms; and beat 22 covers `family`.

Every actionable screen makes the current goal and one required gesture apparent without trial and error. The 18 listening challenges show one complete uncropped 3:2 scene with at least four neutral pulsing candidates, play one English cue at a time, and validate a touch immediately. Single-person candidates are round; pairs and groups use a wider capsule spanning their members. Every visible candidate sits on a real person, pair, group, or action and receives exactly one cue, so the beat cannot advance while an unpracticed target remains. Correct answers advance automatically to the next cue; wrong answers preserve every completed cue, show concise feedback, and repeat the current English cue. There is no answer bank, drag requirement, `Comprobar`, Undo, or Reset. The full instruction, scene, targets, cue progress, feedback, and replay control fit the supported phone viewport without vertical lesson scrolling; short landscape screens use a compact control rail beside the large scene rather than stacking those elements. The final four cards remain inside the mission and become one four-lock voice game: the current question and guest scene stay visible, the microphone is the central mission control, and every accepted graded answer lights one celebration-entry lock before the next guest appears. These screens never reuse the standard Speak-card header or generic pronunciation panel, and each retains one unambiguous image with no duplicate selectable copy.

## Difficulty Ramp

Early A1:

- picture-to-English recognition
- two choices
- one grammar pattern at a time
- concrete nouns and visible actions

Middle A1:

- at most three choices in an ordinary text answer bank; an approved construction activity may expose every required word or word-part tile only through the dedicated responsive, accessible construction layout; image choices may use four after smaller contrasts are established
- earlier vocabulary combined into new, larger meanings and situations
- simple question prompts
- small contrasts like `he/she`, `in/on`, singular/plural

Late A1:

- sentence building from word tiles
- short listening prompts without text
- simple speaking imitation
- short answer selection for everyday questions

## Authoring Requirements

Canonical standard lesson files use these fields:

- lesson id, title, level, unit, goal
- new vocabulary
- review vocabulary
- cards with prompt, stage, correct option, choices, image assets, and optional audio
- optional Spanish hint/help text
- tags for skill type: recognition, listening, speaking, production, review

Mission lesson files additionally declare:

- `experience_type: mission` and a positive `content_revision`
- learner-facing mission label, title, briefing, completion title, and completion message
- an ordered list of chapter IDs, titles, and objectives
- `mission_chapter_id` on every card, with cards following the declared chapter order

Units 2-7 are reproducibly generated from the approved course canvas, then exported into embedded mobile Preview snapshots. Automated checks keep the canonical lesson files, standard five-stage sequence, mission metadata and chapter sequence, dependencies, translations, assets, answers, and mobile snapshots synchronized.

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
| `1.8` | Who Is He? Who Are They? | 50-card question/answer pairs in all five sections |
| `1.9` | Unit 1 Story Review | 54-card fresh-scene review ready for learner review |
| `1.10` | ¡Todos a la celebración! | 22-beat find/connect/action/correct/Who adventure ready for Preview learner review |

Every standard lesson uses the same `Learn -> Recognize -> Listen -> Speak -> Use` journey. A lesson declared as `experience_type: mission` instead uses one continuous learner-facing mission; its internal stage values remain engine/modality metadata and may interleave in story order. The checked-in Unit 1 builder preserves 1.1 while reproducibly generating 1.2 through 1.10, including the approved celebration-adventure contract above. Automated checks enforce the story sequence, intentional card counts, vocabulary boundaries, bidirectional image/text recognition, audio-only listening choices, speaking cards, multi-word completion, valid media, the fresh-scene boundary for the comprehensive review, and the distinct 22-beat, 74-target mission contract for 1.10.

The previously built family lessons supply the existing assets and cards for the new `1.4` through `1.7` sequence. `Places Around Me` leaves Unit 1 and becomes the start of Unit 2.

Standalone `1.3 Pronunciation Practice` has been removed. Pronunciation practice now lives inside each sub-lesson as one of the standard lesson sections.

## Current Build and Review Status

The canonical A1 track now contains seven units with ten lessons per unit. Every standard lesson follows `Learn -> Recognize -> Listen -> Speak -> Use`; every mission lesson replaces that visible shell with one continuous chaptered challenge while retaining internal modality metadata. Each lesson declares its prerequisite and culminates in a speaking outcome. Lessons 1-8 move forward by incorporating earlier vocabulary into richer constructions rather than inserting standalone review cards. Lesson 9 of each unit is a comprehensive no-new-language review using fresh scenarios and covering at least 70 percent of the unit's declared mastery targets; lesson 10 is a coherent, lightly gamified mission that integrates the unit's functions in one applied story or challenge.

The course menu presents the seven-unit big picture first. Selecting a unit reveals only that unit's ten lessons, with an explicit return to the all-units view. This navigation mirrors the curriculum hierarchy and keeps the 70-lesson roadmap browsable without flattening it into one long list.

The next pedagogical decision is the post-Preview mastery policy: define the observable pass thresholds for each stage, the number and timing of delayed recycling attempts, and whether a failed mission blocks progression or schedules targeted review while allowing the learner to continue.
