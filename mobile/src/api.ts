import { fetch } from 'expo/fetch';
import { File } from 'expo-file-system';

import { API_BASE_URL } from './config';
import type { Lesson, PronunciationResult } from './types';

export async function getLesson(lessonId: string): Promise<Lesson> {
  const response = await fetch(`${API_BASE_URL}/api/lessons/${lessonId}`);
  if (!response.ok) throw new Error(`Could not load the lesson (${response.status}).`);
  return response.json() as Promise<Lesson>;
}

export async function scorePronunciation(
  recordingUri: string,
  phrase: string,
): Promise<PronunciationResult> {
  const formData = new FormData();
  formData.append('text', phrase);
  formData.append('provider', 'azure');
  formData.append('audio', new File(recordingUri), 'pronunciation.m4a');
  const response = await fetch(`${API_BASE_URL}/api/pronunciation/score`, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail =
      typeof payload?.detail === 'string'
        ? payload.detail
        : JSON.stringify(payload?.detail || payload);
    throw new Error(detail || `Scoring failed (${response.status}).`);
  }
  return payload as PronunciationResult;
}
