import { createScopedLessonResults } from '../../mobile/src/scopedLessonResults';
import { syncLessonResult } from './api';

export const lessonResults = createScopedLessonResults({
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
});
export const syncLocalLessonResults = (userId) => lessonResults.sync(userId, syncLessonResult);
