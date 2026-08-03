import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { API_BASE_URL } from './config';
import type {
  LearnerProfile,
  Lesson,
  LessonSummary,
  PronunciationResult,
  SavedUser,
} from './types';

const STANDARD_REQUEST_TIMEOUT_MS = 70000;
const PRONUNCIATION_REQUEST_TIMEOUT_MS = 45000;

function requestError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('La conexión tardó demasiado. Revisa tu internet e inténtalo otra vez.');
  }
  if (error instanceof Error && /network|fetch|internet|connection/i.test(error.message)) {
    return new Error('No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.');
  }
  return error instanceof Error ? error : new Error('Ocurrió un problema de conexión. Inténtalo otra vez.');
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STANDARD_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Request failed (${response.status}).`);
    }
    return payload as T;
  } catch (error) {
    throw requestError(error);
  } finally {
    clearTimeout(timeout);
  }
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

export async function scorePronunciation(
  recordingUri: string,
  phrase: string,
  userId?: string,
): Promise<PronunciationResult> {
  const requestStartedAt = Date.now();
  const formData = new FormData();
  formData.append('text', phrase);
  formData.append('provider', 'azure');
  if (userId) formData.append('user_id', userId);
  formData.append('audio', new File(recordingUri), 'pronunciation.m4a');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRONUNCIATION_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/pronunciation/score`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail =
        typeof payload?.detail === 'string'
          ? payload.detail
          : JSON.stringify(payload?.detail || payload);
      throw new Error(detail || `Scoring failed (${response.status}).`);
    }
    const result = payload as PronunciationResult;
    result._timing = {
      ...result._timing,
      client_request_ms: Date.now() - requestStartedAt,
    };
    return result;
  } catch (error) {
    throw requestError(error);
  } finally {
    clearTimeout(timeout);
  }
}
