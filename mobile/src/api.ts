import * as Sentry from '@sentry/react-native';
import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { API_BASE_URL } from './config';
import type {
  LearnerProfile,
  LessonFeedbackInput,
  Lesson,
  LessonSummary,
  PronunciationResult,
  SavedUser,
} from './types';

const STANDARD_REQUEST_TIMEOUT_MS = 70000;
const PRONUNCIATION_REQUEST_TIMEOUT_MS = 45000;

function routeTemplate(path: string): string {
  return path
    .replace(/\/by-name\/[^/?]+/i, '/by-name/:display_name')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
}

function tracedHeaders(headers: HeadersInit | undefined, span: Sentry.Span): Headers {
  const traced = new Headers(headers);
  const context = span.spanContext();
  const sampled = (context.traceFlags & 1) === 1 ? '1' : '0';
  traced.set('sentry-trace', `${context.traceId}-${context.spanId}-${sampled}`);
  return traced;
}

function requestError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('La conexión tardó demasiado. Revisa tu internet e inténtalo otra vez.');
  }
  if (error instanceof Error && /network|fetch|internet|connection/i.test(error.message)) {
    return new Error('No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.');
  }
  return error instanceof Error ? error : new Error('Ocurrió un problema de conexión. Inténtalo otra vez.');
}

async function responsePayload(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) return null;
  try {
    return JSON.parse(body);
  } catch {
    if (!response.ok) {
      throw new Error(`El servidor no pudo completar la solicitud (${response.status}). Inténtalo otra vez.`);
    }
    throw new Error('El servidor envió una respuesta que la app no pudo interpretar.');
  }
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method || 'GET';
  return Sentry.startSpan(
    {
      name: `${method} ${routeTemplate(path)}`,
      op: 'http.client',
      attributes: {
        'http.request.method': method,
        'server.address': 'learnenglish-fxki.onrender.com',
      },
    },
    async (span) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), STANDARD_REQUEST_TIMEOUT_MS);
      try {
        const headers = tracedHeaders(init?.headers, span);
        headers.set('Content-Type', 'application/json');
        const response = await fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        });
        span.setAttribute('http.response.status_code', response.status);
        const payload = await responsePayload(response);
        if (!response.ok) {
          const detail = payload && typeof payload === 'object' && 'detail' in payload
            ? payload.detail
            : undefined;
          throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status}).`);
        }
        return payload as T;
      } catch (error) {
        span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
        throw requestError(error);
      } finally {
        clearTimeout(timeout);
      }
    }
  );
}

export function getLessons(): Promise<LessonSummary[]> {
  return jsonRequest('/api/lessons');
}

export async function getLesson(lessonId: string): Promise<Lesson> {
  return jsonRequest(`/api/lessons/${lessonId}`);
}

export function getLearnerByName(displayName: string): Promise<SavedUser> {
  return jsonRequest(`/api/users/by-name/${encodeURIComponent(displayName)}`);
}

export function saveLearnerProfile(profile: LearnerProfile): Promise<SavedUser> {
  const path = profile.userId ? `/api/users/${profile.userId}` : '/api/users';
  return jsonRequest(path, {
    method: profile.userId ? 'PUT' : 'POST',
    body: JSON.stringify({ display_name: profile.displayName, profile }),
  });
}

export function deleteLearnerProfile(userId: string): Promise<{ deleted: boolean }> {
  return jsonRequest(`/api/users/${userId}`, { method: 'DELETE' });
}

export function startLessonSession(userId: string, lessonId: string, totalCards: number) {
  return jsonRequest<{ id: string }>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, lesson_id: lessonId, total_cards: totalCards }),
  });
}

export function finishLessonSession(sessionId: string, score: number, totalCards: number) {
  return jsonRequest(`/api/sessions/${sessionId}/finish`, {
    method: 'PATCH',
    body: JSON.stringify({ score, total_cards: totalCards }),
  });
}

export function logCardAttempt(input: {
  sessionId: string;
  userId: string;
  lessonId: string;
  cardIndex: number;
  prompt: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  firstTry: boolean;
}) {
  return jsonRequest('/api/card-attempts', {
    method: 'POST',
    body: JSON.stringify({
      session_id: input.sessionId,
      user_id: input.userId,
      lesson_id: input.lessonId,
      card_index: input.cardIndex,
      prompt: input.prompt,
      selected_option_id: input.selectedOptionId,
      correct_option_id: input.correctOptionId,
      is_correct: input.isCorrect,
      first_try: input.firstTry,
    }),
  });
}

export function saveLessonFeedback(input: LessonFeedbackInput) {
  return jsonRequest<{ id: string; submitted_at: string }>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      user_id: input.userId,
      session_id: input.sessionId || null,
      lesson_id: input.lessonId,
      clarity_rating: input.clarityRating,
      learning_support: input.learningSupport,
      comment_text: input.commentText?.trim() || null,
      score: input.score,
      total_cards: input.totalCards,
      app_version: input.appVersion || null,
      update_id: input.updateId || null,
      viewport_width: Math.round(input.viewportWidth),
      viewport_height: Math.round(input.viewportHeight),
    }),
  });
}

export async function transcribeFeedback(recordingUri: string): Promise<string> {
  return Sentry.startSpan(
    { name: 'POST /api/feedback/transcribe', op: 'http.client' },
    async (span) => {
      const formData = new FormData();
      formData.append('locale', 'es-MX');
      formData.append('audio', new File(recordingUri), 'feedback.m4a');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRONUNCIATION_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE_URL}/api/feedback/transcribe`, {
          method: 'POST',
          body: formData,
          headers: tracedHeaders(undefined, span),
          signal: controller.signal,
        });
        span.setAttribute('http.response.status_code', response.status);
        const payload = await response.json();
        if (!response.ok) {
          const detail = typeof payload?.detail === 'string'
            ? payload.detail
            : JSON.stringify(payload?.detail || payload);
          throw new Error(detail || `Transcription failed (${response.status}).`);
        }
        return String(payload.transcript || '').trim();
      } catch (error) {
        throw requestError(error);
      } finally {
        clearTimeout(timeout);
      }
    },
  );
}

