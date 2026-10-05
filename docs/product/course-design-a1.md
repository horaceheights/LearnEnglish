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
4. 1.4 Children and Babies: `family`, `baby/babies`, `child/children`; reuse `sleeping`, `sitting` and `running` in `The baby is sleeping.`, `The babies are sitting.` and `The children are running.`
5. 1.5 Brothers, Sisters, and Adults: `brother/brothers`, `sister/sisters`, `an`, `adult/adults`; `He is a brother.`, `They are sisters.`, `He is an adult.`, `The adults are sitting.`
6. 1.6 Parents and Grandparents: `father`, `mother`, `parents`, `grandfather`, `grandmother`, `grandparents`, `grandchildren`; closes with `The grandparents and the grandchildren`
7. 1.7 Family Actions: `playing`, `studying`, `working`, `cooking`, `talking`
   - Keep single-word action practice and full subject/action practice in separate answer banks. Sentence alternatives have comparable structure and reading load, with varied learned subjects and actions; never place a lone action word beside a complete sentence. See the choice-coherence guardrail.
8. 1.8 What They Are Not Doing: use `not` to contrast each visible action with a true negative statement
9. 1.9 Who Is He? Who Are They?: identity questions and short answers (42 cards since 2026-09-23)
10. 1.10 Unit 1 Story Review: comprehensive retrieval with no new vocabulary and only newly authored scenes and combinations
11. 1.11 ¡Todos a la celebración!: complete one continuous 22-beat adventure by finding the missing people, connecting their family relationships, following all thirteen action clues, correcting false reports with `not`, answering all three `Who ...?` forms, and bringing everyone to the celebration

Core patterns:

- `The boy is running.`
- `He is eating.`
- `She is writing.`
- `The boy and the girl are running.`
- `They are running.`
- `He is not cooking.`
- `Who are they? They are the parents.`

**2026-09-23 rebuild (practice and pacing standards).** The old 1.4 and 1.5 introduced 9 and 10 new items and under-practised `sister`, `child` and `grandchildren`, so the family words now span three engine-authored lessons (briefs in `docs/product/content-briefs/unit-1/`), each with 5–7 new items, 42 cards, at least five practices per word across four sections, and guided completion before whole-sentence construction. Who Is He? keeps all five question/answer pairs in Learn and Recognize and was trimmed to 42 cards. Lesson numbers after 1.3 moved up by one; lesson IDs, and so learner progress, did not change. Later units must reuse `babies`, `child`, `adult(s)`, `grandmother` and `grandchildren` (for example "The grandmother is in the kitchen." in Unit 4), because the Unit 1 review cannot show them with its existing photos.

The paragraph below describes the unit before that rebuild; its lesson numbers after 1.3 are one lower than today.

Lessons 1.1 through 1.10 follow the approved cumulative restructuring. Lessons 1.2 through 1.7 contain 42 cards in a `10 Learn / 10 Recognize / 8 Listen / 7 Speak / 7 Use` rhythm, except Lesson 1.5, which has 43 cards and eight Use slides. Its three guided completions lead into five full constructions; the closing grandfather, grandmother, and grandparents sentences each have a separate slide, in that order. Lesson 1.8 contains 50 cards, ten per section, with separate visitor-question and family-portrait answer pairs for all five identities. Lesson 1.9 expands to 54 cards so its new three-part story can retrieve the unit broadly without replaying earlier content-image pairs. Lesson 1.10 closes the unit with the continuous `¡Todos a la celebración!` adventure rather than another five-section deck. The learner finds people, connects family relationships, follows action clues, repairs false reports, answers `Who ...?` questions, and visibly brings everyone to one final celebration. The successful path retrieves all 46 vocabulary targets introduced in Lessons 1.1-1.8, including all thirteen actions and all three Unit 1 `Who` forms, while adding no assessed English. The rejected family-album and film-studio concepts, their imagery, and their tile-first workflows are not reusable starting points for this mission.

### Unit 2: Places, Objects, Numbers, and Colors

Goal: Introduce familiar places, transport, and objects, then count, locate, and describe them. Unit 1 supplies people and actions; Unit 2 adds place and location language so those earlier subjects and actions can now form longer sentences such as `The girl is running in the park.`

Lessons:

1. 2.1 Places Around Me
2. 2.2 Streets and Transportation
3. 2.3 Common Objects
4. 2.4 What Is It?
5. 2.5 This and That
6. 2.6 Numbers 1-5: `one`–`five`; `It is two.` names a number card; `One book.`
7. 2.7 Numbers 6-10: `six`–`ten`; `It is six.`
8. 2.8 Basic Colors
9. 2.9 Count and Describe
10. 2.10 Unit 2 Review
11. 2.11 Around Me Mission

Core patterns:

- `It is a bank.`
- `What is it? It is a book.`
- `This is a pen. That is a bag.`
- `Three green books.`

