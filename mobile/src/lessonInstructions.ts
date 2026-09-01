const SPANISH_FIRST_LESSONS = new Set([
  'lesson-1-people-actions',
  'lesson-2-pronouns',
  'lesson-3-two-people',
  'lesson-4-children-siblings',
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

const LISTEN_AND_CHOOSE_PROMPT = 'Listen and choose.';
const CHOOSE_CORRECT_PHRASE_INSTRUCTION = '¡Elige la frase correcta!';
const LISTEN_AND_REPEAT_INSTRUCTION = '¡Escucha y repite!';

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

const SHORT_ENGLISH_STAGE_LABELS: Record<string, string> = {
  'Learn': 'Learn',
  'Recognize': 'Recognize',
  'Speak': 'Speak',
  'Use': 'Use',
  'Action Introduction': 'Actions',
  'Family Action Practice': 'Actions',
  'Family Challenge': 'Challenge',
  'Family Sentences': 'Sentences',
  'Listen To Picture': 'Listen',
  'Meaning Practice': 'Meaning',
  'More People': 'People',
  'Negation Practice': 'Negation',
  'New Grammar': 'Grammar',
  'New Vocab': 'Vocab',
  'New Words': 'Words',
  'Pattern Challenge': 'Challenge',
  'People Challenge': 'Challenge',
  'Picture To Text': 'Picture-text',
  'Plural Challenge': 'Plural',
  'Pronoun Pattern': 'Pronouns',
  'Pronunciation Practice': 'Pronounce',
  'What Is It?': 'What is it?',
};

export function usesSpanishInstructions(lessonId: string) {
  return SPANISH_FIRST_LESSONS.has(lessonId);
}

export function lessonStageLabel(lessonId: string, stage: string) {
  if (!usesSpanishInstructions(lessonId)) return stage;
  return SPANISH_STAGE_LABELS[stage] || stage;
}

export function lessonStageShortLabel(lessonId: string, stage: string) {
  if (usesSpanishInstructions(lessonId)) {
    return SHORT_SPANISH_STAGE_LABELS[stage] || lessonStageLabel(lessonId, stage);
  }
  return SHORT_ENGLISH_STAGE_LABELS[stage] || stage;
}

export function lessonPromptText(lessonId: string, prompt: string) {
  const instruction = SPANISH_INSTRUCTION_PROMPTS[prompt.trim()];
  if (instruction) return instruction;
  if (!usesSpanishInstructions(lessonId)) return prompt;
  return prompt;
}

export function usesCompactListenInstruction(stage: string, prompt: string) {
  return stage === 'Listen' && prompt.trim() === LISTEN_AND_CHOOSE_PROMPT;
}

export function usesCompactRecognizeInstruction(stage: string, prompt: string) {
  return stage === 'Recognize' && !prompt.trim();
}

export function usesCompactSpeakInstruction(stage: string) {
  return stage === 'Speak' || stage === 'Pronunciation Practice';
}

export function lessonHeaderPromptText(lessonId: string, stage: string, prompt: string) {
  if (usesCompactRecognizeInstruction(stage, prompt)) return CHOOSE_CORRECT_PHRASE_INSTRUCTION;
  return lessonPromptText(lessonId, prompt);
}

export function pronunciationInstruction() {
  return LISTEN_AND_REPEAT_INSTRUCTION;
}
