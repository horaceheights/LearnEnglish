const SPANISH_FIRST_LESSONS = new Set([
  'lesson-1-people-actions',
  'lesson-2-pronouns',
  'lesson-3-two-people',
  'lesson-4-children-siblings',
  'lesson-1-5-brothers-sisters-adults',
  'lesson-5-parents-grandparents',
  'lesson-6-family-actions',
  'lesson-7-is-are-not',
  'lesson-8-who',
  'lesson-9-unit-review',
  'lesson-10-family-mission',
]);

const SPANISH_STAGE_LABELS: Record<string, string> = {
  'Learn': 'Aprende',
  'Recognize': 'Reconoce',
  'Speak': 'Habla',
  'Use': 'Completa',
  'Action Introduction': 'Presentación de acciones',
  'Family': 'Familia',
  'Family Action Practice': 'Acciones en familia',
  'Family Challenge': 'Reto de familia',
  'Family Sentences': 'Oraciones de familia',
  'Grammar': 'Gramática',
  'Listen': 'Comprensión auditiva',
  'Listen To Picture': 'Escucha y elige',
  'Meaning Practice': 'Práctica de significado',
  'More People': 'Más personas',
  'New Grammar': 'Gramática nueva',
  'New Vocab': 'Vocabulario nuevo',
  'New Words': 'Palabras nuevas',
  'Pattern': 'Patrón',
  'Pattern Challenge': 'Reto de patrones',
  'People': 'Personas',
  'People Challenge': 'Reto de personas',
  'Picture To Text': 'De imagen a texto',
  'Plural Challenge': 'Reto de frases plurales',
  'Pronoun Pattern': 'Patrón de pronombres',
  'Pronouns': 'Pronombres',
  'Pronunciation': 'Pronunciación',
  'Pronunciation Practice': 'Práctica de pronunciación',
  'What Is It?': 'Aprende a preguntar',
};

import type { UiLanguage } from './uiText';

// Courses for English speakers (uiLanguage "en", user decision 2026-11-19) show
// English stage names and instructions. Kept inline: this module has no runtime imports.
const ENGLISH_STAGE_LABELS: Record<string, string> = {
  'Use': 'Complete',
  'Listen To Picture': 'Listen and choose',
  'What Is It?': 'Learn to ask',
};
const SHORT_ENGLISH_STAGE_LABELS: Record<string, string> = {
  'Use': 'Complete',
  'Listen To Picture': 'Listen',
  'Pronunciation Practice': 'Pronounce',
  'Pronunciation': 'Pronounce',
};
const ENGLISH_INSTRUCTIONS: Record<string, string> = {
  '¡Elige la frase que corresponde a la imagen!': 'Choose the sentence that matches the picture!',
  '¡Elige la palabra que corresponde a la imagen!': 'Choose the word that matches the picture!',
  '¡Escucha y repite!': 'Listen and repeat!',
  '¡Escucha y elige!': 'Listen and choose!',
  '¡Escucha y elige la foto!': 'Listen and choose the photo!',
  '¡Escucha y elige la frase!': 'Listen and choose the sentence!',
};

function inLanguage(language: UiLanguage, spanish: string) {
  return language === 'en' ? ENGLISH_INSTRUCTIONS[spanish] ?? spanish : spanish;
}

const LISTEN_AND_CHOOSE_PROMPT = 'Listen and choose.';
const CHOOSE_CORRECT_PHRASE_INSTRUCTION = '¡Elige la frase que corresponde a la imagen!';
const CHOOSE_CORRECT_WORD_INSTRUCTION = '¡Elige la palabra que corresponde a la imagen!';
const LISTEN_AND_REPEAT_INSTRUCTION = '¡Escucha y repite!';
const EQUIVALENT_SUBJECT_PRONOUNS = new Set(['he', 'she', 'they', 'it']);
const PRONOUN_BE_FORMS: Record<string, string> = {
  he: 'is',
  it: 'is',
  she: 'is',
  they: 'are',
};
const SUBJECT_FOCUS_STOP_WORDS = new Set(['a', 'an', 'and', 'the']);

const SPANISH_INSTRUCTION_PROMPTS: Record<string, string> = {
  [LISTEN_AND_CHOOSE_PROMPT]: '¡Escucha y elige!',
};

const SHORT_SPANISH_STAGE_LABELS: Record<string, string> = {
  'Learn': 'Aprende',
  'Recognize': 'Reconoce',
  'Speak': 'Habla',
  'Use': 'Completa',
  'Action Introduction': 'Acciones',
  'Family': 'Familia',
  'Family Action Practice': 'Acciones',
  'Family Challenge': 'Reto',
  'Family Sentences': 'Frases',
  'Grammar': 'Gramática',
  'Listen': 'Escucha',
  'Listen To Picture': 'Escucha',
  'Meaning Practice': 'Significado',
  'More People': 'Personas',
  'Negation Practice': 'Negación',
  'New Grammar': 'Gramática',
  'New Vocab': 'Vocab',
  'New Words': 'Palabras',
  'Pattern': 'Patrón',
  'Pattern Challenge': 'Reto',
  'People': 'Personas',
  'People Challenge': 'Reto',
  'Picture To Text': 'Imagen-texto',
  'Plural Challenge': 'Plural',
  'Pronoun Pattern': 'Pronombres',
  'Pronouns': 'Pronombres',
  'Pronunciation': 'Pronuncia',
  'Pronunciation Practice': 'Pronuncia',
  'What Is It?': '¿Qué es?',
};

