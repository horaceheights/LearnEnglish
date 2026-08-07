import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lessonStageShortLabel } from '../lessonInstructions';
import type { LessonCard } from '../types';

type Props = {
  cards: LessonCard[];
  compact?: boolean;
  currentIndex: number;
  lessonId: string;
  maxVisitedIndex?: number;
  onStagePress?: (startIndex: number) => void;
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

export function StageJourney({
  cards,
  compact = false,
  currentIndex,
  lessonId,
  maxVisitedIndex = currentIndex,
  onStagePress,
}: Props) {
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
    <View style={styles.container}>
      <View style={[styles.track, compact ? styles.trackCompact : null]}>
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const isComplete = index < activeSegmentIndex;
          const isUnlocked = segment.start <= maxVisitedIndex;
          const color = STAGE_COLORS[index % STAGE_COLORS.length];
          return (
            <Pressable
              accessibilityLabel={`Ir a la sección ${segment.label}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isUnlocked, selected: isActive }}
              disabled={!isUnlocked || !onStagePress}
              key={`${segment.stage}-${segment.start}`}
              onPress={() => onStagePress?.(segment.start)}
              style={({ pressed }) => [
                styles.segment,
                { backgroundColor: color },
                isActive ? styles.activeSegment : null,
                pressed ? styles.segmentPressed : null,
              ]}
            >
              {!isUnlocked ? <View pointerEvents="none" style={styles.futureOverlay} /> : null}
              {isActive ? (
                <>
                  <View style={[styles.activeProgress, { width: `${positionInStage}%` }]} />
                  <View style={[styles.marker, compact ? styles.markerCompact : null, { left: `${positionInStage}%` }]} />
                </>
              ) : null}
              {isComplete ? <Text style={[styles.completeMark, compact ? styles.completeMarkCompact : null]}>✓</Text> : null}
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.58}
                numberOfLines={1}
                style={[
                  styles.segmentLabel,
                  compact ? styles.segmentLabelCompact : null,
                  color === '#d99b20' ? styles.darkLabel : null,
                ]}
              >
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 300, width: '100%' },
  track: { borderColor: '#fff', borderRadius: 20, borderWidth: 3, flexDirection: 'row', height: 66, overflow: 'hidden', width: '100%' },
  trackCompact: { borderRadius: 16, height: 50 },
  segment: { alignItems: 'center', borderRightColor: 'rgba(255,255,255,0.7)', borderRightWidth: 1, flex: 1, justifyContent: 'center', minWidth: 0, overflow: 'hidden', position: 'relative' },
  segmentPressed: { opacity: 0.78 },
  futureOverlay: { backgroundColor: 'rgba(255,255,255,0.32)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  activeSegment: { borderColor: '#24333a', borderWidth: 3 },
  activeProgress: { backgroundColor: 'rgba(20,35,42,0.20)', bottom: 0, left: 0, position: 'absolute', top: 0 },
  marker: { backgroundColor: '#fff', borderColor: '#17252b', borderRadius: 14, borderWidth: 4, height: 28, marginLeft: -14, position: 'absolute', top: -3, width: 28, zIndex: 3 },
  markerCompact: { borderRadius: 11, borderWidth: 3, height: 22, marginLeft: -11, width: 22 },
  completeMark: { color: '#fff', fontSize: 18, fontWeight: '900', left: 7, position: 'absolute', top: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 2 },
  completeMarkCompact: { fontSize: 13, left: 4, top: 2 },
  segmentLabel: { color: '#fff', fontSize: 20, fontWeight: '900', paddingHorizontal: 6, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { height: 1, width: 0 }, textShadowRadius: 2, width: '100%', zIndex: 2 },
  segmentLabelCompact: { fontSize: 15, paddingHorizontal: 3 },
  darkLabel: { color: '#3d2a00', textShadowColor: 'transparent' },
});
