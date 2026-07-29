import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LearnerProfile, SavedUser } from './types';

const PROFILE_KEY = 'spanglish-profile-v1';

export const DEFAULT_PROFILE: LearnerProfile = {
  displayName: '',
  level: 'new',
  immediateGoal: 'unsure',
  learningMode: 'natural_guided',
  confidence: 'trying',
  sessionLength: 'short',
  challenge: [],
};

export async function loadLocalProfile(): Promise<LearnerProfile | null> {
  const stored = await AsyncStorage.getItem(PROFILE_KEY);
  if (!stored) return null;
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(stored) as LearnerProfile) };
  } catch {
    await AsyncStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export async function persistProfile(profile: LearnerProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearLocalProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}

export function profileFromUser(user: SavedUser): LearnerProfile {
  return {
    ...DEFAULT_PROFILE,
    ...user.profile,
    userId: user.id,
    displayName: user.display_name,
  };
}
