import { createAccountSyncStore, createAccountSyncCoordinator } from '../../mobile/src/accountSyncStore';
import { getAccountSession, progressScope, setAccountSession } from '../../mobile/src/accountSession';
import { getAccountSnapshot, syncAccountCheckpoint } from './api';
import { lessonResults, syncLocalLessonResults } from './localLessonResults';

const storage = {
  getItem: async key => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
};
export const accountCheckpoints = createAccountSyncStore(storage);
export async function acceptAccountSnapshot(snapshot) {
  const current = getAccountSession();
  setAccountSession({ userId: snapshot.user.id, generation: snapshot.generation,
    profileVersion: current?.userId === snapshot.user.id && current.generation === snapshot.generation
      ? Math.max(current.profileVersion, snapshot.profileVersion) : snapshot.profileVersion });
  const scope = progressScope(snapshot.user.id);
  await lessonResults.importRemote(snapshot.user.id, snapshot.results);
  await accountCheckpoints.accept(scope, snapshot.checkpoints);
}
const coordinator = createAccountSyncCoordinator(async () => {
  const previous = getAccountSession();
  if (!previous) return;
  const snapshot = await getAccountSnapshot();
  if (getAccountSession()?.userId !== previous.userId || getAccountSession()?.generation !== previous.generation) return;
  if (snapshot.generation !== previous.generation) throw new Error('Tu progreso fue restablecido. Cierra sesión y vuelve a entrar.');
  await acceptAccountSnapshot(snapshot);
  if (getAccountSession()?.userId !== previous.userId || getAccountSession()?.generation !== previous.generation) return;
  await syncLocalLessonResults(snapshot.user.id);
  if (getAccountSession()?.userId !== previous.userId || getAccountSession()?.generation !== previous.generation) return;
  await accountCheckpoints.sync(progressScope(snapshot.user.id), syncAccountCheckpoint);
  return snapshot;
});
export const synchronizeAccount = coordinator.sync;
export const scheduleAccountSync = coordinator.schedule;
export const subscribeAccountSync = coordinator.subscribe;
export async function loadAccountCheckpoint(userId, lessonId, key) {
  const scope = progressScope(userId);
  await synchronizeAccount().catch(() => undefined);
  const run = await accountCheckpoints.load(scope, lessonId, async (local, remote) =>
    window.confirm(`Hay progreso en dos dispositivos. Aceptar: otro dispositivo (tarjeta ${(remote?.cardIndex ?? -1) + 1}). Cancelar: este dispositivo (tarjeta ${(local?.cardIndex ?? -1) + 1}). Conservaremos una copia del otro intento.`) ? 'remote' : 'local');
  if (run) window.localStorage.setItem(key, JSON.stringify(run));
  else if (await accountCheckpoints.has(scope, lessonId)) window.localStorage.removeItem(key);
  return run;
}
