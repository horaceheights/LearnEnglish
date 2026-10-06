import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncLessonResult } from './api';
import { createScopedLessonResults } from './scopedLessonResults';

export const lessonResults = createScopedLessonResults(AsyncStorage);
export const syncLocalLessonResults = (userId: string) => lessonResults.sync(userId, syncLessonResult);
