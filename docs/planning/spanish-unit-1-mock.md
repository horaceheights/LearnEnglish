# Spanish Unit 1 — paper mock

Status: planning mock, 2026-11-19. This is the gate before any `es-a1` lesson is built. It is not approved curriculum, and the Spanish lines need a native-speaker check.
Course: `es-a1`, "Español A1 (beta)", level `Español A1`. The user approved it on 2026-11-19. Target language: Latin American (Mexico) Spanish, scored with `es-MX`. Help text, translations and app screens are in English.
Learner: English speakers.
Source: the 13 Unit 1 lessons on `origin/main` at `45244c10` (`backend/lessons/unit_1/`).
Scope: all 13 lessons, built later in three batches (see the end of this document).

## Bottom line

- **Photos: all 123 Unit 1 image files are reused. No new photos are needed.** Spanish follows the English sequence closely, and no lesson needs a split.
- **Lessons:** 10 port directly, 3 keep their photos but need re-authored cards, 0 are new and 0 drop out. Spanish Unit 1 keeps **13 lessons**.
- **Cards:** of 548 cards, about 522 port one-to-one (only the text and audio change) and about 26 are re-authored on the same photos. No cards are new.
- **Every card's text and audio is new**, as with German. Today's English prompt becomes the English help text unchanged. Today's `spanish_translation` is only a **draft** of the Spanish target line. About one in five of those values are instructions ("Escucha y elige.", "Elige la frase correcta."), one-word glosses ("Bebiendo") or shortened mission lines, so they can't be copied as they are (see "Draft problems" below).
- **The hardest Spanish points in Unit 1 are `ser` vs `estar`, gender agreement and `niño` doing two jobs.** English `is` becomes `es` (1.1) or `está` (1.2). English `are` becomes `están` (1.3) or `son` (1.4). `Sentado` agrees with the subject (`sentado/sentada/sentados`). `Niño` means both "boy" and "child", which breaks the 1.4 "A child" cards. Unlike German, Spanish has a real "is eating" form (`está comiendo`), so most English sentences map word for word and most tile counts stay the same.

## Verdict key

| Verdict | Meaning |
| --- | --- |
| **Ports directly** | Same cards, same photos, same order. Only the text and audio change. A port may still rewrite 1–3 cards (for example, a lone pronoun moved into a sentence); the "Re-authored" column counts them. |
| **Same photos, new cards** | Photos are reused, but prompts, distractors, tiles or the vocabulary list must be re-authored for Spanish grammar. |
| **Needs a new lesson** | Spanish needs teaching the English sequence never had. (None in Unit 1.) |
| **Drops out** | The English content has no Spanish equivalent. (None in Unit 1.) |

## Summary table

| EN lesson | Cards | ES lesson | Verdict | Re-authored | Main Spanish issue |
| --- | ---: | --- | --- | ---: | --- |
| 1.1 Meet the People | 42 | E1.1 | Ports directly | 2 | `un/una`; lone `Él`/`Ella` Learn cards move into sentences |
| 1.2 People in Action | 42 | E1.2 | Ports directly | 2 | `is` splits: `es` (1.1) vs `está` (new) |
| 1.3 Two People: They and Are | 42 | E1.3 | Ports directly | 3 | `ellos` for a boy + girl; `está sentado` is not `-ando` |
| 1.4 Children and Babies | 42 | E1.4 | Same photos, new cards | 9 | `niño` = boy and child; `son` arrives |
| 1.5 Brothers, Sisters, Adults | 42 | E1.5 | Ports directly | 0 | `an` disappears; `ellas` arrives |
| 1.6 Parents and Grandparents | 42 | E1.6 | Ports directly | 0 | `padres` = parents; `padre/madre` vs `papá/mamá` |
| 1.7 Family Actions | 42 | E1.7 | Ports directly | 0 | `hablando` vs Mexican `platicando` |
| 1.8 What They Are Not Doing | 42 | E1.8 | Ports directly | 0 | `no` goes before the verb |
| 1.9 Who Is He? Who Are They? | 42 | E1.9 | Ports directly | 0 | `quién` / `quiénes`; `¿…?` |
| 1.10 Pets | 42 | E1.10 | Ports directly | 2 | `Son mascotas`, not `Ellos son mascotas` |
| 1.11 Friends and People | 42 | E1.11 | Same photos, new cards | 4 | `amiga/amigas`; `persona` is always feminine |
| 1.12 Unit 1 Story Review | 62 | E1.12 | Same photos, new cards | 4 | follows the changes above; agreement fixes |
| 1.13 ¡Todos a la celebración! | 24 | E1.13 | Ports directly | 0 | every support field becomes English |