**2026-09-23 rebuild (practice and pacing standards).** Numbers 1-10 introduced ten words with two or three practices each and used colors before 2.8 taught them, so it became two engine-authored lessons (briefs in `docs/product/content-briefs/unit-2/`) with five numbers each, shown on the numeral cards. Every other foundation lesson grew from 34-36 to 40 cards with six extra practice cards on its own words (two Recognize, two Listen, one Speak, one whole-sentence construction), without changing any reviewed card. Lesson IDs are unchanged; the new lesson is `lesson-2-numbers-6-10`. `These/those` and `Which one?` are the next Unit 2 additions and need new photographs. `cars` should return in Unit 6 transport, alongside the Unit 1 family words carried forward.

**2026-09-24 reuse pass (user direction).** Numbers and colors practise what the learner already knows instead of untaught objects. 2.6 teaches `number` and one to five; 2.7 teaches six to ten. Both introduce each number on its numeral card, ask `What number is it?` / `It is number eight.` about the card, and count nouns from 2.2-2.3 (`Two cars.`, `Seven chairs.`), with wrong options that change only the number (`Three books.` against `Two books.`). 2.8 shows each color on a known object (red bus, blue bike, green chair, yellow backpack, black car, white table) and brings the counting photos back with `They are blue.`, so 2.9 can join number, color and noun. The review asks `It is number seven/eight.` over its own fresh photos (a parking space, a bus), and the mission's number clues say `It is number seven.` Learn cards hold only new vocabulary. Later the same day (user direction) colors followed the numbers pattern: 2.8's Learn cards show `Colors` and the six colors on the restored plain discs only, and every later card asks `What color is it?` / `What color are they?` about known objects and the counting photos, or names the thing with its color (`It is a blue bike.`). A new **2.10 These and Those** teaches `these`, `those` and `Which one?` on first-person table pairs (books, phones) and the red/blue backpacks, contrasting them with 2.5's this/that photos; Unit 2 now has 12 lessons (review 2.11, mission 2.12). The review asks `What color are they?`, hears `These are bags.`, `Those are phones.` and `Which one? The red one.`; the mission's near/far beat became `These are books. Those are books. These are phones. That is a phone.` on a plural scene, its objects beat says `This is a …`, its chair beat asks `Which one? The red one.`, and its gates ask `What color is it?` and `What number is it?`.

The paragraph below predates that rebuild: its 2.9 is today's 2.10.

Lesson 2.9's reviewed restructuring contains 48 cards (`8 Learn / 8 Recognize / 18 Listen / 6 Speak / 8 Use`). It revisits surroundings, object identity, same-object near/far contrasts, quantities and colors, with a closing listening number check. Its successful-path inventory covers all 43 vocabulary entries declared by 2.1–2.8. Sixteen fresh review stills replace only repeated review bindings, preserving the original Gemini/unknown-provenance files and their earlier teaching uses. This uses the comprehensive-review length exception below; it is not a new length requirement for every lesson. Human media and device review remain pending.

### Unit 3: Me and Other People

Goal: Exchange basic personal information, ask about a current action, and describe oneself or another person with tightly supported A1 questions and answers.

Lessons:

1. 3.1 Greetings and Names: `hello`, `good morning`, `goodbye`, `What is your name?`, `My name is ...`
2. 3.2 I, You, and We: `I`, `you`, `we`, `I am Ana.`
3. 3.3 Am, Is, and Are: four complete current-action exchanges, `What are you doing? / I am ...`, `What is she doing? / She is ...`, `What is he doing? / He is ...`, and `What are they doing? / They are ...`, on familiar Unit 1 actions
4. 3.4 Yes and No: `yes`, `no`; `Is he ...? / Are you ...?` and `Yes, he is. / No, she is not.` with *be* only
5. 3.5 Ages 11-15: `eleven`–`fifteen`, `How old are you?`, `... years old`
6. 3.6 Ages 16-20: `sixteen`–`twenty`; `How old is she?`
7. 3.7 Where Are You From?: `Where are you from?`, `Mexico`, `Mexican`, `the United States`, `American`
8. 3.8 Canada and Spain: `Canada`, `Canadian`, `Spain`, `Spanish`
9. 3.9 Professions: `a teacher`, `a doctor`, `a cook`, `a driver`, `a farmer`, `a nurse`, `What is your job?`
10. 3.10 My, Your, His, and Her
11. 3.11 Our, Their, and 's
12. 3.12 Have, Has, Mine, and Yours
13. 3.13 Unit 3 Review
14. 3.14 Cenas cruzadas

Core patterns:

- `What is your name? My name is Ana.`
- `What are you doing? I am reading.`
- `How old are you? I am twenty.`
- `Where are you from? I am from Mexico.`
- `What is your job? I am a teacher.`
- `She has a phone.`
- `Is he eating? Yes, he is.`
- `It is Ana's book. Is it yours? Yes, it is mine.`

