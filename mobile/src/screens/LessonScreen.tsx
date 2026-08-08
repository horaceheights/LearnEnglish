import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { preload, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  finishLessonSession,
  getLesson,
  logCardAttempt,
  startLessonSession,
} from '../api';
import { LessonCardView } from '../components/LessonCardView';
import { LessonFeedbackSurvey } from '../components/LessonFeedbackSurvey';
import { StageJourney } from '../components/StageJourney';
import { courseAudioProvider, courseAudioUrl, courseAudioVoice } from '../config';
import {
  addDiagnosticBreadcrumb,
  captureDiagnosticError,
  setDiagnosticContext,
  setDiagnosticOperation,
} from '../diagnostics';
import { lessonPromptText, lessonStageLabel, pronunciationInstruction } from '../lessonInstructions';
import { useProgressiveLoadingMessage } from '../hooks/useProgressiveLoadingMessage';
import type { LearnerProfile, Lesson, LessonCard } from '../types';

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
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);
  const successChimePlayer = useAudioPlayer(SUCCESS_CHIME);
  const tryAgainCuePlayer = useAudioPlayer(TRY_AGAIN_CUE);
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isPortrait = viewportHeight >= viewportWidth;
  const useCompactPhoneLayout = !isPortrait && viewportWidth < 760 && viewportHeight < 420;
  const manualCardNavigation = lessonId === 'lesson-1-people-actions' && !qaMode;
  const answerAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerAudioAwaitingRef = useRef(false);
  const answerAudioStartedRef = useRef(false);
  const answerAudioWasPlayingRef = useRef(false);
  const grammarAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grammarAnswerAwaitingRef = useRef(false);
  const grammarAnswerWasPlayingRef = useRef(false);
  const singleCardAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleCardFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleCardAudioAwaitingRef = useRef(false);
  const singleCardAudioWasPlayingRef = useRef(false);
  const audioPlaybackRequestRef = useRef(0);
  const audioPlayerActiveRef = useRef(true);
  const audioPreloadRef = useRef<Map<string, Promise<void>>>(new Map());
  const finishedSessionRef = useRef(false);
  const cardTransitioningRef = useRef(false);
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const pronunciationPassHandledRef = useRef(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [furthestCardIndex, setFurthestCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attemptedCards, setAttemptedCards] = useState<Set<number>>(() => new Set());
  const [wrongCards, setWrongCards] = useState<Set<number>>(() => new Set());
  const [completedCards, setCompletedCards] = useState<Set<number>>(() => new Set());
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
  const loadingMessage = useProgressiveLoadingMessage(isLoading);
  const audioProvider = courseAudioProvider(lessonId);
  const audioVoice = courseAudioVoice(lessonId, lesson?.cards[cardIndex]?.stage || '');

  useEffect(() => {
    // Lessons adapt to both orientations. DEFAULT follows the device sensor,
    // while the card renderer provides a dedicated portrait layout.
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });

    return () => subscription.remove();
  }, [onExit]);

  const ensureAudioPreloaded = useCallback((url: string) => {
    const existing = audioPreloadRef.current.get(url);
    if (existing) return existing;

    const startedAt = Date.now();
    const pending = preload(url)
      .then(() => {
        addDiagnosticBreadcrumb('audio_preloaded', {
          duration_ms: Date.now() - startedAt,
        });
      })
      .catch((preloadError) => {
        audioPreloadRef.current.delete(url);
        captureDiagnosticError(
          preloadError,
          'course_audio_preload',
          { duration_ms: Date.now() - startedAt },
          'warning',
        );
      });
    audioPreloadRef.current.set(url, pending);
    return pending;
  }, []);

  const preloadCardAudio = useCallback((card?: LessonCard) => {
    if (!card) return Promise.resolve();
    const text = card.audio_text ?? card.prompt ?? '';
    const requests: Promise<void>[] = [];
    if (text.trim()) {
      const pronunciation = card.stage === 'Pronunciation Practice';
      const variant = pronunciation
        ? 'split-ing'
        : text.trim().toLowerCase() === 'what is it?'
          ? 'question'
          : 'prompt';
      requests.push(ensureAudioPreloaded(courseAudioUrl(
        text,
        pronunciation ? 'pronunciation_slow' : 'prompt',
        variant,
        audioProvider,
        courseAudioVoice(lessonId, card.stage),
      )));
    }
    if (card.answer_audio_text?.trim()) {
      requests.push(ensureAudioPreloaded(courseAudioUrl(
        card.answer_audio_text,
        'prompt',
        'answer',
        audioProvider,
        courseAudioVoice(lessonId, card.stage),
      )));
    }
    return Promise.all(requests).then(() => undefined);
  }, [audioProvider, ensureAudioPreloaded, lessonId]);

  const playAudio = useCallback((text: string, mode = 'prompt', variant = 'default') => {
    if (!text.trim()) return;
    const url = courseAudioUrl(text, mode, variant, audioProvider, audioVoice);
    const requestId = ++audioPlaybackRequestRef.current;
    void ensureAudioPreloaded(url)
      .then(() => {
        if (
          !audioPlayerActiveRef.current ||
          audioPlaybackRequestRef.current !== requestId
        ) return;
        addDiagnosticBreadcrumb('audio_started', { mode, variant });
        audioPlayer.replace(url);
        audioPlayer.play();
      })
      .catch((playbackError) => {
        // useAudioPlayer releases its native object when this screen unmounts.
        // A preload that finishes afterward is an expected cancellation, not
        // an application error and must never become an unhandled rejection.
        if (
          !audioPlayerActiveRef.current ||
          audioPlaybackRequestRef.current !== requestId
        ) return;
        captureDiagnosticError(
          playbackError,
          'course_audio_playback',
          { mode, variant },
          'warning',
        );
      });
  }, [audioPlayer, audioProvider, audioVoice, ensureAudioPreloaded]);

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
      answerAudioStartedRef.current = true;
      answerAudioWasPlayingRef.current = false;
      playAudio(text, 'prompt', 'answer');
    }, 520);
  }, [playAudio]);

  useEffect(() => {
    audioPlayerActiveRef.current = true;
    return () => {
      audioPlayerActiveRef.current = false;
      audioPlaybackRequestRef.current += 1;
      if (answerAudioTimerRef.current) clearTimeout(answerAudioTimerRef.current);
      if (answerAdvanceTimerRef.current) clearTimeout(answerAdvanceTimerRef.current);
      if (grammarAudioTimerRef.current) clearTimeout(grammarAudioTimerRef.current);
    };
  }, []);

  const load = async () => {
    setDiagnosticContext({ lessonId, operation: 'lesson_load', qaMode });
    setIsLoading(true);
    setError('');
    try {
      const nextLesson = await getLesson(lessonId);
      const nextCardIndex = Math.min(
        Math.max(initialCardIndex, 0),
        Math.max(nextLesson.cards.length - 1, 0),
      );
      // Keep the loading state visible until the first phrase is ready. This
      // avoids showing a silent card while its audio buffers for the first time.
      await Promise.race([
        preloadCardAudio(nextLesson.cards[nextCardIndex]),
        new Promise<void>((resolve) => setTimeout(resolve, 3500)),
      ]);
      setLesson(nextLesson);
      setCardIndex(nextCardIndex);
      setFurthestCardIndex(nextCardIndex);
      if (profile.userId && !qaMode) {
        startLessonSession(profile.userId, nextLesson.id, nextLesson.cards.length)
          .then((session) => setSessionId(session.id))
          .catch((sessionError) => captureDiagnosticError(
            sessionError,
            'start_lesson_session',
            { lesson_id: nextLesson.id },
            'warning',
          ));
      }
    } catch (loadError) {
      captureDiagnosticError(loadError, 'lesson_load', { lesson_id: lessonId });
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar esta lección. Inténtalo otra vez.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [initialCardIndex, lessonId, qaMode]);

  const currentCard = lesson?.cards[cardIndex];
  const isPronunciation = currentCard?.stage === 'Pronunciation Practice';
  const isGrammar = currentCard?.stage === 'Grammar' || currentCard?.stage === 'New Grammar';
  const pauseForPronunciationReview = manualCardNavigation && isPronunciation;
  const canSwipeForward = pauseForPronunciationReview && attemptedCards.has(cardIndex);
  const automaticAdvanceDelay = manualCardNavigation ? 2000 : 0;
  const isAutomaticSingleCard = manualCardNavigation && !isPronunciation && currentCard?.options.length === 1;
  const promptAudio = currentCard?.audio_text ?? currentCard?.prompt ?? '';
  const updateCode = Updates.updateId?.slice(0, 8) || 'embedded';

  useEffect(() => {
    setFurthestCardIndex((current) => Math.max(current, cardIndex));
  }, [cardIndex]);

  useEffect(() => {
    if (!lesson) return;
    // Prepare the active card (important for QA jumps) plus the next two cards.
    for (let index = cardIndex; index <= Math.min(cardIndex + 2, lesson.cards.length - 1); index += 1) {
      void preloadCardAudio(lesson.cards[index]);
    }
  }, [cardIndex, lesson, preloadCardAudio]);

  useEffect(() => {
    audioPlaybackRequestRef.current += 1;
    audioPlayer.pause();
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardAdvanceTimerRef.current) clearTimeout(singleCardAdvanceTimerRef.current);
    if (singleCardFallbackTimerRef.current) clearTimeout(singleCardFallbackTimerRef.current);
    singleCardAdvanceTimerRef.current = null;
    singleCardFallbackTimerRef.current = null;
  }, [audioPlayer, cardIndex]);

  useEffect(() => {
    setDiagnosticContext({
      cardIndex,
      lessonId,
      prompt: currentCard?.prompt,
      qaMode,
      operation: 'card_active',
      stage: currentCard?.stage,
      totalCards: lesson?.cards.length,
    });
  }, [cardIndex, currentCard?.prompt, currentCard?.stage, lesson?.cards.length, lessonId, qaMode]);

  useEffect(() => {
    if (!currentCard || isPronunciation || result !== null) return undefined;
    const timer = setTimeout(() => {
      singleCardAudioAwaitingRef.current = isAutomaticSingleCard;
      singleCardAudioWasPlayingRef.current = false;
      playAudio(
        promptAudio,
        'prompt',
        promptAudio.trim().toLowerCase() === 'what is it?' ? 'question' : 'prompt',
      );
    }, 120);
    return () => clearTimeout(timer);
  }, [cardIndex, currentCard, isAutomaticSingleCard, isPronunciation, playAudio, promptAudio, result]);

  const advance = useCallback(() => {
    if (!lesson) return;
    addDiagnosticBreadcrumb('card_advanced', {
      from_card: cardIndex + 1,
      to_card: Math.min(cardIndex + 2, lesson.cards.length),
    });
    answerAudioAwaitingRef.current = false;
    answerAudioStartedRef.current = false;
    answerAudioWasPlayingRef.current = false;
    if (answerAudioTimerRef.current) {
      clearTimeout(answerAudioTimerRef.current);
      answerAudioTimerRef.current = null;
    }
    if (answerAdvanceTimerRef.current) {
      clearTimeout(answerAdvanceTimerRef.current);
      answerAdvanceTimerRef.current = null;
    }
    grammarAnswerAwaitingRef.current = false;
    grammarAnswerWasPlayingRef.current = false;
    if (grammarAudioTimerRef.current) {
      clearTimeout(grammarAudioTimerRef.current);
      grammarAudioTimerRef.current = null;
    }
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardAdvanceTimerRef.current) {
      clearTimeout(singleCardAdvanceTimerRef.current);
      singleCardAdvanceTimerRef.current = null;
    }
    if (singleCardFallbackTimerRef.current) {
      clearTimeout(singleCardFallbackTimerRef.current);
      singleCardFallbackTimerRef.current = null;
    }
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

  const completeAutomaticSingleCard = useCallback(() => {
    if (!isAutomaticSingleCard || singleCardAdvanceTimerRef.current) return;
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardFallbackTimerRef.current) {
      clearTimeout(singleCardFallbackTimerRef.current);
      singleCardFallbackTimerRef.current = null;
    }
    setCompletedCards((current) => new Set(current).add(cardIndex));
    singleCardAdvanceTimerRef.current = setTimeout(() => {
      singleCardAdvanceTimerRef.current = null;
      advance();
    }, 3000);
  }, [advance, cardIndex, isAutomaticSingleCard]);

  useEffect(() => {
    if (!isAutomaticSingleCard || !singleCardAudioAwaitingRef.current) return;
    if (audioPlayerStatus.playing) singleCardAudioWasPlayingRef.current = true;
    if (audioPlayerStatus.error || (audioPlayerStatus.didJustFinish && singleCardAudioWasPlayingRef.current)) {
      completeAutomaticSingleCard();
    }
  }, [
    audioPlayerStatus.didJustFinish,
    audioPlayerStatus.error,
    audioPlayerStatus.playing,
    completeAutomaticSingleCard,
    isAutomaticSingleCard,
  ]);

  useEffect(() => {
    if (!isAutomaticSingleCard) return undefined;
    singleCardFallbackTimerRef.current = setTimeout(completeAutomaticSingleCard, 8000);
    return () => {
      if (singleCardFallbackTimerRef.current) clearTimeout(singleCardFallbackTimerRef.current);
      singleCardFallbackTimerRef.current = null;
    };
  }, [cardIndex, completeAutomaticSingleCard, isAutomaticSingleCard]);

  useEffect(() => {
    if (
      result !== 'correct' ||
      !currentCard ||
      isGrammar ||
      Boolean(currentCard.answer_audio_text) ||
      pauseForPronunciationReview ||
      (qaMode && !qaAutoAdvance)
    ) return undefined;
    const delay = (isPronunciation ? 900 : 1000) + automaticAdvanceDelay;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [
    advance,
    automaticAdvanceDelay,
    currentCard,
    isGrammar,
    isPronunciation,
    pauseForPronunciationReview,
    qaAutoAdvance,
    qaMode,
    result,
  ]);

  useEffect(() => {
    if (
      !answerAudioAwaitingRef.current ||
      !answerAudioStartedRef.current ||
      isGrammar ||
      result !== 'correct'
    ) return;
    if (audioPlayerStatus.error) {
      answerAudioAwaitingRef.current = false;
      answerAudioStartedRef.current = false;
      answerAudioWasPlayingRef.current = false;
      if (answerAdvanceTimerRef.current) clearTimeout(answerAdvanceTimerRef.current);
      if (pauseForPronunciationReview || (qaMode && !qaAutoAdvance)) {
        answerAdvanceTimerRef.current = null;
        return;
      }
      answerAdvanceTimerRef.current = setTimeout(() => {
        answerAdvanceTimerRef.current = null;
        advance();
      }, 900 + automaticAdvanceDelay);
      return;
    }
    if (audioPlayerStatus.playing) answerAudioWasPlayingRef.current = true;
    if (!audioPlayerStatus.didJustFinish || !answerAudioWasPlayingRef.current) return;

    answerAudioAwaitingRef.current = false;
    answerAudioStartedRef.current = false;
    answerAudioWasPlayingRef.current = false;
    if (answerAdvanceTimerRef.current) clearTimeout(answerAdvanceTimerRef.current);
    if (pauseForPronunciationReview || (qaMode && !qaAutoAdvance)) {
      answerAdvanceTimerRef.current = null;
      return;
    }
    answerAdvanceTimerRef.current = setTimeout(() => {
      answerAdvanceTimerRef.current = null;
      advance();
    }, 350 + automaticAdvanceDelay);
  }, [
    advance,
    automaticAdvanceDelay,
    audioPlayerStatus.didJustFinish,
    audioPlayerStatus.error,
    audioPlayerStatus.playing,
    isGrammar,
    pauseForPronunciationReview,
    qaAutoAdvance,
    qaMode,
    result,
  ]);

  useEffect(() => {
    if (!grammarAnswerAwaitingRef.current || !isGrammar || result !== 'correct') return;
    if (audioPlayerStatus.error) {
      grammarAnswerAwaitingRef.current = false;
      grammarAnswerWasPlayingRef.current = false;
      if (grammarAudioTimerRef.current) clearTimeout(grammarAudioTimerRef.current);
      if (pauseForPronunciationReview || (qaMode && !qaAutoAdvance)) {
        grammarAudioTimerRef.current = null;
        return;
      }
      grammarAudioTimerRef.current = setTimeout(() => {
        grammarAudioTimerRef.current = null;
        advance();
      }, 900 + automaticAdvanceDelay);
      return;
    }
    if (audioPlayerStatus.playing) grammarAnswerWasPlayingRef.current = true;
    if (!audioPlayerStatus.didJustFinish || !grammarAnswerWasPlayingRef.current) return;

    grammarAnswerAwaitingRef.current = false;
    grammarAnswerWasPlayingRef.current = false;
    if (grammarAudioTimerRef.current) clearTimeout(grammarAudioTimerRef.current);
    if (pauseForPronunciationReview || (qaMode && !qaAutoAdvance)) {
      grammarAudioTimerRef.current = null;
      return;
    }
    grammarAudioTimerRef.current = setTimeout(() => {
      grammarAudioTimerRef.current = null;
      advance();
    }, 350 + automaticAdvanceDelay);
  }, [
    advance,
    automaticAdvanceDelay,
    audioPlayerStatus.didJustFinish,
    audioPlayerStatus.error,
    audioPlayerStatus.playing,
    isGrammar,
    pauseForPronunciationReview,
    qaAutoAdvance,
    qaMode,
    result,
  ]);

  useEffect(() => {
    if (qaMode || !isComplete || !lesson || !sessionId || finishedSessionRef.current) return;
    finishedSessionRef.current = true;
    setDiagnosticOperation('finish_lesson_session');
    void finishLessonSession(sessionId, score, lesson.cards.length)
      .catch((finishError) => captureDiagnosticError(
        finishError,
        'finish_lesson_session',
        { score, total_cards: lesson.cards.length },
        'warning',
      ));
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
    }).catch((attemptError) => captureDiagnosticError(
      attemptError,
      'save_card_attempt',
      { card_number: cardIndex + 1, is_correct: isCorrect },
      'warning',
    ));
  };

  const choose = (optionId: string) => {
    if (!currentCard || result === 'correct') return;
    const correct = optionId === currentCard.correct_option_id;
    const firstTry = !wrongCards.has(cardIndex) && !completedCards.has(cardIndex);
    addDiagnosticBreadcrumb('answer_selected', {
      card_number: cardIndex + 1,
      first_try: firstTry,
      is_correct: correct,
      option_id: optionId,
    });
    setSelectedId(optionId);
    setAttemptedCards((current) => new Set(current).add(cardIndex));
    recordAttempt(optionId, correct, firstTry);

    if (correct) {
      setResult('correct');
      if (!completedCards.has(cardIndex)) {
        setCompletedCards((current) => new Set(current).add(cardIndex));
        if (firstTry) setScore((current) => current + 1);
      }
      void playSuccessChime();
      if (isGrammar) {
        return;
      }
      if (currentCard.answer_audio_text) {
        answerAudioAwaitingRef.current = true;
        answerAudioStartedRef.current = false;
        answerAudioWasPlayingRef.current = false;
        if (answerAdvanceTimerRef.current) clearTimeout(answerAdvanceTimerRef.current);
        if (!pauseForPronunciationReview) {
          answerAdvanceTimerRef.current = setTimeout(() => {
            answerAdvanceTimerRef.current = null;
            if (!answerAudioAwaitingRef.current) return;
            answerAudioAwaitingRef.current = false;
            answerAudioStartedRef.current = false;
            answerAudioWasPlayingRef.current = false;
            if (qaMode && !qaAutoAdvance) return;
            advance();
          }, 60000);
        }
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
    if (!completedCards.has(cardIndex)) {
      setCompletedCards((current) => new Set(current).add(cardIndex));
      setScore((current) => current + 1);
    }
    setResult('correct');
    void playSuccessChime();
  }, [cardIndex, completedCards, playSuccessChime]);

  const pronunciationAttempted = useCallback(() => {
    setAttemptedCards((current) => new Set(current).add(cardIndex));
  }, [cardIndex]);

  const pronunciationReviewRestarted = useCallback(() => {
    pronunciationPassHandledRef.current = false;
    setResult(null);
  }, []);

  const grammarAnimationComplete = useCallback(() => {
    if (!currentCard || !isGrammar) return;
    const selectedOption = currentCard.options.find((option) => option.id === selectedId);
    const completedSentence = selectedOption?.label
      ? currentCard.prompt.replace(/_{2,}/, selectedOption.label)
      : currentCard.answer_audio_text || currentCard.audio_text || currentCard.prompt;
    setGrammarCompleted(true);
    grammarAnswerAwaitingRef.current = true;
    grammarAnswerWasPlayingRef.current = false;
    if (grammarAudioTimerRef.current) clearTimeout(grammarAudioTimerRef.current);
    if (!pauseForPronunciationReview) {
      grammarAudioTimerRef.current = setTimeout(() => {
        grammarAudioTimerRef.current = null;
        if (!grammarAnswerAwaitingRef.current) return;
        grammarAnswerAwaitingRef.current = false;
        grammarAnswerWasPlayingRef.current = false;
        if (qaMode && !qaAutoAdvance) return;
        advance();
      }, 60000);
    }
    playAudio(
      currentCard.answer_audio_text || completedSentence,
      'prompt',
      'answer',
    );
  }, [advance, currentCard, isGrammar, pauseForPronunciationReview, playAudio, qaAutoAdvance, qaMode, selectedId]);

  const clearCardInteractionState = useCallback(() => {
    answerAudioAwaitingRef.current = false;
    answerAudioStartedRef.current = false;
    answerAudioWasPlayingRef.current = false;
    if (answerAudioTimerRef.current) {
      clearTimeout(answerAudioTimerRef.current);
      answerAudioTimerRef.current = null;
    }
    if (answerAdvanceTimerRef.current) {
      clearTimeout(answerAdvanceTimerRef.current);
      answerAdvanceTimerRef.current = null;
    }
    grammarAnswerAwaitingRef.current = false;
    grammarAnswerWasPlayingRef.current = false;
    if (grammarAudioTimerRef.current) {
      clearTimeout(grammarAudioTimerRef.current);
      grammarAudioTimerRef.current = null;
    }
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardAdvanceTimerRef.current) {
      clearTimeout(singleCardAdvanceTimerRef.current);
      singleCardAdvanceTimerRef.current = null;
    }
    if (singleCardFallbackTimerRef.current) {
      clearTimeout(singleCardFallbackTimerRef.current);
      singleCardFallbackTimerRef.current = null;
    }
    pronunciationPassHandledRef.current = false;
    setGrammarCompleted(false);
    setSelectedId(null);
    setResult(null);
    setIsComplete(false);
    setCardRunId((current) => current + 1);
  }, []);

  const resetCardState = useCallback(() => {
    clearCardInteractionState();
    setScore(0);
    setAttemptedCards(new Set());
    setWrongCards(new Set());
    setCompletedCards(new Set());
  }, [clearCardInteractionState]);

  const openStage = useCallback((startIndex: number) => {
    if (!lesson || startIndex > furthestCardIndex) return;
    addDiagnosticBreadcrumb('lesson_stage_opened', {
      from_card: cardIndex + 1,
      to_card: startIndex + 1,
    });
    cardTranslateX.stopAnimation();
    cardTranslateX.setValue(0);
    clearCardInteractionState();
    setCardIndex(Math.min(Math.max(startIndex, 0), lesson.cards.length - 1));
  }, [cardIndex, cardTranslateX, clearCardInteractionState, furthestCardIndex, lesson]);

  const openQaCard = useCallback((nextIndex: number) => {
    if (!lesson) return;
    setCardIndex(Math.min(Math.max(nextIndex, 0), lesson.cards.length - 1));
    resetCardState();
  }, [lesson, resetCardState]);

  const settleCard = useCallback(() => {
    Animated.spring(cardTranslateX, {
      damping: 22,
      mass: 0.7,
      stiffness: 240,
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      cardTransitioningRef.current = false;
    });
  }, [cardTranslateX]);

  const navigateManualCard = useCallback((direction: -1 | 1) => {
    if (!manualCardNavigation || !lesson || cardTransitioningRef.current) return;
    if (direction > 0 && !canSwipeForward) {
      settleCard();
      return;
    }
    const nextIndex = cardIndex + direction;
    if (nextIndex < 0) {
      settleCard();
      return;
    }

    cardTransitioningRef.current = true;
    const travelDistance = Math.min(Math.max(viewportWidth * 0.72, 320), 760);
    Animated.timing(cardTranslateX, {
      duration: 190,
      toValue: direction > 0 ? -travelDistance : travelDistance,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        settleCard();
        return;
      }
      clearCardInteractionState();
      if (nextIndex >= lesson.cards.length) {
        cardTranslateX.setValue(0);
        cardTransitioningRef.current = false;
        setIsComplete(true);
        return;
      }

      cardTranslateX.setValue(direction > 0 ? travelDistance : -travelDistance);
      setCardIndex(nextIndex);
      requestAnimationFrame(settleCard);
    });
  }, [
    cardIndex,
    cardTranslateX,
    canSwipeForward,
    clearCardInteractionState,
    lesson,
    manualCardNavigation,
    settleCard,
    viewportWidth,
  ]);

  const cardPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      manualCardNavigation &&
      !cardTransitioningRef.current &&
      Math.abs(gesture.dx) > 16 &&
      Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35
    ),
    onPanResponderMove: (_, gesture) => {
      const atStart = cardIndex === 0 && gesture.dx > 0;
      const forwardBlocked = gesture.dx < 0 && !canSwipeForward;
      cardTranslateX.setValue(atStart || forwardBlocked ? gesture.dx * 0.28 : gesture.dx);
    },
    onPanResponderRelease: (_, gesture) => {
      const shouldAdvance = canSwipeForward && (gesture.dx < -58 || gesture.vx < -0.55);
      const shouldReturn = gesture.dx > 58 || gesture.vx > 0.55;
      if (shouldAdvance) navigateManualCard(1);
      else if (shouldReturn && cardIndex > 0) navigateManualCard(-1);
      else settleCard();
    },
    onPanResponderTerminate: settleCard,
    onPanResponderTerminationRequest: () => true,
  }), [canSwipeForward, cardIndex, cardTranslateX, manualCardNavigation, navigateManualCard, settleCard]);

  const renderPrompt = () => {
    if (!currentCard) return '';
    const normalizedStage = currentCard.stage.trim().toLowerCase();
    const selectedOption = currentCard.options.find((option) => option.id === selectedId);
    const displayedPrompt =
      isGrammar && grammarCompleted && selectedOption?.label
        ? currentCard.prompt.replace(/_{2,}/, selectedOption.label)
        : currentCard.prompt;
    const focus = currentCard.stage === 'Grammar'
      ? new Set(['is', 'are', selectedOption?.label?.toLowerCase() || ''])
      : currentCard.stage === 'New Grammar'
        ? new Set(['not', selectedOption?.label?.toLowerCase() || ''])
      : currentCard.stage === 'More People' || normalizedStage.includes('plural')
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
          <Text accessibilityLiveRegion="polite" style={styles.loadingText}>Cargando la lección…</Text>
          <Text style={styles.coldStart}>{loadingMessage}</Text>
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
    if (profile.userId) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar hidden />
          <LessonFeedbackSurvey
            lessonId={lesson.id}
            onDone={onExit}
            score={score}
            sessionId={sessionId || undefined}
            totalCards={lesson.cards.length}
            userId={profile.userId}
            viewportHeight={viewportHeight}
            viewportWidth={viewportWidth}
          />
        </SafeAreaView>
      );
    }
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

  const lessonContent = (
    <>
        {qaMode ? (
          <View style={styles.qaToolbar}>
            <View style={styles.qaIdentity}>
              <Text style={styles.qaLabel}>ENGINE QA · v{Updates.runtimeVersion || '1.5.0'} · {updateCode}</Text>
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
        <View style={[
          styles.hero,
          useCompactPhoneLayout ? styles.heroCompact : null,
          isPortrait ? styles.heroPortrait : null,
        ]}>
          {isPortrait ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.heroGlowCoral} />
              <View style={styles.heroGlowMint} />
              <View style={styles.heroGlowGold} />
            </View>
          ) : null}
          <View style={[styles.heroTop, isPortrait ? styles.heroTopPortrait : null]}>
            <View style={styles.heroNavigation}>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[styles.logoPill, useCompactPhoneLayout ? styles.logoPillCompact : null]}
              >
                <Text style={styles.logoText}>SP</Text>
              </View>
              <Pressable
                accessibilityLabel="Volver a lecciones"
                accessibilityRole="button"
                onPress={onExit}
                style={[styles.backButton, useCompactPhoneLayout ? styles.backButtonCompact : null]}
              >
                <Text style={styles.backButtonText}>← Lecciones</Text>
              </Pressable>
            </View>
            {!isPortrait ? (
              <View style={styles.lessonStatus}>
                <StageJourney
                  cards={lesson.cards}
                  compact={useCompactPhoneLayout}
                  currentIndex={cardIndex}
                  lessonId={lesson.id}
                  maxVisitedIndex={qaMode ? lesson.cards.length - 1 : furthestCardIndex}
                  onStagePress={openStage}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityLabel={showHelp ? 'Ocultar ayuda' : 'Mostrar ayuda'}
              accessibilityRole="button"
              accessibilityState={{ expanded: showHelp }}
              onPress={() => setShowHelp((current) => !current)}
              style={[
                styles.helpButton,
                useCompactPhoneLayout ? styles.helpButtonCompact : null,
                showHelp ? styles.helpButtonActive : null,
              ]}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </Pressable>
          </View>
          {isPortrait ? (
            <View style={[styles.lessonStatus, styles.lessonStatusPortrait]}>
              <StageJourney
                cards={lesson.cards}
                compact
                currentIndex={cardIndex}
                lessonId={lesson.id}
                maxVisitedIndex={qaMode ? lesson.cards.length - 1 : furthestCardIndex}
                onStagePress={openStage}
              />
            </View>
          ) : null}
        </View>
        <View style={[
          styles.contentHeader,
          useCompactPhoneLayout ? styles.contentHeaderCompact : null,
          isPortrait ? styles.contentHeaderPortrait : null,
          isPronunciation ? styles.contentHeaderPronunciation : null,
          isPronunciation && isPortrait ? styles.contentHeaderPronunciationPortrait : null,
        ]}>
          <Text accessibilityRole="header" style={styles.stage}>
            {lessonStageLabel(lesson.id, currentCard.stage).toUpperCase()}
          </Text>
          <View style={[
            styles.promptRow,
            isPortrait ? styles.promptRowPortrait : null,
            isPronunciation ? styles.promptRowPronunciation : null,
          ]}>
            <Pressable
              accessibilityLabel={`Reproducir: ${promptAudio}`}
              accessibilityHint="Toca dos veces para escuchar la frase"
              accessibilityRole="button"
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
                  {
                    fontSize: isPronunciation
                      ? isPortrait
                        ? Math.max(21, Math.min(26, viewportWidth * 0.045))
                        : Math.max(18, Math.min(24, viewportHeight * 0.06))
                      : useCompactPhoneLayout
                        ? Math.max(22, Math.min(29, viewportHeight * 0.072))
                        : Math.max(26, Math.min(36, viewportHeight * 0.052)),
                    lineHeight: isPronunciation
                      ? isPortrait
                        ? Math.max(25, Math.min(31, viewportWidth * 0.054))
                        : Math.max(22, Math.min(29, viewportHeight * 0.072))
                      : useCompactPhoneLayout
                        ? Math.max(27, Math.min(35, viewportHeight * 0.085))
                        : Math.max(31, Math.min(43, viewportHeight * 0.062)),
                  },
                ]}
              >
                {isPronunciation ? pronunciationInstruction(lesson.id) : renderPrompt()}
              </Text>
            </Pressable>
            {!isPronunciation && promptAudio.trim() ? (
              <Pressable
                accessibilityLabel={`Repetir audio: ${promptAudio}`}
                accessibilityHint="Reproduce nuevamente la frase"
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => playAudio(promptAudio, 'prompt', 'prompt')}
                style={({ pressed }) => [
                  styles.repeatButton,
                  isPortrait ? styles.repeatButtonPortrait : styles.repeatButtonFloating,
                  !isPortrait
                    ? {
                        marginLeft: Math.max(
                          9,
                          Math.min((promptTextWidth / 2) + 9, (viewportWidth / 2) - 112),
                        ),
                      }
                    : null,
                  pressed ? styles.repeatButtonPressed : null,
                ]}
              >
                <Text style={styles.repeatIcon}>↻</Text>
                <Text style={styles.repeatText}>Repetir</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {pauseForPronunciationReview ? (
          <View
            accessibilityLabel={canSwipeForward ? 'Desliza para continuar' : 'Completa la práctica para continuar'}
            accessible
            style={[styles.manualNavigation, useCompactPhoneLayout ? styles.manualNavigationCompact : null]}
          >
            <Text style={[styles.swipeHint, !canSwipeForward ? styles.swipeHintLocked : null]}>
              {canSwipeForward
                ? cardIndex === lesson.cards.length - 1 ? 'Desliza para terminar →' : 'Desliza para continuar →'
                : 'Completa la práctica para continuar'}
            </Text>
          </View>
        ) : null}
        <Animated.View
          {...(manualCardNavigation ? cardPanResponder.panHandlers : {})}
          style={[
            styles.cardCarousel,
            manualCardNavigation ? { transform: [{ translateX: cardTranslateX }] } : null,
          ]}
        >
          <LessonCardView
            audioProvider={audioProvider}
            audioVoice={audioVoice}
            card={currentCard}
            gentleFeedback={profile.confidence === 'nervous'}
            key={qaMode ? `${cardIndex}-${cardRunId}` : 'lesson-card'}
            level={lesson.level}
            manualReview={pauseForPronunciationReview}
            optionsInteractive={!isAutomaticSingleCard}
            onPronunciationAttempted={pronunciationAttempted}
            onPronunciationPassed={pronunciationPassed}
            onPronunciationReviewRestarted={pronunciationReviewRestarted}
            onGrammarAnimationComplete={grammarAnimationComplete}
            onSelect={choose}
            result={result}
            selectedId={selectedId}
            showHelp={showHelp}
            userId={profile.userId}
          />
        </Animated.View>
    </>
  );
  const needsAccessibleScrolling = fontScale > 1.3 || viewportHeight < 300;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      {needsAccessibleScrolling ? (
        <ScrollView
          contentContainerStyle={[
            styles.pageScrollable,
            useCompactPhoneLayout ? styles.pageCompact : null,
            isPortrait ? styles.pagePortrait : null,
            isPronunciation ? styles.pagePronunciation : null,
          ]}
          persistentScrollbar
          style={styles.pageScroll}
        >
          {lessonContent}
        </ScrollView>
      ) : (
        <View style={[
          styles.page,
          useCompactPhoneLayout ? styles.pageCompact : null,
          isPortrait ? styles.pagePortrait : null,
          isPronunciation ? styles.pagePronunciation : null,
        ]}>{lessonContent}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flex: 1, gap: 6, padding: 6 },
  pagePortrait: { gap: 7, padding: 10 },
  pageCompact: { gap: 4, padding: 4 },
  pagePronunciation: { gap: 4, paddingBottom: 4, paddingTop: 4 },
  pageScroll: { flex: 1 },
  pageScrollable: { gap: 6, padding: 6, paddingBottom: 16 },
  cardCarousel: { flex: 1 },
  manualNavigation: { alignItems: 'center', justifyContent: 'center', minHeight: 42, paddingHorizontal: 4 },
  manualNavigationCompact: { minHeight: 36 },
  swipeHint: { color: '#287f68', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  swipeHintLocked: { color: '#7b736a' },
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
  hero: { backgroundColor: '#ffe8c7', borderColor: '#dab277', borderRadius: 15, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 5 },
  heroCompact: { paddingHorizontal: 4, paddingVertical: 3 },
  heroPortrait: {
    backgroundColor: '#fff0d6',
    borderColor: '#d9b873',
    borderRadius: 25,
    elevation: 2,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'relative',
    shadowColor: '#9a7244',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  heroGlowCoral: { backgroundColor: '#f7b7a7', borderRadius: 90, height: 150, left: -45, opacity: 0.24, position: 'absolute', top: -65, width: 150 },
  heroGlowMint: { backgroundColor: '#a9dfcf', borderRadius: 100, bottom: -75, height: 180, opacity: 0.3, position: 'absolute', right: -55, width: 180 },
  heroGlowGold: { backgroundColor: '#f4cf72', borderRadius: 65, height: 110, opacity: 0.2, position: 'absolute', right: 75, top: -55, width: 110 },
  heroTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  heroTopPortrait: { minHeight: 48 },
  heroNavigation: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  logoPill: { alignItems: 'center', backgroundColor: '#16324f', borderRadius: 15, height: 48, justifyContent: 'center', width: 54 },
  logoPillCompact: { borderRadius: 12, height: 40, width: 46 },
  logoText: { color: '#f1bf00', fontSize: 15, fontWeight: '900' },
  backButton: { backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 15, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 13 },
  backButtonCompact: { borderRadius: 12, minHeight: 40, paddingHorizontal: 10 },
  backButtonText: { color: '#24333a', fontSize: 12, fontWeight: '900' },
  lessonStatus: { alignItems: 'stretch', flex: 1, justifyContent: 'center', marginHorizontal: 3 },
  lessonStatusPortrait: { flex: 0, height: 50, marginHorizontal: 0, marginTop: 6, width: '100%' },
  helpButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 24, borderWidth: 2, height: 48, justifyContent: 'center', width: 48 },
  helpButtonCompact: { borderRadius: 20, height: 40, width: 40 },
  helpButtonActive: { backgroundColor: '#f4c95d' },
  helpButtonText: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  contentHeader: { backgroundColor: '#fff', borderColor: '#e4ded2', borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  contentHeaderCompact: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3 },
  contentHeaderPortrait: {
    backgroundColor: '#fffaf1',
    borderColor: '#ead6b5',
    borderRadius: 24,
    borderWidth: 2,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#8d684a',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  contentHeaderPronunciation: { paddingBottom: 3, paddingTop: 3 },
  contentHeaderPronunciationPortrait: { paddingBottom: 5, paddingTop: 5 },
  stage: { color: '#4d5559', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  promptRow: { justifyContent: 'center', minHeight: 38, position: 'relative' },
  promptRowPortrait: { alignItems: 'center', flexDirection: 'column-reverse', gap: 3 },
  promptRowPronunciation: { minHeight: 28 },
  promptTapTarget: { width: '100%' },
  prompt: { color: '#111', fontWeight: '900', textAlign: 'center' },
  repeatButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#c98f42', borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 28, width: 82 },
  repeatButtonFloating: { left: '50%', marginTop: -14, position: 'absolute', top: '50%' },
  repeatButtonPortrait: { alignSelf: 'center' },
  repeatButtonPressed: { backgroundColor: '#fff4df', opacity: 0.78, transform: [{ scale: 0.97 }] },
  repeatIcon: { color: '#8a4f00', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  repeatText: { color: '#694b22', fontSize: 10, fontWeight: '900' },
  highlight: { backgroundColor: '#ffe36b', color: '#111' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { color: '#24333a', fontSize: 19, fontWeight: '900', marginTop: 16 },
  coldStart: { color: '#697177', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  errorTitle: { color: '#24333a', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  errorText: { color: '#a34842', fontSize: 14, marginTop: 9, textAlign: 'center' },
  primary: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 15, justifyContent: 'center', marginTop: 20, minHeight: 54, paddingHorizontal: 26 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  linkButton: { marginTop: 15, padding: 10 },
  linkText: { color: '#16766f', fontSize: 15, fontWeight: '800' },
  completeMark: { backgroundColor: '#2f8f62', borderRadius: 42, color: '#fff', fontSize: 40, fontWeight: '900', height: 84, lineHeight: 80, textAlign: 'center', width: 84 },
  completeEyebrow: { color: '#697177', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 20 },
  completeTitle: { color: '#24333a', fontSize: 31, fontWeight: '900', marginTop: 5 },
  completeText: { color: '#526168', fontSize: 16, lineHeight: 23, marginTop: 8, textAlign: 'center' },
});
