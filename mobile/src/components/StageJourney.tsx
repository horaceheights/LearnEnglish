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
                isActive ? styles.activeSegment : null,
              ]}
            >
              {!isActive && !isComplete ? <View style={styles.futureOverlay} /> : null}
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
  container: { flex: 1, maxWidth: 1200, minWidth: 300 },
  captionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, paddingHorizontal: 2 },
  currentLabel: { color: '#263238', flex: 1, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  score: { color: '#3d2d0d', fontSize: 15, fontWeight: '900', marginLeft: 10 },
  track: { borderColor: '#fff', borderRadius: 15, borderWidth: 2, flexDirection: 'row', height: 47, overflow: 'hidden' },
  segment: { alignItems: 'center', borderRightColor: 'rgba(255,255,255,0.7)', borderRightWidth: 1, flex: 1, justifyContent: 'center', minWidth: 0, overflow: 'hidden', position: 'relative' },
  futureOverlay: { backgroundColor: 'rgba(255,255,255,0.32)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  activeSegment: { borderColor: '#24333a', borderWidth: 2 },
  activeProgress: { backgroundColor: 'rgba(20,35,42,0.20)', bottom: 0, left: 0, position: 'absolute', top: 0 },
  marker: { backgroundColor: '#fff', borderColor: '#17252b', borderRadius: 10, borderWidth: 3, height: 20, marginLeft: -10, position: 'absolute', top: -2, width: 20, zIndex: 3 },
  completeMark: { color: '#fff', fontSize: 14, fontWeight: '900', left: 5, position: 'absolute', top: 3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 2 },
  segmentLabel: { color: '#fff', fontSize: 14, fontWeight: '900', paddingHorizontal: 5, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 2, width: '100%', zIndex: 2 },
  darkLabel: { color: '#3d2a00', textShadowColor: 'transparent' },
});
