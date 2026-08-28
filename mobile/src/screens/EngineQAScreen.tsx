import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLesson, getLessons } from '../api';
import {
  captureDiagnosticError,
  isCrashReportingConfigured,
  setDiagnosticContext,
} from '../diagnostics';
import { mergePreviewLessonSummaries } from '../previewLessons';
import type { Lesson, LessonSummary } from '../types';

type Props = {
  onExit: () => void;
  onOpenCard: (lessonId: string, cardIndex: number) => void;
};

type QaLocation = {
  lessonId: string;
  cardIndex: number;
};

type VisibleCard = {
  card: Lesson['cards'][number];
  index: number;
  stagePosition: number;
};

const QA_LOCATION_STORAGE_KEY = 'qa:last-location';
const CARD_ROW_HEIGHT = 76;
const CARD_ROW_GAP = 8;

function unitIdFor(lesson?: LessonSummary | Lesson | null): string {
  if (lesson?.unit_id) return lesson.unit_id;
  const number = lesson?.sub_lesson_id?.match(/^\d+/)?.[0] || '1';
  return `unit-${number}`;
}

function unitNumber(lesson?: LessonSummary | Lesson | null): string {
  return unitIdFor(lesson).match(/\d+/)?.[0] || '1';
}

function unitName(lesson?: LessonSummary | Lesson | null): string {
  return (lesson?.unit_title || `Unit ${unitNumber(lesson)}`).replace(/^Unit\s+\d+\s*:\s*/i, '');
}

function lessonNumber(lesson: LessonSummary): string {
  return lesson.sub_lesson_id || lesson.lesson_id || lesson.id;
}

function lessonName(lesson?: LessonSummary | Lesson | null): string {
  return lesson?.sub_lesson_title || lesson?.lesson_title || lesson?.title || '';
}

function validStoredLocation(value: string | null): QaLocation | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<QaLocation>;
    if (typeof parsed.lessonId !== 'string' || !Number.isInteger(parsed.cardIndex)) return null;
    return { cardIndex: Math.max(0, parsed.cardIndex || 0), lessonId: parsed.lessonId };
  } catch {
    return null;
  }
}

function saveQaLocation(location: QaLocation) {
  return AsyncStorage.setItem(QA_LOCATION_STORAGE_KEY, JSON.stringify(location));
}

