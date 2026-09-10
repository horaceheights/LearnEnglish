import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { LESSON_STAGE_COLORS, lessonStageColorForSegment } from '../lessonStageTheme';
import type { SectionBriefing } from '../lessonSectionBriefing';
import type { LessonCard } from '../types';
import { StageJourney, stageIcon } from './StageJourney';

type Props = {
  briefing: SectionBriefing;
  cards: LessonCard[];
  lessonId: string;
  onContinue: () => void;
};

const ENTRANCE_MS = 260;

// Gold needs dark ink for contrast; every other journey colour carries white.
function foregroundFor(color: string) {
  return color === LESSON_STAGE_COLORS[4] ? '#3d2a00' : '#fff';
}

export function LessonSectionBriefing({ briefing, cards, lessonId, onContinue }: Props) {
  const reduceMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  const isOpening = briefing.kind === 'opening';

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      return undefined;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      duration: ENTRANCE_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [briefing.nextCardIndex, entrance, reduceMotion]);

  const doneColor = briefing.doneSegmentIndex === null
    ? LESSON_STAGE_COLORS[0]
    : lessonStageColorForSegment(briefing.doneSegmentIndex);
  const nextColor = briefing.accentColor;

  return (
    <ScrollView contentContainerStyle={styles.page} style={styles.scroll}>
      <StageJourney
        cards={cards}
        compact
        currentIndex={briefing.nextCardIndex}
        lessonId={lessonId}
        maxVisitedIndex={briefing.nextCardIndex}
      />

      <Animated.View
        style={[
          styles.body,
          {
            opacity: entrance,
            transform: [
              { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          },
        ]}
      >
        <View style={[styles.panel, { borderColor: doneColor }]}>
          <Text style={[styles.eyebrow, { color: doneColor }]}>
            {isOpening ? 'VAS A APRENDER' : 'LO QUE ACABAS DE PRACTICAR'}
          </Text>
          {briefing.doneSummary ? (
            <Text style={styles.summary}>{briefing.doneSummary}</Text>
          ) : null}
          {briefing.doneChips.length > 0 ? (
            <View
              accessibilityLabel={isOpening ? 'Palabras de esta lección' : 'Lo que practicaste'}
              style={styles.chipRow}
            >
              {briefing.doneChips.map((chip) => (
                <View key={chip} style={[styles.chip, { borderColor: doneColor }]}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Ionicons color="#b3a894" name="arrow-down-circle" size={26} style={styles.divider} />

        <View style={[styles.panel, styles.nextPanel, { borderColor: nextColor }]}>
          <Text style={[styles.eyebrow, { color: nextColor }]}>AHORA</Text>
          <View style={styles.nextHeading}>
            <View style={[styles.stageBadge, { backgroundColor: nextColor }]}>
              <Ionicons color={foregroundFor(nextColor)} name={stageIcon(briefing.nextStage)} size={22} />
            </View>
            <Text accessibilityRole="header" style={styles.nextTitle}>{briefing.nextLabel}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{briefing.nextCount} tarjetas</Text>
            </View>
          </View>
          <Text style={styles.intro}>{briefing.nextIntro}</Text>
          <Text style={[styles.mechanic, { color: nextColor }]}>{briefing.nextMechanic}</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}>
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons color="#fff" name="arrow-forward" size={20} />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#fbf7ef', flex: 1 },
  page: {
    alignItems: 'center',
    flexGrow: 1,
    gap: 4,
    justifyContent: 'center',
    paddingBottom: 26,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  body: { alignItems: 'center', maxWidth: 720, width: '100%' },
  panel: {
    backgroundColor: '#fffdf8',
    borderRadius: 22,
    borderWidth: 2,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    width: '100%',
  },
  nextPanel: { marginTop: 4 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  summary: { color: '#3d4a50', fontSize: 16, fontWeight: '800', lineHeight: 22, marginTop: 6, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 9 },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  chipText: { color: '#24333a', fontSize: 16, fontWeight: '800' },
  divider: { marginTop: 8 },
  nextHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 7 },
  stageBadge: { alignItems: 'center', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  nextTitle: { color: '#24333a', flexShrink: 1, fontSize: 24, fontWeight: '900' },
  countPill: {
    backgroundColor: '#f1ebdd',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 10,
  },
  countText: { color: '#6d6152', fontSize: 12, fontWeight: '800' },
  intro: { color: '#4b585e', fontSize: 16, lineHeight: 22, marginTop: 9, textAlign: 'center' },
  mechanic: { fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 7, textAlign: 'center' },
  button: {
    alignItems: 'center',
    backgroundColor: '#c94d24',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 54,
    paddingHorizontal: 30,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
