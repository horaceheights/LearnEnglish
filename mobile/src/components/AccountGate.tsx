import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { resourceCache } from '@clerk/expo/resource-cache';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { BrandHeader } from './BrandHeader';
import { PlayfulLoading } from './PlayfulLoading';
import { getAccountSnapshot, getLessons } from '../api';
import { getAccountSession, setAccountSession, setAccessTokenProvider } from '../accountSession';
import { acceptAccountSnapshot, accountCheckpoints, synchronizeAccount, subscribeAccountSync } from '../accountSync';
import { useConnectivity } from '../hooks/useConnectivity';
import { progressScope } from '../accountSession';
import { importLegacyAccount } from '../legacyAccountImport';
import { lessonResults } from '../localLessonResults';
import { loadLocalProfile } from '../profile';
import type { AccountSnapshot } from '../accountSyncStore';
import { DEFAULT_PROFILE } from '../profile';
import type { LearnerProfile } from '../types';

type Props = { children: (profile: LearnerProfile, signOut: () => Promise<void>) => ReactNode };
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function Gate({ children }: Props) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [legacyProfile, setLegacyProfile] = useState<LearnerProfile | null>(null);
  const [importing, setImporting] = useState(false);
  const importPending = useRef(false);
  const identity = useRef(userId); identity.current = userId;
  const tokenProvider = useRef(getToken); tokenProvider.current = getToken;
  const isOffline = useConnectivity();
  const restore = useCallback(async () => {
    if (!isSignedIn || !userId) return;
    setBusy(true); setError('');
    try {
      setAccessTokenProvider(() => tokenProvider.current());
      const next = await getAccountSnapshot();
      if (identity.current !== userId) return;
      await acceptAccountSnapshot(next);
      if (identity.current !== userId) return;
      await AsyncStorage.setItem(`spanglish-account-v1:${userId}`, JSON.stringify(next));
      if (identity.current !== userId) return;
      setSnapshot(next);
      const legacy = await loadLocalProfile();
      if (identity.current !== userId) return;
      if (legacy && legacy.userId !== next.user.id) {
        const marker = JSON.parse(await AsyncStorage.getItem(`spanglish-legacy-account-import-v1:${legacy.userId || legacy.displayName.trim().toLowerCase()}`) || 'null');
        if (identity.current !== userId) return;
        if (!marker?.complete) setLegacyProfile(legacy);
      }
    } catch (cause) {
      if (identity.current !== userId) return;
      // Cached data is accessible only for Clerk's restored identity, never by name.
      const raw = await AsyncStorage.getItem(`spanglish-account-v1:${userId}`);
      if (identity.current !== userId) return;
      if (raw && !(cause as { status?: number }).status) {
        const cached = JSON.parse(raw) as AccountSnapshot;
        await acceptAccountSnapshot(cached);
        if (identity.current !== userId) return;
        setSnapshot(cached);
      }
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar tu cuenta.');
    } finally { if (identity.current === userId) setBusy(false); }
  }, [isSignedIn, userId]);
  useEffect(() => {
    setSnapshot(null); setLegacyProfile(null); setAccountSession(null);
    if (!isSignedIn) { setAccessTokenProvider(null); return; }
    void restore();
    return () => { setAccessTokenProvider(null); setAccountSession(null); };
  }, [isSignedIn, restore]);
  useEffect(() => {
    if (!snapshot) return;
    const stop = subscribeAccountSync((next, cause) => {
      if (cause) setError(`Tu progreso queda guardado aquí. ${cause.message}`);
      else if (next) {
        if (next.profileVersion < (getAccountSession()?.profileVersion || 0)) return;
        setError(''); setSnapshot(next);
        void AsyncStorage.setItem(`spanglish-account-v1:${userId}`, JSON.stringify(next));
      }
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void synchronizeAccount().catch(cause => setError(cause.message));
    });
    const interval = setInterval(() => { if (AppState.currentState === 'active') void synchronizeAccount().catch(() => undefined); }, 30000);
    if (!isOffline) void synchronizeAccount().catch(() => undefined);
    return () => { subscription.remove(); stop(); clearInterval(interval); };
  }, [!!snapshot, userId, isOffline]);
  const leave = async () => { await signOut(); setSnapshot(null); setAccountSession(null); };
  if (!isLoaded || (busy && !snapshot)) return <View style={{ flex: 1, justifyContent: 'center' }}><PlayfulLoading label="Preparando tu cuenta…" /></View>;
  if (isSignedIn && snapshot) return <View style={{ flex: 1 }}>
    {error ? <Pressable accessibilityRole="button" onPress={() => void restore()}><Text style={{ padding: 10, color: '#a34842' }}>{error} Toca para reintentar.</Text></Pressable> : null}
    {legacyProfile ? <View style={{ padding: 12, gap: 8 }}><Text>Encontramos progreso anterior de {legacyProfile.displayName} en este dispositivo.</Text>
      <Pressable accessibilityRole="button" disabled={importing} onPress={() => {
        if (importPending.current) return;
        importPending.current = true; setImporting(true);
        const previous = legacyProfile;
        const scope = progressScope(snapshot.user.id);
        const checkIdentity = () => {
          if (identity.current !== userId || progressScope(snapshot.user.id) !== scope) throw new Error('La cuenta cambió. Inténtalo otra vez.');
        };
        void getLessons().then(lessons => importLegacyAccount(AsyncStorage, previous, snapshot.user.id, lessons,
          result => { checkIdentity(); return lessonResults.save(result); },
          (lessonId, run) => { checkIdentity(); return accountCheckpoints.save(scope, lessonId, run); }))
          .then(() => { if (identity.current !== userId) return; setLegacyProfile(null); return synchronizeAccount(); })
          .catch(cause => { if (identity.current === userId) setError(cause.message); })
          .finally(() => { importPending.current = false; setImporting(false); });
      }}><Text>Conservar este progreso en mi cuenta</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={importing} onPress={() => setLegacyProfile(null)}><Text>Continuar sin importar</Text></Pressable>
    </View> : null}
    {children({ ...DEFAULT_PROFILE, ...snapshot.user.profile, userId: snapshot.user.id,
      displayName: snapshot.user.display_name, qaAccess: snapshot.qaAccess }, leave)}
  </View>;
  const open = async (mode: 'sign-in' | 'sign-up') => {
    setBusy(true); setError('');
    try { await startHostedAuth({ mode, redirectUrl: makeRedirectUri({ scheme: String(Constants.expoConfig?.scheme || 'spanglish'), path: 'auth-callback' }) }); }
    catch { setError('No pudimos abrir el acceso a tu cuenta. Inténtalo otra vez.'); }
    finally { setBusy(false); }
  };
  return <View style={{ flex: 1, justifyContent: 'center', padding: 28, gap: 18, backgroundColor: '#fbf7ef' }}>
    <BrandHeader title="Tu aprendizaje, contigo" onLogoPress={() => setError('')} />
    <Text>Tu cuenta guarda tu aprendizaje para continuar en cualquier dispositivo.</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: '#a34842' }}>{error}</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => isSignedIn ? void restore() : void open('sign-in')} style={{ padding: 18, backgroundColor: '#c94d24', borderRadius: 14 }}>
      <Text style={{ color: 'white', fontWeight: '800' }}>{isSignedIn ? 'Reintentar' : 'Iniciar sesión'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => isSignedIn ? void leave() : void open('sign-up')}>
      <Text>{isSignedIn ? 'Cerrar sesión' : 'Crear cuenta'}</Text>
    </Pressable>
    <Text>Verifica tu correo y recupera tu contraseña desde la pantalla de acceso.</Text>
  </View>;
}

export function AccountGate(props: Props) {
  if (!publishableKey) return <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}><Text>El acceso a cuentas todavía no está disponible. Inténtalo más tarde.</Text></View>;
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} __experimental_resourceCache={resourceCache}><Gate {...props} /></ClerkProvider>;
}
