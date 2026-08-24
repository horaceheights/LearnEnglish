import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * expo-updates is disabled when JavaScript is being served by Metro and
 * enabled in installed builds that can check the configured EAS channel.
 *
 * Do not infer this from Constants.executionEnvironment: modern EAS builds
 * are not guaranteed to report the legacy Standalone value.
 */
export const canUseEasUpdates = Updates.isEnabled;
export const currentReleaseCommit = (process.env.EXPO_PUBLIC_RELEASE_COMMIT || 'embedded').slice(0, 7);

const UPDATE_COMPLETED_STORAGE_KEY = 'app:update-completed-message';

export type UpdateReceipt = {
  build?: string;
  commit?: string;
  targetUpdateId?: string;
  updateId: string;
  version: string;
};

export function getCurrentUpdateReceipt(targetUpdateId?: string): UpdateReceipt {
  return {
    build: Constants.nativeBuildVersion || 'no disponible',
    commit: currentReleaseCommit,
    targetUpdateId,
    updateId: Updates.updateId || 'embedded',
    version: Constants.nativeAppVersion || Updates.runtimeVersion || '1.6.0',
  };
}

export async function saveUpdateReceiptBeforeReload(targetUpdateId?: string): Promise<void> {
  await AsyncStorage.setItem(
    UPDATE_COMPLETED_STORAGE_KEY,
    JSON.stringify(getCurrentUpdateReceipt(targetUpdateId)),
  );
}

async function clearUpdateReceipt(): Promise<void> {
  await AsyncStorage.removeItem(UPDATE_COMPLETED_STORAGE_KEY);
}

export function releaseVersionLabel(version: string, commit = currentReleaseCommit): string {
  return `Versión ${version} · Commit ${commit}`;
}

function parseUpdateReceipt(value: string): UpdateReceipt | 'legacy' | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === true) return 'legacy';
    if (
      typeof parsed !== 'object'
      || parsed === null
      || !('updateId' in parsed)
      || typeof parsed.updateId !== 'string'
      || !('version' in parsed)
      || typeof parsed.version !== 'string'
    ) {
      return null;
    }
    return parsed as UpdateReceipt;
  } catch {
    return null;
  }
}

/**
 * Returns the one-time learner message only after the downloaded update is
 * actually running. A receipt whose target does not match is kept so a later
 * cold start can still confirm the update after Expo activates it.
 */
export async function consumeCompletedUpdateMessage(): Promise<string | null> {
  const storedReceipt = await AsyncStorage.getItem(UPDATE_COMPLETED_STORAGE_KEY);
  if (!storedReceipt) return null;

  // Earlier versions wrote a one-time boolean flag instead of version data.
  const previous = parseUpdateReceipt(storedReceipt);
  const current = getCurrentUpdateReceipt();

  if (previous === 'legacy') {
    await clearUpdateReceipt();
    return releaseVersionLabel(current.version, current.commit);
  }
  if (!previous) {
    await clearUpdateReceipt();
    return null;
  }

  const updateChanged = previous?.targetUpdateId
    ? current.updateId === previous.targetUpdateId
    : current.updateId !== previous.updateId;

  if (!updateChanged) return null;

  await clearUpdateReceipt();
  return releaseVersionLabel(current.version, current.commit);
}
