import { useCallback, useEffect, useRef, useState } from 'react';

export const HELP_IDLE_MS = 4000;
export const HELP_STORAGE_PREFIX = 'spanglish-sentence-help-v3';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

/** One help lifecycle for the app and web. Acknowledging help lasts for this
 * slide; only "No mostrar" saves the preference to stop automatic help. */
export function useContextualHelp({ cardKey, ready, introKey, storageKey, storage }: {
  cardKey: string;
  ready: boolean;
  introKey?: string;
  storageKey: string;
  storage: Storage;
}) {
  const [preference, setPreference] = useState<'loading' | 'enabled' | 'suppressed'>('loading');
  const [popup, setPopup] = useState<{ cardKey: string; mode: 'help' | 'reminder' } | null>(null);
  const [activity, setActivity] = useState(0);
  const handledCard = useRef<string | null>(null);
  const shownIntro = useRef<string | null>(null);
  const touching = useRef(false);

  useEffect(() => {
    let active = true;
    setPreference('loading');
    setPopup(null);
    handledCard.current = null;
    shownIntro.current = null;
    void storage.getItem(storageKey).catch(() => null).then(value => {
      if (active) setPreference(current => current === 'suppressed' ? current : value === 'seen' ? 'suppressed' : 'enabled');
    });
    return () => { active = false; };
  }, [storage, storageKey]);

  useEffect(() => {
    setPopup(null);
    handledCard.current = null;
    touching.current = false;
  }, [cardKey]);

  const interact = useCallback(() => setActivity(value => value + 1), []);
  const touchStart = useCallback(() => { touching.current = true; interact(); }, [interact]);
  const touchEnd = useCallback(() => { touching.current = false; interact(); }, [interact]);
  const open = useCallback(() => {
    handledCard.current = cardKey;
    setPopup({ cardKey, mode: 'help' });
  }, [cardKey]);
  const dismiss = useCallback(() => {
    handledCard.current = cardKey;
    setPopup(null);
  }, [cardKey]);
  const suppress = useCallback(() => {
    handledCard.current = cardKey;
    setPreference('suppressed');
    setPopup({ cardKey, mode: 'reminder' });
    // A storage failure must never trap the learner in the popup.
    void storage.setItem(storageKey, 'seen').catch(() => undefined);
  }, [cardKey, storage, storageKey]);

  const mode = popup?.cardKey === cardKey ? popup.mode : null;
  useEffect(() => {
    if (!introKey || !ready || preference !== 'enabled' || mode
      || handledCard.current === cardKey || shownIntro.current === introKey) return;
    shownIntro.current = introKey;
    open();
  }, [cardKey, introKey, mode, open, preference, ready]);
  useEffect(() => {
    if (!ready || preference !== 'enabled' || mode || touching.current || handledCard.current === cardKey) return;
    const timer = setTimeout(open, HELP_IDLE_MS);
    return () => clearTimeout(timer);
  }, [activity, cardKey, mode, open, preference, ready]);

  return { mode, visible: mode !== null, open, dismiss, suppress, interact, touchStart, touchEnd };
}
