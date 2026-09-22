import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MissionAnswerSegment } from '../missionVoiceAnswer';
import { OptionMediaImage } from './OptionMediaImage';

export type MissionVoiceStage =
  | 'asking' | 'ready' | 'listening' | 'checking' | 'passed' | 'retry' | 'coached' | 'waiting';

const STAGE_LABELS: Record<Exclude<MissionVoiceStage, 'passed'>, string> = {
  asking: 'ESCUCHA LA PREGUNTA',
  ready: 'SE ABRE EL MICRÓFONO',
  listening: 'TE ESCUCHAMOS',
  checking: 'REVISANDO TU VOZ',
  retry: 'INTÉNTALO OTRA VEZ',
  coached: 'SIGUE PRACTICANDO',
  waiting: 'RESPONDE EN VOZ ALTA',
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const STAGE_ICONS: Record<MissionVoiceStage, IconName> = {
  asking: 'volume-high',
  ready: 'mic',
  listening: 'mic',
  checking: 'sparkles',
  passed: 'checkmark',
  retry: 'refresh',
  coached: 'arrow-forward',
  waiting: 'mic',
};

const BADGE_STYLES: Record<MissionVoiceStage,
  'badgeAsking' | 'badgeMic' | 'badgeChecking' | 'badgePassed' | 'badgeRetry' | 'badgeWaiting'> = {
  asking: 'badgeAsking',
  ready: 'badgeMic',
  listening: 'badgeMic',
  checking: 'badgeChecking',
  passed: 'badgePassed',
  retry: 'badgeRetry',
  coached: 'badgeRetry',
  waiting: 'badgeWaiting',
};

const SEGMENT_STYLES: Record<MissionAnswerSegment['state'],
  'answerPending' | 'answerHeard' | 'answerGood' | 'answerWeak' | null> = {
  plain: null,
  pending: 'answerPending',
  heard: 'answerHeard',
  good: 'answerGood',
  weak: 'answerWeak',
};

// Recording, grading, sound cues and animation clocks stay in the shared
// pronunciation engine. This panel lays out the lesson Speak signals inside the
// mission frame: the voice-level signal, the listening and grading mascot, the
// answer sentence whose syllables turn green as they are recognized, and the
// same spring celebration once the answer passes.
export function MissionVoicePresentation({
  imageUrl, stage, answer, message, attemptLabel = null, signal, mascot, celebrate, successScale,
  reduceMotion, replayDisabled, permissionNeeded, unavailable, offline, onReplay, onContinue,
  successLabel = 'ENTRADA ACTIVADA',
}: {
  imageUrl: string; stage: MissionVoiceStage; answer: MissionAnswerSegment[] | null; message: string;
  attemptLabel?: string | null; signal: ReactNode; mascot: ReactNode | null; celebrate: boolean;
  successScale: Animated.Value; reduceMotion: boolean; replayDisabled: boolean; permissionNeeded: boolean;
  unavailable: boolean; offline: boolean; onReplay: () => void; onContinue: () => void;
  successLabel?: string;
}) {
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const micPop = useRef(new Animated.Value(1)).current;
  const imageWidth = Math.max(0, Math.min(slot.width - 4, (slot.height - 4) * 1.5));
  const accepted = stage === 'passed';

  // The shared ready cue announces that the microphone is opening; the badge
  // pops at the same moment so the change is visible as well as audible.
  useEffect(() => {
    micPop.stopAnimation();
    if (stage !== 'ready' || reduceMotion) {
      micPop.setValue(1);
      return undefined;
    }
    micPop.setValue(0.55);
    const pop = Animated.spring(micPop, { friction: 4, tension: 170, toValue: 1, useNativeDriver: true });
    pop.start();
    return () => pop.stop();
  }, [micPop, reduceMotion, stage]);

  const label = accepted ? successLabel : STAGE_LABELS[stage];
  // Denied microphone access turns the replay control into the way back to recording.
  const replayText = unavailable ? 'Reintentar' : permissionNeeded ? 'Activar micrófono' : 'Repetir pregunta';
  const badgeScale = stage === 'ready' ? micPop : accepted ? successScale : 1;
  // The level bars belong to the live microphone, so they appear only while it
  // opens, listens and grades; the settled states keep the full width for copy.
  const liveSignal = stage === 'ready' || stage === 'listening' || stage === 'checking';
  return (
    <View style={styles.surface}>
      <View style={styles.sceneSlot} onLayout={({ nativeEvent: { layout } }) =>
        setSlot(current => current.width === layout.width && current.height === layout.height
          ? current : { width: layout.width, height: layout.height })}>
        {imageWidth > 0 ? <View style={[styles.scene, accepted ? styles.sceneAccepted : null,
          { width: imageWidth + 4, height: imageWidth / 1.5 + 4 }]}>
          <OptionMediaImage accessibilityLabel={stage === 'asking' ? 'Escucha la pregunta.' : 'Mira la escena y responde.'}
            imageUrl={imageUrl} />
          {accepted ? (
            <Animated.View pointerEvents="none" style={[styles.successBadge, { transform: [{ scale: successScale }] }]}>
              <Ionicons color="#fff" name="checkmark-circle" size={20} />
              <Text numberOfLines={1} style={styles.successBadgeText}>{successLabel}</Text>
            </Animated.View>
          ) : null}
        </View> : null}
      </View>
      <View style={[styles.console, accepted ? styles.consoleAccepted : null]}>
        <View style={styles.statusRow}>
          {mascot ? <View style={styles.badgeMascot}>{mascot}</View> : (
            <Animated.View style={[styles.badge, styles[BADGE_STYLES[stage]], { transform: [{ scale: badgeScale }] }]}>
              <Ionicons color="#fff" name={STAGE_ICONS[stage]} size={24} />
            </Animated.View>
          )}
          <View style={styles.statusCopy}>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.label}>
              {label}{attemptLabel && !accepted ? ` · ${attemptLabel}` : ''}
            </Text>
            <Animated.Text accessibilityLiveRegion="polite" adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}
              style={[styles.message, celebrate ? styles.messageCelebrate : null,
                celebrate ? { transform: [{ scale: successScale }] } : null]}>
              {celebrate ? `✨ ${message} ✨` : message}
            </Animated.Text>
          </View>
          {liveSignal ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{signal}</View> : null}
        </View>
        {answer && !unavailable ? <Text accessibilityLiveRegion="polite" adjustsFontSizeToFit minimumFontScale={0.65}
          numberOfLines={2} style={styles.answer}>
          {answer.map((segment, index) => (
            <Text key={`${index}-${segment.text}`} style={segmentStyle(segment.state)}>{segment.text}</Text>
          ))}
        </Text> : null}
        {!accepted ? <View style={styles.actions}>
          <Pressable accessibilityRole="button"
            accessibilityLabel={replayText === 'Repetir pregunta' ? 'Repetir la pregunta' : replayText}
            disabled={replayDisabled || (unavailable && offline)} onPress={onReplay}
            style={[styles.replay, replayDisabled ? styles.disabled : null]}>
            <Ionicons name={permissionNeeded && !unavailable ? 'mic' : 'volume-high'} size={20} color="#fff" />
            <Text style={styles.replayText}>{replayText}</Text>
          </Pressable>
          {unavailable ? <Pressable accessibilityRole="button" onPress={onContinue} style={styles.replay}>
            <Text style={styles.replayText}>Continuar sin calificar</Text>
          </Pressable> : null}
        </View> : null}
      </View>
    </View>
  );
}

