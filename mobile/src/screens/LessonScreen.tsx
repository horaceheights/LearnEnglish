import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import * as Updates from 'expo-updates';

import {
  finishLessonSession,
  getLesson,
  logCardAttempt,
  startLessonSession,
} from '../api';
import { LessonCardView } from '../components/LessonCardView';
import { courseAudioUrl } from '../config';
import { setDiagnosticContext } from '../diagnostics';
import { lessonPromptText, lessonStageLabel, pronunciationInstruction } from '../lessonInstructions';
import type { LearnerProfile, Lesson } from '../types';

const SUCCESS_CHIME = require('../../assets/success-chime.wav');
const TRY_AGAIN_CUE = require('../../assets/try-again.wav');

type Props = {
  lessonId: string;
  profile: LearnerProfile;
  onExit: () => void;
  initialCardIndex?: number;
  qaMode?: boolean;
};

export function LessonScreen({
  lessonId,
  profile,
  onExit,
  initialCardIndex = 0,
  qaMode = false,
}: Props) {
  const audioPlayer = useAudioPlayer(null);
  const successChimePlayer = useAudioPlayer(SUCCESS_CHIME);
  const tryAgainCuePlayer = useAudioPlayer(TRY_AGAIN_CUE);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const answerAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [grammarCompleted, setGrammarCompleted] = useState(false);
  const [qaAutoAdvance, setQaAutoAdvance] = useState(false);
  const [cardRunId, setCardRunId] = useState(0);
  const [promptTextWidth, setPromptTextWidth] = useState(0);

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });

    return () => subscription.remove();
  }, [onExit]);

  const playAudio = useCallback((text: string, mode = 'prompt', variant = 'default') => {
    if (!text.trim()) return;
    audioPlayer.replace(courseAudioUrl(text, mode, variant));
    audioPlayer.play();
  }, [audioPlayer]);

  const playSuccessChime = useCallback(async () => {
    try {
      await successChimePlayer.seekTo(0);
      successChimePlayer.play();
    } catch {
      // Feedback audio should never interrupt the lesson flow.
    }
  }, [successChimePlayer]);

  const playTryAgainCue = useCallback(async () => {
    try {
      await tryAgainCuePlayer.seekTo(0);
      tryAgainCuePlayer.play();
    } catch {
      // Feedback audio should never interrupt the lesson flow.
    }
  }, [tryAgainCuePlayer]);

  const playAnswerAfterChime = useCallback((text: string) => {
    if (answerAudioTimerRef.current) clearTimeout(answerAudioTimerRef.current);
    answerAudioTimerRef.current = setTimeout(() => {
      answerAudioTimerRef.current = null;
      playAudio(text, 'prompt', 'answer');
    }, 520);
  }, [playAudio]);

  useEffect(() => () => {
    if (answerAudioTimerRef.current) clearTimeout(answerAudioTimerRef.current);
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const nextLesson = await getLesson(lessonId);
      setLesson(nextLesson);
      setCardIndex(Math.min(Math.max(initialCardIndex, 0), Math.max(nextLesson.cards.length - 1, 0)));
      if (profile.userId && !qaMode) {
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

  useEffect(() => { void load(); }, [initialCardIndex, lessonId, qaMode]);

  const currentCard = lesson?.cards[cardIndex];
  const isPronunciation = currentCard?.stage === 'Pronunciation Practice';
  const isGrammar = currentCard?.stage === 'Grammar' || currentCard?.stage === 'New Grammar';
  const promptAudio = currentCard?.audio_text ?? currentCard?.prompt ?? '';
  const updateCode = Updates.updateId?.slice(0, 8) || 'embedded';

  useEffect(() => {
    setDiagnosticContext({
      cardIndex,
      lessonId,
      prompt: currentCard?.prompt,
      qaMode,
      stage: currentCard?.stage,
      totalCards: lesson?.cards.length,
    });
  }, [cardIndex, currentCard?.prompt, currentCard?.stage, lesson?.cards.length, lessonId, qaMode]);

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
    setGrammarCompleted(false);
    setSelectedId(null);
    setResult(null);
  }, [cardIndex, lesson]);

  useEffect(() => {
    if (
      result !== 'correct' ||
      !currentCard ||
      (isGrammar && !grammarCompleted) ||
      (qaMode && !qaAutoAdvance)
    ) return undefined;
    const delay = isGrammar ? 2200 : currentCard.answer_audio_text ? 2600 : isPronunciation ? 900 : 1000;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [
    advance,
    currentCard,
    grammarCompleted,
    isGrammar,
    isPronunciation,
    qaAutoAdvance,
    qaMode,
    result,
  ]);

  useEffect(() => {
    if (qaMode || !isComplete || !lesson || !sessionId || finishedSessionRef.current) return;
    finishedSessionRef.current = true;
    void finishLessonSession(sessionId, score, lesson.cards.length).catch(() => undefined);
  }, [isComplete, lesson, qaMode, score, sessionId]);

  const recordAttempt = (optionId: string, isCorrect: boolean, firstTry: boolean) => {
    if (qaMode || !lesson || !currentCard || !profile.userId || !sessionId) return;
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
      void playSuccessChime();
      if (isGrammar) {
        return;
      }
      if (currentCard.answer_audio_text) {
        playAnswerAfterChime(currentCard.answer_audio_text);
      }
      return;
    }

    setWrongCards((current) => new Set(current).add(cardIndex));
    setResult('wrong');
    void playTryAgainCue();
  };

  const pronunciationPassed = useCallback(() => {
    if (pronunciationPassHandledRef.current) return;
    pronunciationPassHandledRef.current = true;
    setScore((current) => current + 1);
    setResult('correct');
    void playSuccessChime();
  }, [playSuccessChime]);

  const grammarAnimationComplete = useCallback(() => {
    if (!currentCard || !isGrammar) return;
    const selectedOption = currentCard.options.find((option) => option.id === selectedId);
    const completedSentence = selectedOption?.label
      ? currentCard.prompt.replace(/_{2,}/, selectedOption.label)
      : currentCard.answer_audio_text || currentCard.audio_text || currentCard.prompt;
    setGrammarCompleted(true);
    playAudio(
      currentCard.answer_audio_text || completedSentence,
      'prompt',
      'answer',
    );
  }, [currentCard, isGrammar, playAudio, selectedId]);

  const resetCardState = useCallback(() => {
    pronunciationPassHandledRef.current = false;
    setScore(0);
    setWrongCards(new Set());
    setGrammarCompleted(false);
    setSelectedId(null);
    setResult(null);
    setIsComplete(false);
    setCardRunId((current) => current + 1);
  }, []);

  const openQaCard = useCallback((nextIndex: number) => {
    if (!lesson) return;
    setCardIndex(Math.min(Math.max(nextIndex, 0), lesson.cards.length - 1));
    resetCardState();
  }, [lesson, resetCardState]);

  const renderPrompt = () => {
    if (!currentCard) return '';
    const selectedOption = currentCard.options.find((option) => option.id === selectedId);
    const displayedPrompt =
      isGrammar && grammarCompleted && selectedOption?.label
        ? currentCard.prompt.replace(/_{2,}/, selectedOption.label)
        : currentCard.prompt;
    const focus = currentCard.stage === 'Grammar'
      ? new Set(['is', 'are', selectedOption?.label?.toLowerCase() || ''])
      : currentCard.stage === 'New Grammar'
        ? new Set(['not', selectedOption?.label?.toLowerCase() || ''])
      : currentCard.stage === 'More People'
        ? new Set(['and', 'are'])
        : new Set<string>();
    return lessonPromptText(lesson.id, displayedPrompt).split(/(\b[A-Za-z']+\b)/g).map((part, index) => (
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
        {qaMode ? (
          <View style={styles.qaToolbar}>
            <View style={styles.qaIdentity}>
              <Text style={styles.qaLabel}>ENGINE QA · v{Updates.runtimeVersion || '1.3.0'} · {updateCode}</Text>
              <Text numberOfLines={1} style={styles.qaContext}>
                {lesson.id} · #{cardIndex + 1}/{lesson.cards.length} · {currentCard.stage}
              </Text>
            </View>
            <View style={styles.qaActions}>
              <Pressable
                accessibilityLabel="Tarjeta anterior"
                accessibilityRole="button"
                disabled={cardIndex === 0}
                hitSlop={6}
                onPress={() => openQaCard(cardIndex - 1)}
                style={[styles.qaAction, cardIndex === 0 ? styles.qaActionDisabled : null]}
              >
                <Text style={styles.qaActionText}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Reiniciar tarjeta"
                accessibilityRole="button"
                hitSlop={6}
                onPress={resetCardState}
                style={styles.qaRestart}
              >
                <Text style={styles.qaRestartText}>Reiniciar</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Tarjeta siguiente"
                accessibilityRole="button"
                disabled={cardIndex === lesson.cards.length - 1}
                hitSlop={6}
                onPress={() => openQaCard(cardIndex + 1)}
                style={[
                  styles.qaAction,
                  cardIndex === lesson.cards.length - 1 ? styles.qaActionDisabled : null,
                ]}
              >
                <Text style={styles.qaActionText}>›</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Avance automático ${qaAutoAdvance ? 'activado' : 'desactivado'}`}
                accessibilityRole="switch"
                accessibilityState={{ checked: qaAutoAdvance }}
                hitSlop={6}
                onPress={() => setQaAutoAdvance((current) => !current)}
                style={[styles.qaAuto, qaAutoAdvance ? styles.qaAutoActive : null]}
              >
                <Text style={[styles.qaAutoText, qaAutoAdvance ? styles.qaAutoTextActive : null]}>
                  Auto {qaAutoAdvance ? 'ON' : 'OFF'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroNavigation}>
              <Pressable accessibilityLabel="Volver a lecciones" onPress={onExit} style={styles.logoPill}>
                <Text style={styles.logoText}>SP</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onExit} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Lecciones</Text>
              </Pressable>
            </View>
            <View style={styles.lessonStatus}>
              <View style={styles.statusMetric}>
                <Text style={styles.statusLabel}>PROGRESO</Text>
                <Text style={styles.statusValue}>{cardIndex + 1} / {lesson.cards.length}</Text>
              </View>
              <View style={styles.statusMetric}>
                <Text style={styles.statusLabel}>PUNTAJE</Text>
                <Text style={styles.statusValue}>{score}</Text>
              </View>
              <View style={styles.headerProgressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>
            <Pressable
              accessibilityLabel={showHelp ? 'Ocultar ayuda' : 'Mostrar ayuda'}
              onPress={() => setShowHelp((current) => !current)}
              style={[styles.helpButton, showHelp ? styles.helpButtonActive : null]}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </Pressable>
          </View>
          <Text style={styles.stage}>{lessonStageLabel(lesson.id, currentCard.stage).toUpperCase()}</Text>
          <View style={styles.promptRow}>
            <Pressable
              accessibilityLabel={`Reproducir: ${promptAudio}`}
              disabled={!promptAudio.trim()}
              onPress={() => isPronunciation
                ? playAudio(promptAudio, 'pronunciation_slow', 'split-ing')
                : playAudio(promptAudio, 'prompt', 'prompt')}
              style={styles.promptTapTarget}
            >
              <Text
                numberOfLines={2}
                onTextLayout={({ nativeEvent }) => {
                  const measuredWidth = Math.max(0, ...nativeEvent.lines.map((line) => line.width));
                  setPromptTextWidth((current) => Math.abs(current - measuredWidth) < 1 ? current : measuredWidth);
                }}
                style={[
                  styles.prompt,
                  { fontSize: viewportHeight < 400 ? 21 : 24, lineHeight: viewportHeight < 400 ? 25 : 29 },
                ]}
              >
                {isPronunciation ? pronunciationInstruction(lesson.id) : renderPrompt()}
              </Text>
            </Pressable>
            {!isPronunciation && promptAudio.trim() ? (
              <Pressable
                accessibilityLabel={`Repetir audio: ${promptAudio}`}
                accessibilityRole="button"
                onPress={() => playAudio(promptAudio, 'prompt', 'prompt')}
                style={({ pressed }) => [
                  styles.repeatButton,
                  styles.repeatButtonFloating,
                  {
                    marginLeft: Math.max(
                      9,
                      Math.min((promptTextWidth / 2) + 9, (viewportWidth / 2) - 112),
                    ),
                  },
                  pressed ? styles.repeatButtonPressed : null,
                ]}
              >
                <Text style={styles.repeatIcon}>↻</Text>
                <Text style={styles.repeatText}>Repetir</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <LessonCardView
          card={currentCard}
          gentleFeedback={profile.confidence === 'nervous'}
          key={qaMode ? `${cardIndex}-${cardRunId}` : 'lesson-card'}
          level={lesson.level}
          onPronunciationPassed={pronunciationPassed}
          onGrammarAnimationComplete={grammarAnimationComplete}
          onSelect={choose}
          result={result}
          selectedId={selectedId}
          showHelp={showHelp}
          userId={profile.userId}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flex: 1, gap: 6, padding: 6 },
  qaToolbar: { alignItems: 'center', backgroundColor: '#3f2859', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 10, paddingVertical: 5 },
  qaIdentity: { flex: 1, marginRight: 8 },
  qaLabel: { color: '#d8bfe9', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  qaContext: { color: '#fff', fontSize: 10, fontWeight: '800', marginTop: 1 },
  qaActions: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  qaAction: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  qaActionDisabled: { opacity: 0.3 },
  qaActionText: { color: '#3f2859', fontSize: 30, fontWeight: '900', lineHeight: 32 },
  qaRestart: { alignItems: 'center', backgroundColor: '#eee3f7', borderRadius: 12, justifyContent: 'center', minHeight: 44, minWidth: 82, paddingHorizontal: 13 },
  qaRestartText: { color: '#4f2769', fontSize: 12, fontWeight: '900' },
  qaAuto: { alignItems: 'center', borderColor: '#b997cf', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 76, paddingHorizontal: 11 },
  qaAutoActive: { backgroundColor: '#bde8cd', borderColor: '#8fc7a5' },
  qaAutoText: { color: '#e8dff0', fontSize: 11, fontWeight: '900' },
  qaAutoTextActive: { color: '#245d3d' },
  hero: { backgroundColor: '#ffe8c7', borderColor: '#dab277', borderRadius: 15, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroNavigation: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  logoPill: { alignItems: 'center', backgroundColor: '#16324f', borderRadius: 13, height: 30, justifyContent: 'center', width: 50 },
  logoText: { color: '#f1bf00', fontSize: 15, fontWeight: '900' },
  backButton: { backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 13, borderWidth: 1, justifyContent: 'center', minHeight: 30, paddingHorizontal: 10 },
  backButtonText: { color: '#24333a', fontSize: 12, fontWeight: '900' },
  lessonStatus: { alignItems: 'center', flexDirection: 'row', gap: 18, justifyContent: 'center', minWidth: 210, position: 'relative', paddingBottom: 5 },
  statusMetric: { alignItems: 'center', minWidth: 62 },
  statusLabel: { color: '#697177', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  statusValue: { color: '#24333a', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  headerProgressTrack: { backgroundColor: '#d9c6a8', borderRadius: 2, bottom: 0, height: 3, left: 0, overflow: 'hidden', position: 'absolute', right: 0 },
  helpButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 15, borderWidth: 2, height: 30, justifyContent: 'center', width: 30 },
  helpButtonActive: { backgroundColor: '#f4c95d' },
  helpButtonText: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  stage: { color: '#697177', fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  promptRow: { justifyContent: 'center', minHeight: 29, position: 'relative' },
  promptTapTarget: { width: '100%' },
  prompt: { color: '#24333a', fontWeight: '900', textAlign: 'center' },
  repeatButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#c98f42', borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 28, width: 82 },
  repeatButtonFloating: { left: '50%', marginTop: -14, position: 'absolute', top: '50%' },
  repeatButtonPressed: { backgroundColor: '#fff4df', opacity: 0.78, transform: [{ scale: 0.97 }] },
  repeatIcon: { color: '#8a4f00', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  repeatText: { color: '#694b22', fontSize: 10, fontWeight: '900' },
  highlight: { backgroundColor: '#f9dc8e', color: '#8a4f00' },
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
