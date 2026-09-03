import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import { lessonActionVideo, type LessonActionVideo as LessonActionVideoSource } from '../actionVideos';
import { lessonVideoUrl, type CourseAudioProvider, type CourseAudioVoice } from '../config';
import type { CourseAudioTurnPlayback } from '../courseAudioSources';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { lessonHelpText, type PromptInteractionMode } from '../lessonHelp';
import { lessonMistakeHint } from '../lessonMistakeHints';
import type { ChoiceOption, LessonCard } from '../types';
import {
  LESSON_MEDIA_FRAME_STYLE,
  LESSON_MEDIA_VIEWPORT_STYLE,
  LessonMediaFrame,
} from './LessonMediaFrame';
import { OptionMediaImage } from './OptionMediaImage';
import { PronunciationPractice } from './PronunciationPractice';

const TEXT_OPTION_THEMES = [
  { accent: '#6947ad', background: '#f3effc', border: '#b9a8df' },
  { accent: '#2f6f9f', background: '#edf5fc', border: '#a1c7e2' },
  { accent: '#96651d', background: '#fff6df', border: '#e3c27d' },
  { accent: '#4f5d95', background: '#f0f2fa', border: '#adb5d8' },
];
const TEXT_OPTION_NORMAL_MAX_LINES = 2;
const TEXT_OPTION_MAX_LINES = 3;
const EMPTY_SELECTED_IDS: string[] = [];

export function textOptionLineLimit(label: string | null | undefined) {
  const normalized = (label || '').trim();
  const wordCount = normalized ? normalized.split(/\s+/).length : 0;
  const sentenceCount = normalized.match(/[.!?]+(?:\s|$)/g)?.length || 0;
  if (normalized.length <= 22 && wordCount <= 3) return 1;
  if (normalized.length > 56 || sentenceCount >= 3) return TEXT_OPTION_MAX_LINES;
  return TEXT_OPTION_NORMAL_MAX_LINES;
}

export function textAnswerStackNeedsScroll(
  viewportWidth: number,
  viewportHeight: number,
  labels: Array<string | null | undefined>,
) {
  const visibleLabels = labels.filter((label) => Boolean(label?.trim()));
  if (visibleLabels.length === 0) return false;
  const lineDemand = visibleLabels.reduce(
    (total, label) => total + textOptionLineLimit(label),
    0,
  );
  const shortViewportLimit = viewportHeight >= viewportWidth ? 760 : 460;
  return viewportHeight < shortViewportLimit || lineDemand >= 7;
}

type Props = {
  audioProvider: CourseAudioProvider;
  audioVoice: CourseAudioVoice;
  activeTurnImageUrl?: string | null;
  card: LessonCard;
  level: string;
  lessonId: string;
  isAppActive: boolean;
  isOffline: boolean;
  optionsInteractive?: boolean;
  pronunciationAudioTurns?: CourseAudioTurnPlayback[] | null;
  userId?: string;
  selectedId: string | null;
  selectedIds?: string[];
  result: 'correct' | 'wrong' | null;
  gentleFeedback: boolean;
  showHelp: boolean;
  onSelect: (optionId: string) => void;
  onPronunciationAttempted?: () => void;
  onPronunciationReplayAvailabilityChange?: (available: boolean) => void;
  onPronunciationPassed: (firstTry: boolean) => void;
  onPronunciationUnavailable: () => void;
  onGrammarAnimationComplete: () => void;
  onResetSelection?: () => void;
  promptInteractionMode?: PromptInteractionMode;
  pronunciationReplayRequestId?: number;
  missionStep?: number;
  missionTotal?: number;
  onUndoSelection?: () => void;
  allowVerticalGrowth?: boolean;
};

