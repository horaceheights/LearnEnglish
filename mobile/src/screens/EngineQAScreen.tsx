import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLesson, getLessons } from '../api';
import { setDiagnosticContext } from '../diagnostics';
import type { Lesson, LessonSummary } from '../types';

type Props = {
  onExit: () => void;
  onOpenCard: (lessonId: string, cardIndex: number) => void;
};

export function EngineQAScreen({ onExit, onOpenCard }: Props) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDiagnosticContext({ qaMode: true });
    getLessons()
      .then(setLessons)
      .catch(() => setError('No se pudo cargar la lista de lecciones.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });

    return () => subscription.remove();
  }, [onExit]);

  const stages = useMemo(
    () => [...new Set(selectedLesson?.cards.map((card) => card.stage) || [])],
    [selectedLesson],
  );
  const visibleCards = useMemo(
    () =>
      selectedLesson?.cards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => !selectedStage || card.stage === selectedStage) || [],
    [selectedLesson, selectedStage],
  );

  const chooseLesson = async (lessonId: string) => {
    setLoadingLessonId(lessonId);
    setError('');
    try {
      const lesson = await getLesson(lessonId);
      setSelectedLesson(lesson);
      setSelectedStage(lesson.cards[0]?.stage || '');
    } catch {
      setError('No se pudo cargar esa lección.');
    } finally {
      setLoadingLessonId('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>INTERNAL TESTING</Text>
            <Text accessibilityRole="header" style={styles.title}>Engine QA</Text>
            <Text style={styles.subtitle}>Abre cualquier tarjeta sin modificar el progreso del alumno.</Text>
          </View>
          <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" onPress={onExit} style={styles.exitButton}>
            <Text style={styles.exitText}>← Inicio</Text>
          </Pressable>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Flujo recomendado</Text>
          <Text style={styles.instructionsText}>
            Selecciona una lección, filtra por etapa y abre una tarjeta. Dentro de la lección usa Anterior,
            Reiniciar, Siguiente y Auto para probar cada transición.
          </Text>
        </View>

        {isLoading ? <ActivityIndicator color="#6e4aad" size="large" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>1. Lección</Text>
        <View style={styles.lessonList}>
          {lessons.map((lesson) => {
            const selected = selectedLesson?.id === lesson.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={lesson.id}
                onPress={() => void chooseLesson(lesson.id)}
                style={[styles.lessonButton, selected ? styles.lessonButtonSelected : null]}
              >
                <Text style={[styles.lessonButtonText, selected ? styles.lessonButtonTextSelected : null]}>
                  {loadingLessonId === lesson.id ? 'Cargando…' : `${lesson.sub_lesson_id || ''} ${lesson.sub_lesson_title || lesson.title}`.trim()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedLesson ? (
          <>
            <Text style={styles.sectionTitle}>2. Etapa</Text>
            <ScrollView
              contentContainerStyle={styles.stageList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {stages.map((stage) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedStage === stage }}
                  key={stage}
                  onPress={() => setSelectedStage(stage)}
                  style={[styles.stageButton, selectedStage === stage ? styles.stageButtonSelected : null]}
                >
                  <Text style={[styles.stageText, selectedStage === stage ? styles.stageTextSelected : null]}>
                    {stage}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.cardHeading}>
              <Text style={styles.sectionTitle}>3. Tarjeta</Text>
              <Text style={styles.cardCount}>{visibleCards.length} en esta etapa</Text>
            </View>
            <View style={styles.cardList}>
              {visibleCards.map(({ card, index }) => (
                <Pressable
                  accessibilityRole="button"
                  key={`${index}-${card.prompt}`}
                  onPress={() => onOpenCard(selectedLesson.id, index)}
                  style={styles.cardButton}
                >
                  <Text style={styles.cardNumber}>#{index + 1}</Text>
                  <View style={styles.cardText}>
                    <Text numberOfLines={2} style={styles.cardPrompt}>{card.prompt}</Text>
                    <Text style={styles.cardMeta}>
                      {card.options.length} opción{card.options.length === 1 ? '' : 'es'} · {card.stage}
                    </Text>
                  </View>
                  <Text style={styles.openArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f7f2fb', flex: 1 },
  page: { gap: 14, padding: 16, paddingBottom: 40 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#76559e', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#2b2433', fontSize: 32, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#675f6f', fontSize: 13, lineHeight: 18, marginTop: 4, maxWidth: 260 },
  exitButton: { backgroundColor: '#fff', borderColor: '#cdbbdd', borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 13 },
  exitText: { color: '#533278', fontSize: 13, fontWeight: '900' },
  instructions: { backgroundColor: '#eee3f7', borderRadius: 18, padding: 15 },
  instructionsTitle: { color: '#3f2859', fontSize: 14, fontWeight: '900' },
  instructionsText: { color: '#675176', fontSize: 12, lineHeight: 18, marginTop: 4 },
  error: { backgroundColor: '#fbeceb', borderRadius: 12, color: '#a34842', padding: 12, textAlign: 'center' },
  sectionTitle: { color: '#2b2433', fontSize: 17, fontWeight: '900' },
  lessonList: { gap: 8 },
  lessonButton: { backgroundColor: '#fff', borderColor: '#ded3e7', borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 48, padding: 13 },
  lessonButtonSelected: { backgroundColor: '#67418c', borderColor: '#67418c' },
  lessonButtonText: { color: '#3f3944', fontSize: 14, fontWeight: '800' },
  lessonButtonTextSelected: { color: '#fff' },
  stageList: { gap: 8, paddingRight: 16 },
  stageButton: { backgroundColor: '#fff', borderColor: '#d8cbe3', borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 13 },
  stageButtonSelected: { backgroundColor: '#e1caef', borderColor: '#9b71b8' },
  stageText: { color: '#5f5765', fontSize: 12, fontWeight: '800' },
  stageTextSelected: { color: '#4f2769' },
  cardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardCount: { color: '#766f7b', fontSize: 11, fontWeight: '700' },
  cardList: { gap: 8 },
  cardButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#ded3e7', borderRadius: 15, borderWidth: 1, flexDirection: 'row', minHeight: 56, padding: 11 },
  cardNumber: { color: '#76559e', fontSize: 13, fontWeight: '900', minWidth: 40 },
  cardText: { flex: 1 },
  cardPrompt: { color: '#2f2934', fontSize: 14, fontWeight: '800' },
  cardMeta: { color: '#7a717f', fontSize: 10, marginTop: 3 },
  openArrow: { color: '#76559e', fontSize: 25, fontWeight: '700', marginLeft: 8 },
});
