# Multilingual architecture: learn any language with any help language

Approved by the user on 2026-11-28. This is the long-term shape of the app. The
standing rules live in [`project-guardrails.md`](project-guardrails.md); the
work order lives in [`../planning/roadmap.md`](../planning/roadmap.md) and the
Jira `SCRUM` backlog.

## The decision

The app began as English for Spanish speakers. It now teaches four languages:
**English, Spanish, German and French**. Every one of them can be learned with
any of the other three as the **help language**.

- The **target language** is the language being learned. Each target language
  has its own courses (A1, A1+, and later levels).
- The **help language** is the language the learner reads around the lesson:
  app screens, stage names and instructions, translations (Traducir/Translate),
  Learn meanings, mission support text, mistake help, and the AI tutor.
- A learner who does not speak one of the four (a Hindi speaker, say) picks
  English as the help language. English is the common fallback, not a native
  requirement.
- Help languages are limited to the four taught languages.

Four target languages give twelve pairs, but only four courses. A German lesson
is the same German lesson whatever the help language; only the help layer
changes.

## Learner flow

1. **Onboarding** asks four things, in this order:
   1. which language to learn;
   2. which help language to use, among the other three, offering only
      complete pairs;
   3. minutes of practice per day;
   4. days of practice per week.

   Starting level is not asked until content up to at least B2 exists. Every
   learner starts at the beginning of the target's first course.
2. **Existing learners** go through the same onboarding once after the update.
   Their progress stays, because it is stored per lesson.
3. A learner can **add another language** later. The second onboarding asks
   only the language and that language's goal. The account and help language
   carry over as defaults.
4. Each language keeps its **own progress, daily goal and price**. Learners
   usually study one language at a time.

## Daily goal

- The goal is measured in **active minutes** per language and per day. Time
  pauses when the app is in the background or idle.
- Reaching the goal shows a **non-blocking** celebration. The learner may keep
  going. A lesson is never cut off.
- Progress is shown per **week** (days met out of days planned), not as a
  streak that resets after one missed day.
- Reminders on planned days are push notifications. They need a native build
  and ship with payments (phase 7).

## Content rules

- **Pair availability.** A course lists the help languages whose content is
  complete (`helpLanguages` in `backend/courses.json`). Onboarding offers only
  those pairs. A new pair opens when its translations and its app-screen text
  are complete and natively checked.
- **Help text is stored per language.** Cards keep their reviewed legacy field
  (`spanish_translation`, mission `*_es`, mission briefing text), which holds
  the course's default help language. Each further help language sits beside
  its field as `<field>_i18n: {"<lang>": …}` (for example
  `spanish_translation_i18n: {"es": "Un niño"}` on a German card). Lesson files
  are not rewritten to move existing text. The app applies the help language
  when a lesson loads (`localizeLesson`, `mobile/src/helpLanguage.ts`). The
  backend schemas start passing `_i18n` fields when the first translations are
  authored (phase 5).
- **Mistake help fallback (user decision 2026-11-28).** Each hand-written
  explanation module is tied to one pair:
  - English with Spanish help: `choiceTeaching.ts`, `constructionTeaching.ts`.
  - German with English help: `germanTeaching.ts`.
  - Spanish with English help: `spanishTeaching.ts`.

  Every other pair shows the correct answer with its help-language translation
  until hand-written explanations exist for that pair. A pair can launch on the
  fallback.
- **Tutor.** The tutor speaks the learner's help language about the target
  language. It stays off for a pair until the user approves that pair's tutor.

## Delivery and pricing

- **Downloads.** A learner downloads only the courses of their target languages
  and the help layer they picked, from the existing Cloudflare R2 media bucket.
  Today every update ships every course's photos (about 480 MB) and the
  combined lesson catalog (41.5 MB). Per-course download is a separate
  release-infrastructure plan (phase 4).
- **Pricing.** Access is per target language, through the app stores. QA
  accounts (`qaAccess`) bypass the access check. Sample units, and the choice
  between a subscription and a one-time purchase, are still open decisions.
- **One app on purpose.** A learner who enjoys one language should be able to
  add the next one without starting over in another app. Offer the next
  language at high points (unit or level complete), never mid-lesson.

## Phases

| Phase | Scope | Visible change |
|---|---|---|
| 0 | This document, guardrails, roadmap and Jira | none |
| 1 | Language foundations: `targetLanguage` and `helpLanguages` in the registry, a four-language `UiLanguage`, `_i18n` help text applied by `localizeLesson`, mistake help keyed by pair | none |
| 2 | Onboarding, learner languages in the profile, course home per target, help-language switch in QA, tutor parameters | onboarding |
| 3 | Daily goal per language: active-time tracker, practice days, weekly view | daily goal |
| 4 | Per-course content download from R2 (its own plan and approval) | smaller app updates |
| 5 | Fill pairs one at a time: first German with Spanish help, then German and French help for English. The first authored `_i18n` fields also go into `backend/app/schemas.py`; a translated mission briefing needs its own help-language mission-intro recording | new pairs |
| 6 | French course `fr-a1` through the new-content engine | French |
| 7 | One native build: payments and access per language, reminders, rebrand to a name that names no language | store release |

Each phase ships as its own pull request into `main`, then goes to Preview for
the user's phone test.
