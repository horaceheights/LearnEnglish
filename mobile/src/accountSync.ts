import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { getAccountSnapshot, syncAccountCheckpoint } from './api';
import { getAccountSession, progressScope, setAccountSession } from './accountSession';
import { createAccountSyncStore, createAccountSyncCoordinator, type AccountSnapshot } from './accountSyncStore';
import { lessonResults, syncLocalLessonResults } from './localLessonResults';
import type { SavedLessonRun } from './lessonResume';

export const accountCheckpoints = createAccountSyncStore(AsyncStorage);
export async function acceptAccountSnapshot(snapshot: AccountSnapshot) {
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
export function chooseCheckpoint(local: SavedLessonRun | null, remote: SavedLessonRun | null): Promise<'local' | 'remote'> {
  return new Promise(resolve => Alert.alert('Progreso en dos dispositivos',
    'Elige el punto desde el que quieres continuar. Se conservará una copia del otro intento.', [
      { text: `Este dispositivo · tarjeta ${(local?.cardIndex ?? -1) + 1}`, onPress: () => resolve('local') },
      { text: `Otro dispositivo · tarjeta ${(remote?.cardIndex ?? -1) + 1}`, onPress: () => resolve('remote') },
    ], { cancelable: false }));
}
export async function loadAccountCheckpoint(userId: string, lessonId: string, storageKey: string) {
  const scope = progressScope(userId);
  await synchronizeAccount().catch(() => undefined);
  const run = await accountCheckpoints.load(scope, lessonId, chooseCheckpoint);
  if (run) await AsyncStorage.setItem(storageKey, JSON.stringify(run));
  else if (await accountCheckpoints.has(scope, lessonId)) await AsyncStorage.removeItem(storageKey);
  return run;
}