export function usesSpanishInstructions(lessonId: string) {
  return SPANISH_FIRST_LESSONS.has(lessonId);
}

// Stage names are Spanish in every unit, as they were first in Unit 1.
export function lessonStageLabel(_lessonId: string, stage: string, language: UiLanguage = 'es') {
  if (language === 'en') return ENGLISH_STAGE_LABELS[stage] || stage;
  return SPANISH_STAGE_LABELS[stage] || stage;
}

export function lessonStageShortLabel(lessonId: string, stage: string, language: UiLanguage = 'es') {
  if (language === 'en') return SHORT_ENGLISH_STAGE_LABELS[stage] || lessonStageLabel(lessonId, stage, language);
  return SHORT_SPANISH_STAGE_LABELS[stage] || lessonStageLabel(lessonId, stage);
}

export function lessonPromptText(lessonId: string, prompt: string, language: UiLanguage = 'es') {
  const instruction = SPANISH_INSTRUCTION_PROMPTS[prompt.trim()];
  if (instruction) return inLanguage(language, instruction);
  if (!usesSpanishInstructions(lessonId)) return prompt;
  return prompt;
}

export function usesCompactListenInstruction(stage: string, prompt: string) {
  const listeningInstruction = prompt.trim() === LISTEN_AND_CHOOSE_PROMPT
    || prompt.trim() === SPANISH_INSTRUCTION_PROMPTS[LISTEN_AND_CHOOSE_PROMPT]
    || prompt.trim() === ENGLISH_INSTRUCTIONS[SPANISH_INSTRUCTION_PROMPTS[LISTEN_AND_CHOOSE_PROMPT]];
  return (stage === 'Listen' || stage === 'Recognize') && listeningInstruction;
}

export function listeningChoiceInstruction(options: readonly { image_url?: string | null }[], language: UiLanguage = 'es') {
  if (options.length > 0 && options.every((option) => option.image_url)) {
    return inLanguage(language, '¡Escucha y elige la foto!');
  }
  if (options.length > 0 && options.every((option) => !option.image_url)) {
    return inLanguage(language, '¡Escucha y elige la frase!');
  }
  return inLanguage(language, SPANISH_INSTRUCTION_PROMPTS[LISTEN_AND_CHOOSE_PROMPT]);
}

export function usesCompactRecognizeInstruction(stage: string, prompt: string) {
  return stage === 'Recognize' && (!prompt.trim()
    || /^[¡!]?elige la (?:frase|palabra)(?: correcta)?[!.]?$/i.test(prompt.trim()));
}

export function usesCompactSpeakInstruction(stage: string) {
  return stage === 'Speak' || stage === 'Pronunciation Practice';
}

// Single-word choices (colors, numbers, "Hello." or "Goodbye.") ask for the word;
// everything else asks for the phrase, as in Lesson 1.1.
export function recognizeChoiceInstruction(options: readonly { label?: string | null }[], language: UiLanguage = 'es') {
  const labels = options.map((option) => (option.label ?? '').trim().replace(/[.!?]+$/, ''));
  return inLanguage(language, labels.length > 0 && labels.every((label) => label && !/\s/.test(label))
    ? CHOOSE_CORRECT_WORD_INSTRUCTION
    : CHOOSE_CORRECT_PHRASE_INSTRUCTION);
}

export function lessonHeaderPromptText(
  lessonId: string,
  stage: string,
  prompt: string,
  options: readonly { label?: string | null }[] = [],
  language: UiLanguage = 'es',
) {
  if (usesCompactRecognizeInstruction(stage, prompt)) return recognizeChoiceInstruction(options, language);
  return lessonPromptText(lessonId, prompt, language);
}

export function completionEquivalenceFocusWords(prompt: string, selectedAnswer: string) {
  const normalizedAnswer = selectedAnswer.trim().toLowerCase();
  if (!EQUIVALENT_SUBJECT_PRONOUNS.has(normalizedAnswer)) return [];

  const clauses = prompt.trim().match(
    /^(.+?)\s+(is|are)\s+(.+?)(?:,\s*|\s+and\s+)(?:_{2,}|\[blank\])\s+(?:(is|are)|_{2,}|\[blank\])\s+(.+)$/i,
  );
  if (!clauses) return [];

  const antecedentBe = clauses[2].toLowerCase();
  const pronounBe = clauses[4]?.toLowerCase() || PRONOUN_BE_FORMS[normalizedAnswer];
  if (antecedentBe !== pronounBe || PRONOUN_BE_FORMS[normalizedAnswer] !== pronounBe) return [];

  return (clauses[1].toLowerCase().match(/[a-z']+/g) || [])
    .filter((word) => !SUBJECT_FOCUS_STOP_WORDS.has(word));
}

export function pronunciationInstruction(language: UiLanguage = 'es') {
  return inLanguage(language, LISTEN_AND_REPEAT_INSTRUCTION);
}
