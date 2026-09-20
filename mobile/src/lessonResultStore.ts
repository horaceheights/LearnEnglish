import { mergeLessonResult, parseLessonResult, resultSignature, type LessonResult } from './lessonResult';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
type Entry = { result: LessonResult; synced: boolean };
const PREFIX = 'spanglish-lesson-results-v1:';

/** Serialized durable outbox. A delayed acknowledgement cannot clear a newer correction. */
export function createLessonResultStore(storage: Storage) {
  let writing: Promise<unknown> = Promise.resolve();
  const syncing = new Map<string, Promise<void>>();
  const key = (userId: string) => PREFIX + userId;
  const read = async (userId: string): Promise<Entry[]> => {
    const raw = await storage.getItem(key(userId));
    if (!raw) return [];
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) throw new Error('No pudimos leer el progreso guardado.');
    return entries.map((entry) => {
      const result = parseLessonResult(entry.result);
      if (!result || result.userId !== userId) throw new Error('No pudimos leer el resultado guardado.');
      return { result, synced: entry.synced === true };
    });
  };
  const change = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = writing.then(operation, operation);
    writing = next.catch(() => undefined);
    return next;
  };
  const save = (result: LessonResult): Promise<LessonResult> => change(async () => {
    const validated = parseLessonResult(result);
    if (!validated) throw new Error('El resultado de la lección no es válido.');
    const entries = await read(result.userId);
    const entry = entries.find((item) => item.result.id === result.id);
    const merged = entry ? mergeLessonResult(entry.result, validated) : validated;
    if (entry) {
      if (resultSignature(entry.result) !== resultSignature(merged)) entry.synced = false;
      entry.result = merged;
    } else entries.push({ result: merged, synced: false });
    await storage.setItem(key(result.userId), JSON.stringify(entries));
    return merged;
  });
  return {
    save,
    async list(userId: string) { await writing; return (await read(userId)).map((entry) => entry.result); },
    async latest(userId: string, lessonId: string, totalCards: number, contentRevision?: number, runId?: string) {
      await writing;
      return (await read(userId)).map((entry) => entry.result).filter((result) => result.lessonId === lessonId
        && result.totalCards === totalCards && result.contentRevision === contentRevision && (!runId || result.id === runId))
        .sort((left, right) => right.completedAt.localeCompare(left.completedAt))[0] ?? null;
    },
    flush: () => writing.then(() => undefined),
    sync(userId: string, send: (result: LessonResult) => Promise<LessonResult>): Promise<void> {
      const active = syncing.get(userId);
      if (active) return active;
      const operation = (async () => {
        await writing;
        for (;;) {
          const entry = (await read(userId)).find((item) => !item.synced);
          if (!entry) break;
          const returned = await send(entry.result);
          await change(async () => {
            const entries = await read(userId);
            const current = entries.find((item) => item.result.id === entry.result.id);
            if (!current) return;
            current.result = mergeLessonResult(current.result, returned);
            current.synced = resultSignature(current.result) === resultSignature(returned);
            await storage.setItem(key(userId), JSON.stringify(entries));
          });
        }
      })().finally(() => syncing.delete(userId));
      syncing.set(userId, operation);
      return operation;
    },
  };
}
