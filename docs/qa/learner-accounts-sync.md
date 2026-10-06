# Learner accounts and progress QA

Accounts: pull request #237, merged as `4a5e4c4`. Android release follow-up:
`codex/android-account-preview`, based on freshly fetched `origin/main`.
Jira: SCRUM-5 and SCRUM-51 remain in progress until hosted/native verification.

## Account presentation follow-up (2026-10-06)

- The user's installed Android screenshot reaches the signed-in course. It exposed
  an inline legacy-import notice and the backend's default `Student` name; it does
  not establish checkpoint restoration or offline behavior on the phone.
- The mobile import offer is now a centered modal with safe-area padding, scrollable
  content, explicit import/skip actions, disabled actions while saving, and an
  in-dialog error/retry state. Original progress bytes and retry-safe migration
  remain unchanged. Eight native Yoga tests cover choices, Android back, failures,
  small phones, landscape, tablets, larger text and 48dp touch targets.
- The revised presentation uses brief copy, a cloud icon, source/destination
  name cards and a soft white surface. The actual component was reviewed at
  phone size through React Native Web; native installed-device review remains
  separate. The same eight native interaction/layout tests pass after revision.
- Account reads adopt Clerk's first name only for an untouched `Student` profile.
  Backend tests cover first login, repair across devices, profile version conflicts,
  a racing profile edit, learner-chosen names and bounded provider failures.
- All 533 backend tests pass locally. A read-only lookup with the configured
  production Clerk instance returns `Horacio` for the signed-in learner; the
  currently deployed course still shows `Student` before this follow-up deploy.
- Installed-device review still needs to confirm the popup appearance, both choices,
  and the first name after a Preview refresh. The remaining progress gates below
  stay open until their specific behaviors are observed.

## Initial local verification (2026-10-05)

- Real Google sign-in through the user's SpanGlish Clerk development app reaches
  all seven units in Chrome and the separate Codex in-app browser.
- After answering the first card in Chrome, the separate in-app browser restored
  lesson 1.1 at card 2/42 with score 1. Neither browser imported its older local
  profile. This verifies a real server checkpoint across separate storage.
- Browser preflight originally received 401. Moving CORS outside authentication
  fixed it; the regression test verifies preflight with an app key configured
  and readable CORS headers on authentication errors.
- Backend final full suite: all 527 tests passed in GitHub's complete release
  candidate check, including signed deletion retries and deletion before first
  login. The focused account/authentication/tracking/API subset also passed.
- Fourteen shared sync tests cover offline persistence, account/generation isolation,
  explicit two-device conflicts, delayed acknowledgements, tombstones, corrupt
  storage preservation, correction unions, retry-safe legacy import, canonical
  JSON comparison, obsolete revisions and server order with skewed clocks.
  They also cover token resolution during account switches, coalesced refreshes,
  a delayed completion acknowledgement after reset, and a changed checkpoint
  while the learner's conflict choice is open.
- Web production build passes. Mobile TypeScript and the full interaction runner
  pass after updating the replaced login-screen navigation assertion.
- Complete Preview preflight passes, including Android export and versioned
  catalog integrity. No local EAS publication was performed.
- Both approved mobile callback URLs are saved in Clerk Development and
  Production. Native API was already enabled; no paid plan was selected.
- All five production Clerk CNAME records are DNS-only in Cloudflare and verified
  by Clerk. Clerk reports both production SSL certificates issued.
- Matching production Clerk keys are configured in Vercel Production, Render
  and EAS Preview. Render also has the issuer, exact browser-origin allowlist,
  preserved CORS origins plus the owned apex/www origins, and webhook secret.
  Settings are saved for the next deploy; the old backend has no webhook route.
- A production webhook is registered for only `user.deleted` at the documented
  backend endpoint. Real delivery and deletion remain unchecked below.
- The user completed Google consent setup and saved the custom web-client
  credentials in Clerk Production. The existing `horaciomainproject` has only
  the owned apex/www JavaScript origins and Clerk's exact callback for this
  client. No new project or billing selection was made.
- Real Google sign-in through the production account portal created the user's
  Clerk identity and returned to `www.learnspanglish.app`. Requested scopes are
  only OpenID, email and profile; Google's basic-identity exception permits this
  test while its OAuth app remains in testing mode. This verifies provider
  configuration; the new web/backend account flow still requires deployment.
- Pull request #237 passed the complete release-candidate check and Vercel
  build. Hosted settings and production provider sign-in are ready for merge;
  merging activates the new account gate on the live web application.

## Hosted verification and Android release follow-up (2026-10-05)

- Vercel and Render both serve merged main commit `4a5e4c4`; Render reports
  all 6,357 approved audio assets ready with no missing or invalid objects.
- Real production Google sign-in reaches all seven units in Chrome and the
  independent Codex in-app browser. After Chrome answered card one, the other
  browser restored lesson 1.1 at `He`, card 2/42, score 1. Sign-out and Google
  re-entry restored the same checkpoint and score.
- Hosted anonymous account access and invalid bearer tokens return 401. The
  owned www-origin preflight returns 200 with the matching CORS header. An
  unsigned deletion webhook returns 400 and is rejected before any mutation.
- Protected Preview run `37414762949` passed all backend, course, interaction,
  export and CDN checks. EAS uploaded the Android candidate, then the workflow
  failed because iOS had no suitable internal-distribution signing credentials.
  This is not a successful native Preview publication.
- That submitted Android build (`85f46e8e-bdce-42c7-b3e9-241c2194b978`)
  subsequently failed during R8 release minification: `kotlinx.io.RawSink`
  references Kotlin 2.3's binary-only `kotlin.MustUseReturnValues` annotation,
  while Clerk intentionally retains Expo's older Kotlin stdlib. The follow-up
  supplies a narrowly scoped ProGuard exception through Expo's build-properties
  plugin. Its regression check runs the real native-file writer twice and
  verifies existing rules, minification and resource shrinking remain enabled.
- The user approved Android Preview first. The follow-up adds an explicit
  `native_platform: android` choice to the same protected workflow. The default
  still requires Android and iOS. Executable release checks reject stale,
  unfinished, duplicate, missing and unexpected platform results. The release
  manifest deliberately pins the revised publisher and its metadata guard;
  course content and its complete approved catalog are unchanged.

## Required installed/hosted checks

- [ ] Hosted backend, Vercel and EAS Preview keys belong to the same configured
  Clerk instance; verify the backend rejects wrong issuer and browser origin.
- [ ] Register the signed provider deletion webhook; verify a real external
  deletion purges learner data and duplicate deliveries are safe.
- [ ] New protected-main native Preview build installs and returns from hosted
  email/Google sign-in on Android and iOS.
- [ ] Email verification, recovery and sign-out/re-entry work on the installed
  build without losing its progress queue.
- [ ] Two devices restore the same unfinished lesson and completed result;
  different interrupted runs require an explicit choice and retain both copies.
- [ ] Force-close in airplane mode, reopen, finish cached activities, reconnect,
  and verify one completion with the original first-attempt score.
- [ ] Switch accounts while a request is in flight; neither its data nor its
  acknowledgement appears in the new account or reset generation.
- [ ] Reset/delete while a second device is offline; its older queue cannot
  restore erased activity. QA sessions remain outside learner progress.
- [ ] Production Clerk instance/domain and keys are configured, and the exact
  same commit receives explicit Production approval after Preview testing.

The complete 81-lesson, seven-unit catalog and content fingerprint are unchanged.
CourseScreen's release-identity blob is deliberately updated for remote-progress
refresh; its version/commit display remains guarded. Existing pending media
reviews remain Preview warnings and do not authorize Production.
