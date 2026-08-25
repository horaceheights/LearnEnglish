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
import Constants from 'expo-constants';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLessonProgress, getLessons } from '../api';
import { PlayfulLoading } from '../components/PlayfulLoading';
import { setDiagnosticContext } from '../diagnostics';
import { lessonImageSource } from '../lessonImageSources';
import { getPreviewLessonMetadata, mergePreviewLessonSummaries } from '../previewLessons';
import type { LearnerProfile, LessonProgress, LessonSummary } from '../types';
import {
  canUseEasUpdates,
  releaseVersionLabel,
  saveUpdateReceiptBeforeReload,
} from '../updates';

const VISUALS: Record<string, { image: string; description: string; color: string }> = {
  'lesson-1-people-actions': {
    image: 'a1_title_1_1_people_actions.webp',
    description: 'Personas y acciones básicas con imágenes.',
    color: '#ffe8c7',
  },
  'lesson-2-pronouns': {
    image: 'a1_scene_he-she-split_840e1d0.webp',
    description: 'He y she con acciones claras de una persona.',
    color: '#dff4ef',
  },
  'lesson-3-two-people': {
    image: 'a1_title_1_3_two_people.webp',
    description: 'They y are para hablar de dos personas.',
    color: '#e5eefb',
  },
  'lesson-4-children-siblings': {
    image: 'a1_title_1_4_children_siblings.webp',
    description: 'Familia cercana: bebés, niños, hermanos y hermanas.',
    color: '#ffe7bd',
  },
  'lesson-5-parents-grandparents': {
    image: 'a1_title_1_5_parents_grandparents.webp',
    description: 'Familia: adultos, padres, madres y abuelos.',
    color: '#f1e4fa',
  },
  'lesson-6-family-actions': {
    image: 'a1_title_1_6_family_actions.webp',
    description: 'Acciones útiles dentro de la familia.',
    color: '#dff4ef',
  },
  'lesson-7-is-are-not': {
    image: 'a1_title_1_7_is_are_not.webp',
    description: 'Is, are y not dentro de frases conocidas.',
    color: '#ffe8c7',
  },
  'lesson-8-who': {
    image: 'a1_title_1_8_who.webp',
    description: 'Preguntas y respuestas para identificar personas.',
    color: '#e5eefb',
  },
  'lesson-9-unit-review': {
    image: 'a1_title_1_9_review.webp',
    description: 'Repaso mezclado de toda la unidad.',
    color: '#f1e4fa',
  },
  'lesson-10-family-mission': {
    image: 'a1_title_1_10_family_mission.webp',
    description: 'Misión final con personas, familia y acciones.',
    color: '#ffe1ad',
  },
  'lesson-2-1-places-around-me': {
    image: 'a1_scene_a-library_985e108.webp',
    description: 'Lugares familiares del vecindario.',
    color: '#dff4ef',
  },
  'lesson-2-2-streets-and-transportation': {
    image: 'a1_scene_street_d3a9fb0.webp',
    description: 'Calles, puentes y transporte cotidiano.',
    color: '#dff4ef',
  },
  'lesson-2-3-common-objects': {
    image: 'a1_scene_book-next-phone_d548267.webp',
    description: 'Objetos comunes de uso diario.',
    color: '#dff4ef',
  },
  'lesson-2-4-what-is-it': {
    image: 'a1_scene_it-book_48b6205.webp',
    description: 'Pregunta e identifica objetos conocidos.',
    color: '#dff4ef',
  },
  'lesson-2-5-this-and-that': {
    image: 'a1_near-book.webp',
    description: 'Objetos cercanos y lejanos con this y that.',
    color: '#dff4ef',
  },
  'lesson-2-6-numbers-1-10': {
    image: 'a1_n1.webp',
    description: 'Números del uno al diez.',
    color: '#dff4ef',
  },
  'lesson-2-7-basic-colors': {
    image: 'a1_red.webp',
    description: 'Seis colores básicos.',
    color: '#dff4ef',
  },
  'lesson-2-8-count-and-describe': {
    image: 'a1_one-red-car.webp',
    description: 'Cuenta y describe objetos por color.',
    color: '#dff4ef',
  },
  'lesson-2-9-unit-2-review': {
    image: 'a1_scene_five-black-phones_734dda6.webp',
    description: 'Repaso de lugares, objetos, números y colores.',
    color: '#dff4ef',
  },
  'lesson-2-10-around-me-mission': {
    image: 'a1_scene_mission-park_4a508f3.webp',
    description: 'Misión de observación en el vecindario.',
    color: '#dff4ef',
  },
  'lesson-3-1-greetings-and-names': {
    image: 'a1_scene_hello-ana_e4c4db7.webp',
    description: 'Saludos, despedidas y nombres.',
    color: '#e5eefb',
  },
  'lesson-3-2-i-you-and-we': {
    image: 'a1_scene_we-ana-luis_d8d7dd2.webp',
    description: 'I, you y we según quién habla.',
    color: '#e5eefb',
  },
  'lesson-3-3-am-is-and-are': {
    image: 'a1_scene_i-reading_941304e.webp',
    description: 'Am, is y are en frases conocidas.',
    color: '#e5eefb',
  },
  'lesson-3-4-age': {
    image: 'a1_scene_n20_b3be26c.webp',
    description: 'Pregunta y responde la edad.',
    color: '#e5eefb',
  },
  'lesson-3-5-countries-and-nationalities': {
    image: 'a1_scene_mexico-country_c17ee27.webp',
    description: 'Países, nacionalidades y origen.',
    color: '#e5eefb',
  },
  'lesson-3-6-professions': {
    image: 'a1_scene_teacher-ana_0e983a0.webp',
    description: 'Profesiones y trabajos comunes.',
    color: '#e5eefb',
  },
  'lesson-3-7-my-your-his-and-her': {
    image: 'a1_scene_my-book-ana_7f764c0.webp',
    description: 'Expresa a quién pertenece algo.',
    color: '#e5eefb',
  },
  'lesson-3-8-have-and-has': {
    image: 'a1_scene_you-have-phone_6017478.webp',
    description: 'Posesión sencilla con have y has.',
    color: '#e5eefb',
  },
  'lesson-3-9-unit-3-review': {
    image: 'a1_scene_job-dialogue-driver_acd1aee.webp',
    description: 'Repaso de información personal.',
    color: '#e5eefb',
  },
  'lesson-3-10-introduction-mission': {
    image: 'a1_scene_car-luis_d3399da.webp',
    description: 'Misión para presentarte y conocer a alguien.',
    color: '#e5eefb',
  },
  'lesson-4-1-rooms-at-home': {
    image: 'a1_scene_home-cutaway_acf377a.webp',
    description: 'La casa y sus habitaciones.',
    color: '#f1e4fa',
  },
  'lesson-4-2-furniture-and-home-objects': {
    image: 'a1_scene_bed_fefe239.webp',
    description: 'Muebles y objetos del hogar.',
    color: '#f1e4fa',
  },
  'lesson-4-3-where-things-are': {
    image: 'a1_scene_book-on-table_af51f18.webp',
    description: 'Ubica objetos dentro de la casa.',
    color: '#f1e4fa',
  },
  'lesson-4-4-there-is-and-there-are': {
    image: 'a1_scene_one-bed-bedroom_fd49452.webp',
    description: 'Describe lo que hay en una habitación.',
    color: '#f1e4fa',
  },
  'lesson-4-5-morning-routine': {
    image: 'a1_scene_mission-brush_101d93f.webp',
    description: 'Acciones de la rutina de la mañana.',
    color: '#f1e4fa',
  },
  'lesson-4-6-everyday-verbs': {
    image: 'a1_scene_ana-go-school_83ace0e.webp',
    description: 'Acciones frecuentes de todos los días.',
    color: '#f1e4fa',
  },
  'lesson-4-7-simple-present': {
    image: 'a1_scene_he-working_060cda8.webp',
    description: 'Rutinas habituales en presente simple.',
    color: '#f1e4fa',
  },
  'lesson-4-8-days-and-time': {
    image: 'a1_scene_clock7_598dfdb.webp',
    description: 'Días de la semana y horas completas.',
    color: '#f1e4fa',
  },
  'lesson-4-9-unit-4-review': {
    image: 'a1_scene_bedroom_009e058.webp',
    description: 'Repaso del hogar y la vida diaria.',
    color: '#f1e4fa',
  },
  'lesson-4-10-my-day-mission': {
    image: 'a1_scene_mission-sequence-school-study_cefe12b.webp',
    description: 'Misión para contar un día completo.',
    color: '#f1e4fa',
  },
  'lesson-5-1-fruits': {
    image: 'a1_scene_fruit_f053b8b.webp',
    description: 'Frutas comunes, colores y cantidades.',
    color: '#ffe8c7',
  },
  'lesson-5-2-food-and-drinks': {
    image: 'a1_scene_food-and-drinks_bdcf3f2.webp',
    description: 'Comidas y bebidas frecuentes.',
    color: '#ffe8c7',
  },
  'lesson-5-3-food-quantities': {
    image: 'a1_scene_three-eggs_e579b07.webp',
    description: 'Cantidades de alimentos conocidas.',
    color: '#ffe8c7',
  },
  'lesson-5-4-likes-and-dislikes': {
    image: 'a1_scene_i-like-apples_8f1a9bc.webp',
    description: 'Expresa gustos y disgustos.',
    color: '#ffe8c7',
  },
  'lesson-5-5-wants-and-needs': {
    image: 'a1_scene_needs-water_60aec53.webp',
    description: 'Expresa lo que quieres o necesitas.',
    color: '#ffe8c7',
  },
  'lesson-5-6-meals': {
    image: 'a1_scene_breakfast_9e3a822.webp',
    description: 'Desayuno, comida y cena.',
    color: '#ffe8c7',
  },
  'lesson-5-7-prices': {
    image: 'a1_scene_apple-1_ac43e97.webp',
    description: 'Pregunta y comprende precios sencillos.',
    color: '#ffe8c7',
  },
  'lesson-5-8-ordering-politely': {
    image: 'a1_scene_server-hands-drink_9f32830.webp',
    description: 'Pide bebidas con frases amables.',
    color: '#ffe8c7',
  },
  'lesson-5-9-unit-5-review': {
    image: 'a1_scene_i-do-not-like-fish_25804e6.webp',
    description: 'Repaso de comida, compras y preferencias.',
    color: '#ffe8c7',
  },
  'lesson-5-10-cafe-mission': {
    image: 'a1_scene_juice-please-thank-you_3a701af.webp',
    description: 'Misión completa en una cafetería.',
    color: '#ffe8c7',
  },
  'lesson-6-1-buildings-and-services': {
    image: 'a1_scene_a-store_e91614f.webp',
    description: 'Edificios y servicios de la ciudad.',
    color: '#dff4ef',
  },
  'lesson-6-2-transportation': {
    image: 'a1_scene_a-train_af72b4a.webp',
    description: 'Formas de transporte por la ciudad.',
    color: '#dff4ef',
  },
  'lesson-6-3-where-is-it': {
    image: 'a1_scene_store-next-to-hospital_074b3e6.webp',
    description: 'Pregunta dónde está un lugar.',
    color: '#dff4ef',
  },
  'lesson-6-4-location-words': {
    image: 'a1_scene_the-bank-is-on-the-left_2974b35.webp',
    description: 'Cerca, lejos, izquierda y derecha.',
    color: '#dff4ef',
  },
  'lesson-6-5-simple-directions': {
    image: 'a1_scene_straight-then-right_df64e4f.webp',
    description: 'Sigue indicaciones sencillas de ruta.',
    color: '#dff4ef',
  },
  'lesson-6-6-can-and-cannot': {
    image: 'a1_scene_blocked-route_9f7c4b8.webp',
    description: 'Lo que puedes y no puedes hacer.',
    color: '#dff4ef',
  },
  'lesson-6-7-simple-requests': {
    image: 'a1_scene_i-am-tired-i-need-help_788b204.webp',
    description: 'Pide ayuda de manera sencilla y amable.',
    color: '#dff4ef',
  },
  'lesson-6-8-schedules': {
    image: 'a1_scene_the-bus-leaves-at-eight_d18bc2f.webp',
    description: 'Horarios sencillos de autobús y tren.',
    color: '#dff4ef',
  },
  'lesson-6-9-unit-6-review': {
    image: 'a1_scene_store-bank-bus-train_7ae1547.webp',
    description: 'Repaso de la ciudad y sus rutas.',
    color: '#dff4ef',
  },
  'lesson-6-10-town-mission': {
    image: 'a1_scene_find-the-station_2ffd5ff.webp',
    description: 'Misión para llegar a un destino.',
    color: '#dff4ef',
  },
  'lesson-7-1-the-body': {
    image: 'a1_scene_my-head_bc334a5.webp',
    description: 'Partes comunes del cuerpo.',
    color: '#f1e4fa',
  },
  'lesson-7-2-feelings-and-needs': {
    image: 'a1_scene_woman-tired_82a4165.webp',
    description: 'Estados, sentimientos y necesidades.',
    color: '#f1e4fa',
  },
  'lesson-7-3-clothing': {
    image: 'a1_scene_a-shirt_7a7157d.webp',
    description: 'Ropa común y sus colores.',
    color: '#f1e4fa',
  },
  'lesson-7-4-weather': {
    image: 'a1_scene_rainy_14beca1.webp',
    description: 'Condiciones básicas del clima.',
    color: '#f1e4fa',
  },
  'lesson-7-5-clothes-for-the-weather': {
    image: 'a1_scene_it-is-cold-i-need-a-jacket_181fae6.webp',
    description: 'Elige ropa adecuada para el clima.',
    color: '#f1e4fa',
  },
  'lesson-7-6-hobbies-and-free-time': {
    image: 'a1_scene_ana-reading_4037ade.webp',
    description: 'Pasatiempos y actividades de tiempo libre.',
    color: '#f1e4fa',
  },
  'lesson-7-7-invitations-and-responses': {
    image: 'a1_scene_do-you-want-to-watch-tv_b863d46.webp',
    description: 'Invitaciones y respuestas sencillas.',
    color: '#f1e4fa',
  },
  'lesson-7-8-help-and-important-phrases': {
    image: 'a1_scene_i-do-not-understand_d56b045.webp',
    description: 'Frases importantes para pedir ayuda.',
    color: '#f1e4fa',
  },
  'lesson-7-9-complete-a1-review': {
    image: 'a1_scene_a-boy-a-book-a-park_b812e12.webp',
    description: 'Repaso integrado de todo el nivel A1.',
    color: '#f1e4fa',
  },
  'lesson-7-10-a1-final-mission': {
    image: 'a1_scene_i-am-tired-i-need-water_e960d38.webp',
    description: 'Misión final con situaciones de todo el curso.',
    color: '#f1e4fa',
  },
};