**2026-09-25 rebuild (engine briefs, user decisions).** Unit 3 was re-authored through the content engine from the briefs in `docs/product/content-briefs/unit-3/`. Six of eight lessons were short of the 40–42 card standard, 3.4 Age and 3.5 Countries each introduced more than eight new items, fifteen words were under-practised (six never heard or spoken), and 33 Learn cards re-taught known frames. Every teaching lesson now has 40–42 cards, and its Learn cards hold only its new vocabulary (the known frames `I am ...`, `he is ...` are practice). Four lessons are new: **3.4 Yes and No** (yes/no questions with *be* only, practised on Unit 1 action photos; `Do you ...?` waits for Unit 4), **3.6 Ages 16-20** (the age range splits in two, each practised on new kid and teen photos with numeral birthday candles), **3.8 Canada and Spain**, and **3.11 Our, Their, and 's** (Unit 1 family and Unit 2 objects: `their grandmother`, `Ana's book`). 3.12 adds `mine` and `yours` (`Is it yours? Yes, it is mine.`), and professions gain `Is she a nurse? No, she is not.` Lesson IDs are unchanged; the new lessons are `lesson-3-yes-no-questions`, `lesson-3-age-16-20`, `lesson-3-canada-and-spain` and `lesson-3-our-their`, and Unit 3 now has 14 lessons (review 3.13, mission 3.14). Neutral narration alternates the teacher and a second male narrator card by card, and every named or pictured speaker keeps that person's voice. The review (54 cards) adds yes/no, `our`, `their`, `'s` and `mine` cards; the mission re-cues its possession beats to `These are our books.` and `It is the woman's phone.` and adds a fifth voice gate, Ana's `Is it yours?` answered `Yes, it is mine.` (14 beats).

**2026-09-29 current-action correction.** Lesson 3.3 has 40 cards, eight per stage. Learn introduces the four questions in the order you, she, he, they, each immediately followed by its separate matching answer (eight slides). `Doing` is never a standalone image label. Recognize, Listen, Speak and Use retain question/answer alternation and the same perspective order while varying all thirteen already learned actions across the lesson. Question recognition is driven by the heard English question, so no arbitrary action photograph is claimed to mean a general question uniquely. Responses use the established person/action context. Familiar answer sentences are teaching context for the new question pattern, not new vocabulary. Exact shared-engine sequences and context-pair validation preserve this progression; no lesson-specific runtime behavior is added.

The paragraphs below predate those rebuilds: their 3.4-3.10 are today's 3.5, 3.7, 3.9, 3.10, 3.12, 3.13 and 3.14. The older six-card addition to 3.3 is superseded by the 2026-09-29 sequence above.

`What are you doing?` enters late in Lesson 3.3, after Unit 2.4 has introduced `what` and Lesson 3.2 has established `I`, `you`, and `am`. Lesson 3.3 introduces `doing` through six added cards (40 in total: a Learn question, an answer-view Recognize, a Listen discrimination against the name question, a two-speaker Speak exchange and two Use constructions) on four new speaker-view stills, and reuses already learned Unit 1 actions in the answers. It stays distinct from the Lesson 3.6 occupation question `What is your job?`; `do/does` is not generalized. Lesson 3.9 retrieves the exchange with fresh material and Lesson 3.10 applies it.

Lesson 3.9's parity restructuring contains 48 cards (`8 Learn / 8 Recognize / 18 Listen / 6 Speak / 8 Use`) in six stations: greetings and names, speaker perspective and current action, age, countries and nationalities, jobs, and possession. Its successful-path inventory retrieves 43 of the 47 vocabulary entries declared by 3.1–3.8. Fourteen fresh review stills replace the eight exact-byte teaching repeats and add greeting, job and current-action scenes; the originals and their teaching uses stay untouched. It uses the comprehensive-review length exception below.

Lesson 3.10 `Cenas cruzadas` is a 13-beat community dinner mission in five chapters. Nine listening scenes (36 decisions) alternate a *who says it* mechanic—hear a line and tap its speaker—with *who is described* scenes, covering every Unit 3 function from greetings to `have/has`. Four dinner-table voice gates close it, each with a distinct question view and response view. Its 18 mission-only stills replace the stub's blurred-inset kitchen and dining scenes. Human media and device review remain pending.

### Unit 4: Home and Daily Life

Goal: Identify rooms and home objects, say where people and things are, describe a supported daily routine, ask and answer `Do you ...?`, and say the day and whole-hour times.

Lessons:

1. 4.1 Rooms at Home: `home`, `kitchen`, `bedroom`, `bathroom`, `living room`, `dining room`; `The grandmother is in the kitchen.`
2. 4.2 Furniture and Home Objects: `bed`, `sofa`, `lamp`, `door`, `window`, `computer`; `Is it a door? Yes, it is.`
3. 4.3 Where Things Are: `in`, `on`, `under`, `next to`, `Where is ...?`; name the blue book, bag, phone or lamp in location questions and answers to reinforce known object vocabulary across all five stages.
4. 4.4 There Is and There Are: `there is`, `there are`; `There are nine cars.`
5. 4.5 Morning Routine: `wake up`, `wash my face`, `brush my teeth`, `eat breakfast`, `get dressed`, `in the morning`
6. 4.6 Getting ready for school day routine (content direction approved 2026-09-30, no user edits): reuse the 4.5 morning actions in order—wake up, wash face, get dressed, eat breakfast, brush teeth, go to school—adding `first`, `then`, `after that`, `finally` and `go to school`. The accepted review has 41 cards and full-sentence Learn models. The approved engine plan is the authoring source; media and release checks are tracked in the rebuild QA record.
7. 4.7 Helping at home (40-card editorial content approved, 2026-10-01): introduce `open`, `close`, `clothes`, `clean`; retrieve known `wash` through washing clothes, and practise opening/closing a door and cleaning a table. Use meaningful I/you/we/they perspectives and familiar rooms and objects, with matched voices and visual action evidence. The approved 40-card home-help draft supersedes the school-bag proposal; The approved engine plan is the authoring source; media and release checks are tracked in the rebuild QA record.
8. 4.8 Do you...? Questions and replies (user focus decision 2026-10-01): teach auxiliary `Do` plus the short replies `Yes, I do.` and `No, I do not.` through the user-edited Learn exchanges about work, study and playing in the park. Later sections extend to `Do you run in the park?` and supported action/place combinations. Declare base forms `work`, `study`, `play`, `run` alongside the grammar targets; earlier lessons taught their `-ing` meanings. The separate `go to work` introduction is removed from this replacement draft. Questions immediately precede explicit replies; no yes/no habit is inferred from a photo. The user approved the 42-card editorial review on 2026-10-01; The approved engine plan is the authoring source; media and release checks are tracked in the rebuild QA record.
9. 4.9 Days of the Week: `Monday`–`Sunday`, `today`; `What day is it today? Today is Tuesday.`
10. 4.10 What Time Is It?: `What time is it?`, `o'clock`, `afternoon`, `evening`, `night`, `at`, `a.m.`, `p.m.`; first identify morning/afternoon/evening/night from dedicated clock-free scenes, then ask and tell whole-hour times 1–12 with explicit day-period context. Routines and activity-at-time statements are deferred.
11. 4.11 Unit 4 Review — Home, help and plans (editorial proposal updated 2026-10-01): 54 cards retrieve the whole unit with fresh material, including the approved home-help actions and auxiliary-do exchanges with both replies. Known-language recall only; named objects, meaningful perspectives, ordered morning evidence, spoken weekday context and whole-hour times.
12. 4.12 Un día en casa — A family visit (editorial proposal updated 2026-10-01): one continuous home-preparation story with eight listening scenes (32 decisions) and nine closing voice gates. Find rooms and belongings, follow the school morning, wash clothes and clean the table, talk with helpers, confirm Thursday and six o’clock, then open and close the door to welcome the family. No new assessed English or mission interaction.

