import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { lessonImageSource } from '../lessonImageSources';
import type { MissionPresentation } from '../types';

type Props = {
  onExit: () => void;
  onReplay: () => void;
  onStart: () => void;
  presentation: MissionPresentation;
};

export function MissionKickoff({ onExit, onReplay, onStart, presentation }: Props) {
  const { height, width } = useWindowDimensions();
  const compact = height < 720 || width > height;

  return (
    <ScrollView
      contentContainerStyle={[styles.page, compact ? styles.pageCompact : null]}
      persistentScrollbar
      style={styles.scroll}
    >
      <View style={styles.topRow}>
        <Pressable accessibilityLabel="Salir de la misión" accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
          <Ionicons color="#244c45" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.label}>{presentation.label}</Text>
      </View>

      <Text accessibilityRole="header" style={[styles.title, compact ? styles.titleCompact : null]}>
        {presentation.title}
      </Text>
      <Text style={[styles.briefing, compact ? styles.briefingCompact : null]}>{presentation.briefing}</Text>

      <View style={[styles.imageFrame, compact ? styles.imageFrameCompact : null]}>
        <Image
          accessibilityLabel="La familia prepara la celebración mientras espera a quienes faltan"
          resizeMode="cover"
          source={lessonImageSource(presentation.kickoff_image_url)}
          style={styles.image}
        />
        <View style={styles.missionBadge}>
          <Ionicons color="#fff" name="sparkles" size={18} />
          <Text style={styles.missionBadgeText}>22 RETOS · 1 AVENTURA</Text>
        </View>
      </View>

      <View accessibilityLabel="Objetivos de la misión" style={styles.objectives}>
        {presentation.objectives.map((objective, index) => (
          <View key={objective} style={styles.objective}>
            <View style={[styles.objectiveIcon, { backgroundColor: ['#e8754c', '#2e8b77', '#7862ae'][index % 3] }]}>
              <Ionicons color="#fff" name={index === 0 ? 'search' : index === 1 ? 'footsteps' : 'people'} size={17} />
            </View>
            <Text style={styles.objectiveText}>{objective}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.actions, compact ? styles.actionsCompact : null]}>
        <Pressable accessibilityRole="button" onPress={onReplay} style={styles.replayButton}>
          <Ionicons color="#24594e" name="volume-high" size={20} />
          <Text style={styles.replayText}>Escuchar otra vez</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onStart} style={styles.startButton}>
          <Text style={styles.startText}>Comenzar misión</Text>
          <Ionicons color="#fff" name="arrow-forward" size={20} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#fdf6e8', flex: 1 },
  page: { alignItems: 'center', flexGrow: 1, gap: 13, justifyContent: 'center', padding: 18 },
  pageCompact: { gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  topRow: { alignItems: 'center', flexDirection: 'row', maxWidth: 820, width: '100%' },
  exitButton: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, height: 46, justifyContent: 'center', width: 46 },
  label: { color: '#985c22', flex: 1, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textAlign: 'right' },
  title: { color: '#24443f', fontSize: 34, fontWeight: '900', lineHeight: 38, textAlign: 'center' },
  titleCompact: { fontSize: 27, lineHeight: 30 },
  briefing: { color: '#50625e', fontSize: 16, lineHeight: 23, maxWidth: 760, textAlign: 'center' },
  briefingCompact: { fontSize: 14, lineHeight: 19 },
  imageFrame: { aspectRatio: 3 / 2, borderColor: '#fff', borderRadius: 24, borderWidth: 5, maxHeight: 410, maxWidth: 820, overflow: 'hidden', position: 'relative', width: '100%' },
  imageFrameCompact: { maxHeight: 270, maxWidth: 540 },
  image: { height: '100%', width: '100%' },
  missionBadge: { alignItems: 'center', backgroundColor: 'rgba(31,80,70,0.92)', borderRadius: 999, bottom: 10, flexDirection: 'row', gap: 6, left: 10, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute' },
  missionBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  objectives: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 820, width: '100%' },
  objective: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5d8be', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 45, paddingHorizontal: 11 },
  objectiveIcon: { alignItems: 'center', borderRadius: 16, height: 30, justifyContent: 'center', width: 30 },
  objectiveText: { color: '#294a44', fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, maxWidth: 650, width: '100%' },
  actionsCompact: { maxWidth: 560 },
  replayButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#90bdb0', borderRadius: 16, borderWidth: 1.5, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 54 },
  replayText: { color: '#24594e', fontSize: 14, fontWeight: '900' },
  startButton: { alignItems: 'center', backgroundColor: '#e66f45', borderRadius: 16, flex: 1.25, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 54 },
  startText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
