import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as ScreenOrientation from 'expo-screen-orientation';

import {
  finishLessonSession,
  getLesson,
  logCardAttempt,
  startLessonSession,
} from '../api';
import { LessonCardView } from '../components/LessonCardView';
import { courseAudioUrl } from '../config';
import type { LearnerProfile, Lesson } from '../types';

const PRAISE = ['Great', 'Awesome', 'Yay', 'Good job', 'Keep it up', 'Nice job', 'Excellent'];

type Props = {
  lessonId: string;
  profile: LearnerProfile;
  onExit: () => void;
};

export function LessonScreen({ lessonId, profile, onExit }: Props) {
  const audioPlayer = useAudioPlayer(null);
  const { height: viewportHeight } = useWindowDimensions();
  const finishedSessionRef = useRef(false);
  const pronunciationPassHandledRef = useRef(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCards, setWrongCards] = useState<Set<number>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const playAudio = useCallback((text: string, mode = 'prompt', variant = 'default') => {
    if (!text.trim()) return;
    audioPlayer.replace(courseAudioUrl(text, mode, variant));
    audioPlayer.play();
  }, [audioPlayer]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const nextLesson = await getLesson(lessonId);
      setLesson(nextLesson);
      if (profile.userId) {
        startLessonSession(profile.userId, nextLesson.id, nextLesson.cards.length)
          .then((session) => setSessionId(session.id))
          .catch(() => undefined);
      }
    } catch {
      setError('No pudimos cargar esta lección. Inténtalo otra vez.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [lessonId]);

  const currentCard = lesson?.cards[cardIndex];
  const isPronunciation = currentCard?.stage === 'Pronunciation Practice';
  const promptAudio = currentCard?.audio_text ?? currentCard?.prompt ?? '';

  useEffect(() => {
    if (!currentCard || isPronunciation || result !== null) return undefined;
    const timer = setTimeout(() => playAudio(
      promptAudio,
      'prompt',
      promptAudio.trim().toLowerCase() === 'what is it?' ? 'question' : 'prompt',
    ), 120);
    return () => clearTimeout(timer);
  }, [cardIndex, currentCard, isPronunciation, playAudio, promptAudio, result]);

  const advance = useCallback(() => {
    if (!lesson) return;
    if (cardIndex >= lesson.cards.length - 1) {
      setIsComplete(true);
      return;
    }
    setCardIndex((current) => current + 1);
    pronunciationPassHandledRef.current = false;
    setSelectedId(null);
    setResult(null);
  }, [cardIndex, lesson]);

  useEffect(() => {
    if (result !== 'correct' || !currentCard) return undefined;
    const delay = currentCard.answer_audio_text ? 2600 : isPronunciation ? 900 : 1000;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [advance, currentCard, isPronunciation, result]);

  useEffect(() => {
    if (!isComplete || !lesson || !sessionId || finishedSessionRef.current) return;
    finishedSessionRef.current = true;
    void finishLessonSession(sessionId, score, lesson.cards.length).catch(() => undefined);
  }, [isComplete, lesson, score, sessionId]);

  const recordAttempt = (optionId: string, isCorrect: boolean, firstTry: boolean) => {
    if (!lesson || !currentCard || !profile.userId || !sessionId) return;
    void logCardAttempt({
      sessionId,
      userId: profile.userId,
      lessonId: lesson.id,
      cardIndex,
      prompt: currentCard.prompt,
      selectedOptionId: optionId,
      correctOptionId: currentCard.correct_option_id,
      isCorrect,
      firstTry,
    }).catch(() => undefined);
  };

  const choose = (optionId: string) => {
    if (!currentCard || result === 'correct') return;
    const correct = optionId === currentCard.correct_option_id;
    const firstTry = !wrongCards.has(cardIndex);
    setSelectedId(optionId);
    recordAttempt(optionId, correct, firstTry);

    if (correct) {
      setResult('correct');
      if (firstTry) setScore((current) => current + 1);
      if (currentCard.answer_audio_text) {
        playAudio(currentCard.answer_audio_text, 'prompt', 'answer');
      } else {
        const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
        playAudio(praise, 'feedback', 'feedback');
      }
      return;
    }

    setWrongCards((current) => new Set(current).add(cardIndex));
    setResult('wrong');
    playAudio('Try again', 'feedback', 'feedback');
  };

  const pronunciationPassed = useCallback(() => {
    if (pronunciationPassHandledRef.current) return;
    pronunciationPassHandledRef.current = true;
    setScore((current) => current + 1);
    setResult('correct');
  }, []);

  const renderPrompt = () => {
    if (!currentCard) return '';
    const focus = currentCard.stage === 'Grammar'
      ? new Set(['is', 'are'])
      : currentCard.stage === 'More People'
        ? new Set(['and', 'are'])
        : new Set<string>();
    return currentCard.prompt.split(/(\b[A-Za-z']+\b)/g).map((part, index) => (
      <Text key={`${part}-${index}`} style={focus.has(part.toLowerCase()) ? styles.highlight : undefined}>
        {part}
      </Text>
    ));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color="#e96f42" size="large" />
          <Text style={styles.loadingText}>Cargando la lección…</Text>
          <Text style={styles.coldStart}>La primera carga puede tardar mientras el servidor despierta.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson || !currentCard) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>No pudimos abrir la lección</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.primary}><Text style={styles.primaryText}>Reintentar</Text></Pressable>
          <Pressable onPress={onExit} style={styles.linkButton}><Text style={styles.linkText}>Volver a lecciones</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isComplete) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fbf7ef" />
        <View style={styles.center}>
          <Text style={styles.completeMark}>✓</Text>
          <Text style={styles.completeEyebrow}>LECCIÓN TERMINADA</Text>
          <Text style={styles.completeTitle}>Buen trabajo</Text>
          <Text style={styles.completeText}>
            Obtuviste {score} de {lesson.cards.length} correctas al primer intento.
          </Text>
          <Pressable onPress={onExit} style={styles.primary}><Text style={styles.primaryText}>Volver a las lecciones</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((cardIndex + 1) / lesson.cards.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      <View style={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Pressable accessibilityLabel="Volver a lecciones" onPress={onExit} style={styles.logoPill}>
              <Text style={styles.logoText}>SP</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={showHelp ? 'Ocultar ayuda' : 'Mostrar ayuda'}
              onPress={() => setShowHelp((current) => !current)}
              style={[styles.helpButton, showHelp ? styles.helpButtonActive : null]}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel={`Reproducir: ${promptAudio}`}
            disabled={!promptAudio.trim()}
            onPress={() => isPronunciation
              ? playAudio(promptAudio, 'pronunciation_slow', 'split-ing')
              : playAudio(promptAudio, 'prompt', 'prompt')}
          >
            <Text style={styles.stage}>{currentCard.stage.toUpperCase()}</Text>
            <Text
              numberOfLines={2}
              style={[
                styles.prompt,
                { fontSize: viewportHeight < 400 ? 21 : 24, lineHeight: viewportHeight < 400 ? 25 : 29 },
              ]}
            >
              {isPronunciation ? 'Pronunciation Practice' : renderPrompt()}
            </Text>
          </Pressable>
        </View>
        <LessonCardView
          card={currentCard}
          gentleFeedback={profile.confidence === 'nervous'}
          key={`${lesson.id}-${cardIndex}`}
          level={lesson.level}
          onPronunciationPassed={pronunciationPassed}
          onSelect={choose}
          result={result}
          selectedId={selectedId}
          showHelp={showHelp}
          userId={profile.userId}
        />
        <View style={styles.footer}>
          <View><Text style={styles.footerLabel}>PROGRESO</Text><Text style={styles.footerValue}>{cardIndex + 1} / {lesson.cards.length}</Text></View>
          <View><Text style={styles.footerLabel}>PUNTAJE</Text><Text style={styles.footerValue}>{score}</Text></View>
          <Pressable accessibilityLabel="Volver a lecciones" onPress={onExit} style={styles.homeButton}>
            <Text style={styles.homeText}>⌂</Text>
          </Pressable>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flex: 1, gap: 6, padding: 6 },
  hero: { backgroundColor: '#ffe8c7', borderColor: '#dab277', borderRadius: 15, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  logoPill: { alignItems: 'center', backgroundColor: '#16324f', borderRadius: 13, height: 30, justifyContent: 'center', width: 50 },
  logoText: { color: '#f1bf00', fontSize: 15, fontWeight: '900' },
  helpButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 15, borderWidth: 2, height: 30, justifyContent: 'center', width: 30 },
  helpButtonActive: { backgroundColor: '#f4c95d' },
  helpButtonText: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  stage: { color: '#697177', fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  prompt: { color: '#24333a', fontWeight: '900', textAlign: 'center' },
  highlight: { backgroundColor: '#f9dc8e', color: '#8a4f00' },
  footer: { alignItems: 'center', backgroundColor: '#f2ebde', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 4 },
  footerLabel: { color: '#697177', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  footerValue: { color: '#24333a', fontSize: 15, fontWeight: '900' },
  homeButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, height: 30, justifyContent: 'center', width: 30 },
  homeText: { color: '#24333a', fontSize: 17, fontWeight: '900' },
  progressTrack: { backgroundColor: '#dedbd2', borderRadius: 3, height: 3, overflow: 'hidden' },
  progressFill: { backgroundColor: '#2f8f62', height: '100%' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { color: '#24333a', fontSize: 19, fontWeight: '900', marginTop: 16 },
  coldStart: { color: '#697177', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  errorTitle: { color: '#24333a', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  errorText: { color: '#a34842', fontSize: 14, marginTop: 9, textAlign: 'center' },
  primary: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 15, justifyContent: 'center', marginTop: 20, minHeight: 54, paddingHorizontal: 26 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  linkButton: { marginTop: 15, padding: 10 },
  linkText: { color: '#16766f', fontSize: 15, fontWeight: '800' },
  completeMark: { backgroundColor: '#2f8f62', borderRadius: 42, color: '#fff', fontSize: 40, fontWeight: '900', height: 84, lineHeight: 80, textAlign: 'center', width: 84 },
  completeEyebrow: { color: '#697177', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 20 },
  completeTitle: { color: '#24333a', fontSize: 31, fontWeight: '900', marginTop: 5 },
  completeText: { color: '#526168', fontSize: 16, lineHeight: 23, marginTop: 8, textAlign: 'center' },
});