**2026-10-01 approved execution.** The user authorized the complete approved rebuild, resuming 4.6 and replacing the rejected packing, bedtime and frequency proposals. Shared content plans in `docs/product/content-plans/*-approved-unit4-v1.plan.json` are the exact repeatable authoring sources. The earlier September designs are historical where they conflict. Preserve 81 lessons and stable lesson IDs. The days lesson uses numeric weekly calendars and audible weekday context, with no printed answer words. The time lesson retrieves known study instead of the removed sleep target. Drinks retrieves morning context instead of the removed every-day target; Transportation cites school in 4.6 and work in 4.8. See the [rebuild QA record](../qa/unit4-approved-rebuild.md) for actual verification and review limits.

Core patterns:

- `The grandmother is in the kitchen.`
- `Where is the blue book? The blue book is on the table.`
- `There are two chairs in the dining room.`
- `I wake up in the morning.`
- `First, I wake up. Finally, I go to school.`
- `Do you work? No, I do not.`
- `Today is Tuesday.`
- `It is seven o'clock.`

**2026-09-26 rebuild (engine briefs).** Unit 4 was re-authored through the content engine from the briefs in `docs/product/content-briefs/unit-4/`. Seven of eight lessons were short of the 40–42 card standard, 4.5 declared ten items and the old 4.8 Days and Time thirteen (the problem the new-language budget names), days were practised two or three times and no day came back later, 31 Learn cards re-taught known frames, and the review and mission asked `What time is it?`, `What do you do ...?` and `When do you ...?` before `time`, `do` or `when` had been taught. Every teaching lesson now has 42 cards, and its Learn cards hold only its new vocabulary. The old 4.8 splits in two: **4.9 Days of the Week** keeps its ID (`lesson-4-8-days-and-time`) and teaches the seven days and `today` on matching desk-calendar pages with `What day is it today? / Today is ...`; the new **4.10 What Time Is It?** (`lesson-4-what-time-is-it`) teaches the question, `o'clock`, `afternoon`, `night` and `at` on clock cards that change only the hour (eleven and twelve bring the Unit 3 numbers back). The new **4.8 Do You...?** (`lesson-4-do-you-questions`) keeps the Unit 3 decision that `Do you ...?` waits for Unit 4: Luis asks Ana about her routine at a café and she answers `Yes, I do.` or `No, I do not.`; a `No` answer is only offered as text beside its `Yes` pair, and no bank offers another question's `No` answer, because that is true of almost any picture. Practice reuses what learners know: Unit 1 family members in the rooms (`The adults are in the living room.`), the Unit 2 counting photos with `There are ...`, the rooms again in the routine (`I brush my teeth in the bathroom.`), and `First/Then` choices that keep the connector and change the action, because one photo cannot show order. Unit 4 now has 12 lessons (review 4.11, mission 4.12). The review (54 cards) adds family members in rooms, `Today is Saturday.`, `Do you brush your teeth? Yes, I do.`, `Do you go to work?`, `It is twelve o'clock.` and `There are two cars.` on fresh photos; the mission's last two voice gates now ask `Do you wake up in the morning?` (`Yes, I do.`) and `What day is it today?` (`Today is Monday.`). Lesson IDs are unchanged, so learner progress survives.

Before that rebuild, one lesson (4.8 Days and Time) taught `Monday` through `Sunday`, `today`, `afternoon`, `night`, `o'clock`, `on` and `at` on desk-planner stills; its days now live in 4.9 and its times in 4.10.

