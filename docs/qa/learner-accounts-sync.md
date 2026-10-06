# Learner accounts and progress QA

Candidate: `codex/learner-accounts-sync`, based on current `origin/main`.
Jira: SCRUM-5 and SCRUM-51 remain in progress until hosted/native verification.

## Observed locally (2026-10-05)

- Real Google sign-in through the user's SpanGlish Clerk development app reaches
  all seven units in Chrome and the separate Codex in-app browser.
- After answering the first card in Chrome, the separate in-app browser restored
  lesson 1.1 at card 2/42 with score 1. Neither browser imported its older local
  profile. This verifies a real server checkpoint across separate storage.
- Browser preflight originally received 401. Moving CORS outside authentication
  fixed it; the regression test verifies preflight with an app key configured
  and readable CORS headers on authentication errors.
- Backend full suite: 525 tests passed before deletion-webhook addition.
  The final account/authentication/tracking/API subset subsequently passed all
  35 tests, including signed deletion retries and deletion before first login.
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
- Both approved mobile callback URLs are saved in Clerk. Native API was already
  enabled; no paid plan or upgrade was selected.
- Clerk Production currently reports 0/3 setup tasks complete: production
  environment keys, custom Google credentials and domain CNAME records.
  Vercel's connector returned 403 when listing project environment variables.
  Hosted deployment remains blocked pending that configuration; merging would
  activate the new account gate on the live web application.

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
