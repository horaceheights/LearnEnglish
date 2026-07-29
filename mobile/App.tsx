import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';

import { clearLocalProfile, loadLocalProfile } from './src/profile';
import { CourseScreen } from './src/screens/CourseScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { LearnerProfile } from './src/types';

type Screen = { name: 'course' } | { name: 'lesson'; lessonId: string } | { name: 'profile' };

export default function App() {
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

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: '#fbf7ef', flex: 1, justifyContent: 'center' },
});
