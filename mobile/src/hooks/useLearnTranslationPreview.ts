import { useEffect, useRef, useState } from 'react';
import type { LessonCard } from '../types';

export function learnTranslationPreviewDuration(card?: LessonCard): number {
  const duration = card?.learn_translation_preview_ms ?? 2000;
  return card?.stage === 'Learn' && card.options.length === 1
    && Boolean(card.options[0].image_url?.trim())
    && Boolean(card.spanish_translation?.trim())
    && typeof duration === 'number' && duration >= 100 && duration <= 10000
    ? duration : 0;
}

// User decision (2026-11-18): the automatic preview shows the card's complete Spanish at once.
// One two-second window cannot follow a question and its answer line by line, so a later line's
// own translation only flashed. A tap still translates the line currently on screen.
export function learnTranslationText(card: LessonCard | undefined, lineTranslation: string, tapped: boolean): string {
  return !tapped && learnTranslationPreviewDuration(card) ? card?.spanish_translation?.trim() ?? '' : lineTranslation;
}

// User decision (2026-11-19): the Spanish stays while the card's voice speaks and for one second
// after it stops, never less than the authored minimum (two seconds). A question alone takes about
// 1.5-2.7 s, so a fixed two-second window hid the translation before the answer was heard.
export const LEARN_TRANSLATION_HOLD_MS = 1000;
// Playback that never reports its end must not strand the subtitle on screen.
export const LEARN_TRANSLATION_MAX_MS = 12000;

// Count visible time, not time behind a briefing, unloaded picture or background app.
// A short gap between spoken lines restarts the one-second hold rather than ending it.
// Once hidden, the card's preview is spent: replays and rotation cannot bring it back.
export function useLearnTranslationPreview(card: LessonCard | undefined, cardKey: string, ready: boolean, speaking = false) {
  const duration = learnTranslationPreviewDuration(card);
  const session = useRef({ key: '', minimum: 0, cap: 0, hold: 0, spent: false });
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  useEffect(() => {
    if (session.current.key !== cardKey) {
      session.current = { key: cardKey, minimum: duration, cap: LEARN_TRANSLATION_MAX_MS, hold: LEARN_TRANSLATION_HOLD_MS, spent: false };
      setVisibleKey(null);
    }
    const current = session.current;
    if (!duration || !ready || current.spent) return;
    const started = Date.now();
    setVisibleKey(cardKey);
    const wait = speaking ? current.cap : Math.min(current.cap, Math.max(current.minimum, current.hold));
    const timer = setTimeout(() => {
      current.spent = true;
      setVisibleKey(null);
    }, wait);
    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - started;
      current.minimum = Math.max(0, current.minimum - elapsed);
      current.cap = Math.max(0, current.cap - elapsed);
      current.hold = speaking ? LEARN_TRANSLATION_HOLD_MS : Math.max(0, current.hold - elapsed);
      setVisibleKey(null);
    };
  }, [cardKey, duration, ready, speaking]);
  return { enabled: duration > 0, visible: Boolean(duration && ready && visibleKey === cardKey) };
}
