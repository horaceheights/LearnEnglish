import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '../components/BrandHeader';
import courseCatalogs from '../generated/course-catalogs.json';
import {
  DAILY_MINUTE_CHOICES,
  DEFAULT_DAILY_MINUTES,
  DEFAULT_DAYS_PER_WEEK,
  LANGUAGE_NATIVE_NAMES,
  languageOffers,
  learnerLanguages,
  type CourseIndexEntry,
  type LearnerLanguage,
} from '../learnerLanguages';
import type { LearnerProfile } from '../types';
import { ui, type UiLanguage } from '../uiText';

// Onboarding (user decision 2026-11-28, docs/product/multilingual-architecture.md):
// which language to learn, which help language, minutes per day and days per week.
// Starting level waits until content up to B2 exists. Adding a second language
// skips the help step and keeps the learner's current help language when offered.
type Step = 'target' | 'help' | 'minutes' | 'days';

type Props = {
  /** The language screens use until the learner picks a help language. */
  initialLanguage: UiLanguage;
  /** 'first' for a learner with no language yet; 'add' to add another one. */
  mode: 'first' | 'add';
  profile: LearnerProfile;
  onCancel?: () => void;
  onDone: (language: LearnerLanguage) => Promise<void>;
};

const OFFERS = languageOffers(courseCatalogs as CourseIndexEntry[]);
const DAY_CHOICES = [1, 2, 3, 4, 5, 6, 7];

