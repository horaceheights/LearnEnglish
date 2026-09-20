import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LISTENING_SQUIRREL = require('../../assets/mascots/serious/listening-frames-normalized/listening-06.png');

type Props = {
  message: string;
  mode: 'help' | 'reminder' | null;
  onDismiss: () => void;
  onSuppress: () => void;
};

export function SentenceHelpOverlay({ message, mode, onDismiss, onSuppress }: Props) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isReminder = mode === 'reminder';
  const compact = width < 380 || height < 450;
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} statusBarTranslucent transparent visible={mode !== null}>
      <View accessibilityViewIsModal style={[styles.overlay, {
        paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14,
        paddingLeft: insets.left + 14, paddingRight: insets.right + 14,
      }]}>
        {!isReminder ? <Pressable accessibilityLabel="Cerrar ayuda" accessibilityRole="button"
          onPress={onDismiss} style={StyleSheet.absoluteFill} /> : null}
        <View style={[styles.callout, { maxHeight: height - insets.top - insets.bottom - 28 }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.calloutBody}>
            <Image accessibilityIgnoresInvertColors accessible={false} resizeMode="contain"
              source={LISTENING_SQUIRREL} style={[styles.squirrel, compact ? styles.squirrelCompact : null]} />
            <View style={styles.copy}>
              <Text accessibilityRole="header" style={styles.title}>
                {isReminder ? 'La ayuda sigue aquí' : '¿Necesitas ayuda?'}
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.message}>
                {isReminder ? 'Si necesitas ayuda en el futuro, solo toca el botón' : message}
              </Text>
              {isReminder ? <View accessibilityLabel="Botón de ayuda, signo de interrogación" style={styles.helpIcon}>
                <Text style={styles.helpIconText}>?</Text>
              </View> : null}
            </View>
          </ScrollView>
          <View style={styles.buttonRow}>
            <Pressable accessibilityRole="button" onPress={onDismiss}
              style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
              <Text style={styles.buttonText}>Entiendo</Text>
            </Pressable>
            {!isReminder ? <Pressable accessibilityRole="button" onPress={onSuppress}
              style={({ pressed }) => [styles.button, styles.secondaryButton, pressed ? styles.buttonPressed : null]}>
              <Text style={styles.secondaryButtonText}>No mostrar</Text>
            </Pressable> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(26, 31, 34, 0.46)', flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  callout: {
    alignSelf: 'center', backgroundColor: '#fffaf1', borderColor: '#d9b873', borderRadius: 24,
    borderWidth: 2, elevation: 12, maxWidth: 620, padding: 14, width: '100%',
    shadowColor: '#1c2f37', shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  calloutBody: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  squirrel: { flexShrink: 0, height: 112, width: 90 },
  squirrelCompact: { height: 88, width: 58 },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#24333a', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  message: { color: '#46545a', fontSize: 15, lineHeight: 21, marginTop: 2 },
  helpIcon: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 24,
    borderWidth: 2, height: 48, justifyContent: 'center', marginTop: 10, width: 48 },
  helpIconText: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  buttonRow: { alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', flexWrap: 'wrap',
    flexShrink: 0, gap: 8, marginTop: 12 },
  button: { alignItems: 'center', backgroundColor: '#287f68', borderRadius: 13, justifyContent: 'center',
    minHeight: 48, minWidth: 104, paddingHorizontal: 15, paddingVertical: 8 },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryButton: { backgroundColor: '#fffaf1', borderColor: '#287f68', borderWidth: 2 },
  secondaryButtonText: { color: '#287f68', fontSize: 14, fontWeight: '900' },
});
