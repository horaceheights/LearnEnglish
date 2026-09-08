import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionMediaImage } from './OptionMediaImage';

// Recording and grading remain in the shared engine. Only graded answers enter
// this presentation: hidden answer text must not leak through labels or live UI.
export function MissionVoicePresentation({
  imageUrl, asking, listening, checking, accepted, answer, message,
  replayDisabled, unavailable, offline, onReplay, onContinue,
}: {
  imageUrl: string; asking: boolean; listening: boolean; checking: boolean;
  accepted: boolean; answer: string | null; message: string;
  replayDisabled: boolean; unavailable: boolean; offline: boolean;
  onReplay: () => void; onContinue: () => void;
}) {
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const imageWidth = Math.max(0, Math.min(slot.width - 4, (slot.height - 4) * 1.5));
  const label = accepted ? 'ENTRADA ACTIVADA' : checking ? 'REVISANDO TU RESPUESTA'
    : listening ? 'TE ESCUCHAMOS' : asking ? 'ESCUCHA LA PREGUNTA' : 'RESPONDE EN VOZ ALTA';
  return (
    <View style={styles.surface}>
      <View style={styles.sceneSlot} onLayout={({ nativeEvent: { layout } }) =>
        setSlot(current => current.width === layout.width && current.height === layout.height
          ? current : { width: layout.width, height: layout.height })}>
        {imageWidth > 0 ? <View style={[styles.scene, accepted ? styles.sceneAccepted : null,
          { width: imageWidth + 4, height: imageWidth / 1.5 + 4 }]}>
          <OptionMediaImage accessibilityLabel={asking ? 'Una visitante te hace una pregunta.' : 'Mira a los invitados y responde.'}
            imageUrl={imageUrl} />
        </View> : null}
      </View>
      <View style={[styles.console, accepted ? styles.consoleAccepted : null]}>
        <View style={styles.statusHeading}>
          <Ionicons name={accepted ? 'checkmark-circle' : checking ? 'sparkles' : 'mic'} color="#28624e" size={24} />
          <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={2} style={styles.label}>{label}</Text>
        </View>
        {answer ? <Text accessibilityLiveRegion="polite" adjustsFontSizeToFit minimumFontScale={0.8}
          numberOfLines={2} style={styles.answer}>{answer}</Text> : null}
        <Text accessibilityLiveRegion="polite" adjustsFontSizeToFit minimumFontScale={0.85}
          numberOfLines={2} style={styles.message}>{message}</Text>
        {!accepted ? <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Repetir la pregunta"
            disabled={replayDisabled || (unavailable && offline)} onPress={onReplay}
            style={[styles.replay, replayDisabled ? styles.disabled : null]}>
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text style={styles.replayText}>{unavailable ? 'Reintentar' : 'Repetir pregunta'}</Text>
          </Pressable>
          {unavailable ? <Pressable accessibilityRole="button" onPress={onContinue} style={styles.replay}>
            <Text style={styles.replayText}>Continuar sin calificar</Text>
          </Pressable> : null}
        </View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, minWidth: 0, minHeight: 0, gap: 6 },
  sceneSlot: { flex: 1, minHeight: 0, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  scene: { borderRadius: 18, overflow: 'hidden', borderColor: '#edc976', borderWidth: 2 },
  sceneAccepted: { borderColor: '#61d4a7' },
  console: { alignSelf: 'stretch', backgroundColor: '#fff8e8', borderRadius: 15, padding: 8, gap: 4, flexShrink: 0 },
  consoleAccepted: { backgroundColor: '#dff5e8' },
  statusHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  label: { flex: 1, color: '#28624e', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  answer: { alignSelf: 'stretch', color: '#214c45', fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  message: { color: '#35574a', fontSize: 13, lineHeight: 17, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  replay: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, minHeight: 48,
    flexGrow: 1, paddingHorizontal: 8, backgroundColor: '#286c57', borderRadius: 12 },
  replayText: { color: '#fff', fontWeight: '800', fontSize: 13, flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
