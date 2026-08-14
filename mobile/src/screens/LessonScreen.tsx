import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAudioPlayer,
  preload,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
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
import { SentenceHelpOverlay } from '../components/SentenceHelpOverlay';
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
import { spanishTranslationFor } from '../sentenceTranslations';
import type { LearnerProfile, Lesson, LessonCard } from '../types';

const SUCCESS_CHIME = require('../../assets/success-chime.wav');
const TRY_AGAIN_CUE = require('../../assets/try-again.wav');
const HEADER_BRAND_LOGO = require('../../assets/spanglish-header-logo.png');
void Promise.all([preload(SUCCESS_CHIME), preload(TRY_AGAIN_CUE)]).catch((preloadError) => {
  captureDiagnosticError(preloadError, 'feedback_audio_preload', {}, 'warning');
});
const SENTENCE_HELP_STORAGE_PREFIX = 'spanglish-sentence-help-v2';
const LESSON_RESUME_STORAGE_PREFIX = 'spanglish-lesson-resume-v1';
const DOUBLE_TAP_DELAY_MS = 290;

type SavedLessonRun = {
  attemptedCards: number[];
  cardCount: number;
  cardIndex: number;
  completedCards: number[];
  furthestCardIndex: number;
  score: number;
  sessionId: string;
  wrongCards: number[];
};

function validCardIndexes(indexes: unknown, cardCount: number) {
  if (!Array.isArray(indexes)) return [];
  return indexes.filter((index): index is number => (
    Number.isInteger(index) && index >= 0 && index < cardCount
  ));
}

function parseSavedLessonRun(value: string | null, cardCount: number): SavedLessonRun | null {
  if (!value) return null;
  try {
    const saved = JSON.parse(value) as Partial<SavedLessonRun>;
    if (saved.cardCount !== cardCount || !Number.isInteger(saved.cardIndex)) return null;
    const cardIndex = Math.min(Math.max(saved.cardIndex || 0, 0), Math.max(cardCount - 1, 0));
    return {
      attemptedCards: validCardIndexes(saved.attemptedCards, cardCount),
      cardCount,
      cardIndex,
      completedCards: validCardIndexes(saved.completedCards, cardCount),
      furthestCardIndex: Math.min(
        Math.max(Number.isInteger(saved.furthestCardIndex) ? saved.furthestCardIndex! : cardIndex, cardIndex),
        Math.max(cardCount - 1, 0),
      ),
      score: Math.min(Math.max(Number.isInteger(saved.score) ? saved.score! : 0, 0), cardCount),
      sessionId: typeof saved.sessionId === 'string' ? saved.sessionId : '',
      wrongCards: validCardIndexes(saved.wrongCards, cardCount),
    };
  } catch {
    return null;
  }
}

type Props = {
  lessonId: string;
  profile: LearnerProfile;
  onExit: () => void;
  initialCardIndex?: number;
  previouslyCompleted?: boolean;
  qaMode?: boolean;
};

type CompletedLessonMode = 'standard' | 'prompt' | 'sections' | 'review';

function BackArrowIcon() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.backArrowIcon}>
      <View style={styles.backArrowShaft} />
      <View style={styles.backArrowHead} />
    </View>
  );
}

function LessonBrandMark({
  compact = false,
  centeredWidth,
}: {
  compact?: boolean;
  centeredWidth?: number;
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.logoPill,
        compact ? styles.logoPillCompact : null,
        centeredWidth
          ? { left: '50%', marginLeft: -(centeredWidth / 2), position: 'absolute', width: centeredWidth }
          : null,
      ]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={HEADER_BRAND_LOGO}
        style={styles.brandLogoImage}
      />
    </View>
  );
}

