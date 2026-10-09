import { requireNativeModule } from 'expo';

type EmbeddedAppConfig = { scheme?: string | string[] };
type NativeConstants = { manifest?: string | EmbeddedAppConfig };

export function getNativeAuthRedirectUrl(): string {
  // Production republishes the tested Preview update, whose expoConfig still
  // describes Preview. Only the binary's embedded config owns its URL schemes.
  const { manifest } = requireNativeModule<NativeConstants>('ExponentConstants');
  const config: EmbeddedAppConfig | undefined = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
  const scheme = Array.isArray(config?.scheme) ? config.scheme[0] : config?.scheme;
  if (scheme !== 'spanglish' && scheme !== 'spanglish-preview' && scheme !== 'spanglish-dev') {
    throw new Error('The installed app has no supported authentication callback scheme.');
  }
  return `${scheme}://auth-callback`;
}
