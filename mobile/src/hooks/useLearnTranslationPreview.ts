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

// Count visible time, not time behind a briefing, unloaded picture or background app.
// Replays and rotation keep the same card key and cannot buy another preview.
export function useLearnTranslationPreview(card: LessonCard | undefined, cardKey: string, ready: boolean) {
  const duration = learnTranslationPreviewDuration(card);
  const session = useRef({ key: '', remaining: 0 });
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  useEffect(() => {
    if (session.current.key !== cardKey) {
      session.current = { key: cardKey, remaining: duration };
      setVisibleKey(null);
    }
    if (!duration || !ready || session.current.remaining <= 0) return;
    const current = session.current;
    const started = Date.now();
    setVisibleKey(cardKey);
    const timer = setTimeout(() => {
      current.remaining = 0;
      setVisibleKey(null);
    }, current.remaining);
    return () => {
      clearTimeout(timer);
      current.remaining = Math.max(0, current.remaining - (Date.now() - started));
      setVisibleKey(null);
    };
  }, [cardKey, duration, ready]);
  return { enabled: duration > 0, visible: Boolean(duration && ready && visibleKey === cardKey) };
}
