import { getApiBaseUrl } from './api';
import { accountHeaders, getAccountSession } from '../../mobile/src/accountSession';

async function request(path, body, signal) {
  const owner = getAccountSession();
  const headers = await accountHeaders();
  if (!headers.Authorization) throw new Error('Inicia sesión para hablar con el tutor.');
  const response = await fetch(`${getApiBaseUrl()}/api/account/tutor/${path}`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json',
      'X-App-Key': process.env.NEXT_PUBLIC_APP_API_KEY || 'Lka_Ecgoda6om-OagWcyG0AK-zrmiD1c' },
    body: JSON.stringify(body), signal,
  }).catch(() => { throw new Error('No pudimos conectar con el tutor. Revisa tu conexión e inténtalo otra vez.'); });
  if (getAccountSession() !== owner) throw new Error('La cuenta cambió. Abre el tutor otra vez.');
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Vuelve a iniciar sesión para hablar con el tutor.');
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos conectar con el tutor.');
  }
  return response;
}
export const askTutor = async (context, message, history, signal) => (await request('chat', { ...context, message, history }, signal)).json();
export const transcribeTutor = async (context, audio, format, signal) => (await (await request('transcribe', { ...context, audio, format }, signal)).json()).text;
export const speakTutor = async (context, text, signal) => (await request('speech', { ...context, text }, signal)).blob();
