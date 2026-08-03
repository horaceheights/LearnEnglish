import { useEffect, useState } from 'react';

export function useProgressiveLoadingMessage(active: boolean) {
  const [message, setMessage] = useState('Conectando…');

  useEffect(() => {
    if (!active) return undefined;
    setMessage('Conectando…');
    const slowTimer = setTimeout(() => {
      setMessage('El servidor está despertando. Esto puede tardar unos segundos…');
    }, 4000);
    const verySlowTimer = setTimeout(() => {
      setMessage('Seguimos conectando. Puedes esperar o volver e intentarlo otra vez.');
    }, 15000);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
    };
  }, [active]);

  return message;
}
