# German Unit 1 — paper mock

Status: feasibility mock, 2026-11-18. Not approved curriculum. Needs a native-speaker check before any real build. The Preview pilot built G1.1–G1.3 from it (see the "German pilot course" guardrail); in the pilot, pronouns are taught inside sentences rather than as single-word Learn cards.
Learner: English speakers (support text and the Traducir button become English).
Source: the 13 Unit 1 lessons on `origin/main` at `54c4a816` (`backend/lessons/unit_1/`).

## Bottom line

- **Photos: all 118 Unit 1 photos are reused.** About 2–3 new photos are needed, all for the one new lesson.
- **Lessons:** 6 port directly, 6 keep their photos but need re-authored cards, 1 splits into two lessons, 0 drop out. German Unit 1 ends up with **14 lessons instead of 13**.
- **Cards:** of 548 cards, 234 port one-to-one (text and audio swap only), 272 need re-authoring on the same photos, and about 42 are new.
- **Every card's text and audio is new**, as expected. One thing gets easier: for English speakers, today's English prompt *is* the support text, so the `translation` field is already written.
- **The hardest German points in Unit 1 are articles (der/die/das), verb endings, and `sie` meaning both "she" and "they".** German has no "is eating" form, so the English `is + -ing` scaffolding goes away and verb endings take its place.

## Verdict key

| Verdict | Meaning |
| --- | --- |
| **Ports directly** | Same cards, same photos, same order. Only the text and audio change. |
| **Same photos, new cards** | Photos are reused, but prompts, distractors, tiles or the vocabulary list must be re-authored for German grammar. |
| **Needs a new lesson** | German needs teaching the English sequence never had. |
| **Drops out** | The English content has no German equivalent. |

## Summary table

| EN lesson | Cards | DE lesson | Verdict | Main German issue |
| --- | ---: | --- | --- | --- |
| 1.1 Meet the People | 42 | G1.1 | Ports directly | `ein/eine`; pronoun for `Mädchen` |
| 1.2 People in Action | 42 | G1.2 | Same photos, new cards | `the` becomes der/die/das; `is eating` becomes `isst` |
| 1.3 Two People: They and Are | 42 | G1.3 + **G1.4** | Needs a new lesson (split) | every verb has two forms; `sie` = she / they |
| 1.4 Children and Babies | 42 | G1.5 | Same photos, new cards | `sind` first appears here; plural drops the article |
| 1.5 Brothers, Sisters, Adults | 42 | G1.6 | Same photos, new cards | `an` drops out; `Erwachsene` is an adjective-noun |
| 1.6 Parents and Grandparents | 42 | G1.7 | Ports directly | none |
| 1.7 Family Actions | 42 | G1.8 | Ports directly | regular verbs; `arbeitet` takes `-et` |
| 1.8 What They Are Not Doing | 42 | G1.9 | Ports directly | `nicht` only; `kein` waits |
| 1.9 Who Is He? Who Are They? | 42 | G1.10 | Ports directly | `sie` / formal `Sie` sound the same |
| 1.10 Pets | 42 | G1.11 | Same photos, new cards | animals `fressen`, they don't `essen` |
| 1.11 Friends and People | 42 | G1.12 | Same photos, new cards | `Freund/Freundin`; husband/wife = `Mann/Frau` |
| 1.12 Unit 1 Story Review | 62 | G1.13 | Same photos, new cards | follows the changes above |
| 1.13 ¡Todos a la celebración! | 24 | G1.14 | Ports directly | English title: "Everyone to the celebration!" |

Card arithmetic: ports directly 5×42 + 24 = **234**; same photos, new cards 5×42 + 62 = **272**; the split 1.3 = **42** re-authored plus **~42** new. 234 + 272 + 42 = 548 existing cards.

## Proposed German Unit 1 order

