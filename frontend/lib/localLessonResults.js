import { createLessonResultStore } from '../../mobile/src/lessonResultStore';
import { syncLessonResult } from './api';

export const lessonResults = createLessonResultStore({
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
});
export const syncLocalLessonResults = (userId) => lessonResults.sync(userId, syncLessonResult);
