import * as Updates from 'expo-updates';

/**
 * expo-updates is disabled when JavaScript is being served by Metro and
 * enabled in installed builds that can check the configured EAS channel.
 *
 * Do not infer this from Constants.executionEnvironment: modern EAS builds
 * are not guaranteed to report the legacy Standalone value.
 */
export const canUseEasUpdates = Updates.isEnabled;
