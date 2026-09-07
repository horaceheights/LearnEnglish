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
  'search-outline',
  'git-network-outline',
  'footsteps-outline',
  'construct-outline',
  'people-outline',
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
      accessibilityLabel={`${presentation.label}: ${presentation.title}. ${activeChapter?.title ?? ''}. Paso ${step} de ${total}.`}
      style={[styles.container, compact ? styles.containerCompact : null]}
    >
      <View style={styles.headingRow}>
        <View style={[styles.albumBadge, compact ? styles.albumBadgeCompact : null]}>
          <Ionicons color="#fff8e5" name="compass" size={compact ? 19 : 23} />
        </View>
        <View style={styles.headingCopy}>
          <Text numberOfLines={1} style={[styles.label, compact ? styles.labelCompact : null]}>
            {presentation.label} · {location}
          </Text>
          <Text numberOfLines={1} style={[styles.title, compact ? styles.titleCompact : null]}>
            {presentation.title}
          </Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterLabel}>RETO</Text>
          <Text style={styles.counterValue}>{step}/{total}</Text>
        </View>
      </View>

      <View style={[styles.chapterTrack, compact ? styles.chapterTrackCompact : null]}>
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

      <View style={styles.objectiveRow}>
        <Text numberOfLines={1} style={[styles.chapterTitle, compact ? styles.chapterTitleCompact : null]}>
          {activeChapter?.title}
        </Text>
        <Text numberOfLines={compact ? 1 : 2} style={[styles.objective, compact ? styles.objectiveCompact : null]}>
          {activeChapter?.objective}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(247, 253, 250, 0.96)',
    borderColor: '#73af9d',
    borderRadius: 17,
    borderWidth: 1.5,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  containerCompact: { borderRadius: 13, paddingHorizontal: 8, paddingVertical: 4 },
  headingRow: { alignItems: 'center', flexDirection: 'row', minWidth: 0 },
  albumBadge: {
    alignItems: 'center',
    backgroundColor: '#24594e',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    marginRight: 8,
    width: 38,
  },
  albumBadgeCompact: { borderRadius: 8, height: 30, marginRight: 6, width: 30 },
  headingCopy: { flex: 1, minWidth: 0 },
  label: { color: '#c35e3d', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  labelCompact: { fontSize: 7 },
  title: { color: '#26363b', fontSize: 17, fontWeight: '900', lineHeight: 20 },
  titleCompact: { fontSize: 14, lineHeight: 16 },
  counter: { alignItems: 'center', marginLeft: 7, minWidth: 48 },
  counterLabel: { color: '#94754f', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  counterValue: { color: '#1c6a5a', fontSize: 13, fontWeight: '900' },
  chapterTrack: {
    alignItems: 'center',
    backgroundColor: '#dfd8c8',
    borderRadius: 8,
    flexDirection: 'row',
    height: 10,
    justifyContent: 'space-between',
    marginHorizontal: 9,
    marginTop: 7,
    overflow: 'visible',
    position: 'relative',
  },
  chapterTrackCompact: { height: 7, marginTop: 5 },
  progressFill: {
    backgroundColor: '#58a88a',
    borderRadius: 8,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  chapterMarker: {
    alignItems: 'center',
    backgroundColor: '#fffdf6',
    borderColor: '#bcb5a7',
    borderRadius: 13,
    borderWidth: 1.5,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  chapterMarkerActive: { backgroundColor: '#ffd996', borderColor: '#24594e', borderWidth: 2 },
  chapterMarkerComplete: { backgroundColor: '#2f8f72', borderColor: '#1d7058' },
  chapterMarkerLocked: { opacity: 0.5 },
  objectiveRow: { alignItems: 'baseline', flexDirection: 'row', gap: 6, marginTop: 7, minWidth: 0 },
  chapterTitle: { color: '#24594e', flexShrink: 0, fontSize: 11, fontWeight: '900' },
  chapterTitleCompact: { fontSize: 9 },
  objective: { color: '#5e696c', flex: 1, fontSize: 10, lineHeight: 13 },
  objectiveCompact: { fontSize: 8, lineHeight: 10 },
});
