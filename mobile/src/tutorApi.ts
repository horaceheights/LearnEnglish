import { fetch } from 'expo/fetch';
import { API_BASE_URL, APP_API_KEY } from './config';
import { accountHeaders, captureAccountIdentity } from './accountSession';
import { readTutorSpeech } from './tutorSpeechStream';
import type { TutorContext, TutorTransport } from './lessonTutor';

async function request<T>(path: string, body: object, signal: AbortSignal | undefined, read: (response: Response, check: () => void) => Promise<T>) {
  const check = captureAccountIdentity();
  const headers = await accountHeaders();
  check();
  if (!headers.Authorization) throw new Error('Inicia sesión para hablar con el tutor.');
  const response = await fetch(`${API_BASE_URL}/api/account/tutor/${path}`, {
    method: 'POST', headers: { ...headers, 'X-App-Key': APP_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal,
  }).catch(() => { throw new Error('No pudimos conectar con el tutor. Revisa tu conexión e inténtalo otra vez.'); });
  check();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Vuelve a iniciar sesión para hablar con el tutor.');
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'No pudimos conectar con el tutor.');
  }
  const result = await read(response, check);
  check();
  return result;
}
export const askTutor: TutorTransport = async (context, message, history, signal) =>
  request('chat', { ...context, message, history }, signal, response => response.json());
export async function transcribeTutor(context: TutorContext, audio: string, format: string, signal: AbortSignal): Promise<string> {
  return (await request('transcribe', { ...context, audio, format }, signal, response => response.json())).text;
}
export async function speakTutor(context: TutorContext, text: string, signal: AbortSignal, onAudio: (bytes: Uint8Array) => void) {
  return request('speech-stream', { ...context, text }, signal, (response, check) => readTutorSpeech(response, signal, check, onAudio));
}
