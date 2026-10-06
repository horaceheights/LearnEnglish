# Clerk learner accounts

Clerk's free plan is the approved starting provider. The application owns the
learner UUID, curriculum and progress. The binding is `(issuer, subject)`;
changing providers or moving between Clerk instances requires a verified
migration rather than claiming an old learner by name.

## Configuration

| Location | Variables |
| --- | --- |
| Backend / Render | `CLERK_SECRET_KEY`, `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_WEBHOOK_SIGNING_SECRET` |
| Vercel server | `CLERK_SECRET_KEY` |
| Browser / Vercel | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL` |
| Expo Preview environment | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |

Use keys from the same Clerk instance. `CLERK_ISSUER` is that instance's HTTPS
Frontend API origin. `CLERK_AUTHORIZED_PARTIES` is a comma-separated list of
exact allowed browser origins, including `http://localhost:3000` locally.
Configure CORS separately through `ALLOWED_ORIGINS`. Signed native session
tokens omit `azp`; their signature, issuer, session identity and time claims
are still verified. Machine tokens and sessions for another issuer are denied.

Backend secrets never receive `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixes. Local
`backend/.env`, `frontend/.env.local` and `mobile/.env` are ignored, and mobile
environment files are excluded from EAS uploads. The checked-in examples
contain placeholders only. Local files do not configure hosted services.

For local development, install the backend requirements and launch from the
repository root with `python -m uvicorn backend.app.main:app --env-file
backend/.env --host 127.0.0.1 --port 8000`. Run the frontend on port 3000.
An offline cold start on mobile uses Clerk's SecureStore-backed token and
experimental resource caches; validate this behavior on the installed build
whenever upgrading the pinned Clerk Expo SDK.

## Provider settings

Enable email verification, account recovery and the chosen sign-in methods in
Clerk. Google is enabled in the SpanGlish development instance. Native API is
enabled, and the user approved and saved these exact mobile redirect URLs:

- `spanglish-preview://auth-callback`
- `spanglish-dev://auth-callback`

The app uses PKCE and the SDK's hosted-auth callback validation. These schemes
match `APP_VARIANT` in `mobile/app.config.js`. A future Production rollout needs
its own instance/domain configuration, production keys, and
`spanglish://auth-callback`; development keys are not Production readiness.
Use a new native build for these dependency and configuration changes.

Create a Clerk webhook endpoint for `user.deleted` at
`https://learnenglish-fxki.onrender.com/api/webhooks/clerk`, and save its signing
secret on Render. The endpoint verifies raw-body Svix signatures and timestamps;
it does not require a bundled app key. Deletions are idempotent, retain a minimal
identity tombstone, and also block a late first login after provider deletion.
Configure the webhook for the same Clerk instance as the backend issuer.
See [Clerk's Python webhook reference](https://clerk.com/articles/how-to-add-authentication-to-a-python-backend-3).

QA access is opt-in through backend `CLERK_QA_SUBJECTS`; display names and profile
JSON cannot grant it. Do not infer QA privileges from the old `horace` login.

## Rollout and recovery

Keep the already-shipped unbound legacy mobile clients compatible during
Preview. `LEGACY_LEARNER_LOGIN_ENABLED=false` stops new legacy name-based
registrations when the Production transition is approved; existing legacy
routes never expose an account-bound learner without its verified identity.
Device-held legacy history is offered for explicit import with stable new run
IDs; original bytes remain available. Server history cannot be claimed by name.

Results use immutable first-attempt data, correction unions and server
completion order. Checkpoints use compare-and-set revisions and explicit
conflict choices. Resetting progress advances a server generation inside the
same transaction, so an older device cannot recreate erased results. After a
reset, reconnect or retry the account to accept the new generation; old queues
remain in their original namespace for inspection.

Before merging, configure the target hosted environments and verify the signed
account path. Then use only the protected main Preview workflow with
`delivery: native-build`. Installed Preview sign-in, recovery and offline
two-device checks are still required. Production requires explicit approval of
the same tested commit and completed provider/domain configuration.