Card arithmetic: 11 × 42 + 62 + 24 = **548** cards. Re-authored: 2 + 2 + 3 + 9 + 2 + 4 + 4 = **26**. Ported one-to-one: 548 − 26 = **522**. New: **0**. The mission's 24 cards port, but all of its support text is rewritten (see E1.13).

## Proposed Spanish Unit 1 order

The order is unchanged from English. Learn cards show nouns with their article (`el niño`, `la niña`). A Learn card that introduces a plural shows both forms (`el bebé, los bebés`).

| ES | Title (English) | New vocabulary (Learn stage) | Builds on |
| --- | --- | --- | --- |
| E1.1 | Meet the People | un, una, niño, niña, hombre, mujer, él, ella, es | none |
| E1.2 | People in Action | el, la, está, comiendo, bebiendo, leyendo, escribiendo | E1.1 |
| E1.3 | Two People: y and ellos | y, ellos, están, corriendo, sentado, nadando, durmiendo | E1.2 |
| E1.4 | Children and Babies | familia, bebé/bebés, niños (children), son | E1.3 |
| E1.5 | Brothers, Sisters, Adults | hermano/hermanos, hermana/hermanas, ellas, adulto/adultos | E1.4 |
| E1.6 | Parents and Grandparents | padre, madre, padres, abuelo, abuela, abuelos, nietos | E1.5 |
| E1.7 | Family Actions | jugando, estudiando, trabajando, cocinando, hablando | E1.6 |
| E1.8 | What They Are Not Doing | no | E1.7 |
| E1.9 | Who Is He? Who Are They? | quién, quiénes | E1.8 |
| E1.10 | Pets | perro, gato, pájaro, conejo, mascota/mascotas | E1.9 |
| E1.11 | Friends and People | amiga/amigas, esposo, esposa, hijo, hija, persona/personas | E1.10 |
| E1.12 | Unit 1 Story Review | none | E1.1–E1.11 |
| E1.13 | Everyone to the Celebration! (mission) | none | E1.1–E1.12 |

The Spanish title of the mission, "¡Todos a la celebración!", already is target language. Its English help title is "Everyone to the celebration!"

---

## Lesson by lesson

Sample cards show the reused photo file from `mobile/assets/lesson-assets/`, the Spanish line (prompt and audio) and the English help text. There is one card per stage.

### E1.1 Meet the People ← EN 1.1 · **Ports directly**

Photos reused: 4 of 4 (`boy`, `girl`, `man`, `woman`). New photos: 0. Re-authored: 2.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `boy.webp` | Un niño | A boy |
| Recognize | `woman.webp` (choose from 4) | Una mujer | A woman |
| Listen | audio only, 4 photos | Él es un hombre. | He is a man. |
| Speak | `girl.webp` | Ella es una niña. | She is a girl. |
| Use (tiles) | `woman.webp` | [Una] [mujer.] [Ella] [es] [una] [mujer.] | A woman. She is a woman. |

Spanish issues:
- `un niño, un hombre` but `una niña, una mujer`. The Learn cards present `un`/`una` as part of the noun, the way German teaches `ein`/`eine`.
- **Re-authored:** L2 (`He`) and L5 (`She`) are lone-pronoun Learn cards. The German pilot guardrail bans them because the speech model read lone pronouns as English. They become `Un niño. Él es un niño.` and `Una niña. Ella es una niña.` (or they merge into L3/L6 and free a slot for one more `un`/`una` contrast card).
- `Él` (he) and `el` (the) sound the same; only the accent mark tells them apart. See "Engine risks".

### E1.2 People in Action ← EN 1.2 · **Ports directly**

Photos reused: 8 of 8. New photos: 0. Re-authored: 2.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `boy.webp` | El niño | The boy |
| Learn | `boy_is_eating.webp` | El niño está comiendo. | The boy is eating. |
| Recognize | `girl_is_reading.webp` (choose from 4) | Ella está leyendo. | She is reading. |
| Listen | audio only, 4 photos | El hombre está bebiendo. Él está bebiendo. | The man is drinking. He is drinking. |
| Use (tiles) | `woman_is_writing.webp` | [La] [mujer] [está] [escribiendo.] | The woman is writing. |

