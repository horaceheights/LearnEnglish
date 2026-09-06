import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { MissionChapterProgress } from '../missionExperience';
import type { MissionPresentation } from '../types';

type Props = {
  chapters: MissionChapterProgress[];
  compact?: boolean;
  location: string;
  presentation: MissionPresentation;
  step: number;
  total: number;
};

const CHAPTER_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'videocam-outline',
  'people-outline',
  'walk-outline',
  'mic-outline',
];

export function MissionJourney({
  chapters,
  compact = false,
  location,
  presentation,
  step,
  total,
}: Props) {
  const activeChapter = chapters.find((chapter) => chapter.isActive) ?? chapters[0];
  const progress = total > 0 ? Math.min(100, Math.max(0, (step / total) * 100)) : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${presentation.label}: ${presentation.title}. ${activeChapter?.title ?? ''}: ${activeChapter?.objective ?? ''}. Escena ${step} de ${total}.`}
      style={[styles.container, compact ? styles.containerCompact : null]}
    >
      <View style={styles.headingRow}>
        <View style={[styles.studioBadge, compact ? styles.studioBadgeCompact : null]}>
          <Ionicons color="#f7cf63" name="videocam" size={compact ? 19 : 23} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.label, compact ? styles.labelCompact : null]}>
            {presentation.label} · {location}
          </Text>
          <Text style={[styles.title, compact ? styles.titleCompact : null]}>
            {presentation.title}
          </Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterLabel}>ESCENA</Text>
          <Text style={styles.counterValue}>{step}/{total}</Text>
        </View>
      </View>

      <View accessibilityLabel="Progreso de escenas" style={[styles.chapterTrack, compact ? styles.chapterTrackCompact : null]}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
        {chapters.map((chapter, index) => (
          <View
            key={chapter.id}
            style={[
              styles.chapterMarker,
              chapter.isActive ? styles.chapterMarkerActive : null,
              chapter.isComplete ? styles.chapterMarkerComplete : null,
              !chapter.isUnlocked ? styles.chapterMarkerLocked : null,
            ]}
          >
            <Ionicons
              color={chapter.isComplete ? '#fff' : chapter.isActive ? '#6a4317' : '#6b777b'}
              name={chapter.isComplete ? 'checkmark' : CHAPTER_ICONS[index] ?? 'ellipse-outline'}
              size={compact ? 13 : 15}
            />
          </View>
        ))}
      </View>

      <View style={[styles.objectiveRow, compact ? styles.objectiveRowCompact : null]}>
        <Text style={[styles.chapterTitle, compact ? styles.chapterTitleCompact : null]}>
          {activeChapter?.title}
        </Text>
        <Text style={[styles.objective, compact ? styles.objectiveCompact : null]}>
          {activeChapter?.objective}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 253, 246, 0.92)',
    borderColor: '#d7b36a',
    borderRadius: 17,
    borderWidth: 1.5,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  containerCompact: { borderRadius: 13, paddingHorizontal: 8, paddingVertical: 4 },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', minWidth: 0 },
  studioBadge: {
    alignItems: 'center',
    backgroundColor: '#1d292e',
    borderColor: '#d2aa4f',
    borderRadius: 8,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  studioBadgeCompact: { borderRadius: 7, height: 30, marginRight: 6, width: 30 },
  headingCopy: { flex: 1, minWidth: 0 },
  label: { color: '#b36518', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, lineHeight: 20 },
  labelCompact: { fontSize: 16, lineHeight: 20 },
  title: { color: '#26363b', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  titleCompact: { fontSize: 20, lineHeight: 24 },
  counter: { alignItems: 'center', marginLeft: 7, minWidth: 48 },
  counterLabel: { color: '#94754f', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  counterValue: { color: '#1c6a5a', fontSize: 16, fontWeight: '900' },
  chapterTrack: {
    alignItems: 'center',
    backgroundColor: '#202a2e',
    borderColor: '#0d1214',
    borderRadius: 4,
    borderWidth: 2,
    flexDirection: 'row',
    height: 12,
    justifyContent: 'space-between',
    marginHorizontal: 9,
    marginTop: 7,
    overflow: 'visible',
    position: 'relative',
  },
  chapterTrackCompact: { height: 7, marginTop: 5 },
  progressFill: {
    backgroundColor: '#d8ad45',
    borderRadius: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  chapterMarker: {
    alignItems: 'center',
    backgroundColor: '#fff8df',
    borderColor: '#2c383d',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  chapterMarkerActive: { backgroundColor: '#ffe5a7', borderColor: '#c65b32', borderWidth: 2 },
  chapterMarkerComplete: { backgroundColor: '#2f8f72', borderColor: '#1d7058' },
  chapterMarkerLocked: { opacity: 0.5 },
  objectiveRow: { alignItems: 'flex-start', gap: 2, marginTop: 7, minWidth: 0 },
  objectiveRowCompact: { marginTop: 5 },
  chapterTitle: { color: '#64401d', fontSize: 16, fontWeight: '900', lineHeight: 20 },
  chapterTitleCompact: { fontSize: 16, lineHeight: 20 },
  objective: { color: '#5e696c', fontSize: 16, lineHeight: 21 },
  objectiveCompact: { fontSize: 16, lineHeight: 21 },
});
