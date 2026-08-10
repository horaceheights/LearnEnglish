import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLessons } from '../api';
import { absoluteMediaUrl } from '../config';
import { setDiagnosticContext } from '../diagnostics';
import { useProgressiveLoadingMessage } from '../hooks/useProgressiveLoadingMessage';
import type { LearnerProfile, LessonSummary } from '../types';

const VISUALS: Record<string, { image: string; description: string; color: string }> = {
  'lesson-1-people-actions': {
    image: 'boy_is_reading.webp',
    description: 'Personas y acciones básicas con imágenes.',
    color: '#ffe8c7',
  },
  'lesson-2-pronouns': {
    image: 'they_boy_girl.webp',
    description: 'He, she y they con una o dos personas.',
    color: '#dff4ef',
  },
  'lesson-4-family-members': {
    image: 'family_all_members.webp',
    description: 'Familia cercana: niños, adultos, padres y abuelos.',
    color: '#ffe7bd',
  },
  'lesson-5-family-action-practice': {
    image: 'family_adults_playing.webp',
    description: 'Familia, adultos, niños y acciones comunes.',
    color: '#dff4ef',
  },
  'lesson-6-objects-places': {
    image: 'place_school.webp',
    description: 'Objetos y lugares comunes.',
    color: '#ffe8c7',
  },
};

const DEFAULT_VISUAL = VISUALS['lesson-1-people-actions'];

type Props = {
  profile: LearnerProfile;
  onOpenLesson: (lessonId: string) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onOpenQA?: () => void;
};

function lessonName(lesson: LessonSummary): string {
  return `${lesson.sub_lesson_id || ''} ${lesson.sub_lesson_title || lesson.title}`.trim();
}

function unitName(lesson?: LessonSummary): string {
  const title = lesson?.unit_title || 'People, Actions, and Basic Sentences';
  return title.replace(/^Unit\s+\d+\s*:\s*/i, '');
}