const DEFAULT_VISUAL = VISUALS['lesson-1-people-actions'];
const UNIT_VISUALS: Record<string, { image: string; description: string; color: string }> = {
  'unit-1': { image: 'a1_title_unit_1.webp', description: 'Personas, familia y acciones.', color: '#ffe1ad' },
  'unit-2': { image: 'a1_scene_mission-two-blue-cars_84c4ba2.webp', description: 'Lugares, objetos, números y colores.', color: '#dff4ef' },
  'unit-3': { image: 'a1_scene_job-dialogue-teacher_be7d927.webp', description: 'Presentaciones e información personal.', color: '#e5eefb' },
  'unit-4': { image: 'a1_home.webp', description: 'El hogar y la vida diaria.', color: '#f1e4fa' },
  'unit-5': { image: 'a1_apple.webp', description: 'Comida, bebidas y compras.', color: '#ffe8c7' },
  'unit-6': { image: 'a1_station.webp', description: 'La ciudad, transporte y direcciones.', color: '#dff4ef' },
  'unit-7': { image: 'a1_scene_food-the-bank-it-is-sunny_6a1f116.webp', description: 'Necesidades diarias e integración A1.', color: '#f1e4fa' },
};
type Props = {
  profile: LearnerProfile;
  onHome: () => void;
  onOpenLesson: (lessonId: string, previouslyCompleted: boolean) => void;
  onViewProfile: () => void;
  onSignOut: () => void;
  onOpenQA?: () => void;
};