export function OnboardingScreen({ initialLanguage, mode, profile, onCancel, onDone }: Props) {
  const studied = useMemo(() => new Set(learnerLanguages(profile).map(entry => entry.target)), [profile]);
  const [target, setTarget] = useState<UiLanguage | null>(null);
  const [help, setHelp] = useState<UiLanguage | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState(DEFAULT_DAILY_MINUTES);
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_DAYS_PER_WEEK);
  const [step, setStep] = useState<Step>('target');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const offer = OFFERS.find(item => item.target === target);
  const steps: Step[] = mode === 'add' ? ['target', 'minutes', 'days'] : ['target', 'help', 'minutes', 'days'];
  const stepIndex = steps.indexOf(step);
  // Screens switch to the help language once it is chosen, never mid-choice.
  const lang = step === 'target' ? initialLanguage : help || initialLanguage;

  const chooseTarget = (next: UiLanguage) => {
    const helpChoices = OFFERS.find(item => item.target === next)?.help || [];
    setTarget(next);
    // Keep the current help language when the new course offers it.
    setHelp(helpChoices.includes(initialLanguage) ? initialLanguage : helpChoices[0] || null);
  };

  const canContinue = step === 'target' ? Boolean(target && help) : step === 'help' ? Boolean(help) : true;

  const next = async () => {
    if (!canContinue || isSaving) return;
    if (stepIndex < steps.length - 1) {
      setStep(steps[stepIndex + 1]);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onDone({ target: target!, help: help!, dailyMinutes, daysPerWeek, startedAt: new Date().toISOString() });
    } catch {
      setError(ui(lang, 'No pudimos guardar tu elección. Inténtalo otra vez.'));
      setIsSaving(false);
    }
  };

  const back = () => {
    if (isSaving) return;
    if (stepIndex > 0) setStep(steps[stepIndex - 1]);
    else onCancel?.();
  };

  const choice = (key: string, label: string, selected: boolean, onPress: () => void, options?: { note?: string; disabled?: boolean }) => (
    <Pressable
      key={key}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: options?.disabled }}
      disabled={options?.disabled}
      onPress={onPress}
      style={[styles.choice, selected ? styles.choiceSelected : null, options?.disabled ? styles.choiceDisabled : null]}>
      <Text style={[styles.choiceLabel, selected ? styles.choiceLabelSelected : null]}>{label}</Text>
      {options?.note ? <Text style={styles.choiceNote}>{options.note}</Text> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <BrandHeader compact title={ui(lang, 'Paso {step} de {total}', { step: stepIndex + 1, total: steps.length })} />
        {step === 'target' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.question}>{ui(lang, '¿Qué idioma quieres aprender?')}</Text>
            <View accessibilityRole="radiogroup" style={styles.choices}>
              {OFFERS.map(item => {
                const unavailable = !item.help.length;
                const already = studied.has(item.target);
                return choice(item.target, LANGUAGE_NATIVE_NAMES[item.target], item.target === target,
                  () => chooseTarget(item.target), {
                    disabled: unavailable || already,
                    note: unavailable ? ui(lang, 'Próximamente') : already ? ui(lang, 'Ya lo estás aprendiendo') : undefined,
                  });
              })}
            </View>
          </View>
        ) : null}
        {step === 'help' && offer ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.question}>{ui(lang, '¿En qué idioma quieres la ayuda?')}</Text>
            <Text style={styles.explanation}>{ui(lang, 'Las traducciones, las instrucciones y la ayuda aparecerán en este idioma.')}</Text>
            <View accessibilityRole="radiogroup" style={styles.choices}>
              {offer.help.map(language => choice(language, LANGUAGE_NATIVE_NAMES[language], language === help, () => setHelp(language)))}
            </View>
          </View>
        ) : null}
        {step === 'minutes' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.question}>{ui(lang, '¿Cuántos minutos al día quieres practicar?')}</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {DAILY_MINUTE_CHOICES.map(minutes => choice(String(minutes), ui(lang, '{minutes} min', { minutes }),
                minutes === dailyMinutes, () => setDailyMinutes(minutes)))}
            </View>
          </View>
        ) : null}
        {step === 'days' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.question}>{ui(lang, '¿Cuántos días por semana?')}</Text>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {DAY_CHOICES.map(days => choice(String(days), String(days), days === daysPerWeek, () => setDaysPerWeek(days)))}
            </View>
            <Text style={styles.explanation}>{ui(lang, 'Puedes cambiarlo cuando quieras en tu perfil.')}</Text>
          </View>
        ) : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue || isSaving }}
          onPress={() => void next()}
          style={[styles.primary, !canContinue || isSaving ? styles.disabled : null]}>
          {isSaving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.primaryText}>{stepIndex === steps.length - 1 ? ui(lang, 'Empezar') : ui(lang, 'Continuar')}</Text>
          )}
        </Pressable>
        {stepIndex > 0 || onCancel ? (
          <Pressable accessibilityRole="button" onPress={back} style={styles.secondary}>
            <Text style={styles.secondaryText}>{stepIndex > 0 ? ui(lang, 'Atrás') : ui(lang, 'Cancelar')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fbf7ef', flex: 1 },
  page: { gap: 18, padding: 22, paddingBottom: 40 },
  section: { gap: 12 },
  question: { color: '#24333a', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  explanation: { color: '#5d6a70', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  choices: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: {
    alignItems: 'center', backgroundColor: '#fff', borderColor: '#e7ded0', borderRadius: 16, borderWidth: 2,
    justifyContent: 'center', minHeight: 56, minWidth: 64, paddingHorizontal: 18, paddingVertical: 12,
  },
  choiceSelected: { backgroundColor: '#e3f4f1', borderColor: '#16766f' },
  choiceDisabled: { opacity: 0.55 },
  choiceLabel: { color: '#24333a', fontSize: 18, fontWeight: '800' },
  choiceLabelSelected: { color: '#0f5a54' },
  choiceNote: { color: '#7a6a55', fontSize: 13, fontWeight: '700', marginTop: 2 },
  error: { color: '#a34842', fontSize: 14, textAlign: 'center' },
  primary: { alignItems: 'center', backgroundColor: '#c94d24', borderRadius: 15, justifyContent: 'center', minHeight: 54 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  secondaryText: { color: '#16766f', fontSize: 16, fontWeight: '800' },
});
