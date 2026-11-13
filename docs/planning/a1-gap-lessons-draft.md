# A1 gap lessons (draft)

Date: 2026-11-13. Status: **draft for discussion**. Nothing here is approved, and no lesson, spine or guardrail changes with it. It follows the gaps in [coverage-benchmark-and-topic-map.md](coverage-benchmark-and-topic-map.md).

## 1. Summary

23 candidate lessons would add 164 new items to A1, in three priority groups.

| If we build | New lessons | A1 share of the Oxford A1 list |
|---|---|---|
| Nothing (today) | 0 | 31% |
| Priority 1 | 9 | 36% |
| Priority 1 and 2 | 19 | 44% |
| All three | 23 | 47% |

Even with all 23, A1 reaches about half of the Oxford A1 list. That is expected: A1+ is meant to complete it.

How the list was built:

- Each lesson has at most 8 new items, the current A1 limit.
- Each new lesson goes at the end of its unit, just before the review. Existing lesson numbers before the review do not change.
- Example sentences use only words taught by that point, plus the lesson's own new words.
- Words were chosen from what the outside lists show we lack, favoring ones a photo can show.

## 2. Priority 1: nine lessons

These close the gaps with the strongest evidence.

| Unit | Lesson | New items | Example |
|---|---|---|---|
| 1 | Friends and Family | friend, friends, husband, wife, son, daughter, mom, dad | They are friends. She is the daughter. |
| 1 | Pets | animal, pet, dog, cat, bird, rabbit | The dog is running. The cat is sleeping. |
| 2 | Big and Small | big, small, new, old, same, different, thing | A big house. The car is new. |
| 3 | The Alphabet | alphabet, letter, spell, first name, last name, How do you spell it? | How do you spell it? A-N-A. |
| 3 | Phone Number and Address | zero, phone number, address, email, What is your phone number?, What is your address? | My phone number is 555-0142. |
| 4 | Everyday Verbs | come, give, make, see, use, find | I make breakfast. We see the bus. |
| 4 | Now and Tomorrow | now, tomorrow, week, weekend, month, year, hour, minute | Tomorrow is Friday. I am eating now. |
| 5 | Buying Things | money, buy, pay, price, cheap, expensive | I buy bread. It is cheap. |
| 5 | Numbers 30 to 100 | thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred | It is forty dollars. |

## 3. Priority 2: ten lessons

| Unit | Lesson | New items | Example |
|---|---|---|---|
| 2 | In the Classroom | classroom, class, student, desk, pencil, paper, notebook, or | Is it a pen or a pencil? |
| 2 | More Colors | brown, pink, purple, gray, very | A very big brown dog. |
| 4 | Months 1 | January to June | It is March. |
| 4 | Months 2 | July to December, birthday | My birthday is in July. |
| 5 | More Food | meat, cheese, vegetables, potato, tomato, salad, soup, sandwich | I like soup. He wants a sandwich. |
| 5 | At the Table | cup, glass, bottle, plate, salt, sugar, cake, of | A glass of water. A cup of tea. |
| 7 | Good and Bad Days | good, bad, great, fine, sick, angry, afraid | How are you? I am fine. |
| 7 | Seasons | spring, summer, fall, winter, sun, rain, snow, warm | It is summer. It is warm. |
| 7 | Outdoors | tree, flower, river, sea, beach, mountain, lake, sky | The tree is green. We walk on the beach. |
| 7 | Farm and Wild Animals | cow, horse, sheep, pig, lion, elephant, snake, monkey | The horse is running. It is a lion. |

## 4. Priority 3: four lessons

| Unit | Lesson | New items | Example |
|---|---|---|---|
| 3 | More Jobs | waiter, police officer, artist, singer, worker, mechanic | She is an artist. He is a waiter. |
| 4 | More at Home | apartment, garden, floor, wall, stairs, roof, toilet, key | The key is on the floor. |
| 6 | In the City | city, town, road, market, building, map, drive, visit | The market is near the bank. |
| 7 | Sports and Music | sport, ball, team, game, tennis, sing, song, guitar | I like to sing. They play tennis. |

## 5. Left for A1+

These gaps are not in the list because they fit A1+ better or are already planned there: object pronouns (`him`, `them`, `us`), `any` and `a lot of`, `also` and `again`, technology beyond `email`, US life-skills situations (forms, appointments, medicine labels), and the remaining verbs (`say`, `know`, `think`, `ask`, `tell`, `learn`, `wear`).

## 6. Things to settle before building any of it

1. **Effect on A1+.** Under the same-number rule every new A1 lesson creates an A1+ lesson with the same number. 23 new A1 lessons mean 23 more A1+ lessons.
2. **Reviews and missions move.** Each unit's review and mission shift to later numbers, and each review must grow to retrieve the new words. Learner progress is safe because it follows lesson IDs, not numbers.
3. **A1+ Unit 1 overlap.** `old` is taught in A1+ 1.1, already rebuilt and in Preview. Teaching it in A1 Unit 2 would turn it into review there.
4. **The alphabet.** 26 letter names do not fit the 8-item limit. It needs either several lessons or its own rule.
5. **Fixed question phrases.** `How do you spell it?` uses `do` before A1 4.8 teaches `Do you…?`. It would be taught as a fixed phrase, as `How old are you?` is.
6. **Cost.** Each lesson needs new photos and audio. 23 lessons is about a quarter more A1 content (85 lessons today).
7. **Order of work.** The A1 tune-up and the A1+ rebuild are in progress. This would be a third stream unless it replaces or follows one of them.

## 7. Data

- [`coverage-benchmark-data/a1-gap-lessons-draft.csv`](coverage-benchmark-data/a1-gap-lessons-draft.csv): the 23 lessons with priority and the gap each one closes.
- `coverage-benchmark-data/project.py`: checks the draft against taught words and builds the projected word lists behind the table in section 1.
