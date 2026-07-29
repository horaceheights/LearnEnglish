import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getLessons } from '../api';
import { BrandHeader } from '../components/BrandHeader';
import { absoluteMediaUrl } from '../config';
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
};

export function CourseScreen({ profile, onOpenLesson, onEditProfile }: Props) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [error, setError] = useState('');
  const [loadingLessonId, setLoadingLessonId] = useState('');

  const load = async () => {
    setError('');
    try {
      setLessons(await getLessons());
    } catch {
      setError('No pudimos cargar las lecciones. Inténtalo otra vez.');
    }
  };

  useEffect(() => { void load(); }, []);

  const openLesson = (lessonId: string) => {
    setLoadingLessonId(lessonId);
    onOpenLesson(lessonId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <BrandHeader
          compact
          eyebrow="Tu ruta"
          subtitle="Personas, acciones y frases cortas con imágenes claras."
          title="Lecciones para empezar con claridad"
        />
        <View style={styles.welcome}>
          <View>
            <Text style={styles.welcomeText}>Welcome {profile.displayName}</Text>
            <Text style={styles.aiNote}>Las voces de práctica pueden ser generadas con IA.</Text>
          </View>
          <Pressable accessibilityLabel="Ajustar mi perfil" accessibilityRole="button" onPress={onEditProfile} style={styles.profileButton}>
            <Text style={styles.profileIcon}>◉</Text>
          </Pressable>
        </View>
        <View style={styles.unit}>
          <Text style={styles.unitEyebrow}>UNIT 1</Text>
          <Text style={styles.unitTitle}>People, Actions, and Basic Sentences</Text>
          <Text style={styles.unitDescription}>Aprende a reconocer personas, acciones y frases cortas.</Text>
        </View>
        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={load}><Text style={styles.retry}>Reintentar</Text></Pressable>
          </View>
        ) : null}
        {!lessons.length && !error ? <ActivityIndicator color="#e96f42" size="large" /> : null}
        <View style={styles.grid}>
          {lessons.map((lesson) => {
            const visual = VISUALS[lesson.id] || VISUALS['lesson-1-people-actions'];
            return (
              <Pressable
                accessibilityRole="button"
                key={lesson.id}
                onPress={() => openLesson(lesson.id)}
                style={({ pressed }) => [styles.lessonCard, pressed ? styles.pressed : null]}
              >
                <View style={[styles.imagePanel, { backgroundColor: visual.color }]}>
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
  page: { gap: 16, padding: 16, paddingBottom: 32 },
  welcome: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 21, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  welcomeText: { color: '#24333a', fontSize: 21, fontWeight: '800' },
  aiNote: { color: '#697177', fontSize: 11, marginTop: 4 },
  profileButton: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  profileIcon: { color: '#2f8f62', fontSize: 20 },
  unit: { backgroundColor: '#ffe1ad', borderRadius: 24, padding: 20 },
  unitEyebrow: { color: '#697177', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  unitTitle: { color: '#24333a', fontSize: 27, fontWeight: '900', lineHeight: 32, marginTop: 6 },
  unitDescription: { color: '#526168', fontSize: 14, lineHeight: 20, marginTop: 7 },
  grid: { gap: 14 },
  lessonCard: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, overflow: 'hidden', padding: 10 },
  imagePanel: { borderRadius: 16, height: 180, overflow: 'hidden', position: 'relative' },
  image: { height: '100%', width: '100%' },
  level: { backgroundColor: 'rgba(36,51,58,0.72)', borderRadius: 8, bottom: 10, color: '#fff', fontSize: 11, fontWeight: '900', left: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, position: 'absolute' },
  lessonTitle: { color: '#24333a', fontSize: 22, fontWeight: '900', marginHorizontal: 4, marginTop: 12 },
  lessonDescription: { color: '#697177', fontSize: 14, lineHeight: 20, marginHorizontal: 4, marginTop: 5 },
  start: { color: '#16766f', fontSize: 15, fontWeight: '900', margin: 4, marginTop: 9 },
  errorPanel: { alignItems: 'center', backgroundColor: '#fbeceb', borderRadius: 16, padding: 15 },
  error: { color: '#a34842', textAlign: 'center' },
  retry: { color: '#a34842', fontWeight: '900', marginTop: 8 },
  pressed: { opacity: 0.72 },
});
