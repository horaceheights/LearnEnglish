import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { practiceContext, practiceProgress, practiceUnitLabel, PRACTICE_START, type PracticeMode } from '../lessonPractice';
import { useLessonTutor } from '../hooks/useLessonTutor';
import { askPractice, speakPractice, transcribePractice } from '../tutorApi';
import type { LessonSummary } from '../types';
import { LessonTutorSheet } from './LessonTutorSheet';
type Props = { lesson: LessonSummary; scope: string; active: boolean; disabled: boolean; onOpen?: () => void };
function Session({ lesson, scope, active, disabled, onOpen, mode }: Props & { mode: PracticeMode }) {
  const context = useMemo(() => practiceContext(lesson, mode), [lesson, mode]);
  const tutor = useLessonTutor(scope + ':' + mode, context, askPractice, PRACTICE_START);
  const progress = practiceProgress(tutor.messages, mode, tutor.busy, tutor.error);
  return <><Pressable accessibilityRole="button" disabled={disabled} onPress={() => { onOpen?.(); tutor.open(); }} style={[styles.start, disabled && styles.disabled]}>
    <Text style={styles.startText}>{progress.complete ? 'Ver mi feedback' : tutor.messages.length ? 'Continuar con Liam' : 'Empezar a practicar'}</Text>
  </Pressable><LessonTutorSheet tutor={tutor} context={context} title={practiceUnitLabel(lesson)} answer="" active={active}
    practice={{ ...progress, speak: speakPractice, transcribe: transcribePractice }} /></>;
}
export function LessonPracticeEntry(props: Props) {
  const [mode, setMode] = useState<PracticeMode>('extended');
  return <View style={styles.card}>
    <Text style={styles.badge}>PRUEBA · OPCIONAL</Text><Text accessibilityRole="header" style={styles.heading}>Repasa la {practiceUnitLabel(props.lesson)} con Liam</Text>
    <Text style={styles.copy}>Conversa sobre lo aprendido en la unidad. Liam te guía y termina con feedback. Ideal al terminar las lecciones; no cambia tu progreso.</Text>
    <View style={styles.modes}>{(['short', 'extended'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }}
      onPress={() => setMode(value)} style={[styles.mode, mode === value && styles.selected]}>
      <Text style={styles.modeText}>{value === 'short' ? 'Corto · 3 respuestas' : 'Ampliado · 6 respuestas'}</Text>
    </Pressable>)}</View>
    <Session key={mode} {...props} mode={mode} />
    <Text style={styles.note}>Necesitas iniciar sesión e internet. Ambas opciones son de prueba, sin compra.</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { width: '100%', marginVertical: 12, padding: 16, backgroundColor: '#eaf4ef', borderWidth: 1, borderColor: '#b2d2c4', borderRadius: 20 },
  badge: { color: '#277466', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heading: { color: '#245f53', fontSize: 22, fontWeight: '800', marginVertical: 5 },
  copy: { color: '#4e685e', fontSize: 14, lineHeight: 21, marginBottom: 10 },
  modes: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  mode: { flex: 1, minHeight: 48, padding: 8, borderWidth: 1, borderColor: '#abc7b8', borderRadius: 12, backgroundColor: 'white', justifyContent: 'center' },
  selected: { backgroundColor: '#d2e8dd', borderColor: '#277466' },
  modeText: { color: '#245f53', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  start: { minHeight: 50, marginTop: 12, borderRadius: 14, backgroundColor: '#27796b', alignItems: 'center', justifyContent: 'center', padding: 10 },
  startText: { color: 'white', fontSize: 16, fontWeight: '800' }, disabled: { opacity: .45 },
  note: { color: '#5a7069', fontSize: 11, marginTop: 9 },
});
