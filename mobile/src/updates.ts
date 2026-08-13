import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Development clients load JavaScript from Metro and reject the imperative
 * expo-updates APIs, even when the native updates module reports as enabled.
 */
export const canUseEasUpdates =
  Updates.isEnabled && Constants.executionEnvironment === ExecutionEnvironment.Standalone;
