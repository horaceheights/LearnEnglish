import type { LessonCard } from './types';

const SUBJECT_LABELS: Record<string, string> = {
  'a baby': '“A baby” (un bebé)',
  'a brother': '“A brother” (un hermano)',
  'a child': '“A child” (un niño)',
  'a sister': '“A sister” (una hermana)',
  he: '“He” (él)',
  she: '“She” (ella)',
  'the baby': '“The baby” (el bebé)',
  'the boy': '“The boy” (el niño)',
  'the father': '“The father” (el padre)',
  'the girl': '“The girl” (la niña)',
  'the grandfather': '“The grandfather” (el abuelo)',
  'the grandmother': '“The grandmother” (la abuela)',
  'the man': '“The man” (el hombre)',
  'the mother': '“The mother” (la madre)',
  'the woman': '“The woman” (la mujer)',
};

const PLURAL_SUBJECT_LABELS: Record<string, string> = {
  children: '“Children” (los niños)',
  'the adults': '“The adults” (los adultos)',
  'the boy and the girl': '“The boy and the girl” (el niño y la niña)',
  'the brothers': '“The brothers” (los hermanos)',
  'the children': '“The children” (los niños)',
  'the grandparents': '“The grandparents” (los abuelos)',
  'the parents': '“The parents” (los padres)',
  'the sisters': '“The sisters” (las hermanas)',
  they: '“They” (ellos o ellas)',
};

const IDENTITY_CHOICE_LABELS: Record<string, string> = {
  adults: 'a los adultos',
  brothers: 'a los hermanos',
  children: 'a los niños',
  father: 'al padre',
  grandfather: 'al abuelo',
  grandmother: 'a la abuela',
  grandparents: 'a los abuelos',
  mother: 'a la madre',
  parents: 'a los padres',
  sisters: 'a las hermanas',
};

function normalized(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase().replace(/[?.!,]+$/g, '');
}

function answerText(card: LessonCard) {
  const correctOption = card.options.find((option) => option.id === card.correct_option_id);
  return card.answer_audio_text || card.audio_text || correctOption?.label || card.prompt;
}

function subjectFrom(text: string, verb: 'is' | 'are') {
  const directSubject = text.match(new RegExp(`^(.+?)\\s+${verb}\\b`))?.[1]?.trim();
  if (directSubject && directSubject !== 'who') return directSubject;
  if (/\bthey\b/.test(text)) return 'they';
  if (/\bhe\b/.test(text)) return 'he';
  if (/\bshe\b/.test(text)) return 'she';
  return '';
}

export function lessonMistakeHint(card: LessonCard, selectedOptionId?: string | null) {
  const target = normalized(answerText(card));
  const correctOption = card.options.find((option) => option.id === card.correct_option_id);
  const selectedOption = card.options.find((option) => option.id === selectedOptionId);
  const correctChoice = normalized(correctOption?.label || correctOption?.id);
  const selectedChoice = normalized(selectedOption?.label || selectedOption?.id);

  if (
    card.stage === 'Recognize'
    && normalized(card.prompt).startsWith('who ')
    && selectedOption
    && selectedOption.id !== card.correct_option_id
  ) {
    const correctIdentity = IDENTITY_CHOICE_LABELS[card.correct_option_id];
    const selectedIdentity = IDENTITY_CHOICE_LABELS[selectedOption.id];
    if (correctIdentity && selectedIdentity) {
      return `La imagen muestra ${correctIdentity}, no ${selectedIdentity}.`;
    }
  }

  if (target.includes(' not ') || correctChoice === 'not' || correctChoice.includes('not')) {
    return '“Not” indica que la acción no está ocurriendo.';
  }

  const expectedVerb = correctChoice === 'is' || correctChoice === 'are'
    ? correctChoice
    : /\bare\b/.test(target)
      ? 'are'
      : /\bis\b/.test(target)
        ? 'is'
        : null;

  if (expectedVerb === 'is') {
    const subject = subjectFrom(target, 'is');
    const label = SUBJECT_LABELS[subject];
    return label
      ? `${label} es singular; usamos “is”.`
      : 'Usamos “is” cuando hablamos de una sola persona.';
  }

  if (expectedVerb === 'are') {
    const subject = subjectFrom(target, 'are');
    const label = PLURAL_SUBJECT_LABELS[subject];
    return label
      ? `${label} es plural; usamos “are”.`
      : 'Usamos “are” cuando hablamos de dos o más personas.';
  }

  if (selectedChoice && correctChoice && selectedChoice !== correctChoice) {
    return 'Mira de nuevo quién aparece y qué está haciendo.';
  }

  return 'Observa otra vez la persona, el grupo o la acción.';
}