### Unit 5: Food, Drinks, and Shopping

Goal: Name fruit, food and drinks, ask how many and say some, say what people like, want and need, talk about meals, ask and understand prices, and order politely at a café with `Can I have ...?`.

Lessons:

1. 5.1 Fruits: `fruit`, `apple`, `banana`, `orange`, `grapes`, `strawberry`, `pear`; `The baby is eating a banana.`
2. 5.2 Food: `food`, `bread`, `rice`, `egg`, `chicken`, `fish`; `The father is cooking fish.`
3. 5.3 Drinks: `drinks`, `water`, `milk`, `juice`, `coffee`, `tea`, `drink`; `The grandmother is drinking tea.`, `I drink water every day.`
4. 5.4 How Many? and Some: `How many ...?`, `some`; `How many apples are there? There are three apples.`, `There is some rice.`
5. 5.5 Likes, Dislikes, and Me Too: `like`, `do not like`, `Me too.`; `Do you like coffee? Yes, I do.`
6. 5.6 Wants and Needs: `want`, `wants`, `need`, `needs`; `The baby needs milk.`
7. 5.7 Meals: `lunch`, `dinner`, `for`; `I eat eggs for breakfast.`, `They eat lunch at one o'clock.`
8. 5.8 Prices: `How much is it?`, `dollar`, `dollars`
9. 5.9 Ordering Politely: `café`, `please`, `Here you are.`, `Thank you.`
10. 5.10 Can I Have...?: `Can I have ...?`, `Yes, please.`, `No, thank you.`; `Do you want tea? Yes, please.`
11. 5.11 Unit 5 Review
12. 5.12 Un día en el mercado y el café

Core patterns:

- `I like apples. I do not like fish. I like coffee. Me too.`
- `She wants water. He needs bread.`
- `How many eggs are there? There are four eggs. There is some milk.`
- `How much is it? It is five dollars.`
- `Can I have coffee, please? Do you want tea? No, thank you.`