Spanish issues:
- **`es` vs `está`, the core Spanish point in Unit 1.** E1.1 taught `es` for who someone is. E1.2 adds `está` for what someone is doing. `está` is a new Learn word, so the vocabulary list grows from 5 to 7 words (`el`, `la`, `está` + 4 actions).
- **Re-authored:** L4 is an exact copy of L2 (`He is eating.`). It becomes the contrast card `Él es un niño. Él está comiendo.` One Use card, U2 (`The boy is eating, he is eating`), keeps its comma in Spanish. The native speaker should confirm the comma, or the card is rewritten as two sentences.
- Tile counts match English: `The boy is eating` and `El niño está comiendo` are both 4 words.
- **Mexico flag:** everyday Mexican Spanish says `está tomando (agua)` more often than `está bebiendo`. The mock keeps `bebiendo` because `tomar` also means "take".

### E1.3 Two People: y and ellos ← EN 1.3 · **Ports directly**

Photos reused: 14 of 14. New photos: 0. Re-authored: 3.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `they_boy_girl.webp` | El niño y la niña | The boy and the girl |
| Learn | `man_is_sitting.webp` | El hombre está sentado. | The man is sitting. |
| Recognize | `they_boy_girl_are_eating.webp` vs `they_boy_girl_are_running.webp` | Ellos están comiendo. | They are eating. |
| Listen | audio only: `girl_is_sleeping` | Ella está durmiendo. | She is sleeping. |
| Use (tiles) | `they_boy_girl_are_writing.webp` | El niño y la niña están escribiendo. [Ellos] [están] escribiendo. | The boy and the girl are writing. They are writing. |

Spanish issues:
- **`ellos` for a boy and a girl.** A mixed group takes the masculine plural. The photo pair (a boy and a girl) teaches this without extra explanation. `ellas` waits for E1.5's sisters.
- **`está sentado`, not `está sentando`.** "Is sitting" uses the participle, and it agrees with the subject: `sentado / sentada / sentados / sentadas`. The Learn card shows `sentado`. Feedback must not suggest the `-ando` form (`sentando` means "seating someone").
- **Re-authored:** L2 (`They`) and the R2 answer bank (`Ellos`) are lone-pronoun cards. They become `Ellos están comiendo.` style sentences. Card L10 repeats L4's running photo, and it becomes a second `sentado` card on `family_grandparents_sitting` (`Ellos están sentados.`), so the agreement is seen twice.
- New words: 7, as in English (`y, ellos, están` + 4 actions).

### E1.4 Children and Babies ← EN 1.4 · **Same photos, new cards**

Photos reused: 10 of 10. New photos: 0. Re-authored: 9.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `family_all_members.webp` | Son una familia. | They are a family. |
| Learn | `family_babies.webp` | Los bebés están sentados. | The babies are sitting. |
| Recognize | `family_baby_sleeping.webp` vs `family_babies.webp` | El bebé está durmiendo. | The baby is sleeping. |
| Listen | audio only, 2 photos: `boy` vs `family_children` | Son niños. | They are children. |
| Use (tiles) | `they_boy_girl_are_running.webp` | [Los] [niños] [están] [corriendo.] | The children are running. |

Spanish issues:
- **`niño` already means "boy".** English 1.4 teaches "A child / He is a child" on `boy.webp`. In Spanish that is `Un niño. / Él es un niño.`, the exact E1.1 cards. That breaks the rule that the Learn stage teaches new vocabulary only. **Re-authored (9):** L7, L8, R7, R8, A7, S4, S5, U5 and one Recognize distractor move from singular "child" to the new meaning, `niños` = children (a mixed group), contrasted with a single `niño` / `niña`. Example: `Él es un niño. Ella es una niña. Son niños.` (He is a boy. She is a girl. They are children.), using `boy`, `girl` and `family_children`.
- **`son` arrives here**: `Son una familia`, `Son bebés`. English met `are` in 1.3, but Spanish used `están` there. E1.4 is the first lesson with both `son` and `están` (`Son bebés. Los bebés están sentados.`). The mistake feedback should name the pair.
- `bebé` keeps its accent in the plural (`bebés`). `Los bebés están sentados` agrees in the masculine plural.

