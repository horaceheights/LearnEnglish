import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
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
  onDeleted: () => void;
};

const PROFILE_LABELS: Record<string, string> = {
  new: 'Principiante',
  unsure: 'Por definir',
  natural_guided: 'Natural y guiado',
  trying: 'Tomando confianza',
  short: 'Sesiones cortas',
};

function profileLabel(value: string): string {
  return PROFILE_LABELS[value] || value.replace(/_/g, ' ');
}

export function ProfileScreen({ profile, onCancel, onSaved, onDeleted }: Props) {
  const [name, setName] = useState(profile.displayName);
  const [isEditing, setIsEditing] = useState(false);
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
      setName(nextProfile.displayName);
      setIsEditing(false);
    } catch {
      setError('No pudimos guardar el perfil. Inténtalo otra vez.');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditing = useCallback(() => {
    setName(profile.displayName);
    setError('');
    setIsEditing(false);
  }, [profile.displayName]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSaving || isDeleting) return true;
      if (isEditing) {
        cancelEditing();
      } else {
        onCancel();
      }
      return true;
    });
    return () => subscription.remove();
  }, [cancelEditing, isDeleting, isEditing, isSaving, onCancel]);

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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <BrandHeader
            compact
            eyebrow="Tu cuenta"
            onLogoPress={onCancel}
            subtitle={isEditing ? 'Actualiza el nombre asociado con tu progreso.' : 'Consulta tu información de aprendizaje.'}
            title={isEditing ? 'Editar perfil' : 'Mi perfil'}
          />
          <View style={styles.board}>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.displayName.trim().charAt(0).toUpperCase() || 'P'}</Text>
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityEyebrow}>ESTUDIANTE</Text>
                <Text numberOfLines={1} style={styles.identityName}>{profile.displayName}</Text>
              </View>
            </View>

            {isEditing ? (
              <>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  autoCapitalize="words"
                  autoFocus
                  onChangeText={setName}
                  onSubmitEditing={save}
                  returnKeyType="done"
                  style={styles.input}
                  value={name}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={!name.trim() || isSaving || isDeleting}
                  onPress={save}
                  style={[styles.primary, !name.trim() || isSaving || isDeleting ? styles.disabled : null]}
                >
                  {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar cambios</Text>}
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={cancelEditing} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Cancelar edición</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.profileDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nivel</Text>
                    <Text style={styles.detailValue}>{profileLabel(profile.level)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Objetivo</Text>
                    <Text style={styles.detailValue}>{profileLabel(profile.immediateGoal)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Modalidad</Text>
                    <Text style={styles.detailValue}>{profileLabel(profile.learningMode)}</Text>
                  </View>
                  <View style={[styles.detailRow, styles.detailRowLast]}>
                    <Text style={styles.detailLabel}>Práctica</Text>
                    <Text style={styles.detailValue}>{profileLabel(profile.sessionLength)}</Text>
                  </View>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setIsEditing(true)} style={styles.primary}>
                  <Text style={styles.primaryText}>Editar perfil</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Volver al curso</Text>
                </Pressable>
              </>
            )}

            {!isEditing ? (
              <>
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
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { flex: 1 },
  scrollContent: { alignSelf: 'center', gap: 18, maxWidth: 720, padding: 18, width: '100%' },
  board: { backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 24, borderWidth: 1, padding: 20 },
  identity: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  avatar: { alignItems: 'center', backgroundColor: '#16766f', borderRadius: 27, height: 54, justifyContent: 'center', width: 54 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  identityCopy: { flex: 1, marginLeft: 13, minWidth: 0 },
  identityEyebrow: { color: '#697177', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  identityName: { color: '#24333a', fontSize: 22, fontWeight: '900', marginTop: 2 },
  profileDetails: { backgroundColor: '#fbf7ef', borderRadius: 16, marginBottom: 4, paddingHorizontal: 14 },
  detailRow: { alignItems: 'center', borderBottomColor: '#e7ded0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: '#697177', fontSize: 12, fontWeight: '800' },
  detailValue: { color: '#24333a', flex: 1, fontSize: 13, fontWeight: '900', marginLeft: 16, textAlign: 'right', textTransform: 'capitalize' },
  label: { color: '#24333a', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  input: { borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, color: '#24333a', fontSize: 17, minHeight: 54, paddingHorizontal: 16 },
  error: { color: '#b94b44', fontSize: 13, marginTop: 10 },
  primary: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 15, justifyContent: 'center', marginTop: 18, minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 10, minHeight: 52 },
  secondaryText: { color: '#24333a', fontSize: 16, fontWeight: '800' },
  legalLinks: { alignItems: 'center', gap: 10, marginTop: 18 },
  legalText: { color: '#176f73', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  deleteButton: { alignItems: 'center', borderColor: '#d9aaa6', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 22, minHeight: 50 },
  deleteText: { color: '#a34842', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.45 },
});