**2026-09-26 rebuild (engine briefs, user direction: rebuild Units 5-7 through the engine, new photos approved).** Unit 5 was re-authored through the content engine from the briefs in `docs/product/content-briefs/unit-5/`. Every lesson had 34-36 cards, the old 5.2 taught ten items (food and drinks together), `food`, `drinks` and `café` were met once, `fruit`, `banana` and `egg` never came back, 5.3 taught only `some`, and 37 Learn cards re-taught known frames (`I like apples.`, `It is one dollar.`). Every teaching lesson now has 42 cards and its Learn cards hold only its new vocabulary. Drinks split into a new **5.3 Drinks** (`lesson-5-drinks`), with coffee and tea moved from Meals and `drink` practised in `I drink ...` and `Do you drink ...?`. 5.4 adds `How many ...?` to `some` and counts the 5.1 and 5.2 photos (`There are five drinks.`). 5.5 adds `Me too`, the 2026-09-23 tune-up basic, on the Unit 4 café table where Ana says `I like coffee.` and Luis answers `Me too.` A new **5.10 Can I Have...?** (`lesson-5-can-i-have`) adds the other tune-up basic: Ana asks at the counter, answers a server's `Do you want tea?`, and a customer asks for a banana, an orange or a pear at a fruit stall. Practice reuses what learners know: the Unit 1 family eats and drinks (the baby, the children, the grandparents, the father and the mother), the Unit 4 morning context (`in the morning`, `Do you ...?`) and times (`at one o'clock`), and the Unit 2 numbers and colors. Wrong options change one thing at a time (the food, the drink, the meal or the number), and counting photos stay out of four-picture cards. `So do I` was left out: `Me too` is the simpler agreement for adult beginners. Unit 5 now has 12 lessons (review 5.11, mission 5.12). The review (54 cards) adds `How many eggs are there?`, `Me too`, `Can I have bread, please?`, `an egg`, `a banana` and `Here you are.` on fresh photos or audio; the mission re-cues four lines (`How many pears are there?`, `He wants some water.`, `Can I have water, please?` and the closing `Hello. Can I have coffee, please?`). Lesson IDs are unchanged, so learner progress survives.

Before that rebuild, 5.2 Food and Drinks taught ten items, 5.3 Food Quantities only `some`, 5.6 Meals `coffee` and `tea`, and 5.8 Ordering Politely `café`, `please`, `Here you are.`, `Thank you.`, `Yes, please.` and `No, thank you.`; the review was 5.9 and the mission 5.10.

### Unit 6: Around Town

Goal: Name places in town and ways to travel, say where places are, give simple directions, say what you can and cannot do, ask for help, and read whole-hour bus and train times.

Lessons:

1. 6.1 Buildings and Services: `station`, `bank`, `pharmacy`, `library`; `The mother is at the pharmacy.`, `The children are in the library.`
2. 6.2 Transportation: `train`, `taxi`, `walk`, `by`; `I go to work by train.`, `The children walk to school.`
3. 6.3 Near and Far: `near`, `far from`; `The girl is far from the school.`, `Where is the boy? He is near the station.`
4. 6.4 Left and Right: `left`, `right`, `on the left`, `on the right`; `The bank is on the left.`
5. 6.5 Simple Directions: `Go straight.`, `Turn left.`, `Turn right.`, `Cross the street.`, `Stop.`; `Stop at the bank.`
6. 6.6 Can and Cannot: `can`, `cannot`, `there`; `The boy cannot cross the street.`, `They can go by train.`
7. 6.7 Asking for Help: `Excuse me.`, `Can you help me?`, `Sorry, no.`; `Where is the station? It is on the left.`
8. 6.8 Schedules: `leaves`, `arrives`; `The train arrives at four in the afternoon.`, `The bus leaves at eight on Saturday.`
9. 6.9 Unit 6 Review
10. 6.10 Ruta del barrio

Core patterns:

- `It is a bank. The grandfather is at the bank.`
- `I go by bus. The children walk to school.`
- `The girl is near the school. The bank is on the left.`
- `Go straight. Turn right. Stop at the bank.`
- `You cannot cross the street. Excuse me. Can you help me?`
- `The bus leaves at eight. The train arrives at nine.`

**2026-09-27 rebuild (engine briefs, user direction: rebuild Units 5-7 through the engine, new photos approved).** Unit 6 was re-authored through the content engine from the briefs in `docs/product/content-briefs/unit-6/`. Every lesson had 34-36 cards; 6.1 re-taught `store` and `hospital` from 2.1, 6.3 re-taught the 4.3 `Where is ...? / next to / in / on` frames, 6.4 packed six items (near, far from, left, right and both `on the ...` phrases) onto arrow and tile diagrams, and most Learn cards re-taught known frames (`I go by bus.`, `The bus leaves at eight.`). Every teaching lesson now has 42 cards and its Learn cards hold only its new vocabulary. The old 6.3 and 6.4 are re-scoped: **6.3 Near and Far** (`lesson-6-3-where-is-it`) and **6.4 Left and Right** (`lesson-6-4-location-words`) each teach one contrast on photo pairs that change only that contrast (the same girl at the school gate or far down a road; the same bank and pharmacy swapped across one street; Luis pointing from behind, so his left is the learner's left). Practice reuses what learners know: the Unit 1 family at the new places, the Unit 2 vehicles in `I go by ...`, the Unit 4 `go to work` and `go to school`, and the Unit 4 days and parts of the day in the schedules (`in the afternoon`, `on Monday`, Speak and Use only). 6.5 practises `Stop` in `Stop at the hospital.` and `Stop at the bank.` so it reaches Speak; 6.7 adds `Where is the station?` and `It is on the left.` as the answer; untaught `goes` is gone (the old 6.2 and 6.6 used it), so people travel with `I go ...`, `They go ...` and `walk`. Unit 6 keeps 10 lessons. The review (54 cards) adds `She is at the library.`, `I walk to work.`, `The hospital is far from the park.`, `They go by taxi.`, `You cannot cross the street.` and `The hospital is on the right.` on six fresh photos; the mission already practised every rebuilt function and is unchanged except its vocabulary list. Lesson IDs are unchanged, so learner progress survives.

Before that rebuild, 6.3 was Where Is It? (`Where is the...?` with `next to`, `in` and `on`), 6.4 Location Words (near, far and left and right together), and 6.7 Simple Requests (with `Yes.` and `Thank you.` as new items).

### Unit 7: Everyday Needs and A1 Integration

Goal: Name the body, feelings, clothes and the weather, say what you need and like, invite with `Do you want to ...?` and `Let's ...`, and ask for help when you do not understand, then use all of A1 in a final mission.

Lessons:

1. 7.1 The Body: `head`, `eyes`, `ears`, `mouth`, `arms`, `hands`, `legs`, `feet`; `I have two hands.`, `This is my head.`
2. 7.2 Feelings and Needs: `happy`, `sad`, `tired`, `hungry`, `thirsty`, `How are you?`; `The baby is hungry.`, `I am thirsty. I need water.`
3. 7.3 Clothing: `shirt`, `pants`, `dress`, `jacket`, `shoes`, `hat`, `socks`, `skirt`; `The jacket is blue.`, `This is a skirt.`
4. 7.4 Weather: `sunny`, `rainy`, `hot`, `cold`, `windy`, `cloudy`; `It is hot and sunny.`, `It is cold in the morning.`
5. 7.5 Clothes for the Weather: `umbrella`, `boots`; `It is rainy. I need an umbrella.`
6. 7.6 Hobbies and Free Time: `TV`, `music`, `watching TV`, `listening to music`; `I like reading.`, `I do not like watching TV.`
7. 7.7 Invitations and Responses: `Do you want to...?`, `Let's...`, `OK.`, `play`; `Let's watch TV. OK.`, `Let's play on Saturday.`
8. 7.8 Help and Important Phrases: `I need help.`, `I do not understand.`, `Please repeat.`, `Please speak slowly.`
9. 7.9 Complete A1 Review
10. 7.10 Gran misión de familia

