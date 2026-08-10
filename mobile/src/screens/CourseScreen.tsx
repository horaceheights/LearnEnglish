import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
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
  onViewProfile: () => void;
  onChangeUser: () => void;
  onOpenQA?: () => void;
};

function lessonName(lesson: LessonSummary): string {
  return `${lesson.sub_lesson_id || ''} ${lesson.sub_lesson_title || lesson.title}`.trim();
}

function unitName(lesson?: LessonSummary): string {
  const title = lesson?.unit_title || 'People, Actions, and Basic Sentences';
  return title.replace(/^Unit\s+\d+\s*:\s*/i, '');
}

export function CourseScreen({ profile, onOpenLesson, onViewProfile, onChangeUser, onOpenQA }: Props) {
  const { isUpdatePending } = Updates.useUpdates();
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isLandscape = viewportWidth > viewportHeight;
  const useTwoColumns = (isLandscape && viewportWidth >= 700 && fontScale <= 1.2) || viewportWidth >= 900;
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [recentLessonId, setRecentLessonId] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading'>('idle');
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

  const openLesson = (lessonId: string) => {
    setLoadingLessonId(lessonId);
    setRecentLessonId(lessonId);
    void AsyncStorage.setItem(recentLessonStorageKey, lessonId).catch(() => undefined);
    onOpenLesson(lessonId);
  };

  const openProfile = () => {
    setIsAccountMenuOpen(false);
    onViewProfile();
  };

  const openQA = () => {
    setIsAccountMenuOpen(false);
    onOpenQA?.();
  };

  const confirmChangeUser = () => {
    setIsAccountMenuOpen(false);
    Alert.alert(
      '¿Cambiar de usuario?',
      'Volverás a la pantalla de acceso para elegir otro perfil.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: onChangeUser, text: 'Cambiar usuario' },
      ],
    );
  };

  const confirmExit = useCallback(() => {
    setIsAccountMenuOpen(false);
    Alert.alert(
      '¿Salir de SpanGlish?',
      'Tu usuario quedará guardado para la próxima vez.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: () => BackHandler.exitApp(), style: 'destructive', text: 'Salir' },
      ],
    );
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isAccountMenuOpen) {
        setIsAccountMenuOpen(false);
        return true;
      }
      confirmExit();
      return true;
    });
    return () => subscription.remove();
  }, [confirmExit, isAccountMenuOpen]);

  const checkForUpdates = async () => {
    if (updateStatus !== 'idle') return;
    try {
      if (isUpdatePending) {
        setUpdateStatus('downloading');
        await Updates.reloadAsync();
        return;
      }

      setUpdateStatus('checking');
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setUpdateStatus('idle');
        Alert.alert('SpanGlish está actualizado', 'Ya tienes la versión más reciente.');
        return;
      }

      setUpdateStatus('downloading');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch {
      setUpdateStatus('idle');
      Alert.alert('No pudimos actualizar', 'Revisa tu conexión a internet e inténtalo otra vez.');
    }
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
              <Text style={styles.routeLabel}>TU RUTA DE INGLÉS</Text>
              <Text numberOfLines={1} style={styles.greeting}>{profile.displayName}</Text>
            </View>
          </View>
          <Pressable
            accessibilityHint="Abre el menú de opciones"
            accessibilityLabel="Opciones"
            accessibilityRole="button"
            onPress={() => setIsAccountMenuOpen(true)}
            style={({ pressed }) => [styles.settingsButton, isAccountMenuOpen ? styles.settingsButtonOpen : null, pressed ? styles.pressed : null]}
          >
            <MaterialIcons
              color={isAccountMenuOpen ? '#fff' : '#16766f'}
              name="settings"
              size={25}
            />
          </Pressable>
        </View>

        <Modal
          animationType="fade"
          onRequestClose={() => setIsAccountMenuOpen(false)}
          transparent
          visible={isAccountMenuOpen}
        >
          <View style={styles.accountMenuBackdrop}>
            <Pressable
              accessibilityLabel="Cerrar menú de cuenta"
              accessibilityRole="button"
              onPress={() => setIsAccountMenuOpen(false)}
              style={StyleSheet.absoluteFill}
            />
            <View
              accessibilityViewIsModal
              style={[
                styles.accountMenu,
                { maxHeight: Math.max(viewportHeight - 112, 260), width: Math.min(viewportWidth - 28, 360) },
              ]}
            >
              <View style={styles.menuPointer} />
              <ScrollView contentContainerStyle={styles.accountMenuContent} showsVerticalScrollIndicator={false}>
                <View style={styles.menuIdentity}>
                <View style={styles.menuAvatar}>
                  <Text style={styles.menuAvatarText}>{profile.displayName.trim().charAt(0).toUpperCase() || 'P'}</Text>
                </View>
                <View style={styles.menuIdentityCopy}>
                  <Text style={styles.menuEyebrow}>CUENTA ACTUAL</Text>
                  <Text numberOfLines={1} style={styles.menuName}>{profile.displayName}</Text>
                </View>
                <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" onPress={() => setIsAccountMenuOpen(false)} style={styles.menuClose}>
                  <Text style={styles.menuCloseText}>×</Text>
                </Pressable>
              </View>

              <Pressable accessibilityRole="button" onPress={openProfile} style={({ pressed }) => [styles.menuOption, pressed ? styles.menuOptionPressed : null]}>
                <View style={[styles.menuOptionMark, styles.menuOptionMarkProfile]}><Text style={styles.menuOptionMarkText}>P</Text></View>
                <View style={styles.menuOptionCopy}>
                  <Text style={styles.menuOptionTitle}>Ver perfil</Text>
                  <Text style={styles.menuOptionDescription}>Consulta tu información y preferencias.</Text>
                </View>
                <Text style={styles.menuOptionArrow}>&gt;</Text>
              </Pressable>

              {onOpenQA ? (
                <Pressable accessibilityRole="button" onPress={openQA} style={({ pressed }) => [styles.menuOption, pressed ? styles.menuOptionPressed : null]}>
                  <View style={[styles.menuOptionMark, styles.menuOptionMarkQA]}><Text style={styles.menuOptionMarkText}>QA</Text></View>
                  <View style={styles.menuOptionCopy}>
                    <Text style={styles.menuOptionTitle}>QA test</Text>
                    <Text style={styles.menuOptionDescription}>Herramientas internas de prueba.</Text>
                  </View>
                  <Text style={styles.menuOptionArrow}>&gt;</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: updateStatus !== 'idle', disabled: updateStatus !== 'idle' }}
                disabled={updateStatus !== 'idle'}
                onPress={() => void checkForUpdates()}
                style={({ pressed }) => [
                  styles.menuOption,
                  updateStatus !== 'idle' ? styles.menuOptionDisabled : null,
                  pressed ? styles.menuOptionPressed : null,
                ]}
              >
                <View style={[styles.menuOptionMark, styles.menuOptionMarkUpdate]}>
                  {updateStatus === 'idle'
                    ? <Text style={styles.menuOptionMarkText}>A</Text>
                    : <ActivityIndicator color="#16766f" size="small" />}
                </View>
                <View style={styles.menuOptionCopy}>
                  <Text style={styles.menuOptionTitle}>Actualizar</Text>
                  <Text style={styles.menuOptionDescription}>
                    {updateStatus === 'checking'
                      ? 'Buscando una versión nueva…'
                      : updateStatus === 'downloading'
                        ? 'Instalando y reiniciando…'
                        : 'Busca e instala la versión más reciente.'}
                  </Text>
                </View>
                {updateStatus === 'idle' ? <Text style={styles.menuOptionArrow}>&gt;</Text> : null}
              </Pressable>

              <Pressable accessibilityRole="button" onPress={confirmChangeUser} style={({ pressed }) => [styles.menuOption, pressed ? styles.menuOptionPressed : null]}>
                <View style={[styles.menuOptionMark, styles.menuOptionMarkSwitch]}><Text style={styles.menuOptionMarkText}>U</Text></View>
                <View style={styles.menuOptionCopy}>
                  <Text style={styles.menuOptionTitle}>Cambiar usuario</Text>
                  <Text style={styles.menuOptionDescription}>Elige otro perfil de aprendizaje.</Text>
                </View>
                <Text style={styles.menuOptionArrow}>&gt;</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={confirmExit} style={({ pressed }) => [styles.menuOption, styles.menuOptionExit, pressed ? styles.menuOptionPressed : null]}>
                <View style={[styles.menuOptionMark, styles.menuOptionMarkExit]}><Text style={styles.menuOptionMarkText}>X</Text></View>
                <View style={styles.menuOptionCopy}>
                  <Text style={[styles.menuOptionTitle, styles.menuOptionTitleExit]}>Salir</Text>
                  <Text style={styles.menuOptionDescription}>Cierra la app y conserva este usuario.</Text>
                </View>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

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
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandBlock: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  logo: { height: 43, width: 132 },
  greetingBlock: { borderLeftColor: '#e7ded0', borderLeftWidth: 1, flex: 1, marginLeft: 12, minWidth: 0, paddingLeft: 12 },
  greeting: { color: '#24333a', fontSize: 18, fontWeight: '900', marginTop: 2 },
  routeLabel: { color: '#697177', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: '#e3f4ef',
    borderColor: '#b8ddd3',
    borderRadius: 23,
    borderWidth: 2,
    height: 46,
    justifyContent: 'center',
    marginLeft: 12,
    width: 46,
  },
  settingsButtonOpen: { backgroundColor: '#16766f', borderColor: '#16766f' },
  accountMenuBackdrop: { alignItems: 'flex-end', backgroundColor: 'transparent', flex: 1, paddingRight: 14, paddingTop: 76 },
  accountMenu: {
    backgroundColor: '#fbf7ef',
    borderColor: '#d9d0c5',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 12,
    overflow: 'visible',
    shadowColor: '#24333a',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  accountMenuContent: { padding: 12, paddingBottom: 14 },
  menuPointer: { alignSelf: 'flex-end', backgroundColor: '#fbf7ef', borderColor: '#d9d0c5', borderLeftWidth: 1, borderTopWidth: 1, height: 14, marginRight: 16, marginTop: -8, position: 'absolute', transform: [{ rotate: '45deg' }], width: 14, zIndex: 2 },
  menuIdentity: { alignItems: 'center', flexDirection: 'row', marginBottom: 8, padding: 4 },
  menuAvatar: { alignItems: 'center', backgroundColor: '#16766f', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  menuAvatarText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  menuIdentityCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  menuEyebrow: { color: '#697177', fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  menuName: { color: '#24333a', fontSize: 17, fontWeight: '900', marginTop: 2 },
  menuClose: { alignItems: 'center', backgroundColor: '#eee8de', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  menuCloseText: { color: '#526168', fontSize: 21, fontWeight: '500', lineHeight: 23 },
  menuOption: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 13, borderWidth: 1, flexDirection: 'row', marginTop: 6, minHeight: 57, padding: 8 },
  menuOptionPressed: { opacity: 0.68 },
  menuOptionDisabled: { opacity: 0.72 },
  menuOptionMark: { alignItems: 'center', borderRadius: 11, height: 36, justifyContent: 'center', width: 36 },
  menuOptionMarkProfile: { backgroundColor: '#dff4ef' },
  menuOptionMarkQA: { backgroundColor: '#eee3f7' },
  menuOptionMarkUpdate: { backgroundColor: '#dff4ef' },
  menuOptionMarkSwitch: { backgroundColor: '#ffe8c7' },
  menuOptionMarkExit: { backgroundColor: '#fbeceb' },
  menuOptionMarkText: { color: '#46565c', fontSize: 11, fontWeight: '900' },
  menuOptionCopy: { flex: 1, marginHorizontal: 11, minWidth: 0 },
  menuOptionTitle: { color: '#24333a', fontSize: 14, fontWeight: '900' },
  menuOptionTitleExit: { color: '#a34842' },
  menuOptionDescription: { color: '#697177', fontSize: 10, marginTop: 3 },
  menuOptionArrow: { color: '#b0a79b', fontSize: 20, fontWeight: '700' },
  menuOptionExit: { marginTop: 10 },
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