export function LessonScreen({
  lessonId,
  profile,
  onExit,
  initialCardIndex = 0,
  previouslyCompleted = false,
  qaMode = false,
}: Props) {
  // This player is reused while lesson audio is preloaded asynchronously. Own
  // its lifecycle explicitly so an already-scheduled callback can never receive
  // the auto-released SharedObject created by useAudioPlayer on iOS.
  const [audioPlayer, setAudioPlayer] = useState(() => createAudioPlayer(null));
  const audioPlayerRef = useRef(audioPlayer);
  const retiredAudioPlayersRef = useRef<ReturnType<typeof createAudioPlayer>[]>([]);
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);
  const successChimePlayer = useAudioPlayer(SUCCESS_CHIME, { downloadFirst: true });
  const tryAgainCuePlayer = useAudioPlayer(TRY_AGAIN_CUE, { downloadFirst: true });
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isPortrait = viewportHeight >= viewportWidth;
  const useCompactPhoneLayout = !isPortrait && viewportWidth < 760 && viewportHeight < 420;
  const portraitBrandWidth = Math.min(220, Math.max(150, viewportWidth - 150));
  const useCompactPortraitBrand = isPortrait && portraitBrandWidth < 190;
  // Every lesson uses the learner-tested 1.1 flow. QA may add diagnostics and
  // controls, but it must not change navigation or review behavior.
  const manualCardNavigation = true;
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
  const promptAutoplayFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptAutoplayAwaitingRef = useRef(false);
  const promptAutoplayWasPlayingRef = useRef(false);
  const audioPlaybackRequestRef = useRef(0);
  const audioPlayerActiveRef = useRef(true);
  const audioPreloadRef = useRef<Map<string, Promise<void>>>(new Map());
  const finishedSessionRef = useRef(false);
  const resumeHydratedRef = useRef(false);
  const cardTransitioningRef = useRef(false);
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const pronunciationPassHandledRef = useRef(false);
  const promptTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translationHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTapTargetRef = useRef<View | null>(null);
  const lastPromptTapRef = useRef(0);
  const translationOpacity = useRef(new Animated.Value(0)).current;
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
  const [qaAutoAdvance, setQaAutoAdvance] = useState(true);
  const [cardRunId, setCardRunId] = useState(0);
  const [sentenceHelpStatus, setSentenceHelpStatus] = useState<'loading' | 'pending' | 'seen'>('loading');
  const [sentenceAnchorBottom, setSentenceAnchorBottom] = useState<number | undefined>(undefined);
  const [showSentenceCoachmark, setShowSentenceCoachmark] = useState(false);
  const [showSentenceTranslation, setShowSentenceTranslation] = useState(false);
  const [promptAutoplayFinished, setPromptAutoplayFinished] = useState(false);
  const [completedLessonMode, setCompletedLessonMode] = useState<CompletedLessonMode>(
    previouslyCompleted && !qaMode ? 'prompt' : 'standard',
  );
  const [reviewStageBounds, setReviewStageBounds] = useState<{ end: number; start: number } | null>(null);
  const loadingMessage = useProgressiveLoadingMessage(isLoading);
  const audioProvider = courseAudioProvider(lessonId);
  const audioVoice = courseAudioVoice(lessonId, lesson?.cards[cardIndex]?.stage || '');
  const sentenceHelpStorageKey = `${SENTENCE_HELP_STORAGE_PREFIX}:${profile.userId || profile.displayName.trim().toLowerCase()}`;
  const lessonResumeStorageKey = `${LESSON_RESUME_STORAGE_PREFIX}:${profile.userId || profile.displayName.trim().toLowerCase()}:${lessonId}`;
  const isCompletedSectionPicker = completedLessonMode === 'prompt' || completedLessonMode === 'sections';
  const showCompletedJourney = previouslyCompleted && completedLessonMode !== 'standard';

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

  useEffect(() => {
    if (qaMode) {
      setSentenceHelpStatus('pending');
      return undefined;
    }

    let active = true;
    setSentenceHelpStatus('loading');
    AsyncStorage.getItem(sentenceHelpStorageKey)
      .then((stored) => {
        if (active) setSentenceHelpStatus(stored === 'seen' ? 'seen' : 'pending');
      })
      .catch(() => {
        if (active) setSentenceHelpStatus('pending');
      });
    return () => { active = false; };
  }, [qaMode, sentenceHelpStorageKey]);

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
      .then(async () => {
        if (
          !audioPlayerActiveRef.current ||
          audioPlaybackRequestRef.current !== requestId
        ) return;
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        if (
          !audioPlayerActiveRef.current ||
          audioPlaybackRequestRef.current !== requestId
        ) return;
        addDiagnosticBreadcrumb('audio_started', { mode, variant });
        const nextPlayer = createAudioPlayer(url);
        if (
          !audioPlayerActiveRef.current ||
          audioPlaybackRequestRef.current !== requestId
        ) {
          nextPlayer.release();
          return;
        }
        const previousPlayer = audioPlayerRef.current;
        try {
          previousPlayer.pause();
        } catch {
          // A previous clip may already have ended while the next one is created.
        }
        retiredAudioPlayersRef.current.push(previousPlayer);
        audioPlayerRef.current = nextPlayer;
        setAudioPlayer(nextPlayer);
        nextPlayer.play();
      })
      .catch((playbackError) => {
        // A preload that finishes after a transition is an expected
        // cancellation, not an application error.
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
  }, [audioProvider, audioVoice, ensureAudioPreloaded]);

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
      if (promptTapTimerRef.current) clearTimeout(promptTapTimerRef.current);
      if (translationHideTimerRef.current) clearTimeout(translationHideTimerRef.current);
      if (promptAutoplayFallbackTimerRef.current) clearTimeout(promptAutoplayFallbackTimerRef.current);
      translationOpacity.stopAnimation();
      try {
        audioPlayerRef.current.pause();
      } catch {
        // The native player may already be unavailable while React is tearing down.
      }
      try {
        audioPlayerRef.current.release();
      } catch {
        // Release is idempotent from the screen's point of view.
      }
      retiredAudioPlayersRef.current.forEach((player) => {
        try {
          player.release();
        } catch {
          // Retired players may already be unavailable during app teardown.
        }
      });
      retiredAudioPlayersRef.current = [];
    };
  }, [translationOpacity]);

  const load = async () => {
    setDiagnosticContext({ lessonId, operation: 'lesson_load', qaMode });
    setIsLoading(true);
    setError('');
    resumeHydratedRef.current = false;
    finishedSessionRef.current = false;
    setCompletedLessonMode(previouslyCompleted && !qaMode ? 'prompt' : 'standard');
    setReviewStageBounds(null);
    try {
      const nextLesson = await getLesson(lessonId);
      const savedRun = qaMode || previouslyCompleted
        ? null
        : parseSavedLessonRun(
          await AsyncStorage.getItem(lessonResumeStorageKey).catch(() => null),
          nextLesson.cards.length,
        );
      const nextCardIndex = savedRun?.cardIndex ?? Math.min(
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
      setFurthestCardIndex(
        savedRun?.furthestCardIndex ?? (previouslyCompleted ? nextLesson.cards.length - 1 : nextCardIndex),
      );
      setScore(savedRun?.score ?? 0);
      setAttemptedCards(new Set(savedRun?.attemptedCards ?? []));
      setWrongCards(new Set(savedRun?.wrongCards ?? []));
      setCompletedCards(new Set(savedRun?.completedCards ?? []));
      setSessionId(savedRun?.sessionId ?? '');
      resumeHydratedRef.current = true;
      if (profile.userId && !qaMode) {
        if (previouslyCompleted) return;
        if (savedRun?.sessionId) return;
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

  useEffect(() => { void load(); }, [initialCardIndex, lessonId, lessonResumeStorageKey, previouslyCompleted, qaMode]);

  useEffect(() => {
    if (qaMode || completedLessonMode !== 'standard' || !lesson || !resumeHydratedRef.current) return;
    if (isComplete) {
      void AsyncStorage.removeItem(lessonResumeStorageKey).catch(() => undefined);
      return;
    }
    const savedRun: SavedLessonRun = {
      attemptedCards: [...attemptedCards],
      cardCount: lesson.cards.length,
      cardIndex,
      completedCards: [...completedCards],
      furthestCardIndex,
      score,
      sessionId,
      wrongCards: [...wrongCards],
    };
    void AsyncStorage.setItem(lessonResumeStorageKey, JSON.stringify(savedRun)).catch((saveError) => (
      captureDiagnosticError(saveError, 'save_lesson_resume', { lesson_id: lesson.id }, 'warning')
    ));
  }, [
    attemptedCards,
    cardIndex,
    completedCards,
    completedLessonMode,
    furthestCardIndex,
    isComplete,
    lesson,
    lessonResumeStorageKey,
    qaMode,
    score,
    sessionId,
    wrongCards,
  ]);

  const currentCard = lesson?.cards[cardIndex];
  const isPronunciation = currentCard?.stage === 'Pronunciation Practice';
  const isGrammar = currentCard?.stage === 'Grammar' || currentCard?.stage === 'New Grammar';
  // Pronunciation results remain visible for three seconds inside the practice
  // component, then advance automatically without a swipe-review step.
  const pauseForPronunciationReview = false;
  const canSwipeForward = pauseForPronunciationReview && attemptedCards.has(cardIndex);
  const automaticAdvanceDelay = manualCardNavigation ? 2000 : 0;
  const isAutomaticSingleCard =
    !isCompletedSectionPicker && manualCardNavigation && !isPronunciation && currentCard?.options.length === 1;
  const promptAudio = currentCard?.audio_text ?? currentCard?.prompt ?? '';
  const sentenceTranslation = spanishTranslationFor(
    isGrammar ? currentCard?.prompt ?? '' : promptAudio,
  );
  const updateCode = Updates.updateId?.slice(0, 8) || 'embedded';

  const replayPrompt = useCallback(() => {
    if (!promptAudio.trim()) return;
    if (isPronunciation) {
      playAudio(promptAudio, 'pronunciation_slow', 'split-ing');
      return;
    }
    playAudio(
      promptAudio,
      'prompt',
      promptAudio.trim().toLowerCase() === 'what is it?' ? 'question' : 'prompt',
    );
  }, [isPronunciation, playAudio, promptAudio]);

  const updateSentenceAnchor = useCallback((onMeasured?: () => void) => {
    const target = promptTapTargetRef.current;
    if (!target) {
      setSentenceAnchorBottom(undefined);
      onMeasured?.();
      return;
    }

    target.measureInWindow((_x, y, _width, height) => {
      setSentenceAnchorBottom(y + height);
      onMeasured?.();
    });
  }, []);

  const openSentenceTranslation = useCallback(() => {
    if (promptTapTimerRef.current) {
      clearTimeout(promptTapTimerRef.current);
      promptTapTimerRef.current = null;
    }
    lastPromptTapRef.current = 0;
    if (translationHideTimerRef.current) clearTimeout(translationHideTimerRef.current);
    translationOpacity.stopAnimation();
    translationOpacity.setValue(0);
    setShowSentenceTranslation(true);
    Animated.timing(translationOpacity, {
      duration: 160,
      toValue: 1,
      useNativeDriver: true,
    }).start();
    translationHideTimerRef.current = setTimeout(() => {
      translationHideTimerRef.current = null;
      Animated.timing(translationOpacity, {
        duration: 240,
        toValue: 0,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowSentenceTranslation(false);
      });
    }, 2760);
  }, [translationOpacity]);

  const handlePromptPress = useCallback(() => {
    const now = Date.now();
    if (lastPromptTapRef.current && now - lastPromptTapRef.current <= DOUBLE_TAP_DELAY_MS) {
      openSentenceTranslation();
      return;
    }

    lastPromptTapRef.current = now;
    if (promptTapTimerRef.current) clearTimeout(promptTapTimerRef.current);
    promptTapTimerRef.current = setTimeout(() => {
      promptTapTimerRef.current = null;
      lastPromptTapRef.current = 0;
      replayPrompt();
    }, DOUBLE_TAP_DELAY_MS);
  }, [openSentenceTranslation, replayPrompt]);

  const dismissSentenceCoachmark = useCallback(() => {
    setShowSentenceCoachmark(false);
    setSentenceHelpStatus('seen');
    if (!qaMode) void AsyncStorage.setItem(sentenceHelpStorageKey, 'seen');
  }, [qaMode, sentenceHelpStorageKey]);

  useEffect(() => {
    if (
      sentenceHelpStatus !== 'pending' ||
      !currentCard ||
      currentCard.options.length < 2 ||
      isPronunciation ||
      !promptAudio.trim() ||
      !promptAutoplayFinished ||
      attemptedCards.has(cardIndex)
    ) return undefined;

    const timer = setTimeout(
      () => updateSentenceAnchor(() => setShowSentenceCoachmark(true)),
      4000,
    );
    return () => clearTimeout(timer);
  }, [
    currentCard,
    cardIndex,
    attemptedCards,
    isPronunciation,
    promptAudio,
    promptAutoplayFinished,
    sentenceHelpStatus,
    updateSentenceAnchor,
  ]);

  useEffect(() => {
    if (promptTapTimerRef.current) clearTimeout(promptTapTimerRef.current);
    promptTapTimerRef.current = null;
    if (translationHideTimerRef.current) clearTimeout(translationHideTimerRef.current);
    translationHideTimerRef.current = null;
    lastPromptTapRef.current = 0;
    translationOpacity.stopAnimation();
    translationOpacity.setValue(0);
    setShowSentenceTranslation(false);
  }, [cardIndex, translationOpacity]);

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
    audioPlayerRef.current.pause();
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardAdvanceTimerRef.current) clearTimeout(singleCardAdvanceTimerRef.current);
    if (singleCardFallbackTimerRef.current) clearTimeout(singleCardFallbackTimerRef.current);
    if (promptAutoplayFallbackTimerRef.current) clearTimeout(promptAutoplayFallbackTimerRef.current);
    singleCardAdvanceTimerRef.current = null;
    singleCardFallbackTimerRef.current = null;
    promptAutoplayFallbackTimerRef.current = null;
    promptAutoplayAwaitingRef.current = false;
    promptAutoplayWasPlayingRef.current = false;
    setPromptAutoplayFinished(false);
  }, [cardIndex]);

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
    if (isCompletedSectionPicker || !currentCard || isPronunciation || result !== null) return undefined;
    promptAutoplayAwaitingRef.current = true;
    promptAutoplayWasPlayingRef.current = false;
    promptAutoplayFallbackTimerRef.current = setTimeout(() => {
      promptAutoplayFallbackTimerRef.current = null;
      promptAutoplayAwaitingRef.current = false;
      setPromptAutoplayFinished(true);
    }, 10000);
    const timer = setTimeout(() => {
      singleCardAudioAwaitingRef.current = isAutomaticSingleCard;
      singleCardAudioWasPlayingRef.current = false;
      playAudio(
        promptAudio,
        'prompt',
        promptAudio.trim().toLowerCase() === 'what is it?' ? 'question' : 'prompt',
      );
    }, 120);
    return () => {
      clearTimeout(timer);
      if (promptAutoplayFallbackTimerRef.current) clearTimeout(promptAutoplayFallbackTimerRef.current);
      promptAutoplayFallbackTimerRef.current = null;
      promptAutoplayAwaitingRef.current = false;
    };
  }, [cardIndex, currentCard, isAutomaticSingleCard, isCompletedSectionPicker, isPronunciation, playAudio, promptAudio, result]);

  useEffect(() => {
    if (!promptAutoplayAwaitingRef.current) return;
    if (audioPlayerStatus.playing) promptAutoplayWasPlayingRef.current = true;
    if (
      !audioPlayerStatus.error &&
      (!audioPlayerStatus.didJustFinish || !promptAutoplayWasPlayingRef.current)
    ) return;

    promptAutoplayAwaitingRef.current = false;
    promptAutoplayWasPlayingRef.current = false;
    if (promptAutoplayFallbackTimerRef.current) {
      clearTimeout(promptAutoplayFallbackTimerRef.current);
      promptAutoplayFallbackTimerRef.current = null;
    }
    setPromptAutoplayFinished(true);
  }, [audioPlayerStatus.didJustFinish, audioPlayerStatus.error, audioPlayerStatus.playing]);

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
    if (
      completedLessonMode === 'review' &&
      reviewStageBounds &&
      cardIndex >= reviewStageBounds.end
    ) {
      audioPlaybackRequestRef.current += 1;
      audioPlayer.pause();
      setCompletedLessonMode('sections');
      setReviewStageBounds(null);
      setGrammarCompleted(false);
      setSelectedId(null);
      setResult(null);
      return;
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
  }, [audioPlayer, cardIndex, completedLessonMode, lesson, reviewStageBounds]);

  const completeAutomaticSingleCard = useCallback(() => {
    if (!isAutomaticSingleCard || singleCardAdvanceTimerRef.current) return;
    singleCardAudioAwaitingRef.current = false;
    singleCardAudioWasPlayingRef.current = false;
    if (singleCardFallbackTimerRef.current) {
      clearTimeout(singleCardFallbackTimerRef.current);
      singleCardFallbackTimerRef.current = null;
    }
    if (!completedCards.has(cardIndex)) {
      setCompletedCards((current) => new Set(current).add(cardIndex));
      setScore((current) => current + 1);
    }
    singleCardAdvanceTimerRef.current = setTimeout(() => {
      singleCardAdvanceTimerRef.current = null;
      advance();
    }, 3000);
  }, [advance, cardIndex, completedCards, isAutomaticSingleCard]);

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
    const delay = isPronunciation ? 0 : 1000 + automaticAdvanceDelay;
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
  }, [cardIndex, completedCards]);

  const pronunciationAttempted = useCallback(() => {
    setAttemptedCards((current) => new Set(current).add(cardIndex));
  }, [cardIndex]);

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

  const chooseCompletedLessonSections = useCallback(() => {
    audioPlaybackRequestRef.current += 1;
    audioPlayer.pause();
    clearCardInteractionState();
    setCompletedLessonMode('sections');
    setReviewStageBounds(null);
  }, [audioPlayer, clearCardInteractionState]);

  const startCompletedLessonFromBeginning = useCallback(() => {
    if (!lesson) return;
    audioPlaybackRequestRef.current += 1;
    audioPlayer.pause();
    resetCardState();
    setCardIndex(0);
    setFurthestCardIndex(0);
    setReviewStageBounds(null);
    setCompletedLessonMode('standard');
    setSessionId('');
    void AsyncStorage.removeItem(lessonResumeStorageKey).catch(() => undefined);
    if (profile.userId && !qaMode) {
      startLessonSession(profile.userId, lesson.id, lesson.cards.length)
        .then((session) => setSessionId(session.id))
        .catch((sessionError) => captureDiagnosticError(
          sessionError,
          'start_lesson_session',
          { lesson_id: lesson.id },
          'warning',
        ));
    }
  }, [audioPlayer, lesson, lessonResumeStorageKey, profile.userId, qaMode, resetCardState]);

  const openStage = useCallback((startIndex: number) => {
    if (!lesson || (!qaMode && startIndex > furthestCardIndex)) return;
    addDiagnosticBreadcrumb('lesson_stage_opened', {
      from_card: cardIndex + 1,
      to_card: startIndex + 1,
    });
    cardTranslateX.stopAnimation();
    cardTranslateX.setValue(0);
    const boundedStart = Math.min(Math.max(startIndex, 0), lesson.cards.length - 1);
    if (completedLessonMode !== 'standard') {
      const selectedStage = lesson.cards[boundedStart].stage;
      let end = boundedStart;
      while (end + 1 < lesson.cards.length && lesson.cards[end + 1].stage === selectedStage) end += 1;
      resetCardState();
      setReviewStageBounds({ end, start: boundedStart });
      setCompletedLessonMode('review');
    } else {
      clearCardInteractionState();
    }
    setCardIndex(boundedStart);
  }, [
    cardIndex,
    cardTranslateX,
    clearCardInteractionState,
    completedLessonMode,
    furthestCardIndex,
    lesson,
    qaMode,
    resetCardState,
  ]);

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
    if (
      nextIndex < 0 ||
      (completedLessonMode === 'review' && reviewStageBounds && nextIndex < reviewStageBounds.start)
    ) {
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
      if (
        completedLessonMode === 'review' &&
        reviewStageBounds &&
        nextIndex > reviewStageBounds.end
      ) {
        cardTranslateX.setValue(0);
        cardTransitioningRef.current = false;
        setCompletedLessonMode('sections');
        setReviewStageBounds(null);
        return;
      }
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
    completedLessonMode,
    lesson,
    manualCardNavigation,
    reviewStageBounds,
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
    const selectedFocusWords = selectedOption?.label?.toLowerCase().match(/[a-z']+/g) || [];
    const focus = currentCard.stage === 'Grammar'
      ? new Set(['is', 'are', ...selectedFocusWords])
      : currentCard.stage === 'New Grammar'
        ? new Set(['not', ...selectedFocusWords])
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
            {isPortrait ? (
              <>
                <Pressable
                  accessibilityLabel="Volver a lecciones"
                  accessibilityRole="button"
                  onPress={onExit}
                  style={styles.backButton}
                >
                  <BackArrowIcon />
                </Pressable>
                <LessonBrandMark
                  centeredWidth={portraitBrandWidth}
                  compact={useCompactPortraitBrand}
                />
              </>
            ) : (
              <View style={styles.heroNavigation}>
                <Pressable
                  accessibilityLabel="Volver a lecciones"
                  accessibilityRole="button"
                  onPress={onExit}
                  style={[styles.backButton, useCompactPhoneLayout ? styles.backButtonCompact : null]}
                >
                  <BackArrowIcon />
                </Pressable>
                <LessonBrandMark compact={useCompactPhoneLayout} />
              </View>
            )}
            {!isPortrait ? (
              <View style={styles.lessonStatus}>
                <StageJourney
                  allComplete={showCompletedJourney}
                  cards={lesson.cards}
                  compact={useCompactPhoneLayout}
                  currentIndex={cardIndex}
                  lessonId={lesson.id}
                  maxVisitedIndex={qaMode || showCompletedJourney ? lesson.cards.length - 1 : furthestCardIndex}
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
                allComplete={showCompletedJourney}
                cards={lesson.cards}
                compact
                currentIndex={cardIndex}
                lessonId={lesson.id}
                maxVisitedIndex={qaMode || showCompletedJourney ? lesson.cards.length - 1 : furthestCardIndex}
                onStagePress={openStage}
              />
            </View>
          ) : null}
        </View>
        {isCompletedSectionPicker ? (
          <View accessibilityLiveRegion="polite" style={styles.sectionPickerPanel}>
            <Text accessibilityRole="header" style={styles.sectionPickerTitle}>Elige una sección</Text>
            <Text style={styles.sectionPickerText}>
              Toca cualquiera de las secciones completadas de arriba para practicarla otra vez.
            </Text>
          </View>
        ) : null}
        <View pointerEvents={isCompletedSectionPicker ? 'none' : 'auto'} style={[
          styles.contentHeader,
          useCompactPhoneLayout ? styles.contentHeaderCompact : null,
          isPortrait ? styles.contentHeaderPortrait : null,
          isPronunciation ? styles.contentHeaderPronunciation : null,
          isPronunciation && isPortrait ? styles.contentHeaderPronunciationPortrait : null,
          isCompletedSectionPicker ? styles.reviewContentInactive : null,
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
              ref={promptTapTargetRef}
              accessibilityLabel={`Reproducir: ${promptAudio}`}
              accessibilityActions={[{ label: 'Mostrar traducción', name: 'translate' }]}
              accessibilityHint="Toca una vez para repetir. Usa la acción Traducir para ver la frase en español."
              accessibilityRole="button"
              disabled={!promptAudio.trim()}
              onAccessibilityAction={({ nativeEvent }) => {
                if (nativeEvent.actionName === 'translate') openSentenceTranslation();
              }}
              onLongPress={openSentenceTranslation}
              onLayout={() => {
                if (showSentenceCoachmark) updateSentenceAnchor();
              }}
              onPress={handlePromptPress}
              style={styles.promptTapTarget}
            >
              <Text
                numberOfLines={2}
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
              {showSentenceTranslation ? (
                <Animated.Text
                  accessibilityLiveRegion="polite"
                  numberOfLines={2}
                  style={[styles.inlineTranslation, { opacity: translationOpacity }]}
                >
                  {sentenceTranslation}
                </Animated.Text>
              ) : null}
            </Pressable>
          </View>
        </View>
        <Animated.View
          {...(manualCardNavigation ? cardPanResponder.panHandlers : {})}
          pointerEvents={isCompletedSectionPicker ? 'none' : 'auto'}
          style={[
            styles.cardCarousel,
            isCompletedSectionPicker ? styles.reviewContentInactive : null,
            manualCardNavigation ? { transform: [{ translateX: cardTranslateX }] } : null,
          ]}
        >
          <LessonCardView
            audioProvider={audioProvider}
            audioVoice={audioVoice}
            card={currentCard}
            gentleFeedback={profile.confidence === 'nervous'}
            key={`lesson-card-${cardRunId}`}
            level={lesson.level}
            lessonId={lesson.id}
            optionsInteractive={!isAutomaticSingleCard}
            onPronunciationAttempted={pronunciationAttempted}
            onPronunciationPassed={pronunciationPassed}
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
      <SentenceHelpOverlay
        anchorBottom={sentenceAnchorBottom}
        onClose={dismissSentenceCoachmark}
        visible={showSentenceCoachmark}
      />
      <Modal
        animationType="fade"
        onRequestClose={chooseCompletedLessonSections}
        transparent
        visible={completedLessonMode === 'prompt'}
      >
        <View style={styles.completedPromptBackdrop}>
          <View accessibilityViewIsModal style={styles.completedPromptCard}>
            <Text accessibilityRole="header" style={styles.completedPromptTitle}>Lección completada</Text>
            <Text style={styles.completedPromptText}>
              Ya completaste esta lección. ¿Quieres comenzar desde el principio?
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={startCompletedLessonFromBeginning}
              style={styles.completedPromptPrimary}
            >
              <Text style={styles.completedPromptPrimaryText}>Sí, empezar de nuevo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={chooseCompletedLessonSections}
              style={styles.completedPromptSecondary}
            >
              <Text style={styles.completedPromptSecondaryText}>No, elegir una sección</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  reviewContentInactive: { opacity: 0.28 },
  sectionPickerPanel: {
    alignItems: 'center',
    backgroundColor: '#eef8f5',
    borderColor: '#83bfb1',
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sectionPickerTitle: { color: '#176b5d', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sectionPickerText: { color: '#49635e', fontSize: 14, lineHeight: 19, marginTop: 3, textAlign: 'center' },
  completedPromptBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(25, 32, 35, 0.58)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  completedPromptCard: {
    backgroundColor: '#fffdf8',
    borderColor: '#ddc9a7',
    borderRadius: 24,
    borderWidth: 2,
    maxWidth: 480,
    padding: 24,
    width: '100%',
  },
  completedPromptTitle: { color: '#24333a', fontSize: 25, fontWeight: '900', textAlign: 'center' },
  completedPromptText: { color: '#526168', fontSize: 16, lineHeight: 23, marginTop: 10, textAlign: 'center' },
  completedPromptPrimary: { alignItems: 'center', backgroundColor: '#23856f', borderRadius: 15, marginTop: 22, minHeight: 54, justifyContent: 'center', paddingHorizontal: 18 },
  completedPromptPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  completedPromptSecondary: { alignItems: 'center', borderColor: '#23856f', borderRadius: 15, borderWidth: 2, marginTop: 10, minHeight: 52, justifyContent: 'center', paddingHorizontal: 18 },
  completedPromptSecondaryText: { color: '#176b5d', fontSize: 15, fontWeight: '900', textAlign: 'center' },
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
  heroTopPortrait: { minHeight: 48, position: 'relative' },
  heroNavigation: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  logoPill: { height: 50, overflow: 'hidden', width: 205 },
  logoPillCompact: { height: 40, width: 165 },
  brandLogoImage: { height: '100%', width: '100%' },
  backButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dab277', borderRadius: 15, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  backButtonCompact: { borderRadius: 12, height: 40, width: 40 },
  backArrowIcon: { height: 20, position: 'relative', width: 26 },
  backArrowShaft: { backgroundColor: '#f06d3f', borderRadius: 2, height: 4, left: 7, position: 'absolute', top: 8, width: 17 },
  backArrowHead: { borderBottomColor: 'transparent', borderBottomWidth: 7, borderRightColor: '#f06d3f', borderRightWidth: 10, borderTopColor: 'transparent', borderTopWidth: 7, height: 0, left: 0, position: 'absolute', top: 3, width: 0 },
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
  inlineTranslation: {
    color: '#58656b',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
    textAlign: 'center',
  },
  highlight: { color: '#d99b00', fontWeight: '900' },
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
