import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { absoluteMediaUrl } from '../config';
import type { LessonCard } from '../types';
import { PronunciationPractice } from './PronunciationPractice';

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
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isPronunciation = card.stage === 'Pronunciation Practice';
  const isListenCard = card.stage === 'Listen';
  const isLandscape = viewportWidth > viewportHeight;
  const optionWidth =
    isLandscape && card.options.length >= 4
      ? '23.5%'
      : isLandscape && card.options.length === 3
        ? '31%'
        : card.options.length === 1
          ? '72%'
          : '48%';
  const featureImageHeight = isPronunciation
    ? Math.max(125, Math.min(190, viewportHeight * 0.32))
    : Math.max(70, Math.min(118, viewportHeight * 0.24));
  const optionImageHeight =
    card.options.length >= 4
      ? Math.max(82, Math.min(132, viewportHeight * 0.25))
      : card.options.length === 3
        ? Math.max(110, Math.min(180, viewportHeight * 0.32))
      : card.options.length === 1
        ? Math.max(150, Math.min(240, viewportHeight * 0.42))
        : Math.max(165, Math.min(250, viewportHeight * 0.43));
  const optionMinHeight = isLandscape ? Math.max(58, viewportHeight * 0.17) : 92;

  return (
    <View style={[styles.card, isLandscape ? styles.cardLandscape : null]}>
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
              style={[styles.pronunciationImage, { height: showHelp ? featureImageHeight * 0.65 : featureImageHeight }]}
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
            {card.options.map((option) => {
              const selected = selectedId === option.id;
              const correct = option.id === card.correct_option_id;
              const revealCorrect = selected && result === 'correct' && correct;
              const revealWrong = selected && result === 'wrong';
              return (
                <Pressable
                  accessibilityLabel={option.label || `Answer option ${option.id}`}
                  accessibilityRole="button"
                  disabled={result === 'correct'}
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    { minHeight: optionMinHeight, width: optionWidth },
                    revealCorrect ? styles.correctOption : null,
                    revealWrong ? styles.wrongOption : null,
                    pressed ? styles.pressed : null,
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
                    <Text style={styles.optionLabel}>{option.label}</Text>
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
  optionLabel: {
    color: '#26372f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
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
});
