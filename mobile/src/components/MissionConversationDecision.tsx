import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LessonCard, TeachingClock } from '../types';
import { visibleClockCues } from '../teachingClock';
import { CONVERSATION_DECISION_INSTRUCTION } from '../missionConversationDecision';
import { useMissionConversationDecision } from '../hooks/useMissionConversationDecision';
import { lessonMistakeHint } from '../lessonMistakeHints';
import { OptionMediaImage } from './OptionMediaImage';
import { TutorButton } from './TutorButton';
import { useManualSentenceTranslation } from '../hooks/useManualSentenceTranslation';
import { optionTranslationButtonLabel, optionTranslationText, optionTranslationsAvailable } from '../optionTranslations';
import { ui } from '../uiText';
import { useUiLanguage } from '../uiLanguage';

type Props = {
  card: LessonCard;
  imageUrl?: string | null;
  clockCues?: TeachingClock[];
  interactionReady: boolean;
  cueUnavailable: boolean;
  paused: boolean;
  landscapeHeader?: ReactNode;
  onTutor?: () => void;
  onTutorInset?: (height: number) => void;
  onReplay: () => void;
  onSubmit: (ids: string[]) => void;
  onRetry: () => void;
  onResponse: () => Promise<boolean>;
  onAdvance: () => void;
};