### E1.5 Brothers, Sisters, Adults ← EN 1.5 · **Ports directly**

Photos reused: 8 of 8. New photos: 0. Re-authored: 0.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `family_brothers.webp` | Ellos son hermanos. | They are brothers. |
| Learn | `family_sisters.webp` | Ellas son hermanas. | They are sisters. |
| Recognize | `family_father.webp` (choose from 3) | Él es un adulto. | He is an adult. |
| Listen | audio only, 3 photos | Adultos | Adults |
| Use (tiles) | `family_grandparents_sitting.webp` | [Los] [adultos] [están] [sentados.] | The adults are sitting. |

Spanish issues:
- **`an` disappears.** Spanish has no a/an split (`un adulto`), so `an` leaves the vocabulary list. The adult cards still work, so no card changes.
- **`ellas` arrives**: `Ellas son hermanas`. This is the first feminine plural pronoun.
- **Flag:** `hermanos` also means "siblings" (a brother and a sister). `family_brothers` shows two boys, so the card is unambiguous. The "siblings" meaning waits.

### E1.6 Parents and Grandparents ← EN 1.6 · **Ports directly**

Photos reused: 9 of 9. New photos: 0. Re-authored: 0.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `family_father.webp` | El padre | The father |
| Recognize | `family_mother.webp` | La madre | The mother |
| Listen | audio only, 4 photos | Ella es la abuela. | She is the grandmother. |
| Speak | `family_parents.webp` | Ellos son los padres. | They are the parents. |
| Use (tiles) | `family_grandparents_grandchildren.webp` | [Los] [abuelos] [y] [los] [nietos] | The grandparents and the grandchildren |

Spanish issues:
- `padres` (parents) and `abuelos` (grandparents) are masculine plurals for a mixed pair. This repeats the E1.3 rule.
- **Mexico flag:** families in Mexico say `mi papá, mi mamá, mis papás` far more than `padre/madre`, and `padre` is also slang for "cool". The mock keeps `padre/madre/padres` because they match the photos' "the father" framing and the 1.9 who-questions. Native speaker to decide.

### E1.7 Family Actions ← EN 1.7 · **Ports directly**

Photos reused: 5 of 5. New photos: 0. Re-authored: 0.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `family_children_playing.webp` | Los niños están jugando. | The children are playing. |
| Recognize | `family_brother_studying.webp` | Un hermano está estudiando. | A brother is studying. |
| Listen | audio only, 4 photos | El padre está trabajando. | The father is working. |
| Speak | `family_mother_cooking.webp` | La madre está cocinando. | The mother is cooking. |
| Use (tiles) | `family_parents_talking.webp` | [Los] [padres] [están] [hablando.] | The parents are talking. |

Spanish issues: all five verbs are regular `-ar` verbs (`-ando`). This lesson reinforces the E1.2/E1.3 pattern. **Mexico flag:** `platicando` is the everyday Mexican word for chatting. The mock uses `hablando` because it is also "speaking" and more useful.

### E1.8 What They Are Not Doing ← EN 1.8 · **Ports directly**

Photos reused: 10 of 10. New photos: 0. Re-authored: 0.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `family_father_talking.webp` | Él no está cocinando. | He is not cooking. |
| Recognize | `girl_is_writing.webp` vs `girl_is_reading.webp` | Ella no está leyendo. | She is not reading. |
| Listen | audio only, 2 photos | Ellos no están sentados. | They are not sitting. |
| Speak | `family_grandparents_talking.webp` | Ellos no están durmiendo. | They are not sleeping. |
| Use (tiles) | `family_grandparents_talking.webp` | [Ellos] [no] [están] [durmiendo.] [Ellos] [están] [hablando.] | They are not sleeping. They are talking. |

Spanish issues: `no` goes before the verb (`no está`), while English `not` comes after it (`is not`). The word count is the same, so the tiles only reorder. This is the main mistake to explain in feedback.

### E1.9 Who Is He? Who Are They? ← EN 1.9 · **Ports directly**

