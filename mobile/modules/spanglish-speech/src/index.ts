import { requireOptionalNativeModule } from 'expo-modules-core';

export type SpeechLevelEvent = {
  active: boolean;
  elapsedMs: number;
  levelDb: number;
};

export type SpeechProgressEvent = {
  text: string;
};

export type SpeechResultEvent = {
  json: string;
  segmentText: string;
  text: string;
};

export type SpeechErrorEvent = {
  message: string;
};

type Subscription = { remove: () => void };

type NativeSpeechModule = {
  implementationVersion?: number;
  addListener: <T>(eventName: string, listener: (event: T) => void) => Subscription;
  startAsync: (options: {
    locale: string;
    referenceText: string;
    region: string;
    token: string;
  }) => Promise<void>;
  stopAsync: () => Promise<{ json: string; text: string; uri: string }>;
};

const nativeModule = requireOptionalNativeModule<NativeSpeechModule>('SpanGlishSpeech');

export const nativeStreamingImplementationVersion = nativeModule?.implementationVersion ?? 0;

// Version 1 waits for Azure's own initial-silence timeout during stopAsync.
// Fall back to expo-audio when an older dev client is connected so Metro-only
// updates still honor the three-second no-response flow.
export const nativeStreamingAvailable = nativeStreamingImplementationVersion >= 2;

export function addSpeechListener<T>(eventName: string, listener: (event: T) => void) {
  return nativeModule?.addListener(eventName, listener) ?? { remove: () => undefined };
}

export async function startNativeSpeech(options: Parameters<NativeSpeechModule['startAsync']>[0]) {
  if (!nativeModule) throw new Error('Native streaming pronunciation is not available in this build.');
  await nativeModule.startAsync(options);
}

export async function stopNativeSpeech() {
  if (!nativeModule) return { json: '', text: '', uri: '' };
  return nativeModule.stopAsync();
}