| DE | Title | New vocabulary (Learn stage) | Builds on |
| --- | --- | --- | --- |
| G1.1 | Meet the People | ein, eine, Junge, Mädchen, Mann, Frau, er, sie (she), ist | none |
| G1.2 | People in Action | der, die, das, isst, trinkt, liest, schreibt | G1.1 |
| G1.3 | Two People: und and sie (they) | und, sie (they), essen, lesen, schreiben | G1.2 |
| G1.4 | **New:** One or Two? More Actions | rennt/rennen, sitzt/sitzen, schwimmt/schwimmen, schläft/schlafen | G1.3 |
| G1.5 | Children and Babies | Familie, Baby/Babys, Kind/Kinder, sind | G1.4 |
| G1.6 | Brothers, Sisters, Adults | Bruder/Brüder, Schwester/Schwestern, erwachsen, die Erwachsenen | G1.5 |
| G1.7 | Parents and Grandparents | Vater, Mutter, Eltern, Großvater, Großmutter, Großeltern, Enkelkinder | G1.6 |
| G1.8 | Family Actions | spielt/spielen, lernt/lernen, arbeitet/arbeiten, kocht/kochen, redet/reden | G1.7 |
| G1.9 | What They Are Not Doing | nicht | G1.8 |
| G1.10 | Who Is He? Who Are They? | wer | G1.9 |
| G1.11 | Pets | Hund, Katze, Vogel, Kaninchen, Haustier/Haustiere, frisst/fressen | G1.10 |
| G1.12 | Friends and People | Freund/Freunde, Freundin, Ehemann, Ehefrau, Sohn, Tochter, Person, Leute | G1.11 |
| G1.13 | Unit 1 Story Review | none | G1.1–G1.12 |
| G1.14 | Everyone to the Celebration! (mission) | none | G1.1–G1.13 |

Learners see nouns with their article from the start (`der Junge`), and the plural form is shown on the Learn card (`das Kind, die Kinder`).

---

## Lesson by lesson

Sample cards show the photo file reused from `mobile/assets/lesson-assets/`, the German line (prompt and audio), and the English support text. One card per stage.

### G1.1 Meet the People ← EN 1.1 · **Ports directly**

Photos reused: 4 of 4 (`boy`, `girl`, `man`, `woman`). New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `boy.webp` | Ein Junge | A boy |
| Recognize | `woman.webp` (choose from 4) | Eine Frau | A woman |
| Listen | audio only, 4 photos | Er ist ein Mann. | He is a man. |
| Speak | `girl.webp` | Sie ist ein Mädchen. | She is a girl. |
| Use (tiles) | `woman.webp` | [Eine] [Frau.] [Sie] [ist] [eine] [Frau.] | A woman. She is a woman. |

German issue: `ein Junge, ein Mann, ein Mädchen` but `eine Frau`. The Learn cards should present `ein`/`eine` as part of the noun. **Flag for the native speaker:** `das Mädchen` is grammatically neuter, so textbooks often use `es`, while everyday speech says `sie`. The mock uses `sie` so the 1.1 pattern (`Er…/Sie…`) stays intact.

### G1.2 People in Action ← EN 1.2 · **Same photos, new cards**

Photos reused: 8 of 8. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `boy.webp` | Der Junge | The boy |
| Learn | `boy_is_eating.webp` | Der Junge isst. | The boy is eating. |
| Recognize | `girl_is_reading.webp` (choose from 4) | Das Mädchen liest. | The girl is reading. |
| Listen | audio only, 4 photos | Der Mann trinkt. | The man is drinking. |
| Use (tiles) | `woman_is_writing.webp` | [Die] [Frau] [schreibt.] | The woman is writing. |

German issue: English `the` becomes three words in one lesson (`der Junge, der Mann, die Frau, das Mädchen`). `is eating` shrinks to a single verb, so every Completa tile set changes length and the "`is` + action" distractors no longer make sense. Teach `isst` and `liest` as whole words; the irregular stem is not explained in A1.

### G1.3 Two People: und and sie (they) ← first half of EN 1.3 · **Needs a new lesson (split)**

Photos reused: 7 of 14 from EN 1.3. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `they_boy_girl.webp` | Der Junge und das Mädchen | The boy and the girl |
| Learn | `they_boy_girl_are_eating.webp` | Sie essen. | They are eating. |
| Recognize | `girl_is_reading.webp` vs `they_boy_girl_are_reading.webp` | Sie liest. | She is reading. |
| Listen | audio only: `girl_is_reading` vs `they_boy_girl_are_reading` | Sie lesen. | They are reading. |
| Use (tiles) | `they_boy_girl_are_writing.webp` | [Der] [Junge] [und] [das] [Mädchen] [schreiben.] | The boy and the girl are writing. |

