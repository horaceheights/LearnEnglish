import type { LessonResult } from './lessonResult';
import type { SavedLessonRun } from './lessonResume';
import type { SavedUser } from './types';
import { getAccountSession, progressScope } from './accountSession';

export type Checkpoint = { lessonId: string; revision: number; run: SavedLessonRun | null };
export type AccountSnapshot = {
  user: SavedUser; generation: string; profileVersion: number; qaAccess: boolean;
  results: LessonResult[]; checkpoints: Checkpoint[];
};
type Entry = Checkpoint & { dirty: boolean; conflict?: Checkpoint; previous?: SavedLessonRun | null; obsolete?: boolean };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };

// JSON property order changes across Python and JavaScript. Compare values,
// including nested card-state objects, without manufacturing a conflict.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function createAccountSyncCoordinator(perform: () => Promise<AccountSnapshot | undefined>) {
  const active = new Map<string, Promise<AccountSnapshot | undefined>>();
  const listeners = new Set<(snapshot?: AccountSnapshot, error?: Error) => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sync = () => {
    const account = getAccountSession();
    if (!account) return Promise.resolve(undefined);
    const scope = progressScope(account.userId);
    const pending = active.get(scope); if (pending) return pending;
    const operation = perform().then(snapshot => {
      if (progressScope(account.userId) === scope && snapshot) listeners.forEach(listener => listener(snapshot));
      return snapshot;
    }).catch(error => {
      if (getAccountSession()?.userId === account.userId && progressScope(account.userId) === scope)
        listeners.forEach(listener => listener(undefined, error));
      throw error;
    }).finally(() => active.delete(scope));
    active.set(scope, operation); return operation;
  };
  return {
    sync,
    schedule() { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = undefined; void sync().catch(() => undefined); }, 1500); },
    subscribe(listener: (snapshot?: AccountSnapshot, error?: Error) => void) {
      listeners.add(listener); return () => { listeners.delete(listener); };
    },
  };
}

/** Durable, account/generation-scoped checkpoint queue with compare-and-set writes.
 * Device clocks do not choose a winner. Conflicting runs remain available until
 * the learner explicitly chooses which run to resume. */
export function createAccountSyncStore(storage: Storage) {
  let writing: Promise<unknown> = Promise.resolve();
  const syncing = new Map<string, Promise<void>>();
  const key = (scope: string) => `spanglish-account-checkpoints-v1:${scope}`;
  const read = async (scope: string): Promise<Entry[]> => {
    const entries = JSON.parse(await storage.getItem(key(scope)) || '[]');
    if (!Array.isArray(entries) || entries.some(item => !item || typeof item.lessonId !== 'string'
      || !Number.isInteger(item.revision) || item.revision < 0 || typeof item.dirty !== 'boolean')) {
      throw new Error('No pudimos leer el progreso guardado. Se conserva para recuperación.');
    }
    return entries;
  };
  const change = <T>(operation: () => Promise<T>) => {
    const next = writing.then(operation, operation); writing = next.catch(() => undefined); return next;
  };
  const write = (scope: string, entries: Entry[]) => storage.setItem(key(scope), JSON.stringify(entries));
  return {
    accept(scope: string, remote: Checkpoint[]) { return change(async () => {
      const entries = await read(scope);
      for (const checkpoint of remote) {
        const current = entries.find(item => item.lessonId === checkpoint.lessonId);
        if (!current) entries.push({ ...checkpoint, dirty: false });
        else if (!current.dirty) Object.assign(current, checkpoint);
        else if (canonical(current.run) === canonical(checkpoint.run)) {
          current.revision = checkpoint.revision; current.dirty = false; delete current.conflict;
        } else if (current.revision !== checkpoint.revision) current.conflict = checkpoint;
      }
      await write(scope, entries);
    }); },
    save(scope: string, lessonId: string, run: SavedLessonRun | null) { return change(async () => {
      const entries = await read(scope);
      const current = entries.find(item => item.lessonId === lessonId);
      if (current) { current.run = run; current.dirty = true; delete current.obsolete; }
      else entries.push({ lessonId, run, revision: 0, dirty: true });
      await write(scope, entries);
    }); },
    async has(scope: string, lessonId: string) {
      await writing; return (await read(scope)).some(item => item.lessonId === lessonId);
    },
    async load(scope: string, lessonId: string, choose: (local: SavedLessonRun | null, remote: SavedLessonRun | null) => Promise<'local' | 'remote'>) {
      for (;;) {
        await writing;
        const current = (await read(scope)).find(item => item.lessonId === lessonId);
        if (!current?.conflict) return current?.run ?? null;
        const offered = canonical({ run: current.run, conflict: current.conflict });
        const choice = await choose(current.run, current.conflict.run);
        const resolved = await change(async () => {
          const entries = await read(scope);
          const entry = entries.find(item => item.lessonId === lessonId)!;
          // A response arriving while the choice is open requires a fresh choice.
          if (canonical({ run: entry.run, conflict: entry.conflict }) !== offered) return { retry: true, run: null };
          // Retain the displaced run for recovery; never silently discard it.
          entry.previous = choice === 'remote' ? entry.run : entry.conflict!.run;
          if (choice === 'remote') entry.run = entry.conflict!.run;
          entry.revision = entry.conflict!.revision;
          entry.dirty = choice === 'local'; delete entry.conflict;
          await write(scope, entries); return { retry: false, run: entry.run };
        });
        if (!resolved.retry) return resolved.run;
      }
    },
    sync(scope: string, send: (checkpoint: Checkpoint) => Promise<Checkpoint>) {
      const active = syncing.get(scope); if (active) return active;
      const operation = (async () => {
        await writing;
        for (;;) {
          const entry = (await read(scope)).find(item => item.dirty && !item.conflict && !item.obsolete);
          if (!entry) return;
          const sent = canonical(entry.run);
          let returned: Checkpoint;
          try { returned = await send(entry); }
          catch (error) {
            const conflict = (error as { detail?: { code?: string } & Checkpoint }).detail;
            if (conflict?.code === 'checkpoint_obsolete') {
              await change(async () => {
                const entries = await read(scope);
                const current = entries.find(item => item.lessonId === entry.lessonId)!;
                if (canonical(current.run) === sent) current.obsolete = true;
                await write(scope, entries);
              });
              continue;
            }
            if (conflict?.code !== 'checkpoint_conflict') throw error;
            await change(async () => {
              const entries = await read(scope);
              const current = entries.find(item => item.lessonId === entry.lessonId)!;
              current.conflict = conflict; await write(scope, entries);
            });
            continue;
          }
          await change(async () => {
            const entries = await read(scope);
            const current = entries.find(item => item.lessonId === entry.lessonId)!;
            current.revision = returned.revision;
            // A delayed acknowledgement must not clear newer local progress.
            current.dirty = canonical(current.run) !== sent;
            await write(scope, entries);
          });
        }
      })().finally(() => syncing.delete(scope));
      syncing.set(scope, operation); return operation;
    },
    flush: () => writing.then(() => undefined),
  };
}
