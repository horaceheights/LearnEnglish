import { useEffect, useMemo, useRef, useState } from 'react';
import { createConversationDecision, type DecisionState } from '../missionConversationDecision';
import type { LessonCard } from '../types';

export function useMissionConversationDecision(card: LessonCard, ready: boolean, paused: boolean, callbacks: {
  onSubmit: (ids: string[]) => void;
  onRetry: () => void;
  onResponse: () => Promise<boolean>;
  onAdvance: () => void;
}) {
  const current = useRef({ ready, paused, callbacks });
  current.current = { ready, paused, callbacks };
  const [state, setState] = useState<DecisionState | null>(null);
  const controller = useMemo(() => createConversationDecision(card.options, card.correct_option_id, Boolean(card.mission_game?.completion_scene), {
    ready: () => current.current.ready && !current.current.paused,
    active: () => !current.current.paused,
    submit: ids => current.current.callbacks.onSubmit(ids),
    retry: () => current.current.callbacks.onRetry(),
    response: () => current.current.callbacks.onResponse(),
    advance: () => current.current.callbacks.onAdvance(),
    changed: setState,
  }), [card.slide_id]);
  useEffect(() => {
    controller.activate();
    setState(controller.state);
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => { controller.pause(paused); }, [controller, paused]);
  return { state: state || controller.state, controller };
}