Photos reused: 11 of 11. New photos: 0. Re-authored: 0.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `a1_who_question_father.webp` | ¿Quién es él? | Who is he? |
| Learn | `a1_who_answer_father.webp` | Él es el padre. | He is the father. |
| Recognize | `a1_who_answer_mother.webp` | Ella es la madre. | She is the mother. |
| Listen | audio only: `a1_who_question_parents` | ¿Quiénes son ellos? | Who are they? |
| Use (tiles) | `a1_who_answer_children.webp` | [Ellos] [son] [los] [niños.] | They are the children. |

Spanish issues:
- `who` becomes two words: `quién` (one person) and `quiénes` (more than one). Both are Learn vocabulary.
- **`¿…?`:** the opening `¿` is part of the first word in the text. Tiles must show `¿Quiénes` as one tile, or the tile builder must strip and restore punctuation. See "Engine risks".
- `Él es el padre` puts `Él` (he) and `el` (the) side by side. This is a good reading card, but the speech scorer can't tell them apart.

### E1.10 Pets ← EN 1.10 · **Ports directly**

Photos reused: 11 of 11. New photos: 0. Re-authored: 2.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `a1_photo_u1_pets_dog_v1.webp` | Un perro | A dog |
| Learn | `a1_photo_u1_pets_dog_v1.webp` | Una mascota | A pet |
| Recognize | `a1_photo_u1_pets_dog_running_v1.webp` vs `…cat_sleeping_v1` | El perro está corriendo. | The dog is running. |
| Listen | audio only, 3 photos | El perro es una mascota. | The dog is a pet. |
| Use (tiles) | `a1_photo_u1_pets_girl_dog_playing_v1.webp` | [La] [niña] [y] [el] [perro] [están] [jugando.] | The girl and the dog are playing. |

Spanish issues:
- `mascota` is always feminine: `El perro es una mascota.` This is a good early example that grammatical gender is not the animal's sex.
- **Re-authored:** S8 and U7 (`They are pets.`) become `Son mascotas.` Spanish rarely uses `ellos` for animals. U7 shrinks from 3 tiles to 2.
- Animals `comen` like people, so the German `fressen` problem does not exist.

### E1.11 Friends and People ← EN 1.11 · **Same photos, new cards**

Photos reused: 21 of 21. New photos: 0. Re-authored: 4.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `a1_photo_u1_friends_friend_v1.webp` | Una amiga | A friend |
| Learn | `a1_photo_u1_friends_husband_v1.webp` | El esposo | The husband |
| Recognize | `a1_photo_u1_friends_daughter_v1.webp` vs `…son_v1` | Ella es la hija. | She is the daughter. |
| Listen | audio only, 2 photos | Una persona y una mascota | A person and a pet |
| Use (tiles) | `a1_photo_u1_friends_friends_rabbit_sitting_v1.webp` | [Las] [amigas] [y] [el] [conejo] [están] [sentados.] | The friends and the rabbit are sitting. |

Spanish issues:
- **`friend` splits by gender.** The friend photos show women, so the lesson teaches `amiga/amigas`, and `Ellas son amigas`. `amigo/amigos` is not taught in Unit 1. The review's "son and dog … They are friends" (`Ellos son amigos`) then meets `amigos` for the first time. **Re-authored:** that review card, or one E1.11 card adds `amigos` (see E1.12).
- **`persona` is always feminine**, even for a man: `La persona está sentada.` Check that `a1_photo_u1_friends_person_v1` is described with `sentada`, not `sentado`.
- **`people`:** `las personas` (plural verb) is used, not `la gente`, which is singular (`la gente está hablando`) and would confuse the plural pattern.
- **Agreement:** `Las amigas y el conejo están sentados.` A mixed group of women and a male animal takes the masculine plural. That is correct but surprising, and it needs a feedback note.
- **Re-authored (4):** R1/S2 (`Ellas son amigas` wording check), U4 (agreement), and A9 `People and pets` (`Personas y mascotas`).
- `esposo/esposa` is standard in Mexico. There is no clash with `hombre/mujer`, unlike German `Mann/Frau`.

### E1.12 Unit 1 Story Review ← EN 1.12 · **Same photos, new cards**

Photos reused: 19 of 19. New photos: 0. Re-authored: 4.