export function EngineQAScreen({ onExit, onOpenCard }: Props) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [lastOpenedCardIndex, setLastOpenedCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [error, setError] = useState('');
  const lessonRequestIdRef = useRef(0);
  const cardListRef = useRef<FlatList<VisibleCard>>(null);
  const crashReportingConfigured = isCrashReportingConfigured();

  const chooseLesson = useCallback(async (lessonId: string, preferredCardIndex = 0) => {
    const requestId = lessonRequestIdRef.current + 1;
    lessonRequestIdRef.current = requestId;
    setLoadingLessonId(lessonId);
    setSelectedLesson(null);
    setError('');
    try {
      const lesson = await getLesson(lessonId);
      if (lessonRequestIdRef.current !== requestId) return;

      const cardIndex = Math.min(Math.max(0, preferredCardIndex), Math.max(0, lesson.cards.length - 1));
      const stage = lesson.cards[cardIndex]?.stage || lesson.cards[0]?.stage || '';
      setSelectedUnitId(unitIdFor(lesson));
      setSelectedLesson(lesson);
      setSelectedStage(stage);
      setLastOpenedCardIndex(cardIndex);
      void saveQaLocation({ cardIndex, lessonId }).catch(() => undefined);
    } catch (loadError) {
      if (lessonRequestIdRef.current !== requestId) return;
      captureDiagnosticError(loadError, 'qa_load_lesson', { lesson_id: lessonId });
      setError('No se pudo cargar esa lección.');
    } finally {
      if (lessonRequestIdRef.current === requestId) setLoadingLessonId('');
    }
  }, []);

  useEffect(() => {
    let active = true;
    setDiagnosticContext({ qaMode: true });

    const load = async () => {
      setIsLoading(true);
      try {
        const [backendLessons, storedValue] = await Promise.all([
          getLessons(),
          AsyncStorage.getItem(QA_LOCATION_STORAGE_KEY).catch(() => null),
        ]);
        if (!active) return;

        const nextLessons = mergePreviewLessonSummaries(backendLessons);
        setLessons(nextLessons);
        const storedLocation = validStoredLocation(storedValue);
        const targetLesson = nextLessons.find((lesson) => lesson.id === storedLocation?.lessonId)
          || nextLessons[0];
        if (!targetLesson) {
          setError('No hay lecciones disponibles para QA.');
          return;
        }

        setSelectedUnitId(unitIdFor(targetLesson));
        await chooseLesson(
          targetLesson.id,
          storedLocation?.lessonId === targetLesson.id ? storedLocation.cardIndex : 0,
        );
      } catch (loadError) {
        if (!active) return;
        captureDiagnosticError(loadError, 'qa_load_lessons');
        setError('No se pudo cargar la lista de lecciones.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      lessonRequestIdRef.current += 1;
    };
  }, [chooseLesson]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExit();
      return true;
    });

    return () => subscription.remove();
  }, [onExit]);

  const unitGroups = useMemo(() => {
    const grouped = new Map<string, LessonSummary[]>();
    for (const lesson of lessons) {
      const unitId = unitIdFor(lesson);
      grouped.set(unitId, [...(grouped.get(unitId) || []), lesson]);
    }
    return [...grouped.entries()].map(([id, unitLessons]) => ({ id, lessons: unitLessons }));
  }, [lessons]);
  const selectedUnitLessons = useMemo(
    () => unitGroups.find((unit) => unit.id === selectedUnitId)?.lessons || [],
    [selectedUnitId, unitGroups],
  );
  const activeLessonId = loadingLessonId || selectedLesson?.id || '';
  const selectedLessonSummary = lessons.find((lesson) => lesson.id === activeLessonId) || null;
  const stages = useMemo(
    () => [...new Set(selectedLesson?.cards.map((card) => card.stage) || [])],
    [selectedLesson],
  );
  const visibleCards = useMemo<VisibleCard[]>(
    () => (selectedLesson?.cards || [])
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.stage === selectedStage)
      .map(({ card, index }, stagePosition) => ({ card, index, stagePosition })),
    [selectedLesson, selectedStage],
  );
  const selectedCardPosition = visibleCards.findIndex(({ index }) => index === lastOpenedCardIndex);

  useEffect(() => {
    if (selectedCardPosition <= 0 || !visibleCards.length) return undefined;
    const timer = setTimeout(() => {
      cardListRef.current?.scrollToIndex({
        animated: false,
        index: selectedCardPosition,
        viewPosition: 0.2,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [selectedCardPosition, selectedLesson?.id, selectedStage, visibleCards.length]);

  const chooseUnit = (unitId: string) => {
    const firstLesson = unitGroups.find((unit) => unit.id === unitId)?.lessons[0];
    setSelectedUnitId(unitId);
    if (firstLesson) void chooseLesson(firstLesson.id);
  };

  const chooseStage = (stage: string) => {
    if (!selectedLesson) return;
    const firstCardIndex = selectedLesson.cards.findIndex((card) => card.stage === stage);
    if (firstCardIndex < 0) return;
    setSelectedStage(stage);
    setLastOpenedCardIndex(firstCardIndex);
    void saveQaLocation({ cardIndex: firstCardIndex, lessonId: selectedLesson.id }).catch(() => undefined);
  };

  const openCard = (cardIndex: number) => {
    if (!selectedLesson) return;
    setLastOpenedCardIndex(cardIndex);
    void saveQaLocation({ cardIndex, lessonId: selectedLesson.id }).catch(() => undefined);
    onOpenCard(selectedLesson.id, cardIndex);
  };

  const navigator = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>INTERNAL TESTING</Text>
          <Text accessibilityRole="header" style={styles.title}>Engine QA</Text>
          <Text style={styles.subtitle}>Ve directo a cualquier ubicación del curso.</Text>
        </View>
        <Pressable
          accessibilityLabel="Volver al inicio"
          accessibilityRole="button"
          onPress={onExit}
          style={styles.exitButton}
        >
          <Text style={styles.exitText}>← Inicio</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: toolsExpanded }}
        onPress={() => setToolsExpanded((expanded) => !expanded)}
        style={styles.toolsToggle}
      >
        <View style={styles.toolsCopy}>
          <Text style={styles.toolsTitle}>Herramientas QA</Text>
          <Text style={styles.toolsStatus}>
            Reportes {crashReportingConfigured ? 'activos' : 'pendientes'} · instrucciones y prueba Sentry
          </Text>
        </View>
        <Text style={styles.toolsArrow}>{toolsExpanded ? '−' : '+'}</Text>
      </Pressable>

      {toolsExpanded ? (
        <View style={styles.toolsPanel}>
          <Text style={styles.instructionsTitle}>Flujo recomendado</Text>
          <Text style={styles.instructionsText}>
            Elige unidad, lección, etapa y tarjeta. Dentro de la lección usa Anterior, Reiniciar,
            Siguiente y Auto para probar cada transición.
          </Text>
          <View style={styles.reportingPanel}>
            <View style={styles.reportingCopy}>
              <Text style={styles.reportingTitle}>Reportes de errores</Text>
              <Text style={styles.reportingStatus}>
                {crashReportingConfigured ? 'Activo · Sentry conectado' : 'Pendiente · falta conectar Sentry'}
              </Text>
            </View>
            <Pressable
              accessibilityHint="Envía un error de prueba sin cerrar la aplicación"
              accessibilityLabel="Probar reporte de errores"
              accessibilityRole="button"
              disabled={!crashReportingConfigured}
              onPress={() => {
                captureDiagnosticError(new Error('SpanGlish QA diagnostic test'), 'qa_sentry_test');
                Alert.alert('Reporte enviado', 'Busca “SpanGlish QA diagnostic test” en Sentry.');
              }}
              style={[
                styles.reportingButton,
                !crashReportingConfigured ? styles.reportingButtonDisabled : null,
              ]}
            >
              <Text style={styles.reportingButtonText}>Enviar prueba</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.navigatorPanel}>
        <View style={styles.navigatorHeading}>
          <Text style={styles.stepLabel}>1 · UNIDAD</Text>
          <Text style={styles.navigatorCount}>{unitGroups.length} unidades</Text>
        </View>
        <View style={styles.unitList}>
          {unitGroups.map((unit) => {
            const selected = selectedUnitId === unit.id;
            const firstLesson = unit.lessons[0];
            return (
              <Pressable
                accessibilityLabel={`Unidad ${unitNumber(firstLesson)}. ${unitName(firstLesson)}. ${unit.lessons.length} lecciones.`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={unit.id}
                onPress={() => chooseUnit(unit.id)}
                style={[styles.unitButton, selected ? styles.unitButtonSelected : null]}
              >
                <Text style={[styles.unitButtonText, selected ? styles.unitButtonTextSelected : null]}>
                  {unitNumber(firstLesson)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.navigatorHeading}>
          <Text style={styles.stepLabel}>2 · LECCIÓN</Text>
          <Text style={styles.navigatorCount}>{selectedUnitLessons.length} lecciones</Text>
        </View>
        <View style={styles.lessonGrid}>
          {selectedUnitLessons.map((lesson) => {
            const selected = activeLessonId === lesson.id;
            return (
              <Pressable
                accessibilityLabel={`${lessonNumber(lesson)}. ${lessonName(lesson)}`}
                accessibilityRole="button"
                accessibilityState={{ busy: loadingLessonId === lesson.id, selected }}
                disabled={Boolean(loadingLessonId)}
                key={lesson.id}
                onPress={() => void chooseLesson(lesson.id)}
                style={[
                  styles.lessonButton,
                  selected ? styles.lessonButtonSelected : null,
                  loadingLessonId && !selected ? styles.lessonButtonDisabled : null,
                ]}
              >
                {loadingLessonId === lesson.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.lessonButtonText, selected ? styles.lessonButtonTextSelected : null]}>
                    {lessonNumber(lesson)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {selectedLessonSummary ? (
          <View style={styles.selectedLessonBanner}>
            <View style={styles.selectedLessonCopy}>
              <Text style={styles.selectedLessonEyebrow}>
                UNIT {unitNumber(selectedLessonSummary)} · LESSON {lessonNumber(selectedLessonSummary)}
              </Text>
              <Text numberOfLines={2} style={styles.selectedLessonTitle}>{lessonName(selectedLessonSummary)}</Text>
            </View>
            <Text style={styles.selectedLessonCount}>
              {selectedLesson?.cards.length || '…'} tarjetas
            </Text>
          </View>
        ) : null}

        <View style={styles.navigatorHeading}>
          <Text style={styles.stepLabel}>3 · ETAPA</Text>
          <Text style={styles.navigatorCount}>{stages.length} etapas</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.stageList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {stages.map((stage) => {
            const selected = selectedStage === stage;
            const count = selectedLesson?.cards.filter((card) => card.stage === stage).length || 0;
            return (
              <Pressable
                accessibilityLabel={`${stage}. ${count} tarjetas.`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={stage}
                onPress={() => chooseStage(stage)}
                style={[styles.stageButton, selected ? styles.stageButtonSelected : null]}
              >
                <Text style={[styles.stageText, selected ? styles.stageTextSelected : null]}>
                  {stage} <Text style={styles.stageCount}>{count}</Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.cardHeading}>
        <Text style={styles.sectionTitle}>4 · TARJETA</Text>
        <Text style={styles.cardCount}>{visibleCards.length} en {selectedStage || 'esta etapa'}</Text>
      </View>
      {isLoading ? <ActivityIndicator color="#6e4aad" size="large" style={styles.loading} /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageFrame}>
        <FlatList
          ListEmptyComponent={
            !isLoading && selectedLesson && selectedStage
              ? <Text style={styles.empty}>No hay tarjetas en esta etapa.</Text>
              : null
          }
          ListHeaderComponent={navigator}
          contentContainerStyle={styles.page}
          data={visibleCards}
          getItemLayout={(_, index) => ({
            index,
            length: CARD_ROW_HEIGHT + CARD_ROW_GAP,
            offset: (CARD_ROW_HEIGHT + CARD_ROW_GAP) * index,
          })}
          ItemSeparatorComponent={() => <View style={styles.cardGap} />}
          keyExtractor={({ card, index }) => `${index}-${card.slide_id || card.prompt}`}
          ref={cardListRef}
          renderItem={({ item }) => {
            const selected = item.index === lastOpenedCardIndex;
            const interaction = (item.card.interaction_type || 'choice').replaceAll('_', ' ');
            return (
              <Pressable
                accessibilityLabel={`Abrir tarjeta ${item.index + 1}. ${item.card.prompt}. ${item.card.stage} ${item.stagePosition + 1} de ${visibleCards.length}.`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => openCard(item.index)}
                style={[styles.cardButton, selected ? styles.cardButtonSelected : null]}
              >
                <View style={[styles.cardNumber, selected ? styles.cardNumberSelected : null]}>
                  <Text style={[styles.cardNumberText, selected ? styles.cardNumberTextSelected : null]}>
                    #{item.index + 1}
                  </Text>
                </View>
                <View style={styles.cardText}>
                  <Text numberOfLines={2} style={styles.cardPrompt}>{item.card.prompt}</Text>
                  <Text numberOfLines={1} style={styles.cardMeta}>
                    {item.card.stage} {item.stagePosition + 1}/{visibleCards.length} · {interaction} · {item.card.options.length} opción{item.card.options.length === 1 ? '' : 'es'}
                  </Text>
                </View>
                <Text style={styles.openArrow}>›</Text>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f7f2fb', flex: 1 },
  pageFrame: { alignSelf: 'center', flex: 1, maxWidth: 760, width: '100%' },
  page: { padding: 14, paddingBottom: 40 },
  listHeader: { gap: 11, marginBottom: 9 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#76559e', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#2b2433', fontSize: 28, fontWeight: '900', marginTop: 1 },
  subtitle: { color: '#675f6f', fontSize: 12, lineHeight: 17, marginTop: 2 },
  exitButton: { backgroundColor: '#fff', borderColor: '#cdbbdd', borderRadius: 13, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  exitText: { color: '#533278', fontSize: 12, fontWeight: '900' },
  toolsToggle: { alignItems: 'center', backgroundColor: '#eee3f7', borderRadius: 14, flexDirection: 'row', minHeight: 48, paddingHorizontal: 13, paddingVertical: 8 },
  toolsCopy: { flex: 1, minWidth: 0 },
  toolsTitle: { color: '#3f2859', fontSize: 12, fontWeight: '900' },
  toolsStatus: { color: '#675176', fontSize: 9, marginTop: 2 },
  toolsArrow: { color: '#67418c', fontSize: 22, fontWeight: '800', marginLeft: 10 },
  toolsPanel: { backgroundColor: '#f4edf9', borderRadius: 16, gap: 10, padding: 13 },
  instructionsTitle: { color: '#3f2859', fontSize: 13, fontWeight: '900' },
  instructionsText: { color: '#675176', fontSize: 11, lineHeight: 17 },
  reportingPanel: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#ded3e7', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, justifyContent: 'space-between', padding: 11 },
  reportingCopy: { flex: 1 },
  reportingTitle: { color: '#2b2433', fontSize: 12, fontWeight: '900' },
  reportingStatus: { color: '#675f6f', fontSize: 10, marginTop: 3 },
  reportingButton: { alignItems: 'center', backgroundColor: '#67418c', borderRadius: 11, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  reportingButtonDisabled: { backgroundColor: '#b9afbf', opacity: 0.65 },
  reportingButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  error: { backgroundColor: '#fbeceb', borderRadius: 12, color: '#a34842', padding: 12, textAlign: 'center' },
  navigatorPanel: { backgroundColor: '#fff', borderColor: '#ded3e7', borderRadius: 20, borderWidth: 1, gap: 9, padding: 12 },
  navigatorHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  stepLabel: { color: '#76559e', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  navigatorCount: { color: '#827888', fontSize: 9, fontWeight: '800' },
  unitList: { flexDirection: 'row', gap: 5 },
  unitButton: { alignItems: 'center', backgroundColor: '#f7f2fb', borderColor: '#d8cbe3', borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 44 },
  unitButtonSelected: { backgroundColor: '#67418c', borderColor: '#67418c' },
  unitButtonText: { color: '#5f5765', fontSize: 13, fontWeight: '900' },
  unitButtonTextSelected: { color: '#fff' },
  lessonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7 },
  lessonButton: { alignItems: 'center', backgroundColor: '#f8f5fa', borderColor: '#ded3e7', borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 44, width: '18.4%' },
  lessonButtonSelected: { backgroundColor: '#67418c', borderColor: '#67418c' },
  lessonButtonDisabled: { opacity: 0.5 },
  lessonButtonText: { color: '#514858', fontSize: 11, fontWeight: '900' },
  lessonButtonTextSelected: { color: '#fff' },
  selectedLessonBanner: { alignItems: 'center', backgroundColor: '#f3ecf8', borderRadius: 13, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 11, paddingVertical: 8 },
  selectedLessonCopy: { flex: 1, minWidth: 0 },
  selectedLessonEyebrow: { color: '#76559e', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  selectedLessonTitle: { color: '#302837', fontSize: 14, fontWeight: '900', lineHeight: 17, marginTop: 2 },
  selectedLessonCount: { color: '#76559e', fontSize: 9, fontWeight: '900' },
  stageList: { gap: 7, paddingRight: 8 },
  stageButton: { alignItems: 'center', backgroundColor: '#f8f5fa', borderColor: '#d8cbe3', borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 84, paddingHorizontal: 11 },
  stageButtonSelected: { backgroundColor: '#e1caef', borderColor: '#9b71b8' },
  stageText: { color: '#5f5765', fontSize: 11, fontWeight: '800' },
  stageTextSelected: { color: '#4f2769' },
  stageCount: { fontSize: 9 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 1 },
  sectionTitle: { color: '#2b2433', fontSize: 14, fontWeight: '900' },
  cardCount: { color: '#766f7b', fontSize: 10, fontWeight: '700' },
  loading: { marginVertical: 18 },
  empty: { color: '#766f7b', padding: 24, textAlign: 'center' },
  cardGap: { height: CARD_ROW_GAP },
  cardButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#ded3e7', borderRadius: 15, borderWidth: 1, flexDirection: 'row', height: CARD_ROW_HEIGHT, padding: 10 },
  cardButtonSelected: { backgroundColor: '#fbf7fe', borderColor: '#9b71b8', borderWidth: 2 },
  cardNumber: { alignItems: 'center', backgroundColor: '#eee3f7', borderRadius: 11, justifyContent: 'center', minHeight: 42, minWidth: 44, paddingHorizontal: 6 },
  cardNumberSelected: { backgroundColor: '#67418c' },
  cardNumberText: { color: '#67418c', fontSize: 12, fontWeight: '900' },
  cardNumberTextSelected: { color: '#fff' },
  cardText: { flex: 1, marginLeft: 10, minWidth: 0 },
  cardPrompt: { color: '#2f2934', fontSize: 13, fontWeight: '800', lineHeight: 16 },
  cardMeta: { color: '#7a717f', fontSize: 9, marginTop: 3, textTransform: 'capitalize' },
  openArrow: { color: '#76559e', fontSize: 24, fontWeight: '700', marginLeft: 7 },
});