function lessonName(lesson: LessonSummary): string {
  const previewLesson = getPreviewLessonMetadata(lesson.id);
  const number = previewLesson?.sub_lesson_id || lesson.sub_lesson_id || '';
  const title = previewLesson?.sub_lesson_title
    || lesson.sub_lesson_title
    || previewLesson?.title
    || lesson.title;
  return `${number} ${title}`.trim();
}

function unitName(lesson?: LessonSummary): string {
  const title = lesson?.unit_title || 'People, Family, and Actions';
  return title.replace(/^Unit\s+\d+\s*:\s*/i, '');
}

function lessonVisual(lesson?: LessonSummary) {
  if (!lesson) return DEFAULT_VISUAL;
  return VISUALS[lesson.id] || UNIT_VISUALS[lesson.unit_id || 'unit-1'] || DEFAULT_VISUAL;
}

function unitNumber(lesson?: LessonSummary): number {
  const match = (lesson?.unit_id || lesson?.sub_lesson_id || '1').match(/\d+/);
  return Number(match?.[0] || 1);
}

export function CourseScreen({ profile, onHome, onOpenLesson, onViewProfile, onSignOut, onOpenQA }: Props) {
  const { isUpdatePending } = Updates.useUpdates();
  const currentVersion = Constants.nativeAppVersion || Updates.runtimeVersion || '1.6.0';
  const isPreviewBuild = Updates.channel === 'preview';
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const isLandscape = viewportWidth > viewportHeight;
  const useTwoColumns = (isLandscape && viewportWidth >= 700 && fontScale <= 1.2) || viewportWidth >= 900;
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [progressByLesson, setProgressByLesson] = useState<Record<string, LessonProgress>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLessonId, setLoadingLessonId] = useState('');
  const [recentLessonId, setRecentLessonId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading'>('idle');
  const recentLessonStorageKey = `course:last-lesson:${profile.userId || profile.displayName.trim().toLowerCase()}`;
  const currentLesson = useMemo(
    () => {
      const firstLessonToPass = lessons.find((lesson) => !progressByLesson[lesson.id]?.passed);
      if (firstLessonToPass) return firstLessonToPass;
      return lessons.find((lesson) => lesson.id === recentLessonId) || lessons[lessons.length - 1];
    },
    [lessons, progressByLesson, recentLessonId],
  );
  const currentVisual = lessonVisual(currentLesson);
  const unitGroups = useMemo(() => {
    const grouped = new Map<string, LessonSummary[]>();
    for (const lesson of lessons) {
      const id = lesson.unit_id || `unit-${unitNumber(lesson)}`;
      grouped.set(id, [...(grouped.get(id) || []), lesson]);
    }
    return [...grouped.entries()].map(([id, unitLessons]) => ({ id, lessons: unitLessons }));
  }, [lessons]);
  const selectedUnit = unitGroups.find((unit) => unit.id === selectedUnitId) || null;

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [nextLessons, progressResult] = await Promise.all([
        getLessons(),
        profile.userId ? getLessonProgress(profile.userId).catch(() => null) : Promise.resolve(null),
      ]);
      setLessons(mergePreviewLessonSummaries(nextLessons));
      setProgressByLesson(
        progressResult
          ? Object.fromEntries(progressResult.map((progress) => [progress.lesson_id, progress]))
          : {},
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar las lecciones. Inténtalo otra vez.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [profile.userId]);
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
    onOpenLesson(lessonId, Boolean(progressByLesson[lessonId]?.completed));
  };

  const openProfile = () => {
    setIsAccountMenuOpen(false);
    onViewProfile();
  };

  const openQA = () => {
    setIsAccountMenuOpen(false);
    onOpenQA?.();
  };

  const confirmSignOut = () => {
    setIsAccountMenuOpen(false);
    Alert.alert(
      '¿Cerrar sesión?',
      'Volverás a la pantalla de acceso. Tu progreso permanecerá guardado.',
      [
        { style: 'cancel', text: 'Cancelar' },
        { onPress: onSignOut, style: 'destructive', text: 'Cerrar sesión' },
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
      if (selectedUnitId) {
        setSelectedUnitId(null);
        return true;
      }
      confirmExit();
      return true;
    });
    return () => subscription.remove();
  }, [confirmExit, isAccountMenuOpen, selectedUnitId]);

  const checkForUpdates = async () => {
    if (updateStatus !== 'idle') return;
    setIsAccountMenuOpen(false);
    if (!canUseEasUpdates) {
      Alert.alert(
        'Actualizaciones en desarrollo',
        'Esta compilación recibe los cambios directamente desde Metro. Las actualizaciones instalables se comprueban en las compilaciones preview y production.',
      );
      return;
    }
    try {
      if (isUpdatePending) {
        setUpdateStatus('downloading');
        await saveUpdateReceiptBeforeReload();
        await Updates.reloadAsync();
        return;
      }

      setUpdateStatus('checking');
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) {
        setUpdateStatus('idle');
        Alert.alert('SpanGlish está actualizado', releaseVersionLabel(currentVersion));
        return;
      }

      setUpdateStatus('downloading');
      const fetchedUpdate = await Updates.fetchUpdateAsync();
      if (!fetchedUpdate.isNew) {
        setUpdateStatus('idle');
        Alert.alert('SpanGlish está actualizado', releaseVersionLabel(currentVersion));
        return;
      }
      await saveUpdateReceiptBeforeReload(fetchedUpdate.manifest.id);
      await Updates.reloadAsync();
    } catch {
      setUpdateStatus('idle');
      Alert.alert('No pudimos actualizar', 'Revisa tu conexión a internet e inténtalo otra vez.');
    }
  };

  const renderLessonRow = (lesson: LessonSummary) => {
    const visual = lessonVisual(lesson);
    const globalIndex = lessons.findIndex((candidate) => candidate.id === lesson.id);
    const isCurrent = lesson.id === currentLesson?.id;
    const progress = progressByLesson[lesson.id];
    const isLocked = globalIndex > 0 && !progressByLesson[lessons[globalIndex - 1].id]?.passed;
    const status = isLocked ? 'Bloqueada' : progress?.passed ? 'Completada' : progress ? 'Repetir' : 'Disponible';
    const scoreLabel = progress
      ? `Puntaje ${progress.score}/${progress.total_cards} (${progress.percentage}%)`
      : '';
    const lessonStepNumber = lesson.sub_lesson_id?.split('.')[1] || String(globalIndex + 1);
    return (
      <Pressable
        accessibilityHint={isLocked ? 'Completa la lección anterior con al menos 80 por ciento' : 'Abre esta lección'}
        accessibilityLabel={`${lessonName(lesson)}. ${status}.${scoreLabel ? ` ${scoreLabel}.` : ''} ${visual.description}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLocked }}
        disabled={isLocked}
        key={lesson.id}
        onPress={() => openLesson(lesson.id)}
        style={({ pressed }) => [
          styles.lessonRow,
          useTwoColumns ? styles.lessonRowGrid : null,
          isCurrent ? styles.lessonRowCurrent : null,
          isLocked ? styles.lessonRowLocked : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={[styles.lessonStep, progress?.passed ? styles.lessonStepCompleted : isCurrent ? styles.lessonStepCurrent : null]}>
          {progress?.passed ? (
            <MaterialIcons color="#fff" name="check" size={18} />
          ) : (
            <Text style={[styles.lessonStepText, isCurrent ? styles.lessonStepTextCurrent : null]}>{lessonStepNumber}</Text>
          )}
        </View>
        <View style={[styles.thumbnail, { backgroundColor: visual.color }]}>
          <Image resizeMode="cover" source={lessonImageSource(`/lesson-assets/${visual.image}`)} style={styles.image} />
        </View>
          <View style={styles.lessonCopy}>
          <View style={styles.lessonMeta}>
            <Text style={[
              styles.lessonStatus,
              progress?.passed
                ? styles.lessonStatusCompleted
                : isCurrent
                  ? styles.lessonStatusCurrent
                  : null,
            ]}>{status}</Text>
          </View>
          <Text numberOfLines={2} style={styles.lessonTitle}>{lessonName(lesson)}</Text>
          <Text numberOfLines={1} style={progress ? styles.lessonScore : styles.lessonDescription}>{scoreLabel || visual.description}</Text>
        </View>
        {isLocked ? (
          <MaterialIcons color="#9b958b" name="lock" size={19} />
        ) : loadingLessonId === lesson.id ? (
          <ActivityIndicator color="#16766f" size="small" />
        ) : (
          <Text style={styles.rowArrow}>&gt;</Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        {isPreviewBuild ? (
          <View accessibilityRole="alert" style={styles.previewBanner}>
            <MaterialIcons color="#7a3e00" name="science" size={20} />
            <View style={styles.previewBannerCopy}>
              <Text style={styles.previewBannerTitle}>VERSIÓN DE PRUEBA</Text>
              <Text style={styles.previewBannerText}>Estos cambios todavía no se han enviado a los testers.</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Pressable
              accessibilityLabel="Ir a Inicio"
              accessibilityRole="button"
              onPress={onHome}
              style={({ pressed }) => pressed ? styles.pressed : null}
            >
              <Image
                accessible={false}
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={require('../../assets/spanglish-header-logo.png')}
                style={styles.logo}
              />
            </Pressable>
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
                  {updateStatus === 'idle' ? (
                    <Text style={styles.menuVersion}>{releaseVersionLabel(currentVersion)}</Text>
                  ) : null}
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

              <Pressable accessibilityRole="button" onPress={confirmSignOut} style={({ pressed }) => [styles.menuOption, pressed ? styles.menuOptionPressed : null]}>
                <View style={[styles.menuOptionMark, styles.menuOptionMarkSignOut]}>
                  <MaterialIcons color="#9b5d27" name="logout" size={18} />
                </View>
                <View style={styles.menuOptionCopy}>
                  <Text style={styles.menuOptionTitle}>Cerrar sesión</Text>
                  <Text style={styles.menuOptionDescription}>Vuelve a la pantalla de acceso.</Text>
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
          <View style={styles.loadingPanel}>
            <PlayfulLoading label="Preparando tus lecciones…" />
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
                resizeMode="cover"
                source={lessonImageSource(`/lesson-assets/${currentVisual.image}`)}
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
          selectedUnit ? (
            <View style={styles.courseSection}>
              <Pressable accessibilityRole="button" onPress={() => setSelectedUnitId(null)} style={styles.allUnitsButton}>
                <MaterialIcons color="#16766f" name="arrow-back" size={20} />
                <Text style={styles.allUnitsButtonText}>Todas las unidades</Text>
              </Pressable>
              <View style={[styles.unitHeader, { backgroundColor: UNIT_VISUALS[selectedUnit.id]?.color || '#ffe1ad' }]}>
                <View style={styles.unitNumber}><Text style={styles.unitNumberText}>{unitNumber(selectedUnit.lessons[0])}</Text></View>
                <View style={styles.unitCopy}>
                  <View style={styles.unitMeta}>
                    <Text style={styles.unitEyebrow}>UNIT {unitNumber(selectedUnit.lessons[0])}</Text>
                    <Text style={styles.unitLevel}>{selectedUnit.lessons[0].level}</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.unitTitle}>{unitName(selectedUnit.lessons[0])}</Text>
                  <Text style={styles.unitDescription}>{UNIT_VISUALS[selectedUnit.id]?.description}</Text>
                </View>
                <Text style={styles.lessonCount}>{selectedUnit.lessons.length} lecciones</Text>
              </View>
              <View style={[styles.lessonList, useTwoColumns ? styles.lessonGrid : null]}>
                {selectedUnit.lessons.map(renderLessonRow)}
              </View>
            </View>
          ) : (
            <View style={styles.unitsSection}>
              <View style={styles.unitsHeading}>
                <View>
                  <Text style={styles.unitsEyebrow}>CURSO A1 COMPLETO</Text>
                  <Text style={styles.unitsTitle}>Elige una unidad</Text>
                </View>
                <Text style={styles.unitsCount}>{unitGroups.length} unidades</Text>
              </View>
              <View style={[styles.unitCards, useTwoColumns ? styles.unitCardsWide : null]}>
                {unitGroups.map((unit) => {
                  const firstLesson = unit.lessons[0];
                  const visual = UNIT_VISUALS[unit.id] || DEFAULT_VISUAL;
                  const completed = unit.lessons.filter((lesson) => progressByLesson[lesson.id]?.passed).length;
                  const isCurrentUnit = unit.id === currentLesson?.unit_id;
                  return (
                    <Pressable
                      accessibilityLabel={`Unit ${unitNumber(firstLesson)}. ${unitName(firstLesson)}. ${completed} de ${unit.lessons.length} lecciones completadas.`}
                      accessibilityRole="button"
                      key={unit.id}
                      onPress={() => setSelectedUnitId(unit.id)}
                      style={({ pressed }) => [styles.unitCard, useTwoColumns ? styles.unitCardWide : null, isCurrentUnit ? styles.unitCardCurrent : null, pressed ? styles.pressed : null]}
                    >
                      <View style={[styles.unitCardImage, { backgroundColor: visual.color }]}>
                        <Image resizeMode="cover" source={lessonImageSource(`/lesson-assets/${visual.image}`)} style={styles.image} />
                      </View>
                      <View style={styles.unitCardCopy}>
                        <Text style={styles.unitCardEyebrow}>UNIT {unitNumber(firstLesson)}</Text>
                        <Text numberOfLines={2} style={styles.unitCardTitle}>{unitName(firstLesson)}</Text>
                        <Text numberOfLines={2} style={styles.unitCardDescription}>{visual.description}</Text>
                        <Text style={styles.unitCardProgress}>{completed}/{unit.lessons.length} completadas</Text>
                      </View>
                      <MaterialIcons color="#16766f" name="chevron-right" size={26} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )
        ) : null}

        <Text style={styles.aiNote}>Las voces de práctica pueden ser generadas con IA.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { alignSelf: 'center', gap: 12, maxWidth: 1080, padding: 14, paddingBottom: 28, width: '100%' },
  previewBanner: {
    alignItems: 'center',
    backgroundColor: '#fff0c7',
    borderColor: '#e6a84a',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewBannerCopy: { flex: 1, marginLeft: 10 },
  previewBannerTitle: { color: '#7a3e00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  previewBannerText: { color: '#7a4d1d', fontSize: 11, marginTop: 2 },
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
  menuOptionMarkSignOut: { backgroundColor: '#ffe8c7' },
  menuOptionMarkExit: { backgroundColor: '#fbeceb' },
  menuOptionMarkText: { color: '#46565c', fontSize: 11, fontWeight: '900' },
  menuOptionCopy: { flex: 1, marginHorizontal: 11, minWidth: 0 },
  menuOptionTitle: { color: '#24333a', fontSize: 14, fontWeight: '900' },
  menuOptionTitleExit: { color: '#a34842' },
  menuOptionDescription: { color: '#697177', fontSize: 10, marginTop: 3 },
  menuVersion: { color: '#16766f', fontSize: 11, fontWeight: '900', marginTop: 2 },
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
  unitsSection: { gap: 10 },
  unitsHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4 },
  unitsEyebrow: { color: '#16766f', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  unitsTitle: { color: '#24333a', fontSize: 22, fontWeight: '900', marginTop: 2 },
  unitsCount: { color: '#697177', fontSize: 10, fontWeight: '800' },
  unitCards: { gap: 10 },
  unitCardsWide: { flexDirection: 'row', flexWrap: 'wrap' },
  unitCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 20, borderWidth: 1, flexDirection: 'row', minHeight: 126, padding: 10 },
  unitCardWide: { flexGrow: 1, width: '48%' },
  unitCardCurrent: { borderColor: '#79b8aa', borderWidth: 2 },
  unitCardImage: { borderRadius: 16, height: 102, overflow: 'hidden', width: 122 },
  unitCardCopy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  unitCardEyebrow: { color: '#16766f', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  unitCardTitle: { color: '#24333a', fontSize: 17, fontWeight: '900', lineHeight: 21, marginTop: 2 },
  unitCardDescription: { color: '#697177', fontSize: 10, lineHeight: 14, marginTop: 3 },
  unitCardProgress: { color: '#16766f', fontSize: 10, fontWeight: '900', marginTop: 5 },
  courseSection: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  allUnitsButton: { alignItems: 'center', backgroundColor: '#f4f1eb', flexDirection: 'row', gap: 7, minHeight: 44, paddingHorizontal: 14 },
  allUnitsButtonText: { color: '#16766f', fontSize: 12, fontWeight: '900' },
  unitHeader: { alignItems: 'center', backgroundColor: '#ffe1ad', flexDirection: 'row', minHeight: 98, padding: 14 },
  unitNumber: { alignItems: 'center', backgroundColor: '#fff7e9', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 },
  unitNumberText: { color: '#c94d24', fontSize: 24, fontWeight: '900' },
  unitCopy: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  unitMeta: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  unitEyebrow: { color: '#8a5a20', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  unitLevel: { backgroundColor: '#fff7e9', borderRadius: 5, color: '#8a5a20', fontSize: 8, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 2 },
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
  lessonRowCurrent: { backgroundColor: '#fff5e8', borderColor: '#e6a84a', borderRadius: 16, borderWidth: 1 },
  lessonRowLocked: { backgroundColor: '#f4f1eb', opacity: 0.68 },
  lessonStep: { alignItems: 'center', backgroundColor: '#f2ebde', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  lessonStepCurrent: { backgroundColor: '#e96f42' },
  lessonStepCompleted: { backgroundColor: '#23856f' },
  lessonStepText: { color: '#697177', fontSize: 12, fontWeight: '900' },
  lessonStepTextCurrent: { color: '#fff' },
  thumbnail: { borderRadius: 13, height: 62, marginLeft: 8, overflow: 'hidden', width: 68 },
  lessonCopy: { flex: 1, marginHorizontal: 10, minWidth: 0 },
  lessonMeta: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  lessonStatus: { color: '#8a8176', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  lessonStatusCurrent: { color: '#c94d24' },
  lessonStatusCompleted: { color: '#16766f' },
  lessonTitle: { color: '#24333a', fontSize: 15, fontWeight: '900', lineHeight: 18, marginTop: 3 },
  lessonDescription: { color: '#697177', fontSize: 10, marginTop: 3 },
  lessonScore: { color: '#16766f', fontSize: 11, fontWeight: '900', marginTop: 3 },
  rowArrow: { color: '#b0a79b', fontSize: 22, fontWeight: '700', marginRight: 4 },
  errorPanel: { alignItems: 'center', backgroundColor: '#fbeceb', borderRadius: 16, padding: 15 },
  error: { color: '#a34842', textAlign: 'center' },
  loadingPanel: { alignItems: 'center', paddingVertical: 12 },
  retryButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 44, minWidth: 96 },
  retry: { color: '#a34842', fontWeight: '900' },
  aiNote: { color: '#8a8176', fontSize: 9, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