Core patterns:

- `I have two hands. This is my head.`
- `How are you? I am tired. The baby is hungry.`
- `The jacket is blue. It is cold. I need a jacket.`
- `Do you want to play? Yes, thank you. Let's watch TV. OK.`
- `I do not understand. Please repeat.`

**2026-09-27 rebuild (engine briefs, user direction: rebuild Units 5-7 through the engine, new photos approved).** Unit 7 was re-authored through the content engine from the briefs in `docs/product/content-briefs/unit-7/`. Every lesson had 34-36 cards; `ears`, `pants`, `skirt` and `socks` were met only two or three times, and most Learn cards re-taught known frames (`My head`, `It is sunny.`, `I like reading.`, `Yes, thank you.`). Every teaching lesson now has 42 cards and its Learn cards hold only its new words (`Head`, `Sunny`, `Watching TV`). Practice reuses what learners know: `I have two ...` (3.12, 2.6) and `This is my ...` for the body; the Unit 1 family for feelings (the baby at an empty bowl, the grandfather yawning, the children jumping) with `I need food / water` from Unit 5; the four jacket photos that change only the color; `and`, `today` and `in the morning` with the weather; the Unit 1 activities in `I like ...`. 7.7 adds `Let's`, the tune-up basic, with people who clearly propose (the boy with a ball, Ana with the remote, the grandmother with headphones) and Luis answering `OK.`, and days come back in `Let's play on Saturday.` (Speak and Use only). Wrong choices change one thing at a time, and a picture that only one person shows is offered as text choices. Unit 7 keeps 10 lessons. The review (54 cards) adds `The grandmother is happy.`, `The boy is thirsty.`, `Her hat is red.`, `Let's read.`, `It is cold. I need a hat.` and `I do not understand.` on six fresh photos; in the mission the reader now says `Let's read.` Lesson IDs are unchanged, so learner progress survives.

Before that rebuild, 7.7 taught `watch TV`, `listen to music`, `read` and `play` as new with `Yes, thank you.` and `Sorry, no.` on Learn cards, and `Let's` was not taught.

## Lesson Design Template

Each A1 lesson should follow this shape:

1. Meaning anchor: show clear images with one word or one phrase.
2. Controlled recognition: choose the image that matches the prompt.
3. Pattern repetition: reuse the same sentence shape with swapped vocabulary.
4. Contrast: add near distractors only after the learner has seen clear examples.
5. Cumulative construction: combine useful earlier language with the lesson's new element to create a richer utterance or situation.
6. Optional help: show the same contextual avatar popup when the learner asks or waits four seconds on a ready, unanswered slide. In every lesson except the unit-closing mission, also introduce that help once on the second Aprende card, after the first automatic card and the second card's prompt audio. Use one or two short, actionable sentences for that slide, with no universal reminder paragraph. Mention replay only where available and useful. Respect the saved automatic-help opt-out; keep manual help available. See the unified help standard in the project guardrails.

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

Every ordinary answer bank follows the [answer-choice review procedure](../qa/answer-choice-review.md). Keep words, natural lexical labels, sentences and complete conversational responses coherent within each bank; balance reading load and vary subjects/actions when those are the assessed dimensions. New or changed banks require exact versioned contracts and narrowly justified teaching exceptions. Structural format failures cannot be waived.

