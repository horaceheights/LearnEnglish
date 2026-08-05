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
  text: string;
};

export type SpeechErrorEvent = {
  message: string;
};

type Subscription = { remove: () => void };

type NativeSpeechModule = {
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

export const nativeStreamingAvailable = nativeModule !== null;

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