export function MissionConversationDecision(props: Props) {
  const lang = useUiLanguage();
  const { card, paused, interactionReady, cueUnavailable, onReplay, onTutor, onTutorInset, landscapeHeader } = props;
  const { state, controller } = useMissionConversationDecision(card, interactionReady, paused, props);
  const { width, height } = useWindowDimensions();
  const landscape = width > height && height < 600;
  const [bodySize, setBodySize] = useState({ width: 0, height: 0 });
  const completion = state.phase === 'completion' ? card.mission_game?.completion_scene : undefined;
  const images = state.options.every(option => Boolean(option.image_url));
  const disabled = paused || !interactionReady || state.phase !== 'choosing';
  const imageWidth = Math.max(48, Math.min(bodySize.width || width - 48, ((bodySize.height || height / 2) - 12) * 1.5 / state.options.length));
  const hint = state.phase === 'wrong' ? lessonMistakeHint(card, state.selectedId) : '';
  const busy = state.phase === 'responding';
  const hasResponse = Boolean(card.answer_audio_text || card.answer_audio_turns?.length);
  const replayDisabled = paused || !['choosing', 'wrong'].includes(state.phase);
  // Traducir (user decision 2026-11-18): written replies show their Spanish for 3 s, on demand only.
  const optionTranslation = useManualSentenceTranslation(card.slide_id);
  const showTranslate = !completion && optionTranslationsAvailable(card);
  const translationsVisible = showTranslate && optionTranslation.visible;
  const mistakeFeedback = hint ? <View accessibilityLiveRegion="polite" style={styles.feedback}>
    <ScrollView style={styles.explanation} contentContainerStyle={styles.explanationContent}>
      <Text style={styles.encouragement}>{ui(lang, 'Cuando te equivocas, también aprendes.')}</Text>
      <Text style={styles.hint}>× {hint}</Text>
    </ScrollView>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" disabled={paused} onPress={() => controller.retry()} style={[styles.retry, styles.retryAction]}><Text style={styles.buttonText}>Reintentar</Text></Pressable>
      {onTutor ? <TutorButton more onPress={onTutor} /> : null}
    </View>
  </View> : null;
  return <View style={[styles.root, landscape ? styles.landscape : null]}>
    <View style={landscape ? styles.rail : undefined}>
      {landscape ? landscapeHeader : null}
      <View onLayout={event => onTutorInset?.(landscape ? 0 : event.nativeEvent.layout.height + 8)} style={styles.instruction}>
        <Text style={styles.direction}>{completion?.context_es || ui(lang, CONVERSATION_DECISION_INSTRUCTION)}</Text>
        {!completion ? <Pressable accessibilityRole="button" accessibilityLabel={ui(lang, 'Repetir la conversación en inglés')}
          disabled={replayDisabled} onPress={onReplay} style={styles.speaker}>
          <Ionicons name="volume-high" color="#247b78" size={28} />
        </Pressable> : null}
      </View>
      {showTranslate ? <Pressable accessibilityRole="button" accessibilityLabel={ui(lang, 'Traducir las opciones al español')}
        accessibilityHint={ui(lang, 'Muestra las opciones en español por unos segundos.')} hitSlop={{ bottom: 8, left: 6, right: 6, top: 8 }}
        onPress={() => optionTranslation.open()}
        style={({ pressed }) => [styles.translate, translationsVisible ? styles.translateActive : null, pressed ? styles.translatePressed : null]}>
        <Ionicons color="#23856f" name="language" size={15} />
        <Text maxFontSizeMultiplier={1.2} style={styles.translateLabel}>{optionTranslationButtonLabel(lang)}</Text>
      </Pressable> : null}
      {cueUnavailable && !completion && !busy ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{ui(lang, 'No se pudo reproducir el audio completo. Toca la bocina para volver a escuchar.')}</Text> : null}
      {busy ? <Text accessibilityLiveRegion="polite" style={styles.status}>{hasResponse ? ui(lang, '✓ Escucha la respuesta…') : ui(lang, '✓ ¡Bien!')}</Text> : null}
    </View>
    <View style={styles.body} onLayout={({ nativeEvent }) => setBodySize(current =>
      current.width === nativeEvent.layout.width && current.height === nativeEvent.layout.height ? current
        : { width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
      {mistakeFeedback || (state.phase === 'response-error' ? <View accessibilityLiveRegion="assertive" style={styles.feedback}>
        <Text style={styles.hint}>{hasResponse ? ui(lang, 'La respuesta no se pudo escuchar completa.') : ui(lang, 'La continuación se interrumpió.')}</Text>
        <Pressable accessibilityRole="button" disabled={paused} onPress={() => controller.retryResponse()} style={styles.retry}><Text style={styles.buttonText}>{hasResponse ? ui(lang, 'Repetir respuesta') : 'Continuar'}</Text></Pressable>
      </View> : completion ? <>
        <View style={styles.hero}><OptionMediaImage imageUrl={completion.image_url} accessibilityLabel={completion.context_es} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={ui(lang, 'Continuar la historia')} disabled={paused}
          onPress={() => controller.continue()} style={styles.retry}><Text style={styles.buttonText}>{ui(lang, 'Continuar →')}</Text></Pressable>
      </> : <>
        {!images && props.imageUrl ? <View style={styles.hero}><OptionMediaImage imageUrl={props.imageUrl}
          clockCues={visibleClockCues(card, props.clockCues, state.phase === 'responding')} accessibilityLabel={ui(lang, 'Escena de la conversación')} /></View> : null}
        {!interactionReady && !cueUnavailable && state.phase === 'choosing' ? <Text accessibilityLiveRegion="polite" style={styles.status}>{ui(lang, 'Escucha…')}</Text> : null}
        <View style={[styles.options, images ? styles.imageOptions : null]}>
          {state.options.map((option, index) => <Pressable key={option.id} accessibilityRole="button"
            accessibilityLabel={option.image_url ? `Imagen ${index + 1}` : option.label || ''}
            accessibilityState={{ disabled, selected: state.selectedId === option.id }} disabled={disabled}
            onPress={() => controller.choose(option.id)} style={[styles.option,
              images ? { width: imageWidth, aspectRatio: 1.5, padding: 3 } : styles.textOption,
              state.selectedId === option.id ? (state.phase === 'wrong' ? styles.wrong : styles.correct) : null]}>
            {option.image_url ? <OptionMediaImage imageUrl={option.image_url} accessibilityLabel={`Imagen ${index + 1}`} />
              : <>
                <Text style={styles.optionText}>{option.label}</Text>
                {optionTranslationText(option, translationsVisible) ? <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.15}
                  style={styles.optionTranslation}>{optionTranslationText(option, translationsVisible)}</Text> : null}
              </>}
          </Pressable>)}
        </View>
      </>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, gap: 8 }, landscape: { flexDirection: 'row', gap: 14 },
  rail: { width: '38%', gap: 6 }, instruction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  direction: { flex: 1, color: '#234541', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  speaker: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: 0, gap: 10 }, hero: { flex: 1, minHeight: 60, overflow: 'hidden', borderRadius: 16 },
  options: { gap: 8, width: '100%' }, imageOptions: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 48, borderWidth: 2, borderColor: '#d5dfd7', backgroundColor: '#fffdf7', borderRadius: 14, overflow: 'hidden' },
  textOption: { paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', width: '100%' },
  optionText: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: '#234541', textAlign: 'center' },
  optionTranslation: { color: '#4d5a60', fontSize: 15, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  translate: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#eef7f4', borderColor: '#9fcfc2', borderRadius: 14,
    borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 28, paddingHorizontal: 12, paddingVertical: 3 },
  translateActive: { backgroundColor: '#d6efe8', borderColor: '#23856f' },
  translatePressed: { opacity: 0.82 },
  translateLabel: { color: '#176b5d', fontSize: 13, fontWeight: '800' },
  correct: { borderColor: '#31946c', backgroundColor: '#e2f6ea' }, wrong: { borderColor: '#c75147', backgroundColor: '#fff1ed' },
  feedback: { flex: 1, minHeight: 0, gap: 6, padding: 8, backgroundColor: '#fff8ef', borderRadius: 12 },
  explanation: { flex: 1, minHeight: 0 }, explanationContent: { gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, retryAction: { flex: 1 },
  encouragement: { color: '#795f43', fontSize: 14, fontWeight: '600' }, hint: { color: '#493e35', fontSize: 15, lineHeight: 20 },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, backgroundColor: '#247b78' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, status: { color: '#27675b', fontSize: 14, textAlign: 'center', padding: 4 },
  error: { color: '#943d33', fontSize: 14, lineHeight: 18 },
});
