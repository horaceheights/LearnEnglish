import { createLessonResultStore } from './lessonResultStore';
import { progressScope } from './accountSession';
import type { LessonResult } from './lessonResult';

export function createScopedLessonResults(storage: Parameters<typeof createLessonResultStore>[0]) {
  const stores = new Map<string, ReturnType<typeof createLessonResultStore>>();
  const forUser = (userId: string) => {
    const scope = progressScope(userId);
    if (!stores.has(scope)) stores.set(scope, createLessonResultStore(storage, () => scope));
    return stores.get(scope)!;
  };
  return {
    save: (result: LessonResult) => forUser(result.userId).save(result),
    list: (userId: string) => forUser(userId).list(userId),
    latest: (userId: string, ...args: Parameters<ReturnType<typeof createLessonResultStore>['latest']> extends [string, ...infer Rest] ? Rest : never) => forUser(userId).latest(userId, ...args),
    importRemote: (userId: string, results: LessonResult[]) => forUser(userId).importRemote(userId, results),
    sync: (userId: string, send: (result: LessonResult) => Promise<LessonResult>) => forUser(userId).sync(userId, send),
    flush: async () => { await Promise.all([...stores.values()].map(store => store.flush())); },
  };
}
