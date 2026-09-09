import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareAudioAssets } from '../audioDownload';
import { addDiagnosticBreadcrumb } from '../diagnostics';
import { cacheCourseAudioAsset, cachedCourseAudioAssetSource } from '../lessonAudioCache';
import type { CourseAudioAsset } from '../types';

const EMPTY_ASSETS: CourseAudioAsset[] = [];

// Connectivity is only a hint. A complete local file is the readiness proof.
export function useLessonAudioReadiness(
  key: string,
  requiredAssets: CourseAudioAsset[] | undefined,
  active: boolean,
  offline: boolean,
) {
  const assets = requiredAssets ?? EMPTY_ASSETS;
  const allCached = assets.every(asset => Boolean(cachedCourseAudioAssetSource(asset.id)));
  const [state, setState] = useState({ key, waiting: false, busy: false });
  const [attempt, setAttempt] = useState(0);
  const manualRetryRef = useRef(false);
  const retry = useCallback(() => {
    manualRetryRef.current = true;
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    if (!active || allCached) return;
    let cancelled = false;
    const canRequest = !offline || manualRetryRef.current;
    manualRetryRef.current = false;
    setState(previous => ({ key, waiting: offline || (previous.key === key && previous.waiting), busy: canRequest }));
    if (!canRequest) return;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setState({ key, waiting: true, busy: true });
    }, 4000);
    void prepareAudioAssets(assets, cacheCourseAudioAsset).then(loaded => {
      if (cancelled) return;
      clearTimeout(slowTimer);
      addDiagnosticBreadcrumb(loaded ? 'card_audio_download_ready' : 'card_audio_waiting_for_connection', {
        card_key: key,
        asset_count: assets.length,
      });
      // Re-render also rechecks the local files; a stale promise never unlocks a card.
      setState({ key, waiting: !loaded, busy: false });
    });
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [active, allCached, assets, attempt, key, offline]);

  useEffect(() => {
    if (!active || allCached || offline || state.key !== key || !state.waiting || state.busy) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), 15000);
    return () => clearTimeout(timer);
  }, [active, allCached, key, offline, state]);

  return {
    ready: allCached,
    waiting: offline || (state.key === key && state.waiting),
    busy: state.key === key && state.busy,
    retry,
  };
}
