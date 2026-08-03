# SpanGlish crash reporting setup

The application code and native Sentry integration are installed. Reporting
stays disabled when no DSN is configured, so missing configuration can never
prevent the app from starting.

## One-time account setup

1. Create a Sentry account and a React Native project named `spanglish`.
2. Record the organization slug, project slug, and project DSN.
3. Create an organization auth token with source-map upload and release scopes.
4. Add these EAS environment variables to `preview` and `production`:
   - `EXPO_PUBLIC_SENTRY_DSN` (plain text; a DSN is a public client identifier)
   - `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` (plain text; `0.2` is the default)
   - `SENTRY_ORG` (plain text)
   - `SENTRY_PROJECT` (plain text)
   - `SENTRY_AUTH_TOKEN` (sensitive)
5. Connect Sentry in Expo account settings and link the EAS project when desired.

Never commit the auth token. Learner names, recordings, and spoken audio are
not added to Sentry events. Default PII collection is disabled.

## Performance tracing

The mobile app samples 20% of app starts, interactions, API requests, frame
measurements, and custom pronunciation spans by default. Set
`EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` between `0` and `1` to change the
sample without editing code.

The FastAPI service uses the same trace IDs to continue mobile requests through
Render and the Azure pronunciation call. Add these Render environment variables:

- `SENTRY_DSN`: use the current Sentry project DSN, or a backend project DSN
  from the same Sentry organization.
- `SENTRY_TRACES_SAMPLE_RATE=0.2`
- `SENTRY_ENVIRONMENT=production`

Backend request bodies are disabled in Sentry. Audio recordings, reference
phrases, learner names, and API keys are not attached to spans. Trace spans
contain route names, response status, durations, and audio byte counts only.

## Verification

1. Build and install the native `1.5.0` preview APK.
2. Open **Engine QA → Reportes de errores → Enviar prueba**.
3. Confirm `SpanGlish QA diagnostic test` appears in Sentry.
4. Confirm its tags include runtime version, update ID, and operation. Real
   lesson failures also include lesson, card, stage, and the preceding actions.
5. For each EAS Update, upload the generated source maps with:

   `npm run sentry:upload-sourcemaps`
