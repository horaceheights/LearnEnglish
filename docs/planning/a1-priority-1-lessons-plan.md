# A1 Priority 1 gap lessons: detailed plan

Date: 2026-11-14. Status: **plan for discussion**. 1.10 Pets and 1.11 Friends and People are approved and built (2026-11-14; see the guardrails decision log for the later-reuse status); nothing else here is approved. It details the Priority 1 group from [a1-gap-lessons-draft.md](a1-gap-lessons-draft.md).

## 1. What changed from the draft

Planning the lessons in detail changed four things:

| Draft | Now | Why |
|---|---|---|
| 9 lessons | **10 lessons** | The alphabet needs two lessons. |
| Friends and Family had `mom`, `dad` | `person`, `people` instead | A photo cannot show `mom` as different from `mother`. `people` is one of the most common words we lack. |
| Phone lesson had `email` | Removed | Saying an email address needs `at` and `dot`, which are not taught yet. It moves to A1+. |
| Time lesson had `hour`, `minute` | `days`, `months` instead | Keeps the lesson on the calendar and off the clock. |

Pets now comes before Friends, so the friends lesson can reuse the dog.

## 2. The ten lessons

Each lesson goes at the end of its unit. The unit's review and mission move to the next two numbers.

| No. | Lesson | New items | Model sentences |
|---|---|---|---|
| 1.10 | Pets | pet, pets, dog, cat, bird, rabbit | The dog is running. The cat is sleeping. They are pets. |
| 1.11 | Friends and People | friend, friends, husband, wife, son, daughter, person, people | They are friends. Who is she? She is the daughter. The people are talking. |
| 2.11 | Big and Small | big, small, new, old, same, different | A big dog. The car is new. Two small red books. These pens are the same. |
| 3.13 | The Alphabet A to M | letters A–M, letter | A letter. It is a B. |
| 3.14 | The Alphabet N to Z | letters N–Z, spell, How do you spell it? | My name is Ana. How do you spell it? A-N-A. |
| 3.15 | Phone Number and Address | zero, phone number, address, What is your phone number?, What is your address? | My phone number is 555-0142. My address is 12 Park Street. |
| 4.11 | Everyday Verbs | come, give, make, see, use, find | I make breakfast. We see the bus. I find my phone under the bed. |
| 4.12 | Tomorrow and the Week | now, tomorrow, week, weekend, month, months, year, days | Tomorrow is Tuesday. There are seven days in a week. I am eating now. |
| 5.11 | Buying Things | money, buy, pay, price, cheap, expensive | I buy bread at the store. The apple is cheap. What is the price? |
| 5.12 | Numbers 30 to 100 | thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred | It is forty dollars. She is sixty years old. |

Every model sentence was checked by script: it uses only words A1 teaches by that unit, the lesson's own new items, or items from an earlier lesson in this list.

Each lesson follows the standard A1 format: 40–42 cards through Learn, Recognize, Listen, Speak and Use, with each new item practiced at least 5 times across 4 stages.

## 3. How the new words come back later

The A1 standard requires each new item to return in at least two later lessons. The new lessons are chained so they do most of this for each other.

| Lesson | Returns in |
|---|---|
| 1.10 Pets | 1.11, Unit 1 review, 2.11 (`a big dog`), 4.11 (`Do you see the dog?`) |
| 1.11 Friends and People | Unit 1 review, 4.11 (`I give the book to my friend`), 5.11 |
| 2.11 Big and Small | Unit 2 review, 4.11, 5.11 (`a small cheap bag`) |
| 3.13 and 3.14 Alphabet | 3.15 (spelling the street name), Unit 3 review |
| 3.15 Phone Number and Address | Unit 3 review, **one more home needed** |
| 4.11 Everyday Verbs | 4.12, Unit 4 review, 5.11 |
| 4.12 Tomorrow and the Week | Unit 4 review, 5.11 |
| 5.11 Buying Things | 5.12, Unit 5 review |
| 5.12 Numbers 30 to 100 | Unit 5 review, **one more home needed** |

So five unit reviews must grow to include the new words. Two lessons still need a second later home; the natural places are the Unit 3 and Unit 5 missions.

## 4. Decisions needed before building

1. **Alphabet: conflicts with an earlier decision.** On 2026-09-23 the user deferred spelling and the alphabet because they stress adult beginners. Lessons 3.13 and 3.14 therefore stay out of the build unless the user reverses that decision; 3.15 Phone Number and Address would then drop its spelling line and become 3.13. If they are ever built, two lessons of 14 and 15 items need an approved exception to the 8-item limit (the largest so far is 11, lesson 7.1), or four lessons of 6–7 letters each.
2. **Speaking single letters.** Pronunciation scoring may not tell `B` from `D` or `P`. This needs a quick test in the app before the alphabet lessons are written. If it fails, Speak can use spelled names (`A-N-A`) instead of single letters.
3. **`old` in A1 2.11.** A1+ 1.1 teaches `old` and `young` for people and is already in Preview. If A1 teaches `old` for things, A1+ 1.1 treats it as known. The alternative is to drop `old` and teach only `new` here.
4. **Reviews.** Reviews are capped at 48–54 cards. Adding the new words means either replacing existing review cards or approving longer reviews.
5. **Missions.** Leaving the five missions untouched is possible, except for the two lessons in section 3 that need one more home.
6. **A1+ Unit 1.** New A1 1.10 and 1.11 create A1+ 1.10 and 1.11 under the same-number rule. The A1+ Unit 1 rebuild is in progress in another session and would need to know.

## 5. Size of the work

- 10 new lessons of about 42 cards each.
- Existing teaching lessons use a median of 10 distinct photos (range 4 to 30). Ten lessons is on the order of 100 new photos, plus audio for every new line.
- 5 unit reviews revised; the release manifest's lesson counts updated.
- Photos whose meaning is hard to show need human review: `husband`, `wife`, `son`, `daughter`, `pet`, `same`, `different`, `cheap`, `expensive`. Prices on tags would use numerals, in line with the numbers rule.

## 6. Suggested order

1. **1.10 Pets** as the pilot: the simplest to photograph, no exceptions needed, and the gap you raised first.
2. 1.11 Friends and People, then 2.11 Big and Small, with the Unit 1 and Unit 2 reviews.
3. 4.11, 4.12, 5.11 and 5.12, with the Unit 4 and Unit 5 reviews.
4. Unit 3 last (3.13–3.15), because it depends on decisions 1 and 2.

Each lesson would go through the normal lesson process and your local review before Preview.

## 7. Data

- [`coverage-benchmark-data/a1-priority-1-plan.csv`](coverage-benchmark-data/a1-priority-1-plan.csv): the ten lessons with full model sentences and later reuse.
- `coverage-benchmark-data/check_priority_1.py`: the script that checks the sentences against taught words and measures the photo load of existing lessons.
