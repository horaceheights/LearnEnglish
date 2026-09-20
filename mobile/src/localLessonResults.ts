import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncLessonResult } from './api';
import { createLessonResultStore } from './lessonResultStore';

export const lessonResults = createLessonResultStore(AsyncStorage);
export const syncLocalLessonResults = (userId: string) => lessonResults.sync(userId, syncLessonResult);