| Stage | Photo | Spanish | English help |
| --- | --- | --- | --- |
| Learn | `a1_u1_review_boy_eating.webp` | El niño está comiendo. Él está comiendo. | The boy is eating. He is eating. |
| Recognize | `a1_u1_review_baby_sleeping.webp` | El bebé está durmiendo. | The baby is sleeping. |
| Listen | audio only, 4 photos | ¿Quién es ella? Es la madre. La madre está cocinando. | Who is she? She is the mother. The mother is cooking. |
| Speak | `a1_u1_review_rabbit_bird_eating.webp` | El conejo y el pájaro están comiendo. Son mascotas. | The rabbit and the bird are eating. They are pets. |
| Use (tiles) | `a1_u1_review_grandparents_talking.webp` | [Ellos] [son] [los] [abuelos.] [No] [están] [durmiendo.] | They are the grandparents. They are not sleeping. |

Spanish issues:
- **Re-authored (4):**
  - A12 `Las personas son adultos` → `Las personas son adultas` (agreement with `personas`).
  - S10/R16 `Ellos son mascotas` → `Son mascotas`.
  - A13/S9 `Ellos son amigos` meets `amigos` for the first time. Either E1.11 teaches it or the line becomes `Juegan juntos`.
  - U6 is `Él es el padre` in the source but `Es el padre` in L11. Pick one form for the whole review.
- **Pronoun drop.** The current drafts mix `Es el padre` (natural Spanish) with `Él es el padre` (the taught pattern). This mock keeps the pronoun in Learn/Use cards and allows the natural drop after a question (`¿Quién es ella? Es la madre.`). Native speaker to confirm.
- The review needs an `es`/`está` station and a `son`/`están` station, the Unit 1 points most likely to be confused.

### E1.13 Everyone to the Celebration! ← EN 1.13 mission · **Ports directly**

Photos reused: 24 of 24 (including the kickoff). New photos: 0. Beat structure (find → connect → actions → correct with `no` → `¿Quién…?` → arrival) is unchanged.

| Beat | Photo | Spanish | English help |
| --- | --- | --- | --- |
| 03 | `a1_u1_reunion_03_pronoun_arrival.webp` | Él es un niño. Ella es una niña. Él es un hombre. Ella es una mujer. | He is a boy. She is a girl. He is a man. She is a woman. |
| 05 | `a1_u1_reunion_05_babies.webp` | Un bebé es un niño. Los bebés son niños. | A baby is a child. Babies are children. |
| 16 | `a1_u1_reunion_16_not_eating_v2.webp` | Él no está comiendo. Está bebiendo. | He is not eating. He is drinking. |
| 18a | `a1_u1_reunion_18a_pets.webp` | El perro está corriendo. El gato está durmiendo. El conejo está comiendo. | The dog is running. The cat is sleeping. The rabbit is eating. |
| 21 | `a1_u1_reunion_21_who_parents.webp` | Son los padres. | They are the parents. |

Spanish issues:
- **The mission's support language is Spanish today, and it becomes English.** These fields hold Spanish help text for Spanish speakers: `mission.label`, `title`, `briefing`, `objectives`, `completion_title`, `completion_message`, every `chapters[].title/objective`, every `mission_game.instruction_es` and every target's `label_es`. In `es-a1` they hold English (for example, "Listen to one sentence at a time and tap the person."). This is a text job, but **the field names end in `_es`.** Either the engine reads them per course, or `es-a1` gets course-neutral names. That is a decision for the engine session, not for this mock.
- **The Spanish target lines are new, not copied.** `audio_turns[].text`, `cues[].text/answer_text` and option `label` are English today and become Spanish. The current `spanish_translation` values for the mission are shortened (M01 has `Un niño.` for four people, M02–M03 cover two of four lines) or changed (M10–M15 swap nouns for pronouns: `The mother is eating.` → `Ella está comiendo.`). Each beat is re-authored from its English `audio_text`.
- Beat 04 (`The man is an adult…`) becomes `El hombre es un adulto. La mujer es una adulta.` Check that `adulta` is acceptable, or keep only the masculine forms.
- Beat 05's draft adds `también` ("also"), which is not taught. It is dropped.

---

## Draft problems in today's `spanish_translation`

These values can't become target text as they are:

| Problem | Where | Count (approx.) | Fix |
| --- | --- | ---: | --- |
| Instruction, not a translation | Listen cards (`Escucha y elige.`), Recognize i2t cards (`Elige la frase correcta.` / `Elige la frase para…`) | 79 | Translate the card's `audio_text` / correct option instead; the instruction becomes English help |
| One-word gloss | 1.2 A3/A5/A7 (`Bebiendo`, `Leyendo`, `Escribiendo`), 1.7 A1/A3/A5 (`Jugando`, `Estudiando`, `Trabajando`) | 6 | Full sentence: `Él está bebiendo.` |
| Doesn't match the audio | 1.8 A5 (audio `They are running.`, draft `El niño y la niña están corriendo.`) | 1 | `Ellos están corriendo.` |
| Shortened or rephrased mission lines | M01–M15 | ~15 | Re-author from `audio_text` |
| Agreement or pronoun errors | review A12 (`personas … adultos`), `Ellos son mascotas` (1.10, review) | 4 | See E1.10 and E1.12 |
| Lone pronoun | 1.1 L2/L5 (`Él`, `Ella`), 1.3 L2/R2 (`Ellos`) | 4 | Move into sentences |

## Engine risks (for the parallel engine session)

1. **Lone pronouns and very short lines.** The German pilot found that the speech model reads lone pronouns as English. The guardrail already bans lone-pronoun Learn cards. Spanish also has very short Speak lines (`Un gato`, `Un niño`). The audition's line 1 (`Un niño.`) is there to hear whether `eleven_multilingual_v2` keeps a Mexican accent on two words.
2. **Accents and the speech scorer.** `él/el`, `está/esta` and `qué/que` sound the same. The `es-MX` recognizer may return `el` where the card says `Él`. Speak scoring should compare accent-insensitively and ignore `¿¡`. Tiles and Recognize options must keep accents, because they are spelling.
3. **`¿` and `¡` in tiles.** Punctuation leads the first word (`¿Quién`). The tile builder must not create a `¿` tile or split it wrongly. The `complete-sentence` blank counts in 1.9 assume three words for `Who are they?`, and `¿Quiénes son ellos?` is also three.
4. **Mistake feedback (`spanishTeaching.ts`)** needs these patterns: `es` vs `está`, `son` vs `están`, article gender (`el/la`, `un/una`), plural agreement (`los/las`, `sentado/sentados`), `ellos` for mixed groups, and `no` before the verb. Other words get no invented rule, as in the German pilot.
5. **Mission `_es` support fields** (see E1.13).
6. **Translate button.** On `es-a1`, the existing written-choice translation button shows English and should be labelled "Translate", not "Traducir".
7. **Narration.** Two native Mexican voices alternate odd/even cards (`es-teacher` / `es-co-teacher`), as in the German pilot. This depends on the audition below.

## Photos

- **Reused:** all 123 image files referenced by Unit 1, counting lesson photos and the mission's beat and kickoff images.
- **New: none.** Unlike German, no lesson splits.
- **To check, not to replace:**
  - `a1_photo_u1_friends_friend_v1`, `…friends_v1`: confirm they show women (`amiga/amigas`).
  - `a1_photo_u1_friends_person_v1`: the line is `sentada` either way, because `persona` is feminine.
  - `family_brothers`: two boys (`hermanos`, not siblings).
  - `family_children`: a mixed group (`niños`).
- Review contexts start as `pending-human-review`, as in the German pilot.

## Proposed batches

| Batch | Lessons | Why together |
| --- | --- | --- |
| A | E1.1–E1.4 | `un/una`, `es`/`está`, `ellos`, then `son`/`están`: the ser/estar foundation |
| B | E1.5–E1.9 | family nouns, `-ando` verbs, `no`, `quién/quiénes` (mostly direct ports) |
| C | E1.10–E1.13 | pets, friends, review, mission (most re-authoring, plus mission support text) |

Each batch passes a text-and-photo gate, then a recordings gate, before shipping, as with German.

## Open questions for a native (Mexican) speaker

1. `bebiendo` or `tomando` for "drinking"?
2. `padre/madre/padres` or `papá/mamá/papás` for an A1 Mexican course?
3. `hablando` or `platicando` for "talking"?
4. Keep subject pronouns in every taught sentence (`Él está comiendo.`), or drop them where natural (`Está comiendo.`)?
5. `Las amigas y el conejo están sentados`: acceptable at A1, or swap the photo pairing?
6. Mission beat 04: `La mujer es una adulta.` or keep `adulto` only?