Generated lessons must obey the [contextual help and mistake explanation standard](project-guardrails.md#contextual-help-and-mistake-explanations-approved-2026-09-17). Choose explanations from the current task and the submitted error. Required-word construction teaches why the misplaced words belong in their intended positions; it must not substitute an unrelated vocabulary or article-selection rule. New construction patterns need reviewed Spanish teaching support and passing whole-course hint checks before publication. Before-answer help explains the current mechanic; after-error feedback explains the actual missed relationship.

For every wrong choice, author a brief contrast of the learner's selection with the correct image, audio or sentence. Explain only the distinction assessed on that card, including why the chosen pronoun, word or scene fails; do not repeat a full answer or teach unrelated grammar. Every image-only option needs a reviewed semantic concept so the hint can name what the selected image shows. The course-wide mistake-hint check must reject generic or unsupported contrasts before export.

Grammar explanations must distinguish subject, auxiliary and main verb. For the Unit 1 progressive patterns, teach `subject + am/is/are + verb-ing`, and put `not` between the auxiliary and -ing verb in negatives. `Sleeping` in `She is sleeping` is the main verb's -ing form, not a subject description. Copular identity/adjective/location patterns and non-progressive -ing uses need their own analysis. Generated-content checks must assert these meanings, not merely that a hint mentions word order.

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

Every standard lesson uses the same `Learn -> Recognize -> Listen -> Speak -> Use` journey. A lesson declared as `experience_type: mission` instead uses one continuous learner-facing mission; its internal stage values remain engine/modality metadata and may interleave in story order. The checked-in Unit 1 builder preserves 1.1 while reproducibly generating 1.2 through 1.10, including the approved celebration-adventure contract above. The Completa progression now extends to 1.2–1.9: eligible cards in the last four Use positions construct the entire existing phrase with 2–8 required word tiles and full model audio, after earlier guided completion. Retain single-word cards 1.4 U4/U6 and ten-word cards 1.3 U7 and 1.9 U7 as guided completion. This converts 28 cards without adding vocabulary or changing card counts. The builder’s `--standard-only` option regenerates 1.2–1.9 without rewriting the separate mission. Automated checks enforce the story sequence, intentional card counts, vocabulary boundaries, bidirectional image/text recognition, audio-only listening choices, speaking cards, multi-word completion, valid media, the fresh-scene boundary for the comprehensive review, and the distinct 22-beat, 74-target mission contract for 1.10.

The previously built family lessons supply the existing assets and cards for the new `1.4` through `1.7` sequence. `Places Around Me` leaves Unit 1 and becomes the start of Unit 2.

Standalone `1.3 Pronunciation Practice` has been removed. Pronunciation practice now lives inside each sub-lesson as one of the standard lesson sections.

## Current Build and Review Status

The canonical A1 track contains 81 lessons in seven units, with each approved unit count recorded in the release integrity manifest. Every standard lesson follows `Learn -> Recognize -> Listen -> Speak -> Use`; every mission lesson replaces that visible shell with one continuous chaptered challenge while retaining internal modality metadata. Each lesson declares its prerequisite and culminates in a speaking outcome. Lessons 1-8 move forward by incorporating earlier vocabulary into richer constructions rather than inserting standalone review cards. Lesson 9 of each unit is a comprehensive no-new-language review using fresh scenarios and covering at least 70 percent of the unit's declared mastery targets; lesson 10 is a coherent, lightly gamified mission that integrates the unit's functions in one applied story or challenge.

The course menu presents the seven-unit big picture first. Selecting a unit reveals only that unit's lessons, with an explicit return to the all-units view. This navigation mirrors the curriculum hierarchy and keeps the approved course roadmap browsable without flattening it into one long list.

The next pedagogical decision is the post-Preview mastery policy: define the observable pass thresholds for each stage, the number and timing of delayed recycling attempts, and whether a failed mission blocks progression or schedules targeted review while allowing the learner to continue.

**2026-10-05 approved day-part and time revision (supersedes the 2026-10-03 visual sequence).** Lesson 4.10 first establishes morning, afternoon, evening and night with four dedicated clock-free pictures and full `It is ...` models. Their light, sky and surroundings supply meaning before the learner combines a day part with an hour. Those foundations start Recognize, Listen, Speak and Use as well: identify a scene, hear and choose a scene, say the phrase, and complete `It is ___.` Morning retrieves 4.5; the eight new targets remain within the A1 budget. The lesson then teaches complete question/answer exchanges (`What time is it? / It is seven o’clock.`), day-period answers and explicit a.m./p.m. distinctions. Its 70-card allocation is 18 Learn, 14 Recognize, 14 Listen, 12 Speak and 12 Use: 20 purposeful day-part cards precede the retained 50 time cards within the established five-stage order. Every whole hour 1–12 remains on the successful practice path, both conversational roles are practised, and o’clock is never a standalone vocabulary slide. Exact adjacent `learn_context_groups` bind the day foundations and full exchanges; declared known `support_targets` preserve morning’s prior-learning status.

Each time exchange needs a wider photograph of one person asking another while pointing at a visible clock, followed by a close-up of that exact clock and the full reply. The day background remains another a.m./p.m. cue. Restore the useful original sunrise/7:00, bright-afternoon/3:00 and moonlit/9:00 contextual images and preserve their bytes; only the new day-part introductions crop their clock-free backgrounds. A bare-wrist question photograph plus an unrelated clock is not continuity. The revised proposal explicitly records the missing two-person pointing shot; it must be resolved and semantically reviewed before the complete exchange media is called ready. Darkness alone cannot establish a.m./p.m., and 3 a.m. must not use sunrise evidence. Existing camera-sourced clock assets and local edits remain available; no image generation API or service is used.

This lesson contains only asking/telling time and day-part language. Existing 4.11 and 4.12 retrieval remains unchanged: the review retrieves a.m., p.m. and evening in its time beats, and the mission retrieves them within its established home story. Mission time/day/activity clues use separate known statements without introducing activity-at-time grammar; later meals/schedule contexts introduce that use of `at`. The current authoring source remains [the time-exchange plan](content-plans/4.10-time-exchanges-v1.plan.json), with [the approved brief](content-briefs/unit-4/4.10-time-exchanges-v1.json).
