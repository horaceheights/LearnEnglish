import { getApiBaseUrl } from './api';
import { accountHeaders, captureAccountIdentity } from '../../mobile/src/accountSession';
import { readTutorSpeech } from '../../mobile/src/tutorSpeechStream';

async function request(path, body, signal, read) {
  const check = captureAccountIdentity();
  const headers = await accountHeaders();
  check();
  if (!headers.Authorization) throw new Error('Inicia sesión para hablar con el tutor.');
  const response = await fetch(`${getApiBaseUrl()}/api/account/tutor/${path}`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json',
      'X-App-Key': process.env.NEXT_PUBLIC_APP_API_KEY || 'Lka_Ecgoda6om-OagWcyG0AK-zrmiD1c' },
    body: JSON.stringify(body), signal,
  }).catch(() => { throw new Error('No pudimos conectar con el tutor. Revisa tu conexión e inténtalo otra vez.'); });
  check();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Vuelve a iniciar sesión para hablar con el tutor.');
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos conectar con el tutor.');
  }
  const result = await read(response, check);
  check();
  return result;
}
export const askTutor = (context, message, history, signal) => request('chat', { ...context, message, history }, signal, response => response.json());
export const transcribeTutor = async (context, audio, format, signal) => (await request('transcribe', { ...context, audio, format }, signal, response => response.json())).text;
export const speakTutor = (context, text, signal, onAudio) => request('speech-stream', { ...context, text }, signal,
  (response, check) => readTutorSpeech(response, signal, check, onAudio));
