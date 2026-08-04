import { useState } from 'react';
import {
  ActivityIndicator,
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

import { getLearnerByName, saveLearnerProfile } from '../api';
import { BrandHeader } from '../components/BrandHeader';
import { ACCOUNT_DELETION_URL, PRIVACY_POLICY_URL } from '../config';
import { DEFAULT_PROFILE, persistProfile, profileFromUser } from '../profile';
import type { LearnerProfile } from '../types';

type Props = { onAuthenticated: (profile: LearnerProfile) => void };

export function LoginScreen({ onAuthenticated }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState<'login' | 'create' | null>(null);
  const canContinue = Boolean(name.trim()) && !busyAction;

  const finish = async (profile: LearnerProfile) => {
    await persistProfile(profile);
    onAuthenticated(profile);
  };

  const login = async () => {
    if (!canContinue) return;
    setBusyAction('login');
    setError('');
    try {
      await finish(profileFromUser(await getLearnerByName(name.trim())));
    } catch {
      setError('No encontramos ese usuario. Toca “Nuevo usuario” para crear el perfil.');
    } finally {
      setBusyAction(null);
    }
  };

  const create = async () => {
    if (!canContinue) return;
    setBusyAction('create');
    setError('');
    try {
      const profile = { ...DEFAULT_PROFILE, displayName: name.trim() };
      await finish(profileFromUser(await saveLearnerProfile(profile)));
    } catch {
      setError('No pudimos guardar el perfil. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
        <BrandHeader
          eyebrow="Bienvenido"
          subtitle="Entra con tu nombre para continuar tu práctica."
          title="Aprende inglés de forma natural"
        />
        <View style={styles.board}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={(value) => { setName(value); setError(''); }}
            onSubmitEditing={login}
            placeholder="Tu nombre"
            returnKeyType="go"
            style={styles.input}
            value={name}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={login}
            style={[styles.primary, !canContinue ? styles.disabled : null]}
          >
            {busyAction === 'login' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Entrar</Text>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={create}
            style={[styles.secondary, !canContinue ? styles.disabled : null]}
          >
            {busyAction === 'create' ? <ActivityIndicator color="#24333a" /> : <Text style={styles.secondaryText}>Nuevo usuario</Text>}
          </Pressable>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text style={styles.legalText}>Política de privacidad</Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}>
              <Text style={styles.legalText}>Eliminación de perfiles y datos</Text>
            </Pressable>
          </View>
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
  input: { backgroundColor: '#fff', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, color: '#24333a', fontSize: 17, minHeight: 54, paddingHorizontal: 16 },
  error: { color: '#b94b44', fontSize: 13, lineHeight: 18, marginTop: 10 },
  primary: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 15, justifyContent: 'center', marginTop: 18, minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondary: { alignItems: 'center', borderColor: '#ddd8cf', borderRadius: 15, borderWidth: 1, justifyContent: 'center', marginTop: 10, minHeight: 52 },
  secondaryText: { color: '#24333a', fontSize: 16, fontWeight: '700' },
  legalLinks: { alignItems: 'center', gap: 10, marginTop: 20 },
  legalText: { color: '#176f73', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  disabled: { opacity: 0.45 },
});
