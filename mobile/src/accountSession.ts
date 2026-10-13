// Provider tokens live in Clerk's secure cache. These values are sync metadata.
export type AccountSession = { userId: string; generation: string; profileVersion: number };
let session: AccountSession | null = null;
let identityEpoch = 0;
let tokenProvider: (() => Promise<string | null>) | null = null;
export function setAccountSession(next: AccountSession | null) {
  if (session?.userId !== next?.userId || session?.generation !== next?.generation) identityEpoch++;
  session = next;
}
export function getAccountSession() { return session; }
// Snapshot refresh/profile edits preserve ownership. Sign-out/reset/switch (even
// sign-out then back into the same account) permanently invalidates older work.
export function captureAccountIdentity() {
  const expected = identityEpoch;
  return () => {
    if (identityEpoch !== expected) throw new Error('La cuenta cambió. Abre el tutor otra vez.');
  };
}
export function setAccessTokenProvider(next: (() => Promise<string | null>) | null) { tokenProvider = next; }
export function progressScope(userId: string) {
  return session?.userId === userId ? `${userId}:${session.generation}` : userId;
}
export async function accountHeaders(): Promise<Record<string, string>> {
  const expected = session;
  const assertIdentity = captureAccountIdentity();
  const token = await tokenProvider?.();
  assertIdentity();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(expected ? { 'X-Progress-Generation': expected.generation } : {}),
  };
}
