import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { captureDiagnosticError } from '../diagnostics';
import { preparePackedLessonImages } from '../packedLessonImages';
import { PlayfulLoading } from './PlayfulLoading';

export function BundledLessonImagesGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void preparePackedLessonImages().then(() => {
      if (active) setStatus('ready');
    }).catch(error => {
      captureDiagnosticError(error, 'bundled_images_prepare');
      if (active) setStatus('error');
    });
    return () => { active = false; };
  }, [attempt]);

  if (status === 'ready') return children;
  return (
    <View style={styles.page}>
      {status === 'loading' ? <PlayfulLoading label="Preparando imágenes…" /> : (
        <>
          <Text style={styles.message}>No se pudieron preparar las imágenes. Intenta de nuevo.</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            setStatus('loading');
            setAttempt(value => value + 1);
          }} style={styles.retry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbf7ef', padding: 24 },
  message: { color: '#24333a', fontSize: 16, textAlign: 'center' },
  retry: { backgroundColor: '#c94d24', borderRadius: 14, marginTop: 18, padding: 14 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