export function CourseScreen({ profile, onOpenLesson, onEditProfile, onOpenQA, onSignOut }: Props) {
  const { currentlyRunning, isUpdatePending } = Updates.useUpdates();
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isLandscape = viewportWidth > viewportHeight;
  const useTwoColumns = (isLandscape && viewportWidth >= 700 && fontScale <= 1.2) || viewportWidth >= 900;
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [recentLessonId, setRecentLessonId] = useState('');
  const [updateState, setUpdateState] = useState<'checking' | 'current' | 'ready' | 'unavailable'>('checking');

  const updateCode = currentlyRunning.updateId?.slice(0, 8) || 'embedded';
  const versionLabel = `v${currentlyRunning.runtimeVersion || '1.5.0'} / ${updateCode}`;
  const loadingMessage = useProgressiveLoadingMessage(isLoading);
  const recentLessonStorageKey = `course:last-lesson:${profile.userId || profile.displayName.trim().toLowerCase()}`;
  const currentLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === recentLessonId) || lessons[0],
    [lessons, recentLessonId],
  );
  const currentLessonIndex = currentLesson ? lessons.findIndex((lesson) => lesson.id === currentLesson.id) : -1;
  const currentVisual = currentLesson ? VISUALS[currentLesson.id] || DEFAULT_VISUAL : DEFAULT_VISUAL;

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      setLessons(await getLessons());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar las lecciones. Inténtalo otra vez.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { setDiagnosticContext({}); }, []);
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  }, []);
  useEffect(() => {
    AsyncStorage.getItem(recentLessonStorageKey)
      .then((lessonId) => setRecentLessonId(lessonId || ''))
      .catch(() => setRecentLessonId(''));
  }, [recentLessonStorageKey]);

  useEffect(() => {
    if (isUpdatePending) {
      setUpdateState('ready');
      return;
    }

    let active = true;
    const checkForUpdates = async () => {
      if (__DEV__) {
        if (active) setUpdateState('current');
        return;
      }
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!active) return;
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (active) setUpdateState('ready');
        } else {
          setUpdateState('current');
        }
      } catch {
        if (active) setUpdateState('unavailable');
      }
    };
    void checkForUpdates();
    return () => { active = false; };
  }, [isUpdatePending]);

  const openLesson = (lessonId: string) => {
    setLoadingLessonId(lessonId);
    setRecentLessonId(lessonId);
    void AsyncStorage.setItem(recentLessonStorageKey, lessonId).catch(() => undefined);
    onOpenLesson(lessonId);
  };

  const confirmSignOut = () => {
    Alert.alert(
      '¿Cerrar sesión?',
      'Tu progreso permanecerá guardado para cuando vuelvas a entrar.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: onSignOut, style: 'destructive', text: 'Cerrar sesión' },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Image
              accessible={false}
              accessibilityIgnoresInvertColors
              resizeMode="cover"
              source={require('../../assets/spanglish-header-logo.png')}
              style={styles.logo}
            />
            <View style={styles.greetingBlock}>
              <Text numberOfLines={1} style={styles.greeting}>Hola, {profile.displayName}</Text>
              <Text style={styles.routeLabel}>Tu ruta de inglés</Text>
            </View>
          </View>
          <View style={styles.accountActions}>
            <Pressable
              accessibilityLabel="Ajustar mi perfil"
              accessibilityRole="button"
              onPress={onEditProfile}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.profileIcon}>P</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Cerrar sesión"
              accessibilityRole="button"
              onPress={confirmSignOut}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.signOutIcon}>Salir</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.utilityRow}>
          <Pressable
            accessibilityRole={updateState === 'ready' ? 'button' : 'text'}
            accessibilityState={{ busy: updateState === 'checking' }}
            disabled={updateState !== 'ready'}
            onPress={() => void Updates.reloadAsync()}
            style={[styles.versionBadge, updateState === 'ready' ? styles.versionBadgeReady : null]}
          >
            <Text style={styles.versionText}>
              {updateState === 'ready' ? 'Actualización lista' : updateState === 'checking' ? 'Buscando actualización' : versionLabel}
            </Text>
          </Pressable>
          {onOpenQA ? (
            <Pressable accessibilityRole="button" onPress={onOpenQA} style={styles.qaButton}>
              <Text style={styles.qaText}>Engine QA</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load} style={styles.retryButton}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading && !lessons.length && !error ? (
          <View accessible accessibilityLiveRegion="polite" style={styles.loadingPanel}>
            <ActivityIndicator color="#e96f42" size="large" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        ) : null}

        {currentLesson ? (
          <Pressable
            accessibilityHint="Abre la lección donde continuaste la última vez"
            accessibilityLabel={`Continuar con ${lessonName(currentLesson)}`}
            accessibilityRole="button"
            onPress={() => openLesson(currentLesson.id)}
            style={({ pressed }) => [styles.continueCard, pressed ? styles.pressed : null]}
          >
            <View style={[styles.continueImagePanel, { backgroundColor: currentVisual.color }]}>
              <Image
                resizeMode="contain"
                source={{ uri: absoluteMediaUrl(`/lesson-assets/${currentVisual.image}`) }}
                style={styles.image}
              />
            </View>
            <View style={styles.continueCopy}>
              <Text style={styles.continueEyebrow}>{recentLessonId ? 'CONTINUAR APRENDIENDO' : 'EMPIEZA AQUÍ'}</Text>
              <Text numberOfLines={2} style={styles.continueTitle}>{lessonName(currentLesson)}</Text>
              <Text numberOfLines={1} style={styles.continueDescription}>{currentVisual.description}</Text>
            </View>
            <View style={styles.continueButton}>
              {loadingLessonId === currentLesson.id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.continueArrow}>Ir</Text>
              )}
            </View>
          </Pressable>
        ) : null}

        {lessons.length ? (
          <View style={styles.courseSection}>
            <View style={styles.unitHeader}>
              <View style={styles.unitNumber}>
                <Text style={styles.unitNumberText}>1</Text>
              </View>
              <View style={styles.unitCopy}>
                <Text style={styles.unitEyebrow}>UNIT 1</Text>
                <Text numberOfLines={2} style={styles.unitTitle}>{unitName(lessons[0])}</Text>
                <Text style={styles.unitDescription}>Personas, acciones y frases cortas.</Text>
              </View>
              <Text style={styles.lessonCount}>{lessons.length} lecciones</Text>
            </View>

            <View style={[styles.lessonList, useTwoColumns ? styles.lessonGrid : null]}>
              {lessons.map((lesson, index) => {
                const visual = VISUALS[lesson.id] || DEFAULT_VISUAL;
                const isCurrent = lesson.id === currentLesson.id;
                const status = isCurrent ? 'Actual' : index < currentLessonIndex ? 'Repasar' : 'Disponible';
                return (
                  <Pressable
                    accessibilityHint="Abre esta lección"
                    accessibilityLabel={`${lessonName(lesson)}. ${status}. ${visual.description}`}
                    accessibilityRole="button"
                    key={lesson.id}
                    onPress={() => openLesson(lesson.id)}
                    style={({ pressed }) => [
                      styles.lessonRow,
                      useTwoColumns ? styles.lessonRowGrid : null,
                      isCurrent ? styles.lessonRowCurrent : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={[styles.lessonStep, isCurrent ? styles.lessonStepCurrent : null]}>
                      <Text style={[styles.lessonStepText, isCurrent ? styles.lessonStepTextCurrent : null]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={[styles.thumbnail, { backgroundColor: visual.color }]}>
                      <Image
                        resizeMode="contain"
                        source={{ uri: absoluteMediaUrl(`/lesson-assets/${visual.image}`) }}
                        style={styles.image}
                      />
                    </View>
                    <View style={styles.lessonCopy}>
                      <View style={styles.lessonMeta}>
                        <Text style={[styles.lessonStatus, isCurrent ? styles.lessonStatusCurrent : null]}>{status}</Text>
                        <Text style={styles.lessonLevel}>{lesson.level}</Text>
                      </View>
                      <Text numberOfLines={2} style={styles.lessonTitle}>{lessonName(lesson)}</Text>
                      <Text numberOfLines={1} style={styles.lessonDescription}>{visual.description}</Text>
                    </View>
                    {loadingLessonId === lesson.id ? (
                      <ActivityIndicator color="#16766f" size="small" />
                    ) : (
                      <Text style={styles.rowArrow}>&gt;</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text style={styles.aiNote}>Las voces de práctica pueden ser generadas con IA.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { alignSelf: 'center', gap: 12, maxWidth: 1080, padding: 14, paddingBottom: 28, width: '100%' },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#e7ded0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  brandBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  logo: { height: 46, width: 142 },
  greetingBlock: { borderLeftColor: '#e7ded0', borderLeftWidth: 1, flex: 1, marginLeft: 10, paddingLeft: 10 },
  greeting: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  routeLabel: { color: '#697177', fontSize: 10, fontWeight: '700', marginTop: 2 },
  accountActions: { alignItems: 'center', flexDirection: 'row', gap: 7, marginLeft: 8 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#fbf7ef',
    borderColor: '#ddd8cf',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 8,
  },
  profileIcon: { color: '#16766f', fontSize: 14, fontWeight: '900' },
  signOutIcon: { color: '#a34842', fontSize: 10, fontWeight: '900' },
  utilityRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'flex-end', minHeight: 20 },
  versionBadge: { backgroundColor: '#f2ebde', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  versionBadgeReady: { backgroundColor: '#ffe1ad', borderColor: '#d9a34d', borderWidth: 1 },
  versionText: { color: '#697177', fontSize: 8, fontWeight: '800' },
  qaButton: { backgroundColor: '#eee3f7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  qaText: { color: '#76559e', fontSize: 8, fontWeight: '900' },
  continueCard: {
    alignItems: 'center',
    backgroundColor: '#16766f',
    borderRadius: 22,
    flexDirection: 'row',
    minHeight: 112,
    padding: 10,
  },
  continueImagePanel: { borderRadius: 16, height: 88, overflow: 'hidden', width: 94 },
  continueCopy: { flex: 1, marginHorizontal: 13, minWidth: 0 },
  continueEyebrow: { color: '#bde7df', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  continueTitle: { color: '#fff', fontSize: 21, fontWeight: '900', lineHeight: 25, marginTop: 4 },
  continueDescription: { color: '#d7f1ed', fontSize: 11, marginTop: 4 },
  continueButton: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 18, height: 54, justifyContent: 'center', width: 54 },
  continueArrow: { color: '#fff', fontSize: 13, fontWeight: '900' },
  image: { height: '100%', width: '100%' },
  courseSection: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  unitHeader: { alignItems: 'center', backgroundColor: '#ffe1ad', flexDirection: 'row', minHeight: 98, padding: 14 },
  unitNumber: { alignItems: 'center', backgroundColor: '#fff7e9', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 },
  unitNumberText: { color: '#c94d24', fontSize: 24, fontWeight: '900' },
  unitCopy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  unitEyebrow: { color: '#8a5a20', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  unitTitle: { color: '#24333a', fontSize: 18, fontWeight: '900', lineHeight: 22, marginTop: 2 },
  unitDescription: { color: '#6f604e', fontSize: 11, marginTop: 3 },
  lessonCount: { color: '#8a5a20', fontSize: 9, fontWeight: '900' },
  lessonList: { padding: 10 },
  lessonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lessonRow: {
    alignItems: 'center',
    borderBottomColor: '#eee8de',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  lessonRowGrid: { borderColor: '#eee8de', borderRadius: 16, borderWidth: 1, flexGrow: 1, width: '48%' },
  lessonRowCurrent: { backgroundColor: '#eef8f5', borderColor: '#9dcfc4', borderRadius: 16, borderWidth: 1 },
  lessonStep: { alignItems: 'center', backgroundColor: '#f2ebde', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  lessonStepCurrent: { backgroundColor: '#16766f' },
  lessonStepText: { color: '#697177', fontSize: 12, fontWeight: '900' },
  lessonStepTextCurrent: { color: '#fff' },
  thumbnail: { borderRadius: 13, height: 62, marginLeft: 8, overflow: 'hidden', width: 68 },
  lessonCopy: { flex: 1, marginHorizontal: 10, minWidth: 0 },
  lessonMeta: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  lessonStatus: { color: '#8a8176', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  lessonStatusCurrent: { color: '#16766f' },
  lessonLevel: { backgroundColor: '#f2ebde', borderRadius: 5, color: '#697177', fontSize: 8, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 2 },
  lessonTitle: { color: '#24333a', fontSize: 15, fontWeight: '900', lineHeight: 18, marginTop: 3 },
  lessonDescription: { color: '#697177', fontSize: 10, marginTop: 3 },
  rowArrow: { color: '#b0a79b', fontSize: 22, fontWeight: '700', marginRight: 4 },
  errorPanel: { alignItems: 'center', backgroundColor: '#fbeceb', borderRadius: 16, padding: 15 },
  error: { color: '#a34842', textAlign: 'center' },
  loadingPanel: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  loadingText: { color: '#526168', fontSize: 14, lineHeight: 20, maxWidth: 420, textAlign: 'center' },
  retryButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 44, minWidth: 96 },
  retry: { color: '#a34842', fontWeight: '900' },
  aiNote: { color: '#8a8176', fontSize: 9, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
