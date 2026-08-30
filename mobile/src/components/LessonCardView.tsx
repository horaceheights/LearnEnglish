import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';

import { lessonActionVideo, type LessonActionVideo as LessonActionVideoSource } from '../actionVideos';
import { lessonVideoUrl, type CourseAudioProvider, type CourseAudioVoice } from '../config';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { lessonHelpText } from '../lessonHelp';
import { lessonMistakeHint } from '../lessonMistakeHints';
import type { LessonCard } from '../types';
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

type Props = {
  audioProvider: CourseAudioProvider;
  audioVoice: CourseAudioVoice;
  card: LessonCard;
  level: string;
  lessonId: string;
  isAppActive: boolean;
  isOffline: boolean;
  optionsInteractive?: boolean;
  userId?: string;
  selectedId: string | null;
  result: 'correct' | 'wrong' | null;
  gentleFeedback: boolean;
  showHelp: boolean;
  onSelect: (optionId: string) => void;
  onPronunciationAttempted?: () => void;
  onPronunciationPassed: (firstTry: boolean) => void;
  onPronunciationUnavailable: () => void;
  onGrammarAnimationComplete: () => void;
};

export function LessonCardView({
  audioProvider,
  audioVoice,
  card,
  level,
  lessonId,
  isAppActive,
  isOffline,
  optionsInteractive = true,
  userId,
  selectedId,
  result,
  gentleFeedback,
  showHelp,
  onSelect,
  onPronunciationAttempted,
  onPronunciationPassed,
  onPronunciationUnavailable,
  onGrammarAnimationComplete,
}: Props) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const isPronunciation = card.stage === 'Pronunciation Practice' || card.stage === 'Speak';
  const isGrammar = card.stage === 'Grammar' || card.stage === 'New Grammar' || card.stage === 'Use';
  const isLandscape = viewportWidth > viewportHeight;
  const isCompactLandscape = isLandscape && viewportHeight < 460;
  // Android system bars can reduce a 600dp tablet viewport below 600dp.
  const isTabletLandscape = isLandscape && Math.min(viewportWidth, viewportHeight) >= 540;
  const hasTextOnlyOptions = card.options.length > 0 && card.options.every((option) => !option.image_url);
  // Phrase choices need the full phone width. Stacking them as short horizontal
  // rows keeps each sentence on one line and prevents Android from splitting words.
  const useHorizontalPhraseOptions = !isLandscape && hasTextOnlyOptions;
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
  const mistakeHint = result === 'wrong' ? lessonMistakeHint(card, selectedId) : '';
  const flyingAnswerAnimation = useRef(new Animated.Value(0)).current;
  const [flyingAnswer, setFlyingAnswer] = useState('');
  const [measuredCardHeight, setMeasuredCardHeight] = useState(0);
  const optionWidth =
    useHorizontalPhraseOptions
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
  const optionMinHeight = hasTextOnlyOptions
    ? useHorizontalPhraseOptions
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
    ? needsPortraitImageFeedbackSpace
      ? 76
      : 58
    : 0;
  const availableOptionsHeight = Math.max(0, availableCardHeight - feedbackReservedHeight);
  const textOptionRows = hasTextOnlyOptions
    ? useHorizontalPhraseOptions
      ? card.options.length
      : isLandscape && !useTextGrid
      ? 1
      : Math.ceil(card.options.length / 2)
    : 0;
  const featureReservedHeight = isPronunciation
    ? result
      ? 108
      : isLandscape
        ? 78
        : 132
    : hasTextOnlyOptions
      ? (optionMinHeight * textOptionRows) + (Math.max(0, textOptionRows - 1) * 10) + 30
      : 24;
  const featureImageHeight = Math.min(
    responsiveFeatureImageHeight,
    Math.max(isPronunciation ? 68 : 70, availableCardHeight - featureReservedHeight),
  );
  const promptImageHeight = showHelp ? featureImageHeight * 0.65 : featureImageHeight;
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

  useEffect(() => {
    if (!isGrammar || result !== 'correct' || !selectedId) return undefined;
    const selectedOption = card.options.find((option) => option.id === selectedId);
    if (!selectedOption?.label) {
      onGrammarAnimationComplete();
      return undefined;
    }

    if (reduceMotion) {
      setFlyingAnswer('');
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
    reduceMotion,
    result,
    selectedId,
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
      {showHelp ? (
        <View style={styles.help}>
          <Text accessibilityRole="header" style={styles.helpTitle}>Ayuda</Text>
          <Text accessibilityLiveRegion="polite" style={styles.helpText}>
            {lessonHelpText(card)}
          </Text>
        </View>
      ) : null}
      {card.prompt_image_url ? (
        <LessonMediaFrame
          frameStyle={[
            styles.promptImageFrame,
            useDensePortraitTextLayout ? styles.promptImageFrameDensePortrait : null,
          ]}
          maxHeight={promptImageHeight}
        >
          <OptionMediaImage
            accessibilityLabel={card.answer_audio_text || card.prompt}
            imageUrl={card.prompt_image_url}
          />
        </LessonMediaFrame>
      ) : null}
      {isPronunciation ? (
        <PronunciationPractice
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
          onPassed={onPronunciationPassed}
          onUnavailable={onPronunciationUnavailable}
          phrase={card.audio_text || card.prompt}
          userId={userId}
        />
      ) : (
        <>
          <View style={[
            styles.options,
            isLandscape ? styles.optionsLandscape : null,
            !isLandscape ? styles.optionsPortrait : null,
            useDensePortraitTextLayout ? styles.optionsDensePortrait : null,
            useHorizontalPhraseOptions ? styles.optionsHorizontalPhrases : null,
            isTabletLandscape ? styles.optionsTabletLandscape : null,
            useExpandedSingleActionVideo ? styles.singleActionVideoOptions : null,
            tabletImageGridWidth
              ? { alignSelf: 'center', width: tabletImageGridWidth }
              : null,
          ]}>
            {card.options.map((option, optionIndex) => {
              const selected = selectedId === option.id;
              const correct = option.id === card.correct_option_id;
              const revealCorrect = selected && result === 'correct' && correct;
              const revealWrong = selected && result === 'wrong';
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
                  accessibilityState={{ disabled: !optionsInteractive || result === 'correct', selected }}
                  disabled={!optionsInteractive || result === 'correct'}
                  key={optionRenderKey}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      minHeight: optionMinHeight,
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
                        adjustsFontSizeToFit={useDensePortraitTextLayout || useHorizontalPhraseOptions}
                        maxFontSizeMultiplier={useHorizontalPhraseOptions ? 1.1 : useDensePortraitTextLayout ? 1.15 : undefined}
                        minimumFontScale={useHorizontalPhraseOptions ? 0.55 : useDensePortraitTextLayout ? 0.78 : undefined}
                        numberOfLines={useHorizontalPhraseOptions ? 1 : useDensePortraitTextLayout ? 3 : undefined}
                        style={[
                          styles.optionLabel,
                          styles.textOptionLabel,
                          {
                            color: revealCorrect
                              ? '#287a57'
                              : revealWrong
                                ? '#a34842'
                                : textTheme.accent,
                            fontSize: isTabletLandscape
                              ? Math.max(34, Math.min(42, viewportHeight * 0.055))
                              : useHorizontalPhraseOptions
                                ? Math.max(21, Math.min(28, viewportWidth * 0.068))
                              : useDensePortraitTextLayout
                                ? Math.max(22, Math.min(26, viewportWidth * 0.064))
                              : Math.max(26, Math.min(34, viewportHeight * 0.052)),
                            lineHeight: isTabletLandscape
                              ? Math.max(40, Math.min(49, viewportHeight * 0.064))
                              : useHorizontalPhraseOptions
                                ? Math.max(26, Math.min(34, viewportWidth * 0.082))
                              : useDensePortraitTextLayout
                                ? Math.max(27, Math.min(31, viewportWidth * 0.076))
                              : Math.max(32, Math.min(40, viewportHeight * 0.062)),
                          },
                        ]}
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
          </View>
          {result ? (
            <View
              accessible
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
              style={styles.feedback}
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
  pronunciationCard: { justifyContent: 'flex-start', paddingBottom: 4, paddingTop: 3 },
  pronunciationCardPortrait: { paddingBottom: 6, paddingTop: 3 },
  help: { backgroundColor: '#fff4df', borderRadius: 12, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6 },
  flyingAnswer: { alignItems: 'center', left: 0, position: 'absolute', right: 0, top: -64, zIndex: 20 },
  flyingAnswerText: { backgroundColor: '#f9dc8e', borderColor: '#e0a93f', borderRadius: 10, borderWidth: 2, color: '#8a4f00', fontSize: 22, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 6 },
  helpTitle: { color: '#8a4f00', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  helpText: { color: '#694b22', fontSize: 13, lineHeight: 18, marginTop: 3 },
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
  optionsTabletLandscape: { columnGap: 12, marginTop: 8, rowGap: 10 },
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
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
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
  feedbackTextTablet: { fontSize: 16, lineHeight: 21 },
  educationHint: { color: '#6f4b24', fontSize: 12, fontWeight: '700', lineHeight: 16, textAlign: 'center' },
  educationHintTablet: { fontSize: 15, lineHeight: 20 },
  correctText: { color: '#287a57' },
  wrongText: { color: '#a34842' },
  pressed: { opacity: 0.72 },
  textOptionPressed: { elevation: 0, transform: [{ scale: 0.97 }, { translateY: 3 }] },
});
