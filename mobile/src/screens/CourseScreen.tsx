import { useEffect, useState } from 'react';
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
import { BrandHeader } from '../components/BrandHeader';
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

type Props = {
  profile: LearnerProfile;
  onOpenLesson: (lessonId: string) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onOpenQA?: () => void;
};

export function CourseScreen({ profile, onOpenLesson, onEditProfile, onOpenQA, onSignOut }: Props) {
  const { currentlyRunning, isUpdatePending } = Updates.useUpdates();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isLandscape = viewportWidth > viewportHeight;
  const useGrid = isLandscape || viewportWidth >= 600;
  const isExpanded = viewportWidth >= 840;
  const lessonCardWidth = isExpanded ? '31.5%' : '48.5%';
  const lessonImageHeight = isExpanded ? 210 : viewportWidth >= 600 ? 180 : 138;
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [updateState, setUpdateState] = useState<'checking' | 'current' | 'ready' | 'unavailable'>('checking');

  const updateCode = currentlyRunning.updateId?.slice(0, 8) || 'embedded';
  const versionLabel = `v${currentlyRunning.runtimeVersion || '1.5.0'} · ${updateCode}`;
  const loadingMessage = useProgressiveLoadingMessage(isLoading);

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
        <Pressable
          accessibilityRole={updateState === 'ready' ? 'button' : 'text'}
          accessibilityState={{ busy: updateState === 'checking' }}
          disabled={updateState !== 'ready'}
          onPress={() => void Updates.reloadAsync()}
          style={[
            styles.versionBadge,
            updateState === 'ready' ? styles.versionBadgeReady : null,
            updateState === 'current' ? styles.versionBadgeCurrent : null,
          ]}
        >
          <Text style={styles.versionStatus}>
            {updateState === 'checking'
              ? 'CHECKING FOR UPDATES…'
              : updateState === 'ready'
                ? 'UPDATE READY · TAP TO RESTART'
                : updateState === 'current'
                  ? '✓ UP TO DATE'
                  : 'UPDATE CHECK UNAVAILABLE'}
          </Text>
          <Text style={styles.versionCode}>{versionLabel}</Text>
        </Pressable>
        {onOpenQA ? (
          <Pressable accessibilityRole="button" onPress={onOpenQA} style={styles.qaButton}>
            <Text style={styles.qaEyebrow}>INTERNAL TESTING</Text>
            <Text style={styles.qaTitle}>Open Engine QA →</Text>
          </Pressable>
        ) : null}
        <BrandHeader
          compact
          eyebrow="Tu ruta"
          subtitle="Personas, acciones y frases cortas con imágenes claras."
          title="Lecciones para empezar con claridad"
        />
        <View style={styles.welcome}>
          <View style={styles.welcomeIdentity}>
            <Text style={styles.welcomeText}>Welcome {profile.displayName}</Text>
            <Text style={styles.aiNote}>Las voces de práctica pueden ser generadas con IA.</Text>
          </View>
          <View style={styles.accountActions}>
            <Pressable accessibilityLabel="Ajustar mi perfil" accessibilityRole="button" onPress={onEditProfile} style={styles.profileButton}>
              <Text style={styles.profileIcon}>◉</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.unit}>
          <Text style={styles.unitEyebrow}>UNIT 1</Text>
          <Text style={styles.unitTitle}>People, Actions, and Basic Sentences</Text>
          <Text style={styles.unitDescription}>Aprende a reconocer personas, acciones y frases cortas.</Text>
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
        <View style={[styles.grid, useGrid ? styles.gridLandscape : null]}>
          {lessons.map((lesson) => {
            const visual = VISUALS[lesson.id] || VISUALS['lesson-1-people-actions'];
            return (
              <Pressable
                accessibilityHint="Abre esta lección en modo horizontal"
                accessibilityLabel={`${lesson.sub_lesson_id || lesson.title} ${lesson.sub_lesson_title || ''}. ${visual.description}`}
                accessibilityRole="button"
                key={lesson.id}
                onPress={() => openLesson(lesson.id)}
                style={({ pressed }) => [
                  styles.lessonCard,
                  useGrid ? { width: lessonCardWidth } : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={[
                  styles.imagePanel,
                  { backgroundColor: visual.color },
                  useGrid ? { height: lessonImageHeight } : null,
                ]}>
                  <Image
                    resizeMode="contain"
                    source={{ uri: absoluteMediaUrl(`/lesson-assets/${visual.image}`) }}
                    style={styles.image}
                  />
                  <Text style={styles.level}>{lesson.level}</Text>
                </View>
                <Text style={styles.lessonTitle}>
                  {lesson.sub_lesson_id || lesson.title} {lesson.sub_lesson_title || ''}
                </Text>
                <Text style={styles.lessonDescription}>{visual.description}</Text>
                <Text style={styles.start}>
                  {loadingLessonId === lesson.id ? 'Cargando…' : 'Empezar'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { alignSelf: 'center', gap: 16, maxWidth: 1280, padding: 16, paddingBottom: 32, width: '100%' },
  versionBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#f2ebde',
    borderColor: '#ddd8cf',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  versionBadgeCurrent: { backgroundColor: '#eaf6ee', borderColor: '#9dcfb4' },
  versionBadgeReady: { backgroundColor: '#ffe1ad', borderColor: '#d9a34d' },
  versionStatus: { color: '#42534b', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textAlign: 'right' },
  versionCode: { color: '#697177', fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'right' },
  qaButton: { alignSelf: 'stretch', backgroundColor: '#eee3f7', borderColor: '#cdbbdd', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  qaEyebrow: { color: '#76559e', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  qaTitle: { color: '#4f2769', fontSize: 15, fontWeight: '900', marginTop: 2 },
  welcome: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 21, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  welcomeIdentity: { flex: 1, marginRight: 10 },
  welcomeText: { color: '#24333a', fontSize: 21, fontWeight: '800' },
  aiNote: { color: '#697177', fontSize: 11, marginTop: 4 },
  accountActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  profileButton: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  profileIcon: { color: '#2f8f62', fontSize: 20 },
  signOutButton: { alignItems: 'center', borderColor: '#d9a8a1', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  signOutText: { color: '#a34842', fontSize: 13, fontWeight: '900' },
  unit: { backgroundColor: '#ffe1ad', borderRadius: 24, padding: 20 },
  unitEyebrow: { color: '#697177', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  unitTitle: { color: '#24333a', fontSize: 27, fontWeight: '900', lineHeight: 32, marginTop: 6 },
  unitDescription: { color: '#526168', fontSize: 14, lineHeight: 20, marginTop: 7 },
  grid: { gap: 14 },
  gridLandscape: { flexDirection: 'row', flexWrap: 'wrap' },
  lessonCard: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 10 },
  imagePanel: { borderRadius: 16, height: 180, overflow: 'hidden', position: 'relative' },
  image: { height: '100%', width: '100%' },
  level: { backgroundColor: 'rgba(36,51,58,0.72)', borderRadius: 8, bottom: 10, color: '#fff', fontSize: 11, fontWeight: '900', left: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, position: 'absolute' },
  lessonTitle: { color: '#24333a', fontSize: 22, fontWeight: '900', marginHorizontal: 4, marginTop: 12 },
  lessonDescription: { color: '#697177', fontSize: 14, lineHeight: 20, marginHorizontal: 4, marginTop: 5 },
  start: { color: '#16766f', fontSize: 15, fontWeight: '900', margin: 4, marginTop: 9 },
  errorPanel: { alignItems: 'center', backgroundColor: '#fbeceb', borderRadius: 16, padding: 15 },
  error: { color: '#a34842', textAlign: 'center' },
  loadingPanel: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  loadingText: { color: '#526168', fontSize: 14, lineHeight: 20, maxWidth: 420, textAlign: 'center' },
  retryButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 48, minWidth: 96 },
  retry: { color: '#a34842', fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