function segmentStyle(state: MissionAnswerSegment['state']) {
  const key = SEGMENT_STYLES[state];
  return key ? styles[key] : null;
}

const styles = StyleSheet.create({
  surface: { flex: 1, minWidth: 0, minHeight: 0, gap: 6 },
  sceneSlot: { flex: 1, minHeight: 0, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  scene: { borderRadius: 18, overflow: 'hidden', borderColor: '#edc976', borderWidth: 2 },
  sceneAccepted: { borderColor: '#61d4a7' },
  successBadge: { position: 'absolute', left: 8, bottom: 8, maxWidth: '90%', flexDirection: 'row', alignItems: 'center',
    gap: 6, backgroundColor: 'rgba(28,111,78,0.94)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  successBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, flexShrink: 1 },
  console: { alignSelf: 'stretch', backgroundColor: '#fff8e8', borderRadius: 15, padding: 8, gap: 4, flexShrink: 0 },
  consoleAccepted: { backgroundColor: '#dff5e8' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0, minHeight: 48 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  badgeAsking: { backgroundColor: '#d8923a' },
  badgeMic: { backgroundColor: '#d65353' },
  badgeChecking: { backgroundColor: '#7760ad' },
  badgePassed: { backgroundColor: '#30936c' },
  badgeRetry: { backgroundColor: '#c07a2c' },
  badgeWaiting: { backgroundColor: '#8a7f6a' },
  badgeMascot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, minWidth: 0, gap: 1 },
  label: { color: '#28624e', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  message: { color: '#35574a', fontSize: 13, lineHeight: 17 },
  messageCelebrate: { color: '#17623f', fontWeight: '900' },
  answer: { alignSelf: 'stretch', color: '#214c45', fontSize: 22, lineHeight: 27, fontWeight: '900', textAlign: 'center' },
  answerPending: { color: '#7b8b85' },
  answerHeard: { color: '#17623f', backgroundColor: '#c9eed8' },
  answerGood: { color: '#17623f', backgroundColor: '#dff4e7' },
  answerWeak: { color: '#8a5b10', backgroundColor: '#fff2cf' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  replay: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, minHeight: 48,
    flexGrow: 1, paddingHorizontal: 8, backgroundColor: '#286c57', borderRadius: 12 },
  replayText: { color: '#fff', fontWeight: '800', fontSize: 13, flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
