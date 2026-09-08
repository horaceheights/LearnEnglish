import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  location: string;
  title: string;
  step: number;
  total: number;
  onBack: () => void;
  onHome: () => void;
  onMenu: () => void;
};

// Phone landscape owns its complete chrome. The portrait header stays unchanged.
export function MissionLandscapeHeader({ location, title, step, total, onBack, onHome, onMenu }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.navigation}>
        <Pressable accessibilityLabel="Volver a lecciones" accessibilityRole="button" onPress={onBack} style={styles.button}>
          <Ionicons color="#245f53" name="arrow-back" size={24} />
        </Pressable>
        <Pressable accessibilityLabel="SpanGlish: inicio" accessibilityRole="button" onPress={onHome} style={styles.brand}>
          <Text adjustsFontSizeToFit maxFontSizeMultiplier={1} minimumFontScale={0.75} numberOfLines={1} style={styles.brandText}>SpanGlish!</Text>
        </Pressable>
        <Pressable accessibilityLabel="Ayuda y opciones de la misión" accessibilityRole="button" onPress={onMenu} style={styles.button}>
          <Ionicons color="#245f53" name="ellipsis-horizontal" size={24} />
        </Pressable>
      </View>
      <View style={styles.progressRow}>
        <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={1} style={styles.location}>{location}</Text>
        <Text accessibilityLabel={`Reto ${step} de ${total}`} style={styles.counter}>{step}/{total}</Text>
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={0.85} numberOfLines={2} style={styles.title}>{title}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, step / Math.max(1, total) * 100)}%` }]} />
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 3 },
  navigation: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  button: { alignItems: 'center', backgroundColor: '#fffdf7', borderColor: '#b8d3c8', borderRadius: 14, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  brand: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 48, minWidth: 48 },
  brandText: { color: '#dd6844', fontSize: 16, fontWeight: '900' },
  location: { color: '#805837', flex: 1, fontSize: 11, fontWeight: '800' },
  title: { color: '#203c37', fontSize: 16, fontWeight: '900' },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  track: { backgroundColor: '#d5ddd8', borderRadius: 8, height: 6, overflow: 'hidden' },
  fill: { backgroundColor: '#56ae91', height: '100%' },
  counter: { color: '#245f53', fontSize: 13, fontWeight: '900' },
});
