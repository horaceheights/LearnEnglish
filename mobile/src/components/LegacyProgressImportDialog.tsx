import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

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
          <View style={styles.heading}>
            <View accessible={false} style={styles.icon}><Ionicons name="cloud-upload-outline" size={28} color="#167f73" /></View>
            <Text accessibilityRole="header" style={styles.title}>Tu progreso, contigo</Text>
            <Text style={styles.body}>Guarda tu avance en tu cuenta.</Text>
          </View>
          <View style={styles.transfer}>
            <View style={styles.source}>
              <Text style={styles.label}>Este dispositivo</Text>
              <Text style={styles.name}>{previousName}</Text>
            </View>
            <View accessible={false}><Ionicons name="arrow-forward" size={18} color="#7c9290" /></View>
            <View style={styles.destination}>
              <Text style={styles.label}>Tu cuenta</Text>
              <Text style={styles.name}>{accountName || 'Cuenta actual'}</Text>
            </View>
          </View>
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={importing} accessibilityState={{ disabled: importing, busy: importing }}
              onPress={() => { if (!importing) onImport(); }} style={[styles.primary, importing && styles.disabled]}>
              <Text style={styles.primaryText}>{importing ? 'Guardando progreso…' : error ? 'Reintentar' : 'Conservar progreso'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={importing} accessibilityState={{ disabled: importing }}
              onPress={dismiss} style={[styles.secondary, importing && styles.disabled]}>
              <Text style={styles.secondaryText}>Ahora no</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Tu copia local se conserva.</Text>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(13,34,31,0.4)' },
  panel: { width: '100%', maxWidth: 420, borderRadius: 28, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#132f2b', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 28, elevation: 18 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 24, gap: 20 },
  heading: { alignItems: 'center', gap: 10 },
  icon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#e7f5f1', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center', color: '#24383a' },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center', color: '#637477' },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  source: { flex: 1, padding: 14, gap: 5, borderRadius: 16, backgroundColor: '#f3f6f5' },
  destination: { flex: 1, padding: 14, gap: 5, borderRadius: 16, backgroundColor: '#e7f5f1' },
  label: { fontSize: 12, lineHeight: 17, color: '#596c70' },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#24383a' },
  actions: { gap: 4 },
  hint: { fontSize: 13, lineHeight: 18, color: '#6b7779', textAlign: 'center', marginTop: -8 },
  error: { fontSize: 15, lineHeight: 22, color: '#a34842', backgroundColor: '#fff2ee', padding: 12, borderRadius: 14 },
  primary: { minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#167f73', justifyContent: 'center', alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700', textAlign: 'center', color: '#fff' },
  secondary: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', textAlign: 'center', color: '#637477' },
  disabled: { opacity: 0.65 },
});
