import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const isPronunciation = card.stage === 'Pronunciation Practice';
  const isListenCard = card.stage === 'Listen';

  return (
    <View style={styles.card}>
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
          style={styles.promptImage}
        />
      ) : null}
      {isPronunciation ? (
        <>
          {card.options[0]?.image_url ? (
            <Image
              accessibilityLabel={card.options[0].label || card.prompt}
              resizeMode="contain"
              source={{ uri: absoluteMediaUrl(card.options[0].image_url) }}
              style={styles.pronunciationImage}
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
          <View style={styles.options}>
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
                    card.options.length === 1 ? styles.singleOption : null,
                    revealCorrect ? styles.correctOption : null,
                    revealWrong ? styles.wrongOption : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  {option.image_url ? (
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="cover"
                      source={{ uri: absoluteMediaUrl(option.image_url) }}
                      style={styles.optionImage}
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
  help: { backgroundColor: '#fff4df', borderRadius: 14, marginBottom: 12, padding: 12 },
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
  option: {
    alignItems: 'center',
    backgroundColor: '#faf9f5',
    borderColor: '#dedbd2',
    borderRadius: 17,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 92,
    overflow: 'hidden',
    padding: 8,
    position: 'relative',
    width: '48%',
  },
  singleOption: { width: '82%' },
  optionImage: { backgroundColor: '#f0eee7', borderRadius: 11, height: 128, width: '100%' },
  optionLabel: {
    color: '#26372f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
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
  feedback: { gap: 14, marginTop: 18 },
  feedbackText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  correctText: { color: '#287a57' },
  wrongText: { color: '#a34842' },
  pressed: { opacity: 0.72 },
});
