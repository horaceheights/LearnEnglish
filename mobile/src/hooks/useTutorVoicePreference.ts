import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTOR_VOICE_PREFERENCE_KEY } from '../tutorPresentation';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function useTutorVoicePreference(storage: Storage) {
  const [enabled, setValue] = useState(true);
  const [ready, setReady] = useState(false);
  const touched = useRef(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let mounted = true;
    void storage.getItem(TUTOR_VOICE_PREFERENCE_KEY).then(value => {
      if (mounted && !touched.current) setValue(value !== 'off');
    }).catch(() => undefined).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [storage]);
  const setEnabled = useCallback((value: boolean) => {
    touched.current = true;
    setValue(value);
    setReady(true);
    // Rapid toggles must persist in order; an old write cannot undo the last tap.
    writes.current = writes.current.catch(() => undefined)
      .then(() => storage.setItem(TUTOR_VOICE_PREFERENCE_KEY, value ? 'on' : 'off')).catch(() => undefined);
  }, [storage]);
  return { enabled, ready, setEnabled };
}
