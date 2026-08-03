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
      Sentry.mobileReplayIntegration({
        maskAllImages: true,
        maskAllText: true,
        maskAllVectors: true,
      }),
    ],
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    sendDefaultPii: false,
    tracesSampleRate: 0,
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
