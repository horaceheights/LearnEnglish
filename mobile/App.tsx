import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ConnectivityBanner } from './src/components/ConnectivityBanner';
import { AccountGate } from './src/components/AccountGate';
import { BundledLessonImagesGate } from './src/components/BundledLessonImagesGate';
import { PlayfulLoading } from './src/components/PlayfulLoading';
import {
  addDiagnosticBreadcrumb,
  captureDiagnosticError,
  getDiagnosticContext,
  setDiagnosticContext,
  type DiagnosticContext,
} from './src/diagnostics';
import { saveLearnerProfile } from './src/api';
import { synchronizeAccount } from './src/accountSync';
import {
  activeLearnerLanguage,
  deviceHelpLanguage,
  learnerLanguageFor,
  learnerLanguages,
  needsOnboarding,
  withLearnerLanguage,
} from './src/learnerLanguages';
import { clearLocalProfile, persistProfile, profileFromUser } from './src/profile';
import { CourseScreen } from './src/screens/CourseScreen';
import { EngineQAScreen } from './src/screens/EngineQAScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { UiLanguageContext, helpLanguageForLesson, targetLanguageForLesson, type UiLanguage } from './src/uiLanguage';
import { useConnectivity } from './src/hooks/useConnectivity';
import { syncLocalLessonResults } from './src/localLessonResults';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { LearnerProfile } from './src/types';
import {
  canUseEasUpdates,
  consumeCompletedUpdateMessage,
  saveUpdateReceiptBeforeReload,
} from './src/updates';

type Screen =
  | { name: 'course' }
  | { name: 'lesson'; lessonId: string; initialCardIndex?: number; previouslyCompleted?: boolean; qaMode?: boolean }
  | { name: 'profile' }
  | { name: 'qa' }
  | { name: 'add-language' };


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
                v{Updates.runtimeVersion || '1.6.0'} · {Updates.updateId?.slice(0, 8) || 'embedded'}
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