German issue: **the reason for the split.** `sie` means "she" and also "they"; only the verb ending tells them apart (`sie liest` / `sie lesen`). Existing photo pairs (one girl reading / boy and girl reading) make perfect contrast cards. If 1.3's four new actions also arrive here, each in two forms, the lesson would carry 13+ new forms. `trinken` stays singular-only for now: there is no "two people drinking" photo.

### G1.4 One or Two? More Actions ← second half of EN 1.3 · **New lesson**

Photos reused: `man_is_sitting`, `boy_is_swimming`, `girl_is_sleeping`, `they_boy_girl_are_running`, `family_grandparents_sitting`, `a1_u1_review_children_swimming`. **New photos: ~2** (one person running; two people sleeping).

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `they_boy_girl_are_running.webp` | Sie rennen. | They are running. |
| Learn | `man_is_sitting.webp` | Der Mann sitzt. | The man is sitting. |
| Recognize | `boy_is_swimming.webp` vs `a1_u1_review_children_swimming.webp` | Er schwimmt. | He is swimming. |
| Listen | audio only: `girl_is_sleeping` vs *new* two-sleeping photo | Sie schläft. | She is sleeping. |
| Use (tiles) | `family_grandparents_sitting.webp` | [Sie] [sitzen.] | They are sitting. |

German issue: the mock uses `rennen`, not `laufen`, because `laufen` also means "walk" and `läuft` is irregular. The review photo `a1_u1_review_children_swimming` would teach here, so G1.13 would need a different swimming photo to keep the fresh-scene review rule.

### G1.5 Children and Babies ← EN 1.4 · **Same photos, new cards**

Photos reused: 10 of 10. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `family_all_members.webp` | Die Familie | The family |
| Learn | `family_children.webp` | Sie sind Kinder. | They are children. |
| Recognize | `family_baby_sleeping.webp` | Das Baby schläft. | The baby is sleeping. |
| Listen | audio only, 4 photos | Die Babys sitzen. | The babies are sitting. |
| Use (tiles) | `boy.webp` | [Er] [ist] [ein] [Kind.] | He is a child. |

German issue: English met `are` back in 1.3. German used plural verb endings there instead, so `sind` arrives here as a new Learn word. "They are children" has no article in German (`Sie sind Kinder.`). Every plural takes `die`, which is easier for learners.

### G1.6 Brothers, Sisters, Adults ← EN 1.5 · **Same photos, new cards**

Photos reused: 8 of 8. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `family_brothers.webp` | Die Brüder | The brothers |
| Learn | `family_sisters.webp` | Sie sind Schwestern. | They are sisters. |
| Recognize | `family_father.webp` | Er ist erwachsen. | He is an adult. |
| Listen | audio only, 4 photos | Die Erwachsenen sitzen. | The adults are sitting. |
| Use (tiles) | `boy.webp` | [Er] [ist] [ein] [Bruder.] | He is a brother. |

German issue: **`an` drops out.** German has no a/an split, so EN 1.5's `a` vs `an` contrast cards are refilled with `Bruder/Brüder` plural practice. `ein Erwachsener / eine Erwachsene` follows adjective endings, which is too much for A1, so the mock uses the adjective `erwachsen` plus the fixed chunk `die Erwachsenen`.

### G1.7 Parents and Grandparents ← EN 1.6 · **Ports directly**

Photos reused: 9 of 9. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `family_father.webp` | Der Vater | The father |
| Recognize | `family_mother.webp` | Sie ist die Mutter. | She is the mother. |
| Listen | audio only, 4 photos | Sie sind die Großeltern. | They are the grandparents. |
| Speak | `family_parents.webp` | Sie sind die Eltern. | They are the parents. |
| Use (tiles) | `family_grandparents_grandchildren.webp` | [Die] [Großeltern] [und] [die] [Enkelkinder] | The grandparents and the grandchildren |

German issue: none that changes cards. `Eltern` has no singular, which matches the English use.

### G1.8 Family Actions ← EN 1.7 · **Ports directly**

Photos reused: 5 of 5. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `family_children_playing.webp` | Die Kinder spielen. | The children are playing. |
| Recognize | `family_brother_studying.webp` | Ein Bruder lernt. | A brother is studying. |
| Listen | audio only, 4 photos | Der Vater arbeitet. | The father is working. |
| Speak | `family_mother_cooking.webp` | Die Mutter kocht. | The mother is cooking. |
| Use (tiles) | `family_parents_talking.webp` | [Die] [Eltern] [reden.] | The parents are talking. |

