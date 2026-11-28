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
import courseCatalogs from '../generated/course-catalogs.json';
import {
  DAILY_MINUTE_CHOICES,
  LANGUAGE_NATIVE_NAMES,
  languageOffers,
  learnerLanguages,
  type CourseIndexEntry,
  type LearnerLanguage,
} from '../learnerLanguages';
import type { LearnerProfile } from '../types';
import { ui, type UiLanguage } from '../uiText';

type Props = {
  profile: LearnerProfile;
  /** The learner's help language for the active target (2026-11-28). */
  lang: UiLanguage;
  /** Saves the learner's languages, help languages and goals. */
  onSaveLanguages: (profile: LearnerProfile) => Promise<void>;
  onCancel: () => void;
  onSaved: (profile: LearnerProfile) => void;
  onDeleted: () => void;
};

const OFFERS = languageOffers(courseCatalogs as CourseIndexEntry[]);
const DAY_CHOICES = [1, 2, 3, 4, 5, 6, 7];

export function ProfileScreen({ profile, lang, onSaveLanguages, onCancel, onSaved, onDeleted }: Props) {
  const [editingLanguage, setEditingLanguage] = useState<LearnerLanguage | null>(null);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState('');
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
      setError(ui(lang, 'No pudimos guardar el perfil. Inténtalo otra vez.'));
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
      ui(lang, 'Eliminar perfil y datos'),
      ui(lang, 'Se eliminarán permanentemente tu perfil, progreso, sesiones y respuestas. Esta acción no se puede deshacer.'),
      [
        { style: 'cancel', text: ui(lang, 'Cancelar') },
        {
          style: 'destructive',
          text: ui(lang, 'Eliminar definitivamente'),
          onPress: () => {
            setIsDeleting(true);
            setError('');
            void deleteLearnerProfile(profile.userId!)
              .then(onDeleted)
              .catch(() => setError(ui(lang, 'No pudimos eliminar el perfil. Inténtalo otra vez.')))
              .finally(() => setIsDeleting(false));
          },
        },
      ],
    );
  };

  // Each language keeps its own help language and practice goal (2026-11-28).
  const saveLanguage = async () => {
    if (!editingLanguage || isSavingLanguage) return;
    setIsSavingLanguage(true);
    setLanguageError('');
    try {
      const languages = learnerLanguages(profile).map(entry => entry.target === editingLanguage.target ? editingLanguage : entry);
      await onSaveLanguages({ ...profile, languages });
      setEditingLanguage(null);
    } catch {
      setLanguageError(ui(lang, 'No pudimos guardar tu elección. Inténtalo otra vez.'));
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const chip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}>
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );

  const languagesSection = (
    <View style={styles.profileDetails}>
      <Text style={styles.sectionTitle}>{ui(lang, 'Mis idiomas')}</Text>
      {learnerLanguages(profile).map(entry => {
        const editing = editingLanguage?.target === entry.target ? editingLanguage : null;
        const helpChoices = OFFERS.find(offer => offer.target === entry.target)?.help || [entry.help];
        return (
          <View key={entry.target} style={styles.languageRow}>
            <View style={styles.languageHeader}>
              <View style={styles.languageCopy}>
                <Text style={styles.detailValueLeft}>{LANGUAGE_NATIVE_NAMES[entry.target]}</Text>
                <Text style={styles.detailLabel}>
                  {ui(lang, 'Ayuda en {language} · {minutes} min al día · {days} días por semana', {
                    language: LANGUAGE_NATIVE_NAMES[entry.help], minutes: entry.dailyMinutes, days: entry.daysPerWeek,
                  })}
                </Text>
              </View>
              {!editing ? (
                <Pressable accessibilityRole="button" onPress={() => { setLanguageError(''); setEditingLanguage(entry); }} style={styles.changeButton}>
                  <Text style={styles.changeText}>{ui(lang, 'Cambiar')}</Text>
                </Pressable>
              ) : null}
            </View>
            {editing ? (
              <View style={styles.editor}>
                <Text style={styles.detailLabel}>{ui(lang, '¿En qué idioma quieres la ayuda?')}</Text>
                <View accessibilityRole="radiogroup" style={styles.chips}>
                  {helpChoices.map(language => chip(language, LANGUAGE_NATIVE_NAMES[language], editing.help === language,
                    () => setEditingLanguage({ ...editing, help: language })))}
                </View>
                <Text style={styles.detailLabel}>{ui(lang, '¿Cuántos minutos al día quieres practicar?')}</Text>
                <View accessibilityRole="radiogroup" style={styles.chips}>
                  {DAILY_MINUTE_CHOICES.map(minutes => chip(String(minutes), ui(lang, '{minutes} min', { minutes }),
                    editing.dailyMinutes === minutes, () => setEditingLanguage({ ...editing, dailyMinutes: minutes })))}
                </View>
                <Text style={styles.detailLabel}>{ui(lang, '¿Cuántos días por semana?')}</Text>
                <View accessibilityRole="radiogroup" style={styles.chips}>
                  {DAY_CHOICES.map(days => chip(String(days), String(days), editing.daysPerWeek === days,
                    () => setEditingLanguage({ ...editing, daysPerWeek: days })))}
                </View>
                {languageError ? <Text accessibilityRole="alert" style={styles.error}>{languageError}</Text> : null}
                <Pressable accessibilityRole="button" disabled={isSavingLanguage} onPress={() => void saveLanguage()}
                  style={[styles.primary, isSavingLanguage ? styles.disabled : null]}>
                  {isSavingLanguage ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{ui(lang, 'Guardar cambios')}</Text>}
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSavingLanguage} onPress={() => setEditingLanguage(null)} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{ui(lang, 'Cancelar')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <BrandHeader
            compact
            eyebrow={ui(lang, 'Tu cuenta')}
            onLogoPress={onCancel}
            subtitle={isEditing ? ui(lang, 'Actualiza el nombre asociado con tu progreso.') : ui(lang, 'Consulta tu información de aprendizaje.')}
            title={isEditing ? ui(lang, 'Editar perfil') : ui(lang, 'Mi perfil')}
          />
          <View style={styles.board}>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.displayName.trim().charAt(0).toUpperCase() || 'P'}</Text>
              </View>
              <View style={styles.identityCopy}>
                <Text style={styles.identityEyebrow}>{ui(lang, 'ESTUDIANTE')}</Text>
                <Text numberOfLines={1} style={styles.identityName}>{profile.displayName}</Text>
              </View>
            </View>

            {isEditing ? (
              <>
                <Text style={styles.label}>{ui(lang, 'Nombre')}</Text>
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
                  {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{ui(lang, 'Guardar cambios')}</Text>}
                </Pressable>
                <Pressable accessibilityRole="button" disabled={isSaving} onPress={cancelEditing} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{ui(lang, 'Cancelar edición')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                {languagesSection}
                <Pressable accessibilityRole="button" onPress={() => setIsEditing(true)} style={styles.primary}>
                  <Text style={styles.primaryText}>{ui(lang, 'Editar perfil')}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondary}>
                  <Text style={styles.secondaryText}>{ui(lang, 'Volver al curso')}</Text>
                </Pressable>
              </>
            )}

            {!isEditing ? (
              <>
                <View style={styles.legalLinks}>
                  <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
                    <Text style={styles.legalText}>{ui(lang, 'Política de privacidad')}</Text>
                  </Pressable>
                  <Pressable onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)}>
                    <Text style={styles.legalText}>{ui(lang, 'Información sobre eliminación de datos')}</Text>
                  </Pressable>
                </View>
                <Pressable disabled={!profile.userId || isDeleting} onPress={confirmDelete} style={styles.deleteButton}>
                  {isDeleting
                    ? <ActivityIndicator color="#a34842" />
                    : <Text style={styles.deleteText}>{ui(lang, 'Eliminar mi perfil y mis datos')}</Text>}
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
  sectionTitle: { color: '#24333a', fontSize: 15, fontWeight: '900', paddingTop: 12 },
  languageRow: { borderBottomColor: '#e7ded0', borderBottomWidth: 1, paddingVertical: 12 },
  languageHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  languageCopy: { flex: 1, gap: 3, minWidth: 0 },
  detailValueLeft: { color: '#24333a', fontSize: 16, fontWeight: '900' },
  changeButton: { borderColor: '#16766f', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  changeText: { color: '#16766f', fontSize: 13, fontWeight: '900' },
  editor: { gap: 8, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderColor: '#ddd8cf', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: '#e3f4f1', borderColor: '#16766f' },
  chipText: { color: '#24333a', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  chipTextSelected: { color: '#0f5a54' },
});
