import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteLearnerProfile, saveLearnerProfile } from '../api';
import { BrandHeader } from '../components/BrandHeader';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL } from '../config';
import { persistProfile, profileFromUser } from '../profile';
import type { LearnerProfile } from '../types';

type Props = {
  profile: LearnerProfile;
  onCancel: () => void;
  onSaved: (profile: LearnerProfile) => void;
  onSignOut: () => void;
  onDeleted: () => void;
};

export function ProfileScreen({ profile, onCancel, onSaved, onSignOut, onDeleted }: Props) {
  const [name, setName] = useState(profile.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const confirmDelete = () => {
    if (!profile.userId || isDeleting) return;
    Alert.alert(
      'Eliminar perfil y datos',
      'Se eliminarán permanentemente tu perfil, progreso, sesiones y respuestas. Esta acción no se puede deshacer.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          style: 'destructive',
          text: 'Eliminar definitivamente',
          onPress: () => {
            setIsDeleting(true);
            setError('');
            void deleteLearnerProfile(profile.userId!)
              .then(onDeleted)
              .catch(() => setError('No pudimos eliminar el perfil. Inténtalo otra vez.'))
              .finally(() => setIsDeleting(false));
          },
        },
      ],
    );
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
          <Pressable disabled={!name.trim() || isSaving || isDeleting} onPress={save} style={styles.primary}>
            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar</Text>}
          </Pressable>
          <Pressable onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>Atrás</Text></Pressable>
          <Pressable onPress={onSignOut} style={styles.signOut}><Text style={styles.signOutText}>Cambiar de usuario</Text></Pressable>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text style={styles.legalText}>Política de privacidad</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}>
              <Text style={styles.legalText}>Información sobre eliminación de datos</Text>
            </Pressable>
          </View>
          <Pressable disabled={!profile.userId || isDeleting} onPress={confirmDelete} style={styles.deleteButton}>
            {isDeleting
              ? <ActivityIndicator color="#a34842" />
              : <Text style={styles.deleteText}>Eliminar mi perfil y mis datos</Text>}
          </Pressable>
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
  primary: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 15, justifyContent: 'center', marginTop: 18, minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 10, minHeight: 52 },
  secondaryText: { color: '#24333a', fontSize: 16, fontWeight: '800' },
  signOut: { alignItems: 'center', marginTop: 18, padding: 8 },
  signOutText: { color: '#a34842', fontSize: 14, fontWeight: '800' },
  legalLinks: { alignItems: 'center', gap: 10, marginTop: 18 },
  legalText: { color: '#176f73', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  deleteButton: { alignItems: 'center', borderColor: '#d9aaa6', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 22, minHeight: 50 },
  deleteText: { color: '#a34842', fontSize: 14, fontWeight: '900' },
});
