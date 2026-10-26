import { StyleSheet, Text, View } from 'react-native';
import { clockAngles } from '../teachingClock';
import type { TeachingClock } from '../types';

/** Same authored clock face on every lesson image, with no native dependency. */
export function TeachingClocks({ cues = [] }: { cues?: TeachingClock[] }) {
  if (!cues.length) return null;
  return <View pointerEvents="none" style={styles.clocks}>
    {cues.map((cue, index) => {
      const angles = clockAngles(cue);
      return <View key={index} style={styles.item}>
        <View accessible accessibilityRole="image"
          accessibilityLabel={`${cue.label ? `${cue.label}: ` : ''}${cue.hour}:${String(cue.minute).padStart(2, '0')}`}
          style={styles.face}>
          {[12, 3, 6, 9].map((number, i) => <Text key={number} allowFontScaling={false}
            style={[styles.number, { left: [15, 29, 15, 1][i], top: [0, 14, 28, 14][i] }]}>{number}</Text>)}
          {Array.from({ length: 12 }, (_, i) => <View key={i} style={[styles.axis, { transform: [{ rotate: `${i * 30}deg` }] }]}>
            <View style={styles.tick} />
          </View>)}
          <View style={[styles.axis, { transform: [{ rotate: `${angles.hour}deg` }] }]}><View style={styles.hour} /></View>
          <View style={[styles.axis, { transform: [{ rotate: `${angles.minute}deg` }] }]}><View style={styles.minute} /></View>
          <View style={styles.pin} />
        </View>
        {cue.label ? <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={styles.label}>{cue.label}</Text> : null}
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  clocks: { position: 'absolute', right: 4, top: 4, zIndex: 3, flexDirection: 'row', gap: 4, maxWidth: '100%' },
  item: { alignItems: 'center', width: 46 },
  face: { width: 44, height: 44, borderWidth: 1.5, borderColor: '#173e3b', backgroundColor: '#fffef9', borderRadius: 22 },
  axis: { position: 'absolute', left: 0, top: 0, width: 41, height: 41 },
  tick: { position: 'absolute', top: 1, left: 20, width: 1, height: 3, backgroundColor: '#627470' },
  hour: { position: 'absolute', top: 11, left: 19, width: 3, height: 11, backgroundColor: '#173e3b', borderRadius: 2 },
  minute: { position: 'absolute', top: 4, left: 19.5, width: 2, height: 18, backgroundColor: '#173e3b', borderRadius: 2 },
  pin: { position: 'absolute', left: 18.5, top: 18.5, width: 4, height: 4, borderRadius: 2, backgroundColor: '#173e3b' },
  number: { position: 'absolute', width: 11, textAlign: 'center', fontSize: 7, lineHeight: 11, fontWeight: '600', color: '#173e3b' },
  label: { fontSize: 9, color: '#173e3b', backgroundColor: '#fffef9', textAlign: 'center' },
});
