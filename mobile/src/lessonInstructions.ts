const SPANISH_FIRST_LESSONS = new Set([
  'lesson-1-people-actions',
  'lesson-2-pronouns',
  'lesson-4-family-members',
  'lesson-5-family-action-practice',
  'lesson-6-objects-places',
  'test-pronunciation',
]);

const SPANISH_STAGE_LABELS: Record<string, string> = {
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

const SPANISH_INSTRUCTION_PROMPTS: Record<string, string> = {
  'Listen and choose.': 'Ahora escucha y elige.',
};

const SHORT_SPANISH_STAGE_LABELS: Record<string, string> = {
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
  if (!usesSpanishInstructions(lessonId)) return prompt;
  return SPANISH_INSTRUCTION_PROMPTS[prompt] || prompt;
}

export function pronunciationInstruction(lessonId: string) {
  return usesSpanishInstructions(lessonId)
    ? 'Ahora escucha y repite.'
    : 'Pronunciation Practice';
}
