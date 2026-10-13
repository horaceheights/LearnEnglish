import { useCallback, useEffect, useRef, useState } from 'react';
import { tutorContextKey, tutorOpeningQuestion, type TutorContext, type TutorMessage, type TutorTransport } from '../lessonTutor';

/** No mount, idle, wrong-answer or audio event can open the tutor. Only open(). */
export function useLessonTutor(scope: string, context: TutorContext | null, transport: TutorTransport, openingQuestion?: string) {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const visibleRef = useRef(false);
  const epoch = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const history = useRef<TutorMessage[]>([]);
  const failed = useRef<{ message: string; initial: boolean } | null>(null);
  const key = `${scope}:${context ? tutorContextKey(context) : ''}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const cancel = useCallback(() => { epoch.current++; abort.current?.abort(); abort.current = null; setBusy(false); }, []);
  const close = useCallback(() => { visibleRef.current = false; setVisible(false); cancel(); }, [cancel]);

  useEffect(() => {
    close(); history.current = []; setMessages([]); setError(''); failed.current = null;
    return () => { epoch.current++; abort.current?.abort(); };
  }, [key, close]);

  const send = useCallback(async (text: string, initial = false) => {
    const message = text.trim();
    if (!context || !visibleRef.current || abort.current || !message) return false;
    const run = ++epoch.current;
    const requestKey = key;
    const controller = new AbortController(); abort.current = controller;
    const previous = history.current.slice(-12);
    const outgoing: TutorMessage = { role: 'user', content: message };
    setBusy(true); setError(''); failed.current = null;
    if (!initial) setMessages([...previous, outgoing]);
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await transport(context, message, previous, controller.signal);
      if (epoch.current !== run || currentKey.current !== requestKey || !visibleRef.current) return false;
      history.current = [...previous, ...(initial ? [] : [outgoing]), { role: 'assistant' as const, content: response.reply }].slice(-12);
      setMessages(history.current);
      return true;
    } catch (cause) {
      if (epoch.current !== run || currentKey.current !== requestKey || !visibleRef.current) return false;
      setMessages(previous);
      failed.current = { message, initial };
      setError(controller.signal.aborted ? 'La conexión tardó demasiado. Inténtalo otra vez.'
        : cause instanceof Error ? cause.message : 'No pudimos conectar con el tutor.');
      return false;
    } finally {
      clearTimeout(timeout);
      if (epoch.current === run) { abort.current = null; setBusy(false); }
    }
  }, [context, key, transport]);

  const open = useCallback(() => {
    if (!context || visibleRef.current) return;
    visibleRef.current = true; setVisible(true);
    if (!history.current.length) void send(openingQuestion || tutorOpeningQuestion(context), true);
  }, [context, openingQuestion, send]);
  const retry = useCallback(() => { if (failed.current) void send(failed.current.message, failed.current.initial); }, [send]);
  return { visible, visibleRef, messages, busy, error, open, close, send, retry };
}
