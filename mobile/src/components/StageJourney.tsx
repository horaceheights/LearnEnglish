import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { lessonStageShortLabel } from '../lessonInstructions';
import type { LessonCard } from '../types';

type Props = {
  cards: LessonCard[];
  currentIndex: number;
  lessonId: string;
  score: number;
};

type StageSegment = {
  end: number;
  label: string;
  stage: string;
  start: number;
};

const STAGE_COLORS = [
  '#4f7cac',
  '#df765b',
  '#8865b4',
  '#279487',
  '#d99b20',
  '#577590',
  '#b85d87',
  '#638b52',
];

export function StageJourney({ cards, currentIndex, lessonId, score }: Props) {
  const segments = useMemo<StageSegment[]>(() => {
    const grouped: StageSegment[] = [];
    cards.forEach((card, index) => {
      const previous = grouped[grouped.length - 1];
      if (previous?.stage === card.stage) {
        previous.end = index;
        return;
      }
      grouped.push({
        end: index,
        label: lessonStageShortLabel(lessonId, card.stage),
        stage: card.stage,
        start: index,
      });
    });
    return grouped;
  }, [cards, lessonId]);

  const activeSegmentIndex = Math.max(
    0,
    segments.findIndex((segment) => currentIndex >= segment.start && currentIndex <= segment.end),
  );
  const activeSegment = segments[activeSegmentIndex];
  const activeLength = activeSegment ? activeSegment.end - activeSegment.start + 1 : 1;
  const positionInStage = activeSegment
    ? Math.min(100, Math.max(0, ((currentIndex - activeSegment.start + 0.5) / activeLength) * 100))
    : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${activeSegment?.label || 'Lección'}, etapa ${activeSegmentIndex + 1} de ${segments.length}. Puntaje ${score}.`}
      style={styles.container}
    >
      <View style={styles.captionRow}>
        <Text numberOfLines={1} style={styles.currentLabel}>
          {activeSegment?.label || 'Lección'}
        </Text>
        <Text style={styles.score}>★ {score}</Text>
      </View>
      <View style={styles.track}>
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const isComplete = index < activeSegmentIndex;
          const color = STAGE_COLORS[index % STAGE_COLORS.length];
          return (
            <View
              key={`${segment.stage}-${segment.start}`}
              style={[
                styles.segment,
                { backgroundColor: color },
                !isActive && !isComplete ? styles.futureSegment : null,
                isActive ? styles.activeSegment : null,
              ]}
            >
              {isActive ? (
                <>
                  <View style={[styles.activeProgress, { width: `${positionInStage}%` }]} />
                  <View style={[styles.marker, { left: `${positionInStage}%` }]} />
                </>
              ) : null}
              {isComplete ? <Text style={styles.completeMark}>✓</Text> : null}
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[styles.segmentLabel, color === '#d99b20' ? styles.darkLabel : null]}
              >
                {segment.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, maxWidth: 980, minWidth: 300 },
  captionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, paddingHorizontal: 2 },
  currentLabel: { color: '#37444a', flex: 1, fontSize: 10, fontWeight: '900', letterSpacing: 0.45, textTransform: 'uppercase' },
  score: { color: '#4f3b13', fontSize: 12, fontWeight: '900', marginLeft: 8 },
  track: { borderColor: '#fff', borderRadius: 12, borderWidth: 2, flexDirection: 'row', height: 36, overflow: 'hidden' },
  segment: { alignItems: 'center', borderRightColor: 'rgba(255,255,255,0.7)', borderRightWidth: 1, flex: 1, justifyContent: 'center', minWidth: 0, overflow: 'hidden', position: 'relative' },
  futureSegment: { opacity: 0.42 },
  activeSegment: { borderColor: '#24333a', borderWidth: 2 },
  activeProgress: { backgroundColor: 'rgba(20,35,42,0.20)', bottom: 0, left: 0, position: 'absolute', top: 0 },
  marker: { backgroundColor: '#fff', borderColor: '#24333a', borderRadius: 8, borderWidth: 2, height: 15, marginLeft: -7.5, position: 'absolute', top: -1, width: 15, zIndex: 3 },
  completeMark: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '900', left: 4, position: 'absolute', top: 2 },
  segmentLabel: { color: '#fff', fontSize: 11, fontWeight: '900', paddingHorizontal: 4, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.20)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 1, width: '100%', zIndex: 2 },
  darkLabel: { color: '#3d2a00', textShadowColor: 'transparent' },
});
