import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type Props = { visible: boolean; waiting: boolean; busy: boolean; onRetry(): void; onExit(): void };

export function AudioConnectionNotice({ visible, waiting, busy, onRetry, onExit }: Props) {
  const { width, height } = useWindowDimensions();
  const compact = width > height;
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onExit}>
    <View style={styles.backdrop}>
      <View accessibilityViewIsModal style={[styles.panel, compact && styles.panelCompact]}>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>
          {waiting ? 'Esperando conexión' : 'Cargando audio…'}
        </Text>
        <Text style={styles.copy}>
          {waiting
            ? 'Sin conexión, vuelve cuando haya señal.'
            : 'Un momento. Estamos preparando el audio de esta actividad.'}
        </Text>
        <Text style={styles.saved}>Tu lugar y tus respuestas se conservan.</Text>
        {busy ? <ActivityIndicator color="#23856f" accessibilityLabel="Cargando audio" /> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onRetry} style={[styles.retry, busy && styles.disabled]}>
            <Text style={styles.retryText}>{busy ? 'Cargando…' : 'Reintentar'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onExit} style={styles.exit}>
            <Text style={styles.exitText}>Salir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(25,32,35,0.6)' },
  panel: { width: '100%', maxWidth: 460, padding: 20, borderRadius: 24, backgroundColor: '#fffdf8', borderWidth: 2, borderColor: '#ddc9a7', gap: 12 },
  panelCompact: { maxWidth: 680, padding: 12, gap: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#24333a', textAlign: 'center' },
  copy: { fontSize: 17, color: '#526168', textAlign: 'center' },
  saved: { fontSize: 15, color: '#176b5d', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  retry: { flex: 1, minHeight: 48, justifyContent: 'center', padding: 10, borderRadius: 14, backgroundColor: '#23856f' },
  retryText: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  exit: { flex: 1, minHeight: 48, justifyContent: 'center', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: '#23856f' },
  exitText: { fontSize: 17, fontWeight: '800', color: '#176b5d', textAlign: 'center' },
  disabled: { opacity: 0.6 },
});
