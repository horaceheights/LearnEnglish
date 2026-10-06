"use client";
import { useAuth, SignIn } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import LessonPlayer from './LessonPlayer';
import { getAccountSnapshot, deleteLearnerAccount } from '../lib/api';
import { getAccountSession, setAccountSession, setAccessTokenProvider } from '../../mobile/src/accountSession';
import { acceptAccountSnapshot, synchronizeAccount, subscribeAccountSync, accountCheckpoints } from '../lib/accountSync';
import { progressScope } from '../../mobile/src/accountSession';
import { importLegacyAccount } from '../../mobile/src/legacyAccountImport';
import { lessonResults } from '../lib/localLessonResults';

export default function LearnerApp(props) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [legacyProfile, setLegacyProfile] = useState(null);
  const [importing, setImporting] = useState(false);
  const importPending = useRef(false);
  const identity = useRef(userId); identity.current = userId;
  const tokenProvider = useRef(getToken); tokenProvider.current = getToken;
  const restore = useCallback(async () => {
    if (!isSignedIn || !userId) return;
    setError(''); setAccessTokenProvider(() => tokenProvider.current());
    try {
      const next = await getAccountSnapshot();
      if (identity.current !== userId) return;
      await acceptAccountSnapshot(next);
      if (identity.current !== userId) return;
      window.localStorage.setItem(`spanglish-account-v1:${userId}`, JSON.stringify(next));
      setSnapshot(next);
      const legacy = JSON.parse(window.localStorage.getItem('learn-english-profile-v1') || 'null');
      const marker = legacy && JSON.parse(window.localStorage.getItem(`spanglish-legacy-account-import-v1:${legacy.userId || legacy.displayName.trim().toLowerCase()}`) || 'null');
      if (legacy && legacy.userId !== next.user.id && !marker?.complete) setLegacyProfile(legacy);
    } catch (cause) {
      if (identity.current !== userId) return;
      const raw = window.localStorage.getItem(`spanglish-account-v1:${userId}`);
      if (raw && !cause.status) {
        const cached = JSON.parse(raw); await acceptAccountSnapshot(cached);
        if (identity.current !== userId) return;
        setSnapshot(cached);
      }
      setError(cause.message || 'No pudimos cargar tu cuenta.');
    }
  }, [isSignedIn, userId]);
  useEffect(() => {
    setSnapshot(null); setLegacyProfile(null); setAccountSession(null);
    if (!isSignedIn) { setAccessTokenProvider(null); return; }
    void restore();
    return () => { setAccountSession(null); setAccessTokenProvider(null); };
  }, [isSignedIn, restore]);
  useEffect(() => {
    if (!snapshot) return;
    const sync = () => { if (!document.hidden) void synchronizeAccount().catch(cause => setError(cause.message)); };
    const stop = subscribeAccountSync((next, cause) => {
      if (cause) setError(`Tu progreso queda guardado aquí. ${cause.message}`);
      else if (next && next.profileVersion >= (getAccountSession()?.profileVersion || 0)) { setError(''); setSnapshot(next); window.localStorage.setItem(`spanglish-account-v1:${userId}`, JSON.stringify(next)); }
    });
    window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync);
    const interval = setInterval(sync, 30000); sync();
    return () => { stop(); clearInterval(interval); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); };
  }, [!!snapshot, userId]);
  const importPrevious = async () => {
    if (importPending.current) return;
    importPending.current = true;
    setImporting(true);
    const scope = progressScope(snapshot.user.id);
    const checkIdentity = () => {
      if (identity.current !== userId || progressScope(snapshot.user.id) !== scope) throw new Error('La cuenta cambió. Inténtalo otra vez.');
    };
    const storage = { getItem: async key => window.localStorage.getItem(key), setItem: async (key, value) => window.localStorage.setItem(key, value) };
    try {
      await importLegacyAccount(storage, legacyProfile, snapshot.user.id, props.lessons,
        result => { checkIdentity(); return lessonResults.save(result); },
        (lessonId, run) => { checkIdentity(); return accountCheckpoints.save(scope, lessonId, run); });
      checkIdentity();
      setLegacyProfile(null); await synchronizeAccount();
    } catch (cause) { if (identity.current === userId) setError(cause.message); }
    finally { importPending.current = false; setImporting(false); }
  };
  const removeAccount = async () => {
    if (!window.confirm('¿Eliminar tu cuenta y todo tu progreso? Esta acción no se puede deshacer.')) return;
    try { await deleteLearnerAccount(); window.localStorage.removeItem(`spanglish-account-v1:${userId}`); await signOut(); }
    catch (cause) { setError(cause.message); }
  };
  if (!isLoaded) return <main style={{ padding: 32 }}>Preparando tu cuenta…</main>;
  if (!isSignedIn) return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><SignIn routing="hash" /></main>;
  return <>
    <div style={{ padding: 12, display: 'flex', justifyContent: 'flex-end', gap: 16 }}><button onClick={() => void signOut()}>Cerrar sesión</button><button onClick={() => void removeAccount()}>Eliminar mi cuenta</button></div>
    {error ? <div role="alert" style={{ padding: 12, color: '#a34842' }}>{error} <button onClick={() => void restore()}>Reintentar</button></div> : null}
    {legacyProfile && snapshot ? <div style={{ padding: 12 }}>Encontramos progreso anterior de {legacyProfile.displayName} en este dispositivo.
      <button disabled={importing} onClick={() => void importPrevious()}>Conservar este progreso en mi cuenta</button>
      <button disabled={importing} onClick={() => setLegacyProfile(null)}>Continuar sin importar</button></div> : null}
    {snapshot ? <LessonPlayer {...props} key={snapshot.user.id} accountProfile={{ ...snapshot.user.profile, userId: snapshot.user.id, displayName: snapshot.user.display_name }} /> : <main style={{ padding: 32 }}>Cargando tu progreso…</main>}
  </>;
}