German issue: all five verbs are regular, so this lesson reinforces the G1.3/G1.4 endings. `reden` is used for "talking", not `sprechen`, because `spricht` is irregular. The `-et` in `arbeitet` is the only new spelling point.

### G1.9 What They Are Not Doing ← EN 1.8 · **Ports directly**

Photos reused: 10 of 10. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `family_father_talking.webp` | Der Vater redet. Er kocht nicht. | The father is talking. He is not cooking. |
| Recognize | `girl_is_writing.webp` | Sie liest nicht. | She is not reading. |
| Listen | audio only, 4 photos | Sie sitzen nicht. | They are not sitting. |
| Speak | `family_sister_playing.webp` | Sie lernt nicht. | She is not studying. |
| Use (tiles) | `family_grandparents_talking.webp` | [Die] [Großeltern] [sitzen] [und] [reden.] [Sie] [schlafen] [nicht.] | The grandparents are sitting and talking. They are not sleeping. |

German issue: every 1.8 negation negates an action, so `nicht` at the end of the sentence covers all of them. `kein` ("not a…") isn't needed until a lesson negates a noun.

### G1.10 Who Is He? Who Are They? ← EN 1.9 · **Ports directly**

Photos reused: 11 of 11. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `a1_who_question_father.webp` | Wer ist er? | Who is he? |
| Learn | `a1_who_answer_father.webp` | Er ist der Vater. | He is the father. |
| Recognize | `a1_who_answer_mother.webp` | Sie ist die Mutter. | She is the mother. |
| Listen | audio only: `a1_who_question_parents` | Wer sind sie? | Who are they? |
| Use (tiles) | `a1_who_answer_children.webp` | [Sie] [sind] [die] [Kinder.] | They are the children. |

German issue: **flag:** `Wer sind sie?` (who are they?) sounds the same as `Wer sind Sie?` (who are you, formal). The photo settles it, but a listen-only card can't. Native speakers often say `Wer ist das? / Das sind die Eltern.`, which would add a new `das`; the mock keeps the English pattern.

### G1.11 Pets ← EN 1.10 · **Same photos, new cards**

Photos reused: 11 of 11. New photos: 0.

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `a1_photo_u1_pets_dog_v1.webp` | Der Hund | The dog |
| Learn | `a1_photo_u1_pets_rabbit_eating_v1.webp` | Das Kaninchen frisst. | The rabbit is eating. |
| Recognize | `a1_photo_u1_pets_cat_sleeping_v1.webp` | Die Katze schläft. | The cat is sleeping. |
| Listen | audio only, 4 photos | Der Hund ist ein Haustier. | The dog is a pet. |
| Use (tiles) | `a1_photo_u1_pets_girl_dog_playing_v1.webp` | [Das] [Mädchen] [und] [der] [Hund] [spielen.] | The girl and the dog are playing. |

German issue: animals `fressen`; they don't `essen`. "The rabbit is eating" therefore needs a new Learn word in both forms, `frisst/fressen` (the review uses the plural). The pets lesson also carries three genders: `der Hund`, `die Katze`, `das Kaninchen`.

### G1.12 Friends and People ← EN 1.11 · **Same photos, new cards**

Photos reused: 21 of 21. New photos: 0–1 (only if `daughter_friend` shows a boy).

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `a1_photo_u1_friends_friends_v1.webp` | Die Freunde | The friends |
| Learn | `a1_photo_u1_friends_husband_v1.webp` | Der Ehemann | The husband |
| Recognize | `a1_photo_u1_friends_person_v1.webp` | Die Person sitzt. | The person is sitting. |
| Listen | audio only, 4 photos | Der Sohn und der Hund rennen. | The son and the dog are running. |
| Use (tiles) | `a1_photo_u1_friends_husband_bird_eating_v1.webp` | [Der] [Ehemann] [und] [der] [Vogel] [essen.] | The husband and the bird are eating. |

German issues:
- A female friend is `die Freundin`, so `a friend` splits by gender (and `Freund/Freundin` can also mean boyfriend/girlfriend).
- Everyday German says `mein Mann / meine Frau` for husband/wife, the same words as man/woman from G1.1. The mock uses `Ehemann/Ehefrau` to avoid the clash.
- `die Person` is feminine even for a man.
- **Grammar flag:** the Use card mixes a person and an animal (`essen` vs `fressen`). Better to re-pair that photo with `trinken` or swap the card.

