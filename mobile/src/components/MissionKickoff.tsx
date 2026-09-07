import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { lessonImageSource } from '../lessonImageSources';
import type { MissionPresentation } from '../types';

type Props = {
  onExit: () => void;
  onReplay: () => void;
  onStart: () => void;
  presentation: MissionPresentation;
  ready: boolean;
};

export function MissionKickoff({ onExit, onReplay, onStart, presentation, ready }: Props) {
  const { height, width } = useWindowDimensions();
  const compact = height < 720 || width > height;

  return (
    <View style={[styles.page, compact ? styles.pageCompact : null]}>
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="Salir de la misión" accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
          <Ionicons color="#244c45" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.label}>{presentation.label}</Text>
      </View>

      <View style={styles.introCopy}>
        <Text accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={[styles.title, compact ? styles.titleCompact : null]}>
          {presentation.title}
        </Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={compact ? 2 : 3} style={[styles.briefing, compact ? styles.briefingCompact : null]}>
          {presentation.briefing}
        </Text>
      </View>

      <View style={[styles.imageFrame, compact ? styles.imageFrameCompact : null]}>
        <Image
          accessibilityLabel="Una celebración familiar lista para comenzar"
          resizeMode="cover"
          source={lessonImageSource(presentation.kickoff_image_url)}
          style={styles.image}
        />
        <View style={styles.missionBadge}>
          <Ionicons color="#fff" name="sparkles" size={18} />
          <Text style={styles.missionBadgeText}>22 RETOS · 1 AVENTURA</Text>
        </View>
      </View>

      <View accessibilityLabel="Lo que harás en la misión" style={styles.objectives}>
        {presentation.objectives.map((objective, index) => (
          <View key={objective} style={styles.objective}>
            <View style={[styles.objectiveIcon, { backgroundColor: ['#e8754c', '#2e8b77', '#7862ae'][index % 3] }]}>
              <Ionicons color="#fff" name={index === 0 ? 'search' : index === 1 ? 'ear' : 'mic'} size={17} />
            </View>
            <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2} style={styles.objectiveText}>{objective}</Text>
          </View>
        ))}
      </View>

      <View accessibilityLiveRegion="polite" style={styles.startGuide}>
        <Ionicons color="#d56c45" name={ready ? 'checkmark-circle' : 'ear'} size={20} />
        <Text style={styles.startGuideText}>
          {ready ? 'Listo. En cada reto, escucha en inglés y toca la respuesta.' : 'Escucha primero cómo funciona la misión…'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onReplay} style={styles.replayButton}>
          <Ionicons color="#24594e" name="volume-high" size={20} />
          <Text style={styles.replayText}>Escuchar otra vez</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={onStart}
          style={[styles.startButton, !ready ? styles.startButtonDisabled : null]}
        >
          <Text style={styles.startText}>{ready ? 'Comenzar misión' : 'Escuchando…'}</Text>
          <Ionicons color="#fff" name={ready ? 'arrow-forward' : 'ear'} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', backgroundColor: '#fdf6e8', flex: 1, gap: 10, justifyContent: 'center', minHeight: 0, paddingHorizontal: 18, paddingVertical: 12 },
  pageCompact: { gap: 6, paddingHorizontal: 16, paddingVertical: 7 },
  topRow: { alignItems: 'center', flexDirection: 'row', maxWidth: 820, width: '100%' },
  exitButton: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  label: { color: '#985c22', flex: 1, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textAlign: 'right' },
  introCopy: { alignItems: 'center', maxWidth: 790, width: '100%' },
  title: { color: '#24443f', fontSize: 32, fontWeight: '900', lineHeight: 36, textAlign: 'center' },
  titleCompact: { fontSize: 25, lineHeight: 28 },
  briefing: { color: '#50625e', fontSize: 16, lineHeight: 22, marginTop: 4, textAlign: 'center' },
  briefingCompact: { fontSize: 13, lineHeight: 17 },
  imageFrame: { backgroundColor: '#dbe8e2', borderColor: '#fff', borderRadius: 24, borderWidth: 5, flex: 1, maxHeight: 410, maxWidth: 820, minHeight: 190, overflow: 'hidden', position: 'relative', width: '100%' },
  imageFrameCompact: { maxHeight: 270, maxWidth: 620 },
  image: { height: '100%', width: '100%' },
  missionBadge: { alignItems: 'center', backgroundColor: 'rgba(31,80,70,0.92)', borderRadius: 999, bottom: 10, flexDirection: 'row', gap: 6, left: 10, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute' },
  missionBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  objectives: { flexDirection: 'row', gap: 7, justifyContent: 'center', maxWidth: 820, width: '100%' },
  objective: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5d8be', borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 7, minHeight: 43, paddingHorizontal: 8, paddingVertical: 5 },
  objectiveIcon: { alignItems: 'center', borderRadius: 15, height: 29, justifyContent: 'center', width: 29 },
  objectiveText: { color: '#294a44', flex: 1, fontSize: 12, fontWeight: '800' },
  startGuide: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', maxWidth: 760, minHeight: 24 },
  startGuideText: { color: '#704a35', flexShrink: 1, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 9, maxWidth: 650, width: '100%' },
  replayButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#90bdb0', borderRadius: 15, borderWidth: 1.5, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 50 },
  replayText: { color: '#24594e', fontSize: 13, fontWeight: '900' },
  startButton: { alignItems: 'center', backgroundColor: '#e66f45', borderRadius: 15, flex: 1.25, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 50 },
  startButtonDisabled: { backgroundColor: '#b7aaa2' },
  startText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
