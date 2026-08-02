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
  'Pronoun Pattern': 'Patrón de pronombres',
  'Pronouns': 'Pronombres',
  'Pronunciation': 'Pronunciación',
  'Pronunciation Practice': 'Práctica de pronunciación',
  'What Is It?': 'Aprende a preguntar',
};

const SPANISH_INSTRUCTION_PROMPTS: Record<string, string> = {
  'Listen and choose.': 'Ahora escucha y elige.',
};

export function usesSpanishInstructions(lessonId: string) {
  return SPANISH_FIRST_LESSONS.has(lessonId);
}

export function lessonStageLabel(lessonId: string, stage: string) {
  if (!usesSpanishInstructions(lessonId)) return stage;
  return SPANISH_STAGE_LABELS[stage] || stage;
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
