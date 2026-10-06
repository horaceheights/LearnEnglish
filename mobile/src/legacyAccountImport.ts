import { newLessonRunId, parseLessonResult, type LessonResult } from './lessonResult';
import { parseSavedLessonRun, type SavedLessonRun } from './lessonResume';
import type { LearnerProfile, LessonSummary } from './types';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };

/** Import device-held history only after the learner chooses the destination.
 * Old server UUIDs and names do not prove ownership. Keep original bytes and a
 * persistent run-ID mapping so retries cannot duplicate a finished lesson. */
export async function importLegacyAccount(
  storage: Storage, profile: LearnerProfile, userId: string, lessons: LessonSummary[],
  saveResult: (result: LessonResult) => Promise<unknown>,
  saveRun: (lessonId: string, run: SavedLessonRun) => Promise<unknown>,
) {
  const oldId = profile.userId || profile.displayName.trim().toLowerCase();
  if (!oldId || oldId === userId) return;
  const markerKey = `spanglish-legacy-account-import-v1:${oldId}`;
  const rawMarker = await storage.getItem(markerKey);
  const marker: { destination: string; runs: Record<string, string>; complete?: boolean } = rawMarker
    ? JSON.parse(rawMarker) : { destination: userId, runs: {} };
  if (marker.destination !== userId) throw new Error('Este progreso ya se vinculó a otra cuenta.');
  if (marker.complete) return;
  const runId = async (oldRunId: string) => {
    if (!marker.runs[oldRunId]) {
      marker.runs[oldRunId] = newLessonRunId();
      await storage.setItem(markerKey, JSON.stringify(marker));
    }
    return marker.runs[oldRunId];
  };
  const entries = JSON.parse(await storage.getItem(`spanglish-lesson-results-v1:${oldId}`) || '[]');
  for (const entry of entries) {
    const result = parseLessonResult(entry.result);
    if (!result || result.userId !== oldId) throw new Error('El progreso anterior necesita revisión. Conservamos la copia original.');
    const { serverOrder: _oldOrder, ...original } = result;
    await saveResult({ ...original, userId, id: await runId(result.id) });
  }
  for (const lesson of lessons) {
    const raw = await storage.getItem(`spanglish-lesson-resume-v1:${oldId}:${lesson.id}`);
    if (!raw) continue;
    const original = JSON.parse(raw) as SavedLessonRun;
    // Preserve the old content revision, even when today's lesson changed.
    const run = parseSavedLessonRun(raw, original.cardCount, original.contentRevision);
    if (!run?.sessionId) continue;
    await saveRun(lesson.id, { ...run, sessionId: await runId(run.sessionId),
      ...(run.resultId ? { resultId: await runId(run.resultId) } : {}) });
  }
  marker.complete = true; await storage.setItem(markerKey, JSON.stringify(marker));
}
