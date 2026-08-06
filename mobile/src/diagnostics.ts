import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

export type DiagnosticContext = {
  lessonId?: string;
  cardIndex?: number;
  totalCards?: number;
  stage?: string;
  prompt?: string;
  qaMode?: boolean;
  operation?: string;
};

let currentContext: DiagnosticContext = {};
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';
const configuredTraceSampleRate = Number(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.2',
);
const traceSampleRate = Number.isFinite(configuredTraceSampleRate)
  ? Math.min(Math.max(configuredTraceSampleRate, 0), 1)
  : 0.2;

export function isExpectedConnectivityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /unknownhostexception|unable to resolve host|no address associated with hostname|network request failed|failed to fetch|fetch failed|enotfound|eai_again|no pudimos conectarnos|revisa tu internet|conexi.n.*(?:internet|d.bil)/i.test(message);
}

function sentryEventIsConnectivityFailure(
  event: { message?: string; exception?: { values?: { type?: string; value?: string }[] } },
  originalException?: unknown,
): boolean {
  if (isExpectedConnectivityError(originalException)) return true;
  if (isExpectedConnectivityError(event.message)) return true;
  return (event.exception?.values ?? []).some((value) =>
    isExpectedConnectivityError(value.value || value.type),
  );
}

function updateSentryContext(): void {
  Sentry.setContext('learning_activity', {
    lesson_id: currentContext.lessonId || 'none',
    card_number: typeof currentContext.cardIndex === 'number' ? currentContext.cardIndex + 1 : 0,
    total_cards: currentContext.totalCards || 0,
    stage: currentContext.stage || 'none',
    prompt: currentContext.prompt || 'none',
    qa_mode: Boolean(currentContext.qaMode),
    operation: currentContext.operation || 'idle',
  });
}

export function initializeDiagnostics(): void {
  Sentry.init({
    dsn: sentryDsn,
    enabled: Boolean(sentryDsn),
    integrations: [
      Sentry.reactNativeTracingIntegration({
        shouldCreateSpanForRequest: (url) => url.includes('learnenglish-fxki.onrender.com'),
        traceFetch: true,
        traceXHR: false,
      }),
      Sentry.mobileReplayIntegration({
        maskAllImages: true,
        maskAllText: true,
        maskAllVectors: true,
      }),
    ],
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    sendDefaultPii: false,
    enableAppStartTracking: true,
    enableCaptureFailedRequests: true,
    enableNativeFramesTracking: true,
    enableStallTracking: true,
    enableUserInteractionTracing: true,
    tracePropagationTargets: ['learnenglish-fxki.onrender.com'],
    tracesSampleRate: traceSampleRate,
    // Offline and DNS failures are expected operating conditions, not code
    // defects. Their request spans remain available for performance analysis.
    beforeSend: (event, hint) =>
      sentryEventIsConnectivityFailure(event, hint?.originalException) ? null : event,
  });

  Sentry.setTags({
    'expo.update_id': Updates.updateId || 'embedded',
    'expo.embedded_update': String(Updates.isEmbeddedLaunch),
    'expo.runtime_version': Updates.runtimeVersion || 'unknown',
  });
  updateSentryContext();
}

export function setDiagnosticContext(context: DiagnosticContext): void {
  currentContext = { ...context };
  updateSentryContext();
}

export function getDiagnosticContext(): DiagnosticContext {
  return { ...currentContext };
}

export function setDiagnosticOperation(operation: string): void {
  currentContext = { ...currentContext, operation };
  updateSentryContext();
}

export function addDiagnosticBreadcrumb(
  message: string,
  data?: Record<string, boolean | number | string | null | undefined>,
): void {
  Sentry.addBreadcrumb({ category: 'spanglish', data, level: 'info', message });
}

export function captureDiagnosticError(
  error: unknown,
  operation: string,
  details?: Record<string, boolean | number | string | null | undefined>,
  level: 'error' | 'warning' = 'error',
): string | undefined {
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  const diagnostic = getDiagnosticContext();

  if (isExpectedConnectivityError(normalizedError)) {
    console.warn(`[SpanGlish] ${operation}`, normalizedError.message);
    addDiagnosticBreadcrumb('connectivity_unavailable', { ...details, operation });
    return undefined;
  }

  console[level === 'error' ? 'error' : 'warn'](
    `[SpanGlish] ${operation}`,
    normalizedError,
    { ...diagnostic, ...details },
  );

  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setTag('operation', operation);
    if (diagnostic.lessonId) scope.setTag('lesson_id', diagnostic.lessonId);
    if (typeof diagnostic.cardIndex === 'number') {
      scope.setTag('card_number', String(diagnostic.cardIndex + 1));
    }
    if (diagnostic.stage) scope.setTag('stage', diagnostic.stage);
    scope.setContext('failure', { ...details, operation });
    return Sentry.captureException(normalizedError);
  });
}

export function isCrashReportingConfigured(): boolean {
  return Boolean(sentryDsn);
}