export async function scorePronunciation(
  recordingUri: string,
  phrase: string,
  userId?: string,
  clientTiming?: { recorderFinalizeMs?: number },
): Promise<PronunciationResult> {
  return Sentry.startSpan(
    {
      name: 'POST /api/pronunciation/score',
      op: 'http.client',
      attributes: {
        'http.request.method': 'POST',
        'pronunciation.provider': 'azure',
        'pronunciation.recorder_finalize_ms': clientTiming?.recorderFinalizeMs,
        'server.address': 'learnenglish-fxki.onrender.com',
      },
    },
    async (span) => {
      const requestStartedAt = Date.now();
      const formData = new FormData();
      formData.append('text', phrase);
      formData.append('provider', 'azure');
      if (userId) formData.append('user_id', userId);
      const recordingName = recordingUri.toLocaleLowerCase().includes('.wav')
        ? 'pronunciation.wav'
        : 'pronunciation.m4a';
      formData.append('audio', new File(recordingUri), recordingName);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PRONUNCIATION_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE_URL}/api/pronunciation/score`, {
          method: 'POST',
          body: formData,
          headers: tracedHeaders(undefined, span),
          signal: controller.signal,
        });
        span.setAttribute('http.response.status_code', response.status);
        const payload = await response.json();
        if (!response.ok) {
          const detail =
            typeof payload?.detail === 'string'
              ? payload.detail
              : JSON.stringify(payload?.detail || payload);
          throw new Error(detail || `Scoring failed (${response.status}).`);
        }
        const result = payload as PronunciationResult;
        const clientRequestMs = Date.now() - requestStartedAt;
        result._timing = {
          ...result._timing,
          client_request_ms: clientRequestMs,
        };
        span.setAttribute('pronunciation.client_request_ms', clientRequestMs);
        if (typeof result._timing?.backend_total_ms === 'number') {
          span.setAttribute('pronunciation.backend_total_ms', result._timing.backend_total_ms);
        }
        if (typeof result._timing?.provider_ms === 'number') {
          span.setAttribute('pronunciation.provider_ms', result._timing.provider_ms);
        }
        return result;
      } catch (error) {
        span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
        throw requestError(error);
      } finally {
        clearTimeout(timeout);
      }
    }
  );
}

export async function getPronunciationStreamingToken(): Promise<{
  token: string;
  region: string;
  locale: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRONUNCIATION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/pronunciation/token`, {
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = typeof payload?.detail === 'string'
        ? payload.detail
        : JSON.stringify(payload?.detail || payload);
      throw new Error(detail || `Could not start live pronunciation (${response.status}).`);
    }
    return {
      token: String(payload.token || ''),
      region: String(payload.region || ''),
      locale: String(payload.locale || 'en-US'),
    };
  } catch (error) {
    throw requestError(error);
  } finally {
    clearTimeout(timeout);
  }
}
