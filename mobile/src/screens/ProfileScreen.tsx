import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { saveLearnerProfile } from '../api';
import { BrandHeader } from '../components/BrandHeader';
import { persistProfile, profileFromUser } from '../profile';
import type { LearnerProfile } from '../types';

type Props = {
  profile: LearnerProfile;
  onCancel: () => void;
  onSaved: (profile: LearnerProfile) => void;
  onSignOut: () => void;
};

export function ProfileScreen({ profile, onCancel, onSaved, onSignOut }: Props) {
  const [name, setName] = useState(profile.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setError('');
    try {
      const nextProfile = profileFromUser(await saveLearnerProfile({ ...profile, displayName: name.trim() }));
      await persistProfile(nextProfile);
      onSaved(nextProfile);
    } catch {
      setError('No pudimos guardar el perfil. Inténtalo otra vez.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
        <BrandHeader
          compact
          eyebrow="Tu perfil"
          subtitle="Actualiza el nombre que usamos para guardar tu progreso."
          title="Ajustar mi perfil"
        />
        <View style={styles.board}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setName}
            onSubmitEditing={save}
            returnKeyType="done"
            style={styles.input}
            value={name}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={!name.trim() || isSaving} onPress={save} style={styles.primary}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar</Text>}
          </Pressable>
          <Pressable onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>Atrás</Text></Pressable>
          <Pressable onPress={onSignOut} style={styles.signOut}><Text style={styles.signOutText}>Cambiar de usuario</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flex: 1, gap: 18, justifyContent: 'center', padding: 18 },
  board: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 24, borderWidth: 1, padding: 20 },
  label: { color: '#24333a', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  input: { borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, color: '#24333a', fontSize: 17, minHeight: 54, paddingHorizontal: 16 },
  error: { color: '#b94b44', fontSize: 13, marginTop: 10 },
  primary: { alignItems: 'center', backgroundColor: '#e96f42', borderRadius: 15, justifyContent: 'center', marginTop: 18, minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 10, minHeight: 52 },
  secondaryText: { color: '#24333a', fontSize: 16, fontWeight: '800' },
  signOut: { alignItems: 'center', marginTop: 18, padding: 8 },
  signOutText: { color: '#a34842', fontSize: 14, fontWeight: '800' },
});
