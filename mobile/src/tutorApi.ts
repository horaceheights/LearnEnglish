import { fetch } from 'expo/fetch';
import { API_BASE_URL, APP_API_KEY } from './config';
import { accountHeaders, getAccountSession } from './accountSession';
import type { TutorContext, TutorTransport } from './lessonTutor';

async function request(path: string, body: object, signal?: AbortSignal) {
  const owner = getAccountSession();
  const headers = await accountHeaders();
  if (!headers.Authorization) throw new Error('Inicia sesión para hablar con el tutor.');
  const response = await fetch(`${API_BASE_URL}/api/account/tutor/${path}`, {
    method: 'POST', headers: { ...headers, 'X-App-Key': APP_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal,
  }).catch(() => { throw new Error('No pudimos conectar con el tutor. Revisa tu conexión e inténtalo otra vez.'); });
  if (getAccountSession() !== owner) throw new Error('La cuenta cambió. Abre el tutor otra vez.');
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Vuelve a iniciar sesión para hablar con el tutor.');
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.detail === 'string' ? payload.detail : 'No pudimos conectar con el tutor.');
  }
  return response;
}
export const askTutor: TutorTransport = async (context, message, history, signal) =>
  (await request('chat', { ...context, message, history }, signal)).json();
export async function transcribeTutor(context: TutorContext, audio: string, format: string, signal: AbortSignal): Promise<string> {
  return (await (await request('transcribe', { ...context, audio, format }, signal)).json()).text;
}
export async function speakTutor(context: TutorContext, text: string, signal: AbortSignal) {
  return new Uint8Array(await (await request('speech', { ...context, text }, signal)).arrayBuffer());
}
