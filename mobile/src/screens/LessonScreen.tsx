import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getLesson } from '../api';
import { LessonCardView } from '../components/LessonCardView';
import { FIRST_LESSON_ID } from '../config';
import type { Lesson } from '../types';

export function LessonScreen() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  const loadLesson = async () => {
    setIsLoading(true);
    setError('');
    try {
      setLesson(await getLesson(FIRST_LESSON_ID));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the lesson.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLesson();
  }, []);

  const continueLesson = () => {
    if (!lesson) return;
    if (cardIndex >= lesson.cards.length - 1) {
      setIsComplete(true);
      return;
    }
    setSelectedId(null);
    setCardIndex((current) => current + 1);
  };

  const restartLesson = () => {
    setCardIndex(0);
    setSelectedId(null);
    setIsComplete(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color="#287a57" size="large" />
          <Text style={styles.loadingText}>Loading your lesson…</Text>
          <Text style={styles.coldStartText}>The first load can take a little longer while the server wakes up.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>We couldn’t load the lesson</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={loadLesson} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isComplete) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f2e9" />
        <View style={styles.center}>
          <Text style={styles.completeMark}>✓</Text>
          <Text style={styles.completeTitle}>Lesson complete!</Text>
          <Text style={styles.completeText}>
            You finished all {lesson.cards.length} activities in {lesson.title}.
          </Text>
          <Pressable accessibilityRole="button" onPress={restartLesson} style={styles.retryButton}>
            <Text style={styles.retryText}>Practice again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const card = lesson.cards[cardIndex];
  const progress = ((cardIndex + 1) / lesson.cards.length) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f2e9" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.brand}>SPANGLISH</Text>
              <Text style={styles.title}>{lesson.title}</Text>
            </View>
            <Text style={styles.counter}>{cardIndex + 1}/{lesson.cards.length}</Text>
          </View>
          <View
            accessibilityLabel={`${Math.round(progress)} percent complete`}
            accessibilityRole="progressbar"
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <LessonCardView
          card={card}
          key={`${cardIndex}-${card.prompt}`}
          onContinue={continueLesson}
          onSelect={setSelectedId}
          selectedId={selectedId}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f6f2e9', flex: 1 },
  container: { paddingBottom: 30, paddingHorizontal: 18, paddingTop: 22 },
  header: { marginBottom: 18 },
  headerRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { flex: 1 },
  brand: { color: '#287a57', fontSize: 11, fontWeight: '900', letterSpacing: 2.1 },
  title: { color: '#17251f', fontSize: 24, fontWeight: '800', marginTop: 6 },
  counter: { color: '#66736d', fontSize: 13, fontWeight: '700' },
  progressTrack: {
    backgroundColor: '#dedbd2',
    borderRadius: 5,
    height: 7,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#287a57', borderRadius: 5, height: '100%' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  loadingText: { color: '#17251f', fontSize: 19, fontWeight: '800', marginTop: 18 },
  coldStartText: {
    color: '#66736d',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: { color: '#17251f', fontSize: 23, fontWeight: '800', textAlign: 'center' },
  errorText: { color: '#a34842', fontSize: 14, lineHeight: 20, marginTop: 10, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#287a57',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 54,
    paddingHorizontal: 30,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  completeMark: {
    backgroundColor: '#287a57',
    borderRadius: 44,
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    height: 88,
    lineHeight: 84,
    textAlign: 'center',
    width: 88,
  },
  completeTitle: { color: '#17251f', fontSize: 30, fontWeight: '900', marginTop: 22 },
  completeText: { color: '#66736d', fontSize: 16, lineHeight: 23, marginTop: 9, textAlign: 'center' },
});
