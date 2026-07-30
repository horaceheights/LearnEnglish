import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';

import { clearLocalProfile, loadLocalProfile } from './src/profile';
import { CourseScreen } from './src/screens/CourseScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { LearnerProfile } from './src/types';

type Screen = { name: 'course' } | { name: 'lesson'; lessonId: string } | { name: 'profile' };

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SpanGlish] Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.crashPage}>
        <View style={styles.crashPanel}>
          <Text style={styles.crashTitle}>SpanGlish encontró un error</Text>
          <Text style={styles.crashText}>{this.state.error.message}</Text>
          <Pressable onPress={() => void Updates.reloadAsync()} style={styles.crashButton}>
            <Text style={styles.crashButtonText}>Reiniciar la app</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

function AppContent() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'course' });
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    loadLocalProfile()
      .then(setProfile)
      .finally(() => setIsRestoring(false));
  }, []);

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color="#e96f42" size="large" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return <LoginScreen onAuthenticated={setProfile} />;
  }

  if (screen.name === 'lesson') {
    return (
      <LessonScreen
        lessonId={screen.lessonId}
        onExit={() => setScreen({ name: 'course' })}
        profile={profile}
      />
    );
  }

  if (screen.name === 'profile') {
    return (
      <ProfileScreen
        onCancel={() => setScreen({ name: 'course' })}
        onSaved={(nextProfile) => {
          setProfile(nextProfile);
          setScreen({ name: 'course' });
        }}
        onSignOut={() => {
          void clearLocalProfile();
          setProfile(null);
          setScreen({ name: 'course' });
        }}
        profile={profile}
      />
    );
  }

  return (
    <CourseScreen
      onEditProfile={() => setScreen({ name: 'profile' })}
      onOpenLesson={(lessonId) => setScreen({ lessonId, name: 'lesson' })}
      profile={profile}
    />
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: '#fbf7ef', flex: 1, justifyContent: 'center' },
  crashPage: { backgroundColor: '#fbf7ef', flex: 1, justifyContent: 'center', padding: 24 },
  crashPanel: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, padding: 22 },
  crashTitle: { color: '#24333a', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  crashText: { color: '#a34842', fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  crashButton: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 14, marginTop: 18, padding: 14 },
  crashButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
