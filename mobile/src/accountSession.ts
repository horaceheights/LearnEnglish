// Provider tokens live in Clerk's secure cache. These values are sync metadata.
export type AccountSession = { userId: string; generation: string; profileVersion: number };
let session: AccountSession | null = null;
let tokenProvider: (() => Promise<string | null>) | null = null;
export function setAccountSession(next: AccountSession | null) { session = next; }
export function getAccountSession() { return session; }
export function setAccessTokenProvider(next: (() => Promise<string | null>) | null) { tokenProvider = next; }
export function progressScope(userId: string) {
  return session?.userId === userId ? `${userId}:${session.generation}` : userId;
}
export async function accountHeaders(): Promise<Record<string, string>> {
  const expected = session;
  const token = await tokenProvider?.();
  if (session?.userId !== expected?.userId || session?.generation !== expected?.generation) throw new Error('La cuenta cambió. Inténtalo otra vez.');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(expected ? { 'X-Progress-Generation': expected.generation } : {}),
  };
}