export function LessonCardView({
  audioProvider,
  audioVoice,
  activeTurnImageUrl = null,
  card,
  level,
  lessonId,
  isAppActive,
  isOffline,
  optionsInteractive = true,
  pronunciationAudioTurns = null,
  userId,
  selectedId,
  selectedIds = EMPTY_SELECTED_IDS,
  result,
  gentleFeedback,
  showHelp,
  onSelect,
  onPronunciationAttempted,
  onPronunciationReplayAvailabilityChange,
  onPronunciationPassed,
  onPronunciationUnavailable,
  onGrammarAnimationComplete,
  onResetSelection,
  promptInteractionMode = 'gestures',
  pronunciationReplayRequestId = 0,
  missionStep,
  missionTotal,
  onUndoSelection,
  allowVerticalGrowth = false,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const isPronunciation = card.stage === 'Pronunciation Practice' || card.stage === 'Speak';
  const isGrammar = card.stage === 'Grammar' || card.stage === 'New Grammar' || card.stage === 'Use';
  const isMissionTile = card.interaction_type === 'mission-word-parts'
    || card.interaction_type === 'mission-sentence'
    || card.interaction_type === 'mission-finale';
  const isLandscape = viewportWidth > viewportHeight;
  const isCompactLandscape = isLandscape && viewportHeight < 460;
  // Android system bars can reduce a 600dp tablet viewport below 600dp.
  const isTabletViewport = Math.min(viewportWidth, viewportHeight) >= 540;
  const isTabletLandscape = isLandscape && isTabletViewport;
  const hasTextOnlyOptions = card.options.length > 0 && card.options.every((option) => !option.image_url);
  const hasMultilineTextOption = hasTextOnlyOptions
    && card.options.some((option) => textOptionLineLimit(option.label) > 1);
  const useCompactCompletionTiles = isGrammar
    && hasTextOnlyOptions
    && card.options.length === 3
    && card.options.every((option) => (
      (option.label?.trim().length || 0) <= 8
      && (option.label?.trim().split(/\s+/).length || 0) <= 2
    ));
  // Phrase choices need the full phone width. Stacking them as short horizontal
  // rows lets short responses stay large while longer sentences use two or three safe lines.
  const useHorizontalPhraseOptions = !isLandscape && hasTextOnlyOptions && !useCompactCompletionTiles;
  // A full sentence cannot stay readable in the narrow columns used by a
  // compact landscape row. Stack that bank at full width inside the scroll-safe page.
  const useStackedCompactLandscapeText = isCompactLandscape && hasMultilineTextOption;
  // Image-to-text cards are a recurring lesson pattern. Keep the complete
  // prompt image and a 2x2 phrase grid inside a phone's usable portrait area.
  const useDensePortraitTextLayout =
    !isLandscape &&
    Boolean(card.prompt_image_url) &&
    hasTextOnlyOptions &&
    card.options.length >= 3;
  // Short phone landscape viewports cannot fit two full rows below the prompt image.
  // Keep four text answers in one row there; tablets retain the roomier two-column grid.
  const useTextGrid =
    isLandscape &&
    !isCompactLandscape &&
    hasTextOnlyOptions &&
    card.options.length >= 3;
  const useTabletImageGrid = isTabletLandscape && !hasTextOnlyOptions && card.options.length === 4;
  const usePortraitImageGrid = !isLandscape && !hasTextOnlyOptions && card.options.length >= 3;
  const useFourImagePortraitGrid = usePortraitImageGrid && card.options.length === 4;
  const usePortraitImageStack = !isLandscape && !hasTextOnlyOptions && card.options.length === 2;
  const useSingleImageLayout = !hasTextOnlyOptions && card.options.length === 1;
  const useThreeByTwoOptionMedia = card.options.some((option) => Boolean(option.image_url));
  // These two Lesson 1.7 comparisons intentionally teach the contrast with
  // still choices. Other action-backed choices keep their normal video behavior.
  const useStillOnlyLesson17Comparison = lessonId === 'lesson-7-is-are-not' && card.options.length === 2 && (
    card.options.some((option) => option.id === 'grandparents-sitting') &&
    card.options.some((option) => option.id === 'pair-running')
  );
  const useExpandedSingleActionVideo = useSingleImageLayout && Boolean(
    lessonActionVideo(card.options[0]?.image_url),
  );
  // Phone teaching clips retain their established full-width presentation.
  // Landscape tablets instead use the same height-aware 3:2 width cap as a
  // non-video single card so the clip leaves visible margins below the header.
  const useFullWidthSingleActionVideo = useExpandedSingleActionVideo && !isTabletLandscape;
  const mistakeHint = result === 'wrong' ? lessonMistakeHint(card, selectedIds.length ? selectedIds : selectedId) : '';
  const [feedbackMeasurement, setFeedbackMeasurement] = useState({ key: '', height: 0 });
  const feedbackLayoutKey = `${viewportWidth}:${mistakeHint}`;
  const flyingAnswerAnimation = useRef(new Animated.Value(0)).current;
  const [flyingAnswer, setFlyingAnswer] = useState('');
  const [measuredCardHeight, setMeasuredCardHeight] = useState(0);
  const optionWidth =
    useCompactCompletionTiles
      ? '31%'
      : useHorizontalPhraseOptions
      ? '100%'
      : useStackedCompactLandscapeText
      ? '100%'
      : usePortraitImageStack
      ? '100%'
      : useTextGrid || useTabletImageGrid
      ? '48.5%'
      : isLandscape && card.options.length >= 4
      ? '23.5%'
      : isLandscape && card.options.length === 3
        ? '31%'
        : useSingleImageLayout
          ? '100%'
          : '48%';
  const textOptionFontSize = isTabletViewport
    ? Math.max(34, Math.min(42, viewportHeight * 0.055))
    : useHorizontalPhraseOptions
      ? Math.max(21, Math.min(28, viewportWidth * 0.068))
      : useDensePortraitTextLayout
        ? Math.max(22, Math.min(26, viewportWidth * 0.064))
        : Math.max(26, Math.min(34, viewportHeight * 0.052));
  const textOptionLineHeight = isTabletViewport
    ? Math.max(40, Math.min(49, viewportHeight * 0.064))
    : useHorizontalPhraseOptions
      ? Math.max(26, Math.min(34, viewportWidth * 0.082))
      : useDensePortraitTextLayout
        ? Math.max(27, Math.min(31, viewportWidth * 0.076))
        : Math.max(32, Math.min(40, viewportHeight * 0.062));
  const textOptionMinimumFontSize = isTabletViewport ? 22 : 16;
  const textOptionMinimumFontScale = Math.min(
    1,
    textOptionMinimumFontSize / textOptionFontSize,
  );
  const textOptionLineLimits = hasTextOnlyOptions
    ? card.options.map((option) => textOptionLineLimit(option.label))
    : [];
  const optionMinHeight = hasTextOnlyOptions
    ? useCompactCompletionTiles
      ? Math.max(64, Math.min(82, viewportHeight * 0.09))
      : useHorizontalPhraseOptions
      ? Math.max(52, Math.min(62, viewportHeight * 0.07))
      : isLandscape
      ? isTabletLandscape
        ? Math.max(96, Math.min(124, viewportHeight * 0.16))
        : isCompactLandscape
          ? Math.max(58, Math.min(72, viewportHeight * 0.16))
          : Math.max(72, Math.min(92, viewportHeight * 0.145))
      : useDensePortraitTextLayout
        ? Math.max(82, Math.min(94, viewportHeight * 0.1))
        : 104
    : isLandscape
      ? Math.max(58, viewportHeight * 0.17)
      : 92;
  const textOptionChromeHeight = useHorizontalPhraseOptions
    ? useDensePortraitTextLayout ? 25 : 28
    : useDensePortraitTextLayout ? 33 : 40;
  const textOptionMinHeightFor = (lineLimit: number) => lineLimit > 1
    ? Math.max(optionMinHeight, (textOptionLineHeight * lineLimit) + textOptionChromeHeight)
    : optionMinHeight;
  const responsiveFeatureImageHeight = useDensePortraitTextLayout
    ? Math.max(170, Math.min(245, viewportHeight * 0.27))
    : isTabletLandscape
    ? isPronunciation
      ? Math.max(280, Math.min(390, viewportHeight * 0.49))
      : useTextGrid
        ? Math.max(235, Math.min(320, viewportHeight * 0.4))
        : Math.max(270, Math.min(410, viewportHeight * 0.52))
    : isPronunciation
    ? Math.max(185, Math.min(280, viewportHeight * 0.47))
    : useTextGrid
      ? Math.max(175, Math.min(225, viewportHeight * 0.37))
      : Math.max(175, Math.min(300, viewportHeight * 0.49));
  const responsiveOptionImageHeight = isTabletLandscape
    ? card.options.length >= 4
      ? Math.max(150, Math.min(235, viewportHeight * 0.29))
      : card.options.length === 3
        ? Math.max(230, Math.min(320, viewportHeight * 0.41))
        : card.options.length === 1
          ? Math.max(320, Math.min(460, viewportHeight * 0.62))
          : Math.max(280, Math.min(400, viewportHeight * 0.55))
    : card.options.length >= 4
      ? Math.max(145, Math.min(215, viewportHeight * 0.36))
      : card.options.length === 3
        ? Math.max(175, Math.min(270, viewportHeight * 0.45))
      : card.options.length === 1
        ? Math.max(220, Math.min(365, viewportHeight * 0.61))
        : Math.max(205, Math.min(340, viewportHeight * 0.57));
  const fallbackCardHeight = Math.max(150, viewportHeight * (isCompactLandscape ? 0.43 : 0.58));
  const availableCardHeight = measuredCardHeight || fallbackCardHeight;
  // Keep the answer feedback inside the card on short portrait screens. Two
  // full-width 3:2 choices otherwise size themselves from width and can push a
  // two-line teaching hint beneath the Android navigation bar.
  const needsPortraitImageFeedbackSpace =
    !isLandscape && !hasTextOnlyOptions && optionsInteractive && card.options.length >= 2;
  const feedbackReservedHeight = !isPronunciation && optionsInteractive
    ? Math.max(
        feedbackMeasurement.key === feedbackLayoutKey ? feedbackMeasurement.height + 12 : 0,
        needsPortraitImageFeedbackSpace ? 76 : 58,
      )
    : 0;
  const availableOptionsHeight = Math.max(0, availableCardHeight - feedbackReservedHeight);
  const textOptionColumns = useCompactCompletionTiles
    ? Math.max(1, card.options.length)
    : useHorizontalPhraseOptions
      ? 1
      : useStackedCompactLandscapeText
        ? 1
      : isLandscape && !useTextGrid
        ? Math.max(1, card.options.length)
        : 2;
  const textOptionRows = hasTextOnlyOptions
    ? Math.ceil(card.options.length / textOptionColumns)
    : 0;
  const textOptionsReservedHeight = hasTextOnlyOptions
    ? Array.from({ length: textOptionRows }, (_unused, rowIndex) => {
        const rowLineLimits = textOptionLineLimits.slice(
          rowIndex * textOptionColumns,
          (rowIndex + 1) * textOptionColumns,
        );
        return Math.max(...rowLineLimits.map(textOptionMinHeightFor));
      }).reduce((sum, rowHeight) => sum + rowHeight, 0)
      + (Math.max(0, textOptionRows - 1) * 10)
    : 0;
  const featureReservedHeight = isPronunciation
    ? result
      ? 108
      : isLandscape
        ? 78
        : 132
    : isMissionTile
      ? Math.max(210, Math.min(260, viewportHeight * 0.37))
    : hasTextOnlyOptions
      ? textOptionsReservedHeight + feedbackReservedHeight + 30
      : 24;
  // A scrollable text card measures its natural content height, not a fixed
  // viewport budget. Subtracting its reserved rows/feedback from that measurement
  // feeds the image's own height back into the next layout and shrinks it to 70dp.
  const featureImageHeight = allowVerticalGrowth && hasTextOnlyOptions && !isPronunciation && !isMissionTile
    ? responsiveFeatureImageHeight
    : Math.min(
        responsiveFeatureImageHeight,
        Math.max(isPronunciation ? 68 : 70, availableCardHeight - featureReservedHeight),
      );
  const promptImageHeight = isMissionTile
    ? Math.min(
        showHelp ? featureImageHeight * 0.65 : featureImageHeight,
        isLandscape
          ? Math.max(72, Math.min(150, viewportHeight * 0.25))
          : Math.max(82, Math.min(150, viewportHeight * 0.2)),
      )
    : showHelp ? featureImageHeight * 0.65 : featureImageHeight;
  const optionRows = useTabletImageGrid || usePortraitImageGrid || usePortraitImageStack ? 2 : 1;
  // A single image or teaching clip is the main lesson visual. Let it use the
  // full measured panel instead of shrinking a 16:9 clip into a short strip.
  const optionImageHeight = useSingleImageLayout
    ? Math.max(68, availableOptionsHeight - 42)
    : Math.min(
      responsiveOptionImageHeight,
      useTabletImageGrid || usePortraitImageGrid || usePortraitImageStack
        ? Math.max(68, ((availableOptionsHeight - 20 - ((optionRows - 1) * 10)) / optionRows) - 14)
        : Math.max(68, (availableOptionsHeight - 26 - ((optionRows - 1) * 10)) / optionRows),
    );
  // A two-card portrait stack may scale uniformly when height is limited.
  // Never apply this width constraint to a four-card grid: it must stay 2x2.
  const portraitImageContentWidth = Math.max(0, viewportWidth - 44);
  const constrainedPortraitImageOptionWidth = usePortraitImageStack
    ? Math.min(portraitImageContentWidth, (optionImageHeight * (3 / 2)) + 24)
    : null;
  // Landscape image frames must respect the height left after the shared lesson
  // header. Without this cap, a 3:2 frame derives its height from the full
  // tablet width, which can overflow one-card visuals and the second row of a
  // four-card tablet grid. The column count preserves every established layout,
  // including the working two-card row.
  const landscapeImageGap = isTabletLandscape ? 12 : 7;
  const landscapeImageColumnCount = useTabletImageGrid
    ? 2
    : Math.max(1, card.options.length);
  const landscapeImageContentWidth = Math.max(
    96,
    viewportWidth - (isTabletLandscape ? 56 : 32),
  );
  const landscapeImageColumnWidth = Math.max(
    96,
    (
      landscapeImageContentWidth
      - (Math.max(0, landscapeImageColumnCount - 1) * landscapeImageGap)
    ) / landscapeImageColumnCount,
  );
  const heightAwareThreeByTwoFrameWidth = Math.max(
    96,
    (optionImageHeight * (3 / 2)) + 24,
  );
  const constrainedLandscapeImageOptionWidth = isLandscape && !hasTextOnlyOptions
    ? Math.min(landscapeImageColumnWidth, heightAwareThreeByTwoFrameWidth)
    : null;
  const tabletImageGridWidth = useTabletImageGrid && constrainedLandscapeImageOptionWidth
    ? (constrainedLandscapeImageOptionWidth * 2) + landscapeImageGap
    : null;
  const effectiveSelectedIds = useMemo(
    () => selectedIds.length
      ? selectedIds
      : selectedId
        ? [selectedId]
        : [],
    [selectedId, selectedIds],
  );

  useEffect(() => {
    if (!isGrammar || result !== 'correct' || effectiveSelectedIds.length === 0) return undefined;
    const selectedLabels = effectiveSelectedIds.flatMap((optionId) => {
      const label = card.options.find((option) => option.id === optionId)?.label?.trim();
      return label ? [label] : [];
    });
    if (selectedLabels.length === 0) {
      onGrammarAnimationComplete();
      return undefined;
    }

    if (reduceMotion) {
      setFlyingAnswer('');
      onGrammarAnimationComplete();
      return undefined;
    }

    setFlyingAnswer(selectedLabels.join('  ·  '));
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
    reduceMotion,
    result,
    effectiveSelectedIds,
  ]);

  return (
    <View style={[
      styles.card,
      isLandscape ? styles.cardLandscape : null,
      !isLandscape ? styles.cardPortrait : null,
      isCompactLandscape ? styles.cardCompactLandscape : null,
      isTabletLandscape ? styles.cardTabletLandscape : null,
      isPronunciation ? styles.pronunciationCard : null,
      isPronunciation && !isLandscape ? styles.pronunciationCardPortrait : null,
      allowVerticalGrowth ? styles.cardVerticalGrowth : null,
    ]}
      onLayout={({ nativeEvent }) => {
        const nextHeight = Math.round(nativeEvent.layout.height);
        setMeasuredCardHeight((current) => Math.abs(current - nextHeight) < 2 ? current : nextHeight);
      }}
    >
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
      {missionStep && missionTotal ? (
        <View accessible accessibilityLabel={`Misión familiar, paso ${missionStep} de ${missionTotal}`} style={styles.missionProgress}>
          <Text style={styles.missionProgressLabel}>MISIÓN FAMILIAR</Text>
          <Text style={styles.missionProgressCount}>{missionStep}/{missionTotal}</Text>
        </View>
      ) : null}
      {showHelp ? (
        <View style={styles.help}>
          <Text accessibilityRole="header" style={styles.helpTitle}>Ayuda</Text>
          <Text accessibilityLiveRegion="polite" style={styles.helpText}>
            {lessonHelpText(card, promptInteractionMode)}
          </Text>
        </View>
      ) : null}
      {activeTurnImageUrl || card.prompt_image_url ? (
        <LessonMediaFrame
          frameStyle={[
            styles.promptImageFrame,
            useDensePortraitTextLayout ? styles.promptImageFrameDensePortrait : null,
          ]}
          maxHeight={promptImageHeight}
        >
          <OptionMediaImage
            accessibilityLabel={card.answer_audio_text || card.prompt}
            imageUrl={activeTurnImageUrl || card.prompt_image_url}
          />
        </LessonMediaFrame>
      ) : null}
      {isPronunciation ? (
        <PronunciationPractice
          audioTurns={pronunciationAudioTurns}
          audioProvider={audioProvider}
          audioVoice={audioVoice}
          imageHeight={showHelp
            ? featureImageHeight * 0.65
            : result
              ? featureImageHeight * 0.72
              : featureImageHeight}
          imageLabel={card.options[0]?.label || card.prompt}
          imageUrl={card.options[0]?.image_url}
          isAppActive={isAppActive}
          isOffline={isOffline}
          videoName={null}
          level={level}
          onAttempted={onPronunciationAttempted}
          onHeaderReplayAvailabilityChange={onPronunciationReplayAvailabilityChange}
          onPassed={onPronunciationPassed}
          onUnavailable={onPronunciationUnavailable}
          phrase={card.audio_text || card.prompt}
          headerReplayRequestId={pronunciationReplayRequestId}
          userId={userId}
        />
      ) : (
        <>
          {isMissionTile ? (
            <MissionTileBuilder
              card={card}
              disabled={!optionsInteractive || result === 'correct'}
              onReset={onResetSelection}
              onSelect={onSelect}
              onUndo={onUndoSelection}
              result={result}
              selectedIds={effectiveSelectedIds}
            />
          ) : <View style={[
            styles.options,
            isLandscape ? styles.optionsLandscape : null,
            !isLandscape ? styles.optionsPortrait : null,
            useDensePortraitTextLayout ? styles.optionsDensePortrait : null,
            useHorizontalPhraseOptions ? styles.optionsHorizontalPhrases : null,
            useCompactCompletionTiles ? styles.optionsCompactText : null,
            isTabletLandscape ? styles.optionsTabletLandscape : null,
            useExpandedSingleActionVideo ? styles.singleActionVideoOptions : null,
            tabletImageGridWidth
              ? { alignSelf: 'center', width: tabletImageGridWidth }
              : null,
          ]}>
            {card.options.map((option, optionIndex) => {
              const selected = effectiveSelectedIds.includes(option.id);
              const correct = card.correct_option_ids?.length
                ? card.correct_option_ids.includes(option.id)
                : option.id === card.correct_option_id;
              const revealCorrect = selected && result === 'correct' && correct;
              const revealWrong = selected && result === 'wrong';
              const revealPending = selected && result === null;
              const optionDisabled = !optionsInteractive
                || result === 'correct'
                || (revealPending && effectiveSelectedIds.length < (card.correct_option_ids?.length || 1));
              const optionTextLineLimit = textOptionLineLimit(option.label);
              const textTheme = TEXT_OPTION_THEMES[optionIndex % TEXT_OPTION_THEMES.length];
              const actionVideo = useStillOnlyLesson17Comparison
                ? null
                : lessonActionVideo(option.image_url, card.options.length);
              const playActionVideo = Boolean(actionVideo) && (
                card.options.length === 1 || revealCorrect
              );
              const optionRenderKey = `${option.id}:${option.image_url ?? ''}:${option.label ?? ''}`;
              const renderedOptionImageHeight = showHelp ? optionImageHeight * 0.65 : optionImageHeight;
              return (
                <Pressable
                  accessibilityLabel={option.label || `Answer option ${option.id}`}
                  accessibilityRole={optionsInteractive ? 'button' : 'image'}
                  accessibilityState={{ disabled: optionDisabled, selected }}
                  disabled={optionDisabled}
                  key={optionRenderKey}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      minHeight: hasTextOnlyOptions
                        ? textOptionMinHeightFor(optionTextLineLimit)
                        : optionMinHeight,
                      padding: isTabletLandscape ? 8 : 5,
                      width: constrainedPortraitImageOptionWidth
                        ?? constrainedLandscapeImageOptionWidth
                        ?? optionWidth,
                    },
                    hasTextOnlyOptions
                      ? {
                          backgroundColor: textTheme.background,
                          borderColor: textTheme.border,
                        }
                      : null,
                    option.image_url ? styles.imageOptionFrame : null,
                    useFullWidthSingleActionVideo ? styles.singleActionVideoOption : null,
                    hasTextOnlyOptions ? styles.textOption : null,
                    useDensePortraitTextLayout ? styles.textOptionDensePortrait : null,
                    useHorizontalPhraseOptions ? styles.textOptionHorizontal : null,
                    useCompactCompletionTiles ? styles.textOptionCompact : null,
                    hasTextOnlyOptions && optionTextLineLimit > 1 ? styles.textOptionSentence : null,
                    hasTextOnlyOptions && optionTextLineLimit === TEXT_OPTION_MAX_LINES ? styles.textOptionLong : null,
                    revealPending ? styles.pendingOption : null,
                    revealCorrect ? styles.correctOption : null,
                    revealWrong ? styles.wrongOption : null,
                    pressed ? styles.pressed : null,
                    pressed && hasTextOnlyOptions ? styles.textOptionPressed : null,
                  ]}
                >
                  {option.image_url ? (
                    // Corrected local clips can claim a blank Android texture before
                    // playback. Use the ordinary image renderer until motion starts.
                    actionVideo && playActionVideo ? (
                      <LessonActionMedia
                        accessibilityLabel={option.label || card.prompt}
                        height={renderedOptionImageHeight}
                        imageUrl={option.image_url}
                        onPress={optionsInteractive ? () => onSelect(option.id) : undefined}
                        shouldPlay={playActionVideo}
                        useCompactFrame={useSingleImageLayout}
                        useFourByFiveFrame={useFourImagePortraitGrid}
                        useThreeByTwoFrame={useThreeByTwoOptionMedia && !useFourImagePortraitGrid}
                        video={actionVideo}
                      />
                    ) : (
                      <View
                        style={[
                          styles.optionImage,
                          styles.optionImagePortrait,
                          useFourImagePortraitGrid
                            ? styles.optionImageFourByFiveFrame
                            : styles.optionImageThreeByTwoFrame,
                          showHelp ? styles.optionImageThreeByTwoHelp : null,
                        ]}
                        >
                          <OptionMediaImage
                            imageUrl={option.image_url}
                            sourceOverride={card.options.length === 2 ? actionVideo?.posterSource : undefined}
                          />
                      </View>
                    )
                  ) : null}
                  {option.label && !option.image_url ? (
                    <>
                      <View
                        pointerEvents="none"
                        style={[styles.optionSpark, { backgroundColor: textTheme.accent }]}
                      />
                      <Text
                        adjustsFontSizeToFit
                        android_hyphenationFrequency="none"
                        maxFontSizeMultiplier={isTabletViewport ? 1.2 : 1.15}
                        minimumFontScale={textOptionMinimumFontScale}
                        numberOfLines={optionTextLineLimit}
                        style={[
                          styles.optionLabel,
                          styles.textOptionLabel,
                          {
                            color: revealCorrect
                              ? '#287a57'
                              : revealWrong
                                ? '#a34842'
                                : textTheme.accent,
                            fontSize: textOptionFontSize,
                            lineHeight: textOptionLineHeight,
                          },
                        ]}
                        textBreakStrategy="simple"
                      >
                        {option.label}
                      </Text>
                      <View
                        style={[
                          styles.optionUnderline,
                          useDensePortraitTextLayout ? styles.optionUnderlineDensePortrait : null,
                          {
                            backgroundColor: revealCorrect
                              ? '#3c996c'
                              : revealWrong
                                ? '#c95e55'
                                : textTheme.accent,
                          },
                        ]}
                      />
                    </>
                  ) : null}
                  {revealCorrect ? <Text style={styles.feedbackIcon}>✓</Text> : null}
                  {revealWrong ? <Text style={[styles.feedbackIcon, styles.wrongIcon]}>×</Text> : null}
                </Pressable>
              );
            })}
          </View>}
          {result ? (
            <View
              accessible
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
              style={styles.feedback}
              onLayout={(event) => {
                const height = Math.ceil(event.nativeEvent.layout.height);
                setFeedbackMeasurement((previous) => previous.key === feedbackLayoutKey && previous.height === height
                  ? previous : { key: feedbackLayoutKey, height });
              }}
            >
              <Text style={[
                styles.feedbackText,
                isTabletLandscape ? styles.feedbackTextTablet : null,
                result === 'correct' ? styles.correctText : styles.wrongText,
              ]}>
                {result === 'correct'
                  ? 'Correcto. Vamos a la siguiente tarjeta…'
                  : gentleFeedback
                    ? '¡Tú puedes! Inténtalo de nuevo.'
                    : '¡Ánimo! Inténtalo de nuevo.'}
              </Text>
              {result === 'wrong' && mistakeHint ? (
                <Text style={[
                  styles.educationHint,
                  isTabletLandscape ? styles.educationHintTablet : null,
                ]}>
                  {mistakeHint}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

type MissionDropBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function MissionDraggableTile({
  disabled,
  dropBoundsRef,
  onSelect,
  option,
  selected,
}: {
  disabled: boolean;
  dropBoundsRef: MutableRefObject<MissionDropBounds | null>;
  onSelect: (optionId: string) => void;
  option: ChoiceOption;
  selected: boolean;
}) {
  const drag = useRef(new Animated.ValueXY()).current;
  const tileRef = useRef<View | null>(null);
  const originRef = useRef<MissionDropBounds | null>(null);
  const [dragging, setDragging] = useState(false);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const tileDisabled = disabled || selected;

  const returnTile = useCallback(() => {
    setDragging(false);
    Animated.spring(drag, {
      damping: 18,
      stiffness: 230,
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  }, [drag]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => (
      !tileDisabled && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5)
    ),
    onPanResponderGrant: () => {
      setDragging(true);
      tileRef.current?.measureInWindow((x, y, width, height) => {
        originRef.current = { x, y, width, height };
      });
    },
    onPanResponderMove: (_event, gesture) => {
      const origin = originRef.current;
      if (!origin) return;
      drag.setValue({
        x: Math.max(8 - origin.x, Math.min(gesture.dx, viewportWidth - origin.x - origin.width - 8)),
        y: Math.max(8 - origin.y, Math.min(gesture.dy, viewportHeight - origin.y - origin.height - 8)),
      });
    },
    onPanResponderRelease: (event) => {
      const bounds = dropBoundsRef.current;
      const { pageX, pageY } = event.nativeEvent;
      if (
        bounds
        && pageX >= bounds.x
        && pageX <= bounds.x + bounds.width
        && pageY >= bounds.y
        && pageY <= bounds.y + bounds.height
      ) {
        onSelect(option.id);
      }
      returnTile();
    },
    onPanResponderTerminate: returnTile,
    onPanResponderTerminationRequest: () => false,
  }), [
    drag,
    dropBoundsRef,
    onSelect,
    option.id,
    returnTile,
    tileDisabled,
    viewportHeight,
    viewportWidth,
  ]);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.missionTileMotion,
        dragging ? styles.missionTileDragging : null,
        { transform: drag.getTranslateTransform() },
      ]}
    >
      <Pressable
        accessibilityHint={selected
          ? 'Esta ficha ya está en la respuesta.'
          : 'Toca o arrastra esta ficha al área de respuesta.'}
        accessibilityLabel={`Ficha ${option.label || option.id}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: tileDisabled, selected }}
        disabled={tileDisabled}
        onPress={() => onSelect(option.id)}
        ref={tileRef}
        style={({ pressed }) => [
          styles.missionTile,
          selected ? styles.missionTileSelected : null,
          pressed ? styles.missionTilePressed : null,
        ]}
      >
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={2} style={styles.missionTileText}>
          {option.label || option.id}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function MissionTileBuilder({
  card,
  disabled,
  onReset,
  onSelect,
  onUndo,
  result,
  selectedIds,
}: {
  card: LessonCard;
  disabled: boolean;
  onReset?: () => void;
  onSelect: (optionId: string) => void;
  onUndo?: () => void;
  result: 'correct' | 'wrong' | null;
  selectedIds: string[];
}) {
  const dropZoneRef = useRef<View | null>(null);
  const dropBoundsRef = useRef<MissionDropBounds | null>(null);
  const correctIds = card.correct_option_ids?.length
    ? card.correct_option_ids
    : [card.correct_option_id];
  const isWordParts = card.interaction_type === 'mission-word-parts';
  const selectedLabels = selectedIds.map((optionId) => (
    card.options.find((option) => option.id === optionId)?.label || optionId
  ));
  const measureDropZone = useCallback(() => {
    dropZoneRef.current?.measureInWindow((x, y, width, height) => {
      dropBoundsRef.current = { x, y, width, height };
    });
  }, []);

  useEffect(() => {
    measureDropZone();
  }, [measureDropZone, selectedIds]);

  return (
    <View style={styles.missionBoard}>
      <Text style={styles.missionInstruction}>
        {isWordParts ? 'Forma la palabra' : 'Ordena la oración'}
      </Text>
      <View
        accessibilityLabel={`Respuesta: ${selectedLabels.join(isWordParts ? '-' : ' ') || 'vacía'}`}
        accessibilityLiveRegion="polite"
        accessible
        onLayout={measureDropZone}
        ref={dropZoneRef}
        style={[
          styles.missionDropZone,
          result === 'correct' ? styles.missionDropZoneCorrect : null,
          result === 'wrong' ? styles.missionDropZoneWrong : null,
        ]}
      >
        {correctIds.map((correctId, index) => (
          <View key={`${correctId}-${index}`} style={styles.missionAnswerSlot}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              numberOfLines={1}
              style={styles.missionAnswerSlotText}
            >
              {selectedLabels[index] || '___'}
            </Text>
          </View>
        ))}
      </View>
      <View accessibilityLabel="Fichas disponibles" style={styles.missionTileBank}>
        {card.options.map((option) => (
          <MissionDraggableTile
            disabled={disabled}
            dropBoundsRef={dropBoundsRef}
            key={option.id}
            onSelect={onSelect}
            option={option}
            selected={selectedIds.includes(option.id)}
          />
        ))}
      </View>
      <View style={styles.missionControls}>
        <Pressable
          accessibilityLabel="Deshacer última ficha"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || selectedIds.length === 0 }}
          disabled={disabled || selectedIds.length === 0}
          onPress={onUndo}
          style={({ pressed }) => [
            styles.missionControl,
            disabled || selectedIds.length === 0 ? styles.missionControlDisabled : null,
            pressed ? styles.missionControlPressed : null,
          ]}
        >
          <Text style={styles.missionControlText}>Deshacer</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Reiniciar respuesta"
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || selectedIds.length === 0 }}
          disabled={disabled || selectedIds.length === 0}
          onPress={onReset}
          style={({ pressed }) => [
            styles.missionControl,
            disabled || selectedIds.length === 0 ? styles.missionControlDisabled : null,
            pressed ? styles.missionControlPressed : null,
          ]}
        >
          <Text style={styles.missionControlText}>Reiniciar</Text>
        </Pressable>
      </View>
      <Text style={styles.missionTapHint}>Toca o arrastra las fichas en orden.</Text>
    </View>
  );
}

function LessonActionMedia({
  accessibilityLabel,
  height,
  imageUrl,
  onPress,
  shouldPlay,
  useCompactFrame = false,
  useFourByFiveFrame = false,
  useThreeByTwoFrame = false,
  video,
}: {
  accessibilityLabel: string;
  height: number;
  imageUrl: string;
  onPress?: () => void;
  shouldPlay: boolean;
  useCompactFrame?: boolean;
  useFourByFiveFrame?: boolean;
  useThreeByTwoFrame?: boolean;
  video: LessonActionVideoSource;
}) {
  const reduceMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoSource = useMemo<VideoSource>(
    () => video.source ?? { uri: lessonVideoUrl(video.name), useCaching: true },
    [video.name, video.source],
  );
  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.pause();
  });

  useEffect(() => {
    setVideoFailed(false);
    setVideoReady(false);
  }, [video.name, video.source]);

  useEffect(() => {
    player.pause();
    player.currentTime = 0;
    if (!reduceMotion && shouldPlay) {
      player.play();
    }
  }, [player, reduceMotion, shouldPlay]);

  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setVideoFailed(true);
    });
    return () => subscription.remove();
  }, [player]);

  // Android can report a paused video frame as ready while its texture is still
  // blank. Keep the matching still visible until a correct choice actually
  // starts playback; single-card teaching clips already enter with shouldPlay.
  if (!shouldPlay || reduceMotion || videoFailed) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        style={[
          styles.actionMedia,
          useCompactFrame ? styles.singleActionMedia : null,
          useFourByFiveFrame
            ? styles.actionMediaFourByFive
            : useThreeByTwoFrame
              ? styles.actionMediaThreeByTwo
              : { height },
        ]}
      >
        <OptionMediaImage imageUrl={imageUrl} sourceOverride={video.posterSource} />
      </View>
    );
  }

  return (
    <View style={[
      styles.actionMedia,
      useCompactFrame ? styles.singleActionMedia : null,
      useThreeByTwoFrame ? styles.actionMediaThreeByTwo : { height },
    ]}>
      <VideoView
        accessible={false}
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={() => {
          setVideoFailed(false);
          setVideoReady(true);
        }}
        player={player}
        pointerEvents="none"
        surfaceType="textureView"
        style={styles.actionMediaLayer}
      />
      {!videoReady ? (
        <OptionMediaImage imageUrl={imageUrl} poster sourceOverride={video.posterSource} />
      ) : null}
      {onPress ? (
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.actionMediaPressTarget}
        />
      ) : null}
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
  cardPortrait: {
    backgroundColor: '#fffdf8',
    borderColor: '#eadfce',
    borderRadius: 28,
    borderWidth: 2,
    elevation: 2,
    flex: 1,
    minHeight: 0,
    paddingBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 7,
    shadowColor: '#8d684a',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardCompactLandscape: { minHeight: 0, overflow: 'hidden', padding: 6 },
  cardTabletLandscape: { padding: 14 },
  cardVerticalGrowth: { flexBasis: 'auto', flexGrow: 1, flexShrink: 0 },
  pronunciationCard: { justifyContent: 'flex-start', paddingBottom: 4, paddingTop: 3 },
  pronunciationCardPortrait: { paddingBottom: 6, paddingTop: 3 },
  help: { backgroundColor: '#fff4df', borderRadius: 12, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6 },
  flyingAnswer: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -64, zIndex: 20 },
  flyingAnswerText: { backgroundColor: '#f9dc8e', borderColor: '#e0a93f', borderRadius: 10, borderWidth: 2, color: '#8a4f00', fontSize: 22, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6 },
  helpTitle: { color: '#8a4f00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  helpText: { color: '#694b22', fontSize: 13, lineHeight: 18, marginTop: 3 },
  missionProgress: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#fff3cf',
    borderColor: '#e4b848',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 3,
    minHeight: 28,
    paddingHorizontal: 11,
  },
  missionProgressLabel: { color: '#8c5700', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  missionProgressCount: { color: '#1b6658', fontSize: 12, fontWeight: '900' },
  promptImageFrame: { marginTop: 14 },
  promptImageFrameDensePortrait: { marginTop: 3 },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 20,
  },
  optionsLandscape: { gap: 7, marginTop: 5 },
  optionsPortrait: { columnGap: 10, marginTop: 2, rowGap: 10 },
  optionsDensePortrait: { columnGap: 8, marginTop: 5, rowGap: 8 },
  optionsHorizontalPhrases: { alignContent: 'flex-start', marginTop: 5, rowGap: 7 },
  optionsCompactText: { columnGap: 6 },
  optionsTabletLandscape: { columnGap: 12, marginTop: 8, rowGap: 10 },
  missionBoard: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 5,
    maxWidth: 680,
    width: '100%',
  },
  missionInstruction: { color: '#6a4c25', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  missionDropZone: {
    alignItems: 'center',
    backgroundColor: '#fff9e9',
    borderColor: '#d6b65a',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 58,
    padding: 6,
    width: '100%',
  },
  missionDropZoneCorrect: { backgroundColor: '#eaf6ee', borderColor: '#3c996c', borderStyle: 'solid' },
  missionDropZoneWrong: { backgroundColor: '#fbeceb', borderColor: '#c95e55', borderStyle: 'solid' },
  missionAnswerSlot: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#9b7a39',
    borderBottomWidth: 3,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    maxWidth: 188,
    minHeight: 42,
    minWidth: 64,
    paddingHorizontal: 4,
  },
  missionAnswerSlotText: { color: '#1d5f54', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  missionTileBank: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  missionTileMotion: { maxWidth: 190, minWidth: 82, width: '30%' },
  missionTileDragging: { elevation: 10, zIndex: 30 },
  missionTile: {
    alignItems: 'center',
    backgroundColor: '#eef7f4',
    borderBottomWidth: 4,
    borderColor: '#75aa9e',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 7,
    paddingVertical: 5,
    width: '100%',
  },
  missionTileSelected: { backgroundColor: '#d8e3df', borderColor: '#9baaa6', opacity: 0.58 },
  missionTilePressed: { opacity: 0.75, transform: [{ translateY: 2 }] },
  missionTileText: { color: '#1b6658', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  missionControls: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 7 },
  missionControl: {
    alignItems: 'center',
    backgroundColor: '#f5eee2',
    borderColor: '#c8a875',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
    paddingHorizontal: 12,
  },
  missionControlDisabled: { opacity: 0.42 },
  missionControlPressed: { opacity: 0.72 },
  missionControlText: { color: '#6d4a1f', fontSize: 13, fontWeight: '900' },
  missionTapHint: { color: '#68645c', fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  singleActionVideoOptions: {
    alignContent: 'center',
    flex: 1,
    marginTop: 0,
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
    padding: 5,
    position: 'relative',
    width: '48%',
  },
  imageOptionFrame: {
    ...LESSON_MEDIA_FRAME_STYLE,
  },
  singleActionVideoOption: {
    alignSelf: 'center',
    width: '100%',
  },
  optionImage: { ...LESSON_MEDIA_VIEWPORT_STYLE, width: '100%' },
  optionImageFourByFiveFrame: { aspectRatio: 4 / 5, overflow: 'hidden' },
  optionImageThreeByTwoFrame: { aspectRatio: 3 / 2, overflow: 'hidden' },
  optionImageThreeByTwoHelp: { width: '65%' },
  optionImagePortrait: { borderRadius: 17 },
  optionImageTablet: { borderRadius: 14 },
  actionMedia: {
    ...LESSON_MEDIA_VIEWPORT_STYLE,
    alignSelf: 'center',
    position: 'relative',
    width: '100%',
  },
  actionMediaFourByFive: { aspectRatio: 4 / 5 },
  actionMediaThreeByTwo: { aspectRatio: 3 / 2 },
  singleActionMedia: {
    width: '100%',
  },
  actionMediaLayer: {
    bottom: 0,
    height: '100%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    transform: [{ scale: 1.025 }],
    width: '100%',
  },
  actionMediaPressTarget: {
    bottom: 0,
    elevation: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
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
  textOptionDensePortrait: {
    borderBottomWidth: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  textOptionHorizontal: {
    borderBottomWidth: 4,
    paddingHorizontal: 38,
    paddingVertical: 6,
  },
  textOptionCompact: { paddingHorizontal: 0 },
  textOptionSentence: { paddingHorizontal: 12 },
  textOptionLong: { paddingHorizontal: 0 },
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
  optionUnderlineDensePortrait: { height: 4, marginTop: 5, width: 36 },
  optionLabel: {
    color: '#26372f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
  textOptionLabel: {
    alignSelf: 'stretch',
    flexShrink: 1,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 36,
    marginTop: 0,
    maxWidth: '100%',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 1,
    width: '100%',
  },
  pendingOption: { backgroundColor: '#fff6df', borderColor: '#d6a83b' },
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
  feedbackTextTablet: { fontSize: 16, lineHeight: 21 },
  educationHint: { color: '#6f4b24', fontSize: 12, fontWeight: '700', lineHeight: 16, textAlign: 'center' },
  educationHintTablet: { fontSize: 15, lineHeight: 20 },
  correctText: { color: '#287a57' },
  wrongText: { color: '#a34842' },
  pressed: { opacity: 0.72 },
  textOptionPressed: { elevation: 0, transform: [{ scale: 0.97 }, { translateY: 3 }] },
});
