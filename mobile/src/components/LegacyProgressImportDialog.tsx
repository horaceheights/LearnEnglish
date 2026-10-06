import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  previousName: string;
  accountName: string;
  importing: boolean;
  error: string;
  onImport: () => void;
  onSkip: () => void;
};

export function LegacyProgressImportDialog({ visible, previousName, accountName, importing, error, onImport, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dismiss = () => { if (!importing) onSkip(); };
  return <Modal transparent animationType="fade" statusBarTranslucent visible={visible} onRequestClose={dismiss}>
    <View style={[styles.backdrop, {
      paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16,
      paddingLeft: insets.left + 16, paddingRight: insets.right + 16,
    }]}>
      <View accessibilityViewIsModal style={[styles.panel, { maxHeight: height - insets.top - insets.bottom - 32 }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Encontramos tu progreso anterior</Text>
          <Text style={styles.body}>Hay progreso de {previousName} guardado en este dispositivo. ¿Quieres conservarlo en tu cuenta{accountName ? `, ${accountName}` : ''}?</Text>
          <Text style={styles.hint}>Si continúas sin importar, el progreso anterior seguirá guardado en este dispositivo.</Text>
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={importing} accessibilityState={{ disabled: importing, busy: importing }}
            onPress={() => { if (!importing) onImport(); }} style={[styles.primary, importing && styles.disabled]}>
            <Text style={styles.primaryText}>{importing ? 'Conservando tu progreso…' : error ? 'Reintentar importación' : 'Conservar este progreso en mi cuenta'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={importing} accessibilityState={{ disabled: importing }}
            onPress={dismiss} style={[styles.secondary, importing && styles.disabled]}>
            <Text style={styles.secondaryText}>Continuar sin importar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(26,31,34,0.55)' },
  panel: { width: '100%', maxWidth: 460, borderRadius: 24, backgroundColor: '#fffdf8', borderWidth: 2, borderColor: '#ddc9a7', overflow: 'hidden' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#26363d' },
  body: { fontSize: 17, lineHeight: 25, color: '#26363d' },
  hint: { fontSize: 15, lineHeight: 22, color: '#637277' },
  error: { fontSize: 16, lineHeight: 24, color: '#a34842' },
  primary: { minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#167f73', justifyContent: 'center', alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#fff' },
  secondary: { minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 2, borderColor: '#b5d9d0', justifyContent: 'center', alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '800', textAlign: 'center', color: '#176d64' },
  disabled: { opacity: 0.65 },
});
