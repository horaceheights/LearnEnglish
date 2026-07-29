import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { absoluteMediaUrl } from '../config';
import type { LessonCard } from '../types';
import { CourseAudioButton } from './CourseAudioButton';
import { PronunciationPractice } from './PronunciationPractice';

type Props = {
  card: LessonCard;
  selectedId: string | null;
  onSelect: (optionId: string) => void;
  onContinue: () => void;
};

export function LessonCardView({ card, selectedId, onSelect, onContinue }: Props) {
  const isPronunciation = card.stage === 'Pronunciation Practice';
  const isListenCard = card.stage === 'Listen';
  const answeredCorrectly = selectedId === card.correct_option_id;

  return (
    <View style={styles.card}>
      <Text style={styles.stage}>{card.stage.toUpperCase()}</Text>
      <Text style={styles.prompt}>{card.prompt}</Text>
      {card.prompt_image_url ? (
        <Image
          accessibilityLabel={card.answer_audio_text || card.prompt}
          resizeMode="contain"
          source={{ uri: absoluteMediaUrl(card.prompt_image_url) }}
          style={styles.promptImage}
        />
      ) : null}
      {card.audio_text && !isPronunciation ? (
        <View style={styles.audioWrap}>
          <CourseAudioButton
            label={isListenCard ? 'Play the sentence' : 'Hear it'}
            text={card.audio_text}
          />
        </View>
      ) : null}

      {isPronunciation ? (
        <PronunciationPractice onPassed={onContinue} phrase={card.audio_text || card.prompt} />
      ) : (
        <>
          <View style={styles.options}>
            {card.options.map((option) => {
              const selected = selectedId === option.id;
              const correct = option.id === card.correct_option_id;
              const revealCorrect = selectedId !== null && correct;
              const revealWrong = selected && !correct;
              return (
                <Pressable
                  accessibilityLabel={option.label || `Answer option ${option.id}`}
                  accessibilityRole="button"
                  disabled={selectedId !== null}
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
                  {option.label && (!isListenCard || selectedId !== null || !option.image_url) ? (
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  ) : null}
                  {revealCorrect ? <Text style={styles.feedbackIcon}>✓</Text> : null}
                  {revealWrong ? <Text style={[styles.feedbackIcon, styles.wrongIcon]}>×</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {selectedId !== null ? (
            <View style={styles.feedback}>
              <Text style={[styles.feedbackText, answeredCorrectly ? styles.correctText : styles.wrongText]}>
                {answeredCorrectly ? 'Correct!' : 'Not quite. The correct answer is highlighted.'}
              </Text>
              {card.answer_audio_text ? (
                <CourseAudioButton label="Hear the complete sentence" text={card.answer_audio_text} />
              ) : null}
              <Pressable accessibilityRole="button" onPress={onContinue} style={styles.continueButton}>
                <Text style={styles.continueText}>Continue</Text>
              </Pressable>
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
  stage: { color: '#287a57', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  prompt: {
    color: '#17251f',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 35,
    marginTop: 10,
    textAlign: 'center',
  },
  promptImage: { alignSelf: 'center', height: 180, marginTop: 14, width: '100%' },
  audioWrap: { marginTop: 16 },
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
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#17251f',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
