import { useCallback, useEffect, useRef, useState } from 'react';

// Match the existing sentence-button translation window on both clients.
// Assessment translations are opened by a text tap, never on card mount.
export function useManualSentenceTranslation(cardKey: string) {
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisibleKey(cardKey);
    timer.current = setTimeout(() => {
      timer.current = null;
      setVisibleKey(null);
    }, 3000);
  }, [cardKey]);
  useEffect(() => {
    setVisibleKey(null);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [cardKey]);
  return { visible: visibleKey === cardKey, open };
}
