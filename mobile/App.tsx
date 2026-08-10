import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ConnectivityBanner } from './src/components/ConnectivityBanner';
import {
  addDiagnosticBreadcrumb,
  captureDiagnosticError,
  getDiagnosticContext,
  setDiagnosticContext,
  type DiagnosticContext,
} from './src/diagnostics';
import { clearLocalProfile, loadLocalProfile } from './src/profile';
import { CourseScreen } from './src/screens/CourseScreen';
import { EngineQAScreen } from './src/screens/EngineQAScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { LearnerProfile } from './src/types';

type Screen =
  | { name: 'course' }
  | { name: 'lesson'; lessonId: string; initialCardIndex?: number; qaMode?: boolean }
  | { name: 'profile' }
  | { name: 'qa' };

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; diagnostic: DiagnosticContext }
> {
  state: { error: Error | null; diagnostic: DiagnosticContext } = { diagnostic: {}, error: null };

  static getDerivedStateFromError(error: Error) {
    return { diagnostic: getDiagnosticContext(), error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureDiagnosticError(error, 'render_error', {
      component_stack: info.componentStack || 'unavailable',
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <SafeAreaView style={styles.crashPage}>
        <View style={styles.crashPanel}>
          <Text style={styles.crashTitle}>SpanGlish encontró un error</Text>
          <Text style={styles.crashText}>{this.state.error.message}</Text>
          {this.state.diagnostic.lessonId ? (
            <View style={styles.diagnosticPanel}>
              <Text style={styles.diagnosticTitle}>CONTEXTO DE DIAGNÓSTICO</Text>
              <Text style={styles.diagnosticText}>
                {this.state.diagnostic.lessonId} · tarjeta {(this.state.diagnostic.cardIndex ?? 0) + 1}/
                {this.state.diagnostic.totalCards ?? '?'}
              </Text>
              <Text style={styles.diagnosticText}>
                {this.state.diagnostic.stage || 'Etapa desconocida'} · QA {this.state.diagnostic.qaMode ? 'ON' : 'OFF'}
              </Text>
              <Text numberOfLines={2} style={styles.diagnosticPrompt}>
                {this.state.diagnostic.prompt}
              </Text>
              <Text style={styles.diagnosticText}>
                v{Updates.runtimeVersion || '1.5.0'} · {Updates.updateId?.slice(0, 8) || 'embedded'}
              </Text>
            </View>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => void Updates.reloadAsync()} style={styles.crashButton}>
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
      .catch((error) => captureDiagnosticError(error, 'restore_local_profile'))
      .finally(() => setIsRestoring(false));
  }, []);

  useEffect(() => {
    addDiagnosticBreadcrumb('screen_changed', { screen: screen.name });
    if (screen.name !== 'lesson') {
      setDiagnosticContext({ operation: `screen_${screen.name}` });
    }
  }, [screen]);

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

  const hasQaAccess = profile.displayName.trim().toLowerCase() === 'horace';

  if (screen.name === 'lesson') {
    return (
      <LessonScreen
        initialCardIndex={screen.initialCardIndex}
        lessonId={screen.lessonId}
        onExit={() => setScreen(screen.qaMode ? { name: 'qa' } : { name: 'course' })}
        profile={profile}
        qaMode={screen.qaMode}
      />
    );
  }

  if (screen.name === 'profile') {
    return (
      <ProfileScreen
        onCancel={() => setScreen({ name: 'course' })}
        onSaved={(nextProfile) => {
          setProfile(nextProfile);
        }}
        onDeleted={() => {
          void clearLocalProfile();
          setProfile(null);
          setScreen({ name: 'course' });
        }}
        profile={profile}
      />
    );
  }

  if (screen.name === 'qa' && hasQaAccess) {
    return (
      <EngineQAScreen
        onExit={() => setScreen({ name: 'course' })}
        onOpenCard={(lessonId, initialCardIndex) =>
          setScreen({ initialCardIndex, lessonId, name: 'lesson', qaMode: true })}
      />
    );
  }

  return (
    <CourseScreen
      onSignOut={() => {
        void clearLocalProfile();
        setProfile(null);
        setScreen({ name: 'course' });
      }}
      onOpenLesson={(lessonId) => setScreen({ lessonId, name: 'lesson' })}
      onOpenQA={hasQaAccess ? () => setScreen({ name: 'qa' }) : undefined}
      onViewProfile={() => setScreen({ name: 'profile' })}
      profile={profile}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.appFrame}>
        <ConnectivityBanner />
        <AppErrorBoundary>
          <AppContent />
        </AppErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appFrame: { backgroundColor: '#fbf7ef', flex: 1 },
  loading: { alignItems: 'center', backgroundColor: '#fbf7ef', flex: 1, justifyContent: 'center' },
  crashPage: { backgroundColor: '#fbf7ef', flex: 1, justifyContent: 'center', padding: 24 },
  crashPanel: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 22, borderWidth: 1, padding: 22 },
  crashTitle: { color: '#24333a', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  crashText: { color: '#a34842', fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' },
  diagnosticPanel: { backgroundColor: '#f4eff8', borderRadius: 13, marginTop: 14, padding: 11 },
  diagnosticTitle: { color: '#76559e', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  diagnosticText: { color: '#4d4353', fontSize: 11, fontWeight: '800', marginTop: 3 },
  diagnosticPrompt: { color: '#6e626f', fontSize: 10, lineHeight: 14, marginTop: 4 },
  crashButton: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 14, marginTop: 18, padding: 14 },
  crashButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