function AppContent({ accountProfile, signOut }: { accountProfile: LearnerProfile; signOut: () => Promise<void> }) {
  const [profile, setProfile] = useState<LearnerProfile>(accountProfile);
  const [screen, setScreen] = useState<Screen>({ name: 'course' });
  const isRestoring = false;
  const isOffline = useConnectivity();

  useEffect(() => {
    if (!profile?.userId || isOffline) return;
    const userId = profile.userId;
    const sync = () => { void syncLocalLessonResults(userId).catch(() => undefined); };
    sync();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') sync(); });
    return () => subscription.remove();
  }, [isOffline, profile?.userId]);

  // A snapshot fetched before a language choice was saved must not undo it.
  useEffect(() => {
    setProfile(current => needsOnboarding(accountProfile) && !needsOnboarding(current)
      ? { ...accountProfile, languages: current.languages, activeTarget: current.activeTarget }
      : accountProfile);
  }, [accountProfile]);
  const [qaHelpLanguage, setQaHelpLanguage] = useState<UiLanguage | null>(null);
  const activeLanguage = activeLearnerLanguage(profile);

  // Languages, help language and goal live in the account profile (2026-11-28).
  const saveLanguages = async (nextProfile: LearnerProfile) => {
    const saved = { ...profileFromUser(await saveLearnerProfile(nextProfile)), qaAccess: profile.qaAccess };
    await persistProfile(saved);
    setProfile(saved);
    void synchronizeAccount().catch(() => undefined);
  };

  useEffect(() => {
    addDiagnosticBreadcrumb('screen_changed', { screen: screen.name });
    if (screen.name !== 'lesson') {
      setDiagnosticContext({ operation: `screen_${screen.name}` });
    }
  }, [screen]);

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.loading}>
        <PlayfulLoading label="Preparando SpanGlish…" />
      </SafeAreaView>
    );
  }

  const hasQaAccess = accountProfile.qaAccess === true;

  // Every learner picks a language first; existing learners once (2026-11-28).
  if (!activeLanguage || screen.name === 'add-language') {
    const adding = Boolean(activeLanguage);
    return (
      <OnboardingScreen
        initialLanguage={activeLanguage?.help || deviceHelpLanguage()}
        mode={adding ? 'add' : 'first'}
        onCancel={adding ? () => setScreen({ name: 'course' }) : undefined}
        onDone={async (language) => {
          await saveLanguages(withLearnerLanguage(profile, language));
          setScreen({ name: 'course' });
        }}
        profile={profile}
      />
    );
  }

  if (screen.name === 'lesson') {
    // A lesson runs in the learner's help language for its target language when
    // the course offers it, else the course's default (2026-11-28); QA may force one.
    const lessonHelp = helpLanguageForLesson(
      screen.lessonId,
      learnerLanguageFor(profile, targetLanguageForLesson(screen.lessonId))?.help,
      screen.qaMode ? qaHelpLanguage : null,
    );
    return (
      <UiLanguageContext.Provider value={lessonHelp}>
      <LessonScreen
        key={screen.lessonId}
        initialCardIndex={screen.initialCardIndex}
        lessonId={screen.lessonId}
        onExit={() => setScreen(screen.qaMode ? { name: 'qa' } : { name: 'course' })}
        onHome={() => setScreen({ name: 'course' })}
        onNext={(lessonId) => setScreen({ name: 'lesson', lessonId })}
        previouslyCompleted={screen.previouslyCompleted}
        profile={profile}
        qaMode={screen.qaMode}
      />
      </UiLanguageContext.Provider>
    );
  }

  if (screen.name === 'profile') {
    return (
      <ProfileScreen
        lang={activeLanguage.help}
        onSaveLanguages={saveLanguages}
        onCancel={() => setScreen({ name: 'course' })}
        onSaved={(nextProfile) => {
          setProfile(nextProfile);
        }}
        onDeleted={() => {
          void clearLocalProfile();
          void signOut();
          setScreen({ name: 'course' });
        }}
        profile={profile}
      />
    );
  }

  if (screen.name === 'qa' && hasQaAccess) {
    return (
      <EngineQAScreen
        helpLanguage={qaHelpLanguage}
        onHelpLanguageChange={setQaHelpLanguage}
        onExit={() => setScreen({ name: 'course' })}
        onOpenCard={(lessonId, initialCardIndex) =>
          setScreen({ initialCardIndex, lessonId, name: 'lesson', qaMode: true })}
      />
    );
  }

  return (
    <CourseScreen
      activeTarget={activeLanguage.target}
      helpLanguage={activeLanguage.help}
      studiedLanguages={learnerLanguages(profile).map(entry => entry.target)}
      onAddLanguage={() => setScreen({ name: 'add-language' })}
      onSwitchLanguage={(target) => {
        if (target === activeLanguage.target) return;
        const switched = { ...profile, activeTarget: target };
        setProfile(switched);
        void saveLanguages(switched).catch(() => undefined);
      }}
      onHome={() => setScreen({ name: 'course' })}
      onSignOut={() => {
        void clearLocalProfile();
        void signOut();
        setScreen({ name: 'course' });
      }}
      onOpenLesson={(lessonId, previouslyCompleted) => setScreen({ lessonId, name: 'lesson', previouslyCompleted })}
      onOpenQA={hasQaAccess ? () => setScreen({ name: 'qa' }) : undefined}
      onViewProfile={() => setScreen({ name: 'profile' })}
      profile={profile}
    />
  );
}

function StartupUpdateGate({ children }: { children: ReactNode }) {
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(canUseEasUpdates);

  useEffect(() => {
    if (!canUseEasUpdates) return;

    let isMounted = true;

    const applyAvailableUpdate = async () => {
      let completedUpdateMessage: string | null = null;
      try {
        completedUpdateMessage = await consumeCompletedUpdateMessage();
        addDiagnosticBreadcrumb('startup_update_check');
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;

        addDiagnosticBreadcrumb('startup_update_download');
        const fetchedUpdate = await Updates.fetchUpdateAsync();
        if (!fetchedUpdate.isNew) return;
        await saveUpdateReceiptBeforeReload(fetchedUpdate.manifest.id);
        addDiagnosticBreadcrumb('startup_update_reload');
        await Updates.reloadAsync();
      } catch (error) {
        captureDiagnosticError(error, 'startup_update');
      } finally {
        if (isMounted) {
          setIsCheckingForUpdate(false);
          if (completedUpdateMessage) {
            Alert.alert('Actualización completada', completedUpdateMessage);
          }
        }
      }
    };

    void applyAvailableUpdate();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingForUpdate) {
    return (
      <SafeAreaView style={styles.loading}>
        <PlayfulLoading label="Preparando SpanGlish…" />
      </SafeAreaView>
    );
  }

  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.appFrame}>
        <ConnectivityBanner />
        <AppErrorBoundary>
          <StartupUpdateGate>
            <BundledLessonImagesGate>
              <AccountGate>{(profile, signOut) => <AppContent key={profile.userId} accountProfile={profile} signOut={signOut} />}</AccountGate>
            </BundledLessonImagesGate>
          </StartupUpdateGate>
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
