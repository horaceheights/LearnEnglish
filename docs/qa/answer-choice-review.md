# Answer-choice authoring review

The choice-coherence rule applies throughout the course. Single action words are
valid together. Complete sentence alternatives have comparable reading load and
vary subjects and activities when the task assesses both. A full answer must not
stand out beside shorter fragments.

`python -m scripts.answer_choice_guardrail` checks every ordinary Recognize,
Listen and Use bank. The same check runs in the lesson validator, backend tests,
required pull-request CI and protected Preview/Production preflight.

## What blocks a release

- A word/fragment competing with a complete sentence or response. Recognized
  contractions and simple-present/past noun-subject sentences count as sentences.
- Different sentence/utterance counts, duplicate alternatives, missing text, or a
  partly captioned image bank. These structural defects have no exception.
- A word-count spread greater than `max(2, floor(shortest / 2))`, unless an exact
  teaching exception explains the natural wording. Counts expand contractions;
  this is a conservative reading-load alarm, not a demand to pad every sentence.
- Repeated subjects or activities in descriptive action banks, unless the exact
  card deliberately isolates pronoun/agreement, polarity, a fixed speaker,
  object, transport, sequence or time. Questions, imperatives, possession,
  preferences and needs assess other functions and retain their own review.
- Missing, changed, malformed, duplicate or orphan answer-bank contracts.

The versioned `docs/product/answer-choice-contracts.json` binds each bank's
lesson/stage/slide, option order, IDs, text, images, prompt, audio text and answer.
Even wording the structural parser does not understand requires an exact new
contract. Caption-free image banks have no reading-load measure, but still need
the exact binding and all existing image-meaning/ambiguity checks. A contract
does not approve image pixels or replace human semantic review.

## Reviewing a new or changed bank

1. Inspect the actual prompt, audio, correct answer and every distractor. Confirm
   one answer is supported by the complete picture/audio, the choices share a
   semantic dimension, and all language has already been taught.
2. Keep words together or sentences together. Preserve natural lexical phrases
   such as `Watching TV` and complete responses such as `Stop` only where that is
   the intended activity label or speech act. Avoid giving the answer away by its
   length, detail, completeness or repeated formatting.
3. Use the read-only inspector, for example:

   ```powershell
   python -m scripts.answer_choice_guardrail --lesson lesson-6-family-actions --slide R2
   ```

4. Fix ordinary violations. Record an exception only for an actual teaching
   purpose; name the specific skill and why changing this subject, activity or
   wording would damage it. Exceptions name individual checks, not whole lessons.
   They are bound to the exact bank and become stale on changes. Mixed forms and
   sentence-depth differences cannot be waived. Unnecessary exceptions fail too.
5. After that review, edit only the matching contract's fingerprint, form and
   justified exceptions. Do not bulk renew hashes, automatically accept current
   content, copy another bank's exception or use a generic reason to make CI pass.
   The inspector intentionally has no accept/refresh/write mode.
6. Update the real authoring source, canonical content, mobile exports and any
   affected media/audio contracts together. Run the focused regression tests and
   normal release checks. Review the diff as a whole before merging.

The initial inventory has 952 banks. The 110 banks with teaching exceptions are
explicitly scoped to existing grammatical contrasts, natural lexical/conversation
forms and coordinated-subject reading load; there is no lesson-wide allowlist.
Five unmotivated repeated-subject banks in Lesson 1.9 were corrected instead of
exempted. New banks must earn their own review record.
