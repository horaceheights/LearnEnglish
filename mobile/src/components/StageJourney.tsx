import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { lessonStageShortLabel } from '../lessonInstructions';
import type { LessonCard } from '../types';

type Props = {
  allComplete?: boolean;
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

type StageIconName = ComponentProps<typeof Ionicons>['name'];

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

function stageIcon(stage: string): StageIconName {
  const normalized = stage.toLowerCase();

  if (normalized.includes('pronunciation')) return 'mic-outline';
  if (normalized.includes('listen')) return 'ear-outline';
  if (normalized.includes('grammar') || normalized.includes('negation')) return 'text-outline';
  if (normalized.includes('action')) return 'walk-outline';
  if (normalized.includes('plural') || normalized.includes('people') || normalized.includes('family')) return 'people-outline';
  if (normalized.includes('vocab') || normalized.includes('word')) return 'book-outline';
  if (normalized.includes('picture') || normalized.includes('meaning')) return 'images-outline';
  if (normalized.includes('pronoun')) return 'person-outline';
  if (normalized.includes('pattern')) return 'extension-puzzle-outline';
  if (normalized.includes('what') || normalized.includes('question')) return 'help-circle-outline';
  if (normalized.includes('sentence')) return 'chatbubble-ellipses-outline';

  return 'flag-outline';
}

export function StageJourney({
  allComplete = false,
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
          const isComplete = allComplete || index < activeSegmentIndex;
          const isUnlocked = segment.start <= maxVisitedIndex;
          const color = STAGE_COLORS[index % STAGE_COLORS.length];
          const foregroundColor = color === '#d99b20' ? '#3d2a00' : '#fff';
          return (
            <Pressable
              accessibilityLabel={`Ir a la sección ${segment.label}${isComplete ? ', completada' : isActive ? ', sección actual' : !isUnlocked ? ', bloqueada' : ''}`}
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
                  <View style={[styles.marker, compact ? styles.markerCompact : null, { left: `${positionInStage}%` }]}>
                    <View style={[styles.markerGem, compact ? styles.markerGemCompact : null]} />
                  </View>
                </>
              ) : null}
              <Ionicons
                color={foregroundColor}
                name={stageIcon(segment.stage)}
                size={compact ? 23 : 30}
                style={[styles.stageIcon, isActive ? styles.stageIconActive : null]}
              />
              {isComplete ? (
                <View style={[styles.statusBadge, compact ? styles.statusBadgeCompact : null]}>
                  <Ionicons color="#176c52" name="checkmark" size={compact ? 11 : 14} />
                </View>
              ) : null}
              {!isUnlocked ? (
                <View style={[styles.lockBadge, compact ? styles.lockBadgeCompact : null]}>
                  <Ionicons color="#33464f" name="lock-closed" size={compact ? 9 : 11} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 0, width: '100%' },
  track: { borderColor: '#fff', borderRadius: 18, borderWidth: 3, flexDirection: 'row', height: 54, overflow: 'hidden', width: '100%' },
  trackCompact: { borderRadius: 14, height: 44 },
  segment: { alignItems: 'center', borderRightColor: 'rgba(255,255,255,0.7)', borderRightWidth: 1, flex: 1, justifyContent: 'center', minWidth: 0, overflow: 'hidden', position: 'relative' },
  segmentPressed: { opacity: 0.78 },
  futureOverlay: { backgroundColor: 'rgba(255,255,255,0.48)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 2 },
  activeSegment: { borderColor: '#24333a', borderWidth: 3 },
  activeProgress: { backgroundColor: 'rgba(20,35,42,0.20)', bottom: 0, left: 0, position: 'absolute', top: 0 },
  marker: { alignItems: 'center', backgroundColor: '#fff4a8', borderColor: '#17252b', borderRadius: 4, borderWidth: 2, height: 16, justifyContent: 'center', marginLeft: -8, position: 'absolute', top: 3, transform: [{ rotate: '45deg' }], width: 16, zIndex: 3 },
  markerCompact: { borderRadius: 3, height: 12, marginLeft: -6, top: 2, width: 12 },
  markerGem: { backgroundColor: '#f3a712', borderRadius: 3, height: 6, width: 6 },
  markerGemCompact: { height: 4, width: 4 },
  stageIcon: { zIndex: 3 },
  stageIconActive: { transform: [{ scale: 1.08 }] },
  statusBadge: { alignItems: 'center', backgroundColor: '#edfff8', borderColor: '#176c52', borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', left: 5, position: 'absolute', top: 4, width: 20, zIndex: 4 },
  statusBadgeCompact: { borderRadius: 8, height: 16, left: 3, top: 3, width: 16 },
  lockBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 9, bottom: 4, height: 18, justifyContent: 'center', position: 'absolute', right: 5, width: 18, zIndex: 4 },
  lockBadgeCompact: { borderRadius: 7, bottom: 3, height: 14, right: 3, width: 14 },
});
