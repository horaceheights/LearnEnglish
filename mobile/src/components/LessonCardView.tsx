import { Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { absoluteMediaUrl } from '../config';
import type { LessonCard } from '../types';
import { PronunciationPractice } from './PronunciationPractice';

const TEXT_OPTION_THEMES = [
  { accent: '#d26a3d', background: '#fff1e9', border: '#efb093' },
  { accent: '#287a67', background: '#e8f6f1', border: '#8fc9b8' },
  { accent: '#356aa0', background: '#ebf3fb', border: '#9bbddd' },
  { accent: '#9a6724', background: '#fff6dc', border: '#e7c477' },
];

type Props = {
  card: LessonCard;
  level: string;
  userId?: string;
  selectedId: string | null;
  result: 'correct' | 'wrong' | null;
  gentleFeedback: boolean;
  showHelp: boolean;
  onSelect: (optionId: string) => void;
  onPronunciationPassed: () => void;
  onGrammarAnimationComplete: () => void;
};

export function LessonCardView({
  card,
  level,
  userId,
  selectedId,
  result,
  gentleFeedback,
  showHelp,
  onSelect,
  onPronunciationPassed,
  onGrammarAnimationComplete,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isPronunciation = card.stage === 'Pronunciation Practice';
  const isGrammar = card.stage === 'Grammar' || card.stage === 'New Grammar';
  const isListenCard = card.stage === 'Listen';
  const isLandscape = viewportWidth > viewportHeight;
  const hasTextOnlyOptions = card.options.length > 0 && card.options.every((option) => !option.image_url);
  const useTextGrid = isLandscape && hasTextOnlyOptions && card.options.length >= 3;
  const flyingAnswerAnimation = useRef(new Animated.Value(0)).current;
  const [flyingAnswer, setFlyingAnswer] = useState('');
  const optionWidth =
    useTextGrid
      ? '48.5%'
      : isLandscape && card.options.length >= 4
      ? '23.5%'
      : isLandscape && card.options.length === 3
        ? '31%'
        : card.options.length === 1
          ? '72%'
          : '48%';
  const featureImageHeight = isPronunciation
    ? Math.max(175, Math.min(255, viewportHeight * 0.43))
    : useTextGrid
      ? Math.max(165, Math.min(215, viewportHeight * 0.35))
      : Math.max(155, Math.min(245, viewportHeight * 0.41));
  const optionImageHeight =
    card.options.length >= 4
      ? Math.max(125, Math.min(180, viewportHeight * 0.31))
      : card.options.length === 3
        ? Math.max(155, Math.min(225, viewportHeight * 0.38))
      : card.options.length === 1
        ? Math.max(180, Math.min(285, viewportHeight * 0.48))
        : Math.max(185, Math.min(285, viewportHeight * 0.48));
  const optionMinHeight = hasTextOnlyOptions
    ? isLandscape
      ? Math.max(72, Math.min(92, viewportHeight * 0.145))
      : 104
    : isLandscape
      ? Math.max(58, viewportHeight * 0.17)
      : 92;

  useEffect(() => {
    if (!isGrammar || result !== 'correct' || !selectedId) return undefined;
    const selectedOption = card.options.find((option) => option.id === selectedId);
    if (!selectedOption?.label) {
      onGrammarAnimationComplete();
      return undefined;
    }

    setFlyingAnswer(selectedOption.label);
    flyingAnswerAnimation.setValue(0);
    const animation = Animated.timing(flyingAnswerAnimation, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setFlyingAnswer('');
      onGrammarAnimationComplete();
    });
    return () => animation.stop();
  }, [
    card.options,
    flyingAnswerAnimation,
    isGrammar,
    onGrammarAnimationComplete,
    result,
    selectedId,
  ]);

  return (
    <View style={[styles.card, isLandscape ? styles.cardLandscape : null]}>
      {flyingAnswer ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flyingAnswer,
            {
              opacity: flyingAnswerAnimation.interpolate({
                inputRange: [0, 0.82, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateY: flyingAnswerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [210, 0],
                  }),
                },
                {
                  scale: flyingAnswerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.15],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.flyingAnswerText}>{flyingAnswer}</Text>
        </Animated.View>
      ) : null}
      {showHelp ? (
        <View style={styles.help}>
          <Text style={styles.helpTitle}>Ayuda</Text>
          <Text style={styles.helpText}>
            {isPronunciation
              ? 'Escucha la frase, repítela cuando aparezca la señal y revisa las palabras marcadas.'
              : isListenCard
                ? 'Escucha con atención y toca la imagen que corresponde.'
                : 'Toca la imagen o palabra que corresponde a la frase.'}
          </Text>
        </View>
      ) : null}
      {card.prompt_image_url ? (
        <Image
          accessibilityLabel={card.answer_audio_text || card.prompt}
          resizeMode="contain"
          source={{ uri: absoluteMediaUrl(card.prompt_image_url) }}
          style={[styles.promptImage, { height: showHelp ? featureImageHeight * 0.65 : featureImageHeight }]}
        />
      ) : null}
      {isPronunciation ? (
        <>
          {card.options[0]?.image_url ? (
            <Image
              accessibilityLabel={card.options[0].label || card.prompt}
              resizeMode="contain"
              source={{ uri: absoluteMediaUrl(card.options[0].image_url) }}
              style={[
                styles.pronunciationImage,
                {
                  height: showHelp
                    ? featureImageHeight * 0.65
                    : result
                      ? featureImageHeight * 0.72
                      : featureImageHeight,
                },
              ]}
            />
          ) : null}
          <PronunciationPractice
            level={level}
            onPassed={onPronunciationPassed}
            phrase={card.audio_text || card.prompt}
            userId={userId}
          />
        </>
      ) : (
        <>
          <View style={[styles.options, isLandscape ? styles.optionsLandscape : null]}>
            {card.options.map((option, optionIndex) => {
              const selected = selectedId === option.id;
              const correct = option.id === card.correct_option_id;
              const revealCorrect = selected && result === 'correct' && correct;
              const revealWrong = selected && result === 'wrong';
              const textTheme = TEXT_OPTION_THEMES[optionIndex % TEXT_OPTION_THEMES.length];
              return (
                <Pressable
                  accessibilityLabel={option.label || `Answer option ${option.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: result === 'correct', selected }}
                  disabled={result === 'correct'}
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    { minHeight: optionMinHeight, width: optionWidth },
                    hasTextOnlyOptions
                      ? {
                          backgroundColor: textTheme.background,
                          borderColor: textTheme.border,
                        }
                      : null,
                    hasTextOnlyOptions ? styles.textOption : null,
                    revealCorrect ? styles.correctOption : null,
                    revealWrong ? styles.wrongOption : null,
                    pressed ? styles.pressed : null,
                    pressed && hasTextOnlyOptions ? styles.textOptionPressed : null,
                  ]}
                >
                  {option.image_url ? (
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={{ uri: absoluteMediaUrl(option.image_url) }}
                      style={[styles.optionImage, { height: showHelp ? optionImageHeight * 0.65 : optionImageHeight }]}
                    />
                  ) : null}
                  {option.label && !option.image_url ? (
                    <>
                      <View
                        pointerEvents="none"
                        style={[styles.optionSpark, { backgroundColor: textTheme.accent }]}
                      />
                      <Text
                        style={[
                          styles.optionLabel,
                          styles.textOptionLabel,
                          {
                            color: textTheme.accent,
                            fontSize: Math.max(26, Math.min(34, viewportHeight * 0.052)),
                            lineHeight: Math.max(32, Math.min(40, viewportHeight * 0.062)),
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <View style={[styles.optionUnderline, { backgroundColor: textTheme.accent }]} />
                    </>
                  ) : null}
                  {revealCorrect ? <Text style={styles.feedbackIcon}>✓</Text> : null}
                  {revealWrong ? <Text style={[styles.feedbackIcon, styles.wrongIcon]}>×</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {result ? (
            <View style={styles.feedback}>
              <Text style={[styles.feedbackText, result === 'correct' ? styles.correctText : styles.wrongText]}>
                {result === 'correct'
                  ? 'Correcto. Vamos a la siguiente tarjeta…'
                  : gentleFeedback
                    ? 'No pasa nada. Inténtalo otra vez. Esta tarjeta ya no contará como acierto al primer intento.'
                    : 'No fue esa. Inténtalo otra vez. Esta tarjeta ya no contará como acierto al primer intento.'}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderColor: '#e4ded2',
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
  },
  cardLandscape: { flex: 1, justifyContent: 'center', padding: 9 },
  help: { backgroundColor: '#fff4df', borderRadius: 12, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6 },
  flyingAnswer: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -64, zIndex: 20 },
  flyingAnswerText: { backgroundColor: '#f9dc8e', borderColor: '#e0a93f', borderRadius: 10, borderWidth: 2, color: '#8a4f00', fontSize: 22, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6 },
  helpTitle: { color: '#8a4f00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  helpText: { color: '#694b22', fontSize: 13, lineHeight: 18, marginTop: 3 },
  promptImage: { alignSelf: 'center', height: 180, marginTop: 14, width: '100%' },
  pronunciationImage: { alignSelf: 'center', height: 190, marginTop: 8, width: '100%' },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 20,
  },
  optionsLandscape: { gap: 7, marginTop: 5 },
  option: {
    alignItems: 'center',
    backgroundColor: '#faf9f5',
    borderColor: '#dedbd2',
    borderRadius: 17,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 92,
    overflow: 'hidden',
    padding: 5,
    position: 'relative',
    width: '48%',
  },
  optionImage: { backgroundColor: '#f2ebde', borderRadius: 11, width: '100%' },
  textOption: {
    borderBottomWidth: 5,
    elevation: 3,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#152b22',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  optionSpark: {
    borderRadius: 50,
    height: 72,
    opacity: 0.08,
    position: 'absolute',
    right: -20,
    top: -25,
    width: 72,
  },
  optionUnderline: { borderRadius: 4, height: 5, marginTop: 7, opacity: 0.75, width: 42 },
  optionLabel: {
    color: '#26372f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  textOptionLabel: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginTop: 0,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 1,
  },
  correctOption: { backgroundColor: '#eaf6ee', borderColor: '#3c996c' },
  wrongOption: { backgroundColor: '#fbeceb', borderColor: '#c95e55' },
  feedbackIcon: {
    backgroundColor: '#3c996c',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    height: 28,
    lineHeight: 27,
    position: 'absolute',
    right: 8,
    textAlign: 'center',
    top: 8,
    width: 28,
  },
  wrongIcon: { backgroundColor: '#c95e55' },
  feedback: { gap: 6, marginTop: 5 },
  feedbackText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  correctText: { color: '#287a57' },
  wrongText: { color: '#a34842' },
  pressed: { opacity: 0.72 },
  textOptionPressed: { elevation: 0, transform: [{ scale: 0.97 }, { translateY: 3 }] },
});