### G1.13 Unit 1 Story Review ← EN 1.12 · **Same photos, new cards**

Photos reused: 19 of 19. Swap 1 (the swimming photo moved to teaching in G1.4).

| Stage | Photo | German | English support |
| --- | --- | --- | --- |
| Learn | `a1_u1_review_boy_eating.webp` | Der Junge isst. Er isst. | The boy is eating. He is eating. |
| Recognize | `a1_u1_review_baby_sleeping.webp` | Das Baby schläft. | The baby is sleeping. |
| Listen | audio only, 4 photos | Wer ist sie? Sie ist die Mutter. Die Mutter kocht. | Who is she? She is the mother. The mother is cooking. |
| Speak | `a1_u1_review_rabbit_bird_eating.webp` | Das Kaninchen und der Vogel fressen. Sie sind Haustiere. | The rabbit and the bird are eating. They are pets. |
| Use (tiles) | `a1_u1_review_grandparents_talking.webp` | [Sie] [sitzen] [und] [reden.] [Sie] [schlafen] [nicht.] | They are sitting and talking. They are not sleeping. |

German issue: inherits every change above. It also needs a `sie`-she/`sie`-they station, the Unit 1 point most likely to be confused.

### G1.14 Everyone to the Celebration! ← EN 1.13 mission · **Ports directly**

Photos reused: 24 of 24. New photos: 0. Beat structure (find → connect → actions → correct with `nicht` → `Wer…?` → arrival) is unchanged.

| Beat | Photo | German | English support |
| --- | --- | --- | --- |
| 03 | `a1_u1_reunion_03_pronoun_arrival.webp` | Er ist ein Junge. Sie ist ein Mädchen. Er ist ein Mann. Sie ist eine Frau. | He is a boy. She is a girl. He is a man. She is a woman. |
| 05 | `a1_u1_reunion_05_babies.webp` | Ein Baby ist ein Kind. Babys sind Kinder. | A baby is a child. Babies are children. |
| 16 | `a1_u1_reunion_16_not_eating_v2.webp` | Er isst nicht. Er trinkt. | He is not eating. He is drinking. |
| 18a | `a1_u1_reunion_18a_pets.webp` | Der Hund rennt. Die Katze schläft. Das Kaninchen frisst. | The dog is running. The cat is sleeping. The rabbit is eating. |
| 21 | `a1_u1_reunion_21_who_parents.webp` | Sie sind die Eltern. | They are the parents. |

German issue: the mission's support language is Spanish today, so the beat instructions are rewritten in English. That's a text job; the mechanics don't change. Beat 04 ("The man is an adult") becomes `Der Mann ist erwachsen.`

---

## What this suggests for Units 2–7 (extrapolation, not checked)

Not read for this mock. This is a guess from what each unit teaches:

- **Unit 2 (places, objects, numbers, colors):** mostly vocabulary, so high reuse. But `in the park` becomes `im Park`, the first dative case. Expect one new lesson on location.
- **Unit 3 (me and other people):** personal information ports well. `ich bin / du bist`, plus a decision on `du` vs `Sie`, adds one more set of verb endings.
- **Unit 4 (my day):** frequency adverbs and time phrases trigger German verb-second word order (`Morgens trinke ich…`). Expect several re-authored lessons.
- **Unit 5 (café):** ordering needs the accusative (`Ich möchte einen Kaffee`). Likely a new lesson.
- **Unit 6 (town):** directions and prepositions are where German cases pile up. Probably the lowest reuse in A1.
- **Unit 7:** depends on 4–6.

Rough expectation: photos stay above 90% reused across A1. Lessons split roughly a third each among "ports directly", "new cards" and "new or split", with Unit 1 at the better end.

## Engineering note (not part of the mock)

A second course also needs the one-time work from the first answer: a course/language field where the English locale is set today (pronunciation, audio rendering, audio manifest), a separate release fingerprint and catalog, and room under the EAS asset cap for a second audio set.

## Open questions for a native speaker

1. `Sie ist ein Mädchen.` or `Es ist ein Mädchen.` for A1?
2. `rennen` vs `laufen` for "running".
3. `Ehemann/Ehefrau` vs `Mann/Frau` for husband/wife at A1.
4. `Wer sind sie?` vs `Wer ist das? / Das sind…`.
