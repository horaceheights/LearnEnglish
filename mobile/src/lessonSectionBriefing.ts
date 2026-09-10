import { lessonStageLabel, listeningChoiceInstruction } from './lessonInstructions';
import { isMissionLesson } from './missionExperience';
import { lessonStageColorForSegment } from './lessonStageTheme';
import type { Lesson, LessonCard } from './types';

// A briefing is derived from the authored stage boundaries, never authored as a
// card. Lesson card counts are pinned by the backend structure tests and the
// release-integrity course fingerprint, so this surface must not change them.

export type SectionBriefingKind = 'opening' | 'bridge';

export type SectionBriefing = {
  accentColor: string;
  doneChips: string[];
  doneLabel: string | null;
  doneSegmentIndex: number | null;
  doneStage: string | null;
  doneSummary: string | null;
  kind: SectionBriefingKind;
  nextCardIndex: number;
  nextCount: number;
  nextIntro: string;
  nextLabel: string;
  nextMechanic: string;
  nextSegmentIndex: number;
  nextStage: string;
};

type StageCopy = {
  intro: string;
  mechanic: string;
  summary: string;
};

const MAX_CHIPS = 8;
const MAX_PHRASE_CHIPS = 4;

// Spanish support copy for the canonical five-stage shell. Every standard lesson
// resolves through this table; nothing here is keyed to a lesson ID.
const STAGE_COPY: Record<string, StageCopy> = {
  Learn: {
    intro: 'Conoce las palabras nuevas con su foto y su sonido.',
    mechanic: 'Esta sección es automática: solo mira y escucha.',
    summary: 'Conociste las palabras nuevas de esta lección.',
  },
  Listen: {
    intro: 'Ahora solo escuchas. Aquí entrenas el oído sin leer la respuesta.',
    mechanic: '¡Escucha y elige! Toca 🔊 para repetir.',
    summary: 'Entendiste el inglés escuchando, sin leerlo.',
  },
  Recognize: {
    intro: 'Ahora te toca a ti elegir. A veces eliges la foto y a veces la frase.',
    mechanic: 'Toca la respuesta correcta. Si te equivocas, te explicamos por qué.',
    summary: 'Reconociste las palabras en fotos y en frases.',
  },
  Speak: {
    intro: 'Ahora hablas tú. Escucha el ejemplo y repítelo en voz alta.',
    mechanic: 'Vas a usar el micrófono. Busca un lugar tranquilo.',
    summary: 'Pronunciaste las frases en voz alta.',
  },
  Use: {
    intro: 'Para terminar, arma las frases con tus propias palabras.',
    mechanic: 'Toca cada palabra para colocarla; tócala de nuevo para devolverla.',
    summary: 'Formaste frases completas con lo que aprendiste.',
  },
};

const FALLBACK_COPY: StageCopy = {
  intro: 'Sigue practicando lo que aprendiste.',
  mechanic: 'Toca la respuesta correcta.',
  summary: 'Terminaste esta sección.',
};

function stageCopy(stage: string): StageCopy {
  return STAGE_COPY[stage] || FALLBACK_COPY;
}

type StageSegment = { end: number; index: number; stage: string; start: number };

export function lessonStageSegments(cards: readonly LessonCard[]): StageSegment[] {
  const segments: StageSegment[] = [];
  cards.forEach((card, cardIndex) => {
    const previous = segments[segments.length - 1];
    if (previous && previous.stage === card.stage) {
      previous.end = cardIndex;
      return;
    }
    segments.push({ end: cardIndex, index: segments.length, stage: card.stage, start: cardIndex });
  });
  return segments;
}

function segmentAt(segments: StageSegment[], cardIndex: number): StageSegment | null {
  return segments.find((segment) => cardIndex >= segment.start && cardIndex <= segment.end) || null;
}

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z']+/g, '');
}

function uniqueInOrder(values: string[], limit: number) {
  const seen = new Set<string>();
  const kept: string[] = [];
  values.forEach((value) => {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key) || kept.length >= limit) return;
    seen.add(key);
    kept.push(trimmed);
  });
  return kept;
}

// Vocabulary chips come from language the learner actually met in that segment,
// derived from existing lesson fields. No new authored content is required.
function vocabularyChips(lesson: Lesson, segment: StageSegment) {
  const vocabulary = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [];
  if (vocabulary.length === 0) return [];

  const spoken = new Set<string>();
  for (let index = segment.start; index <= segment.end; index += 1) {
    const card = lesson.cards[index];
    if (!card) continue;
    const sources = [card.prompt || '', card.audio_text || ''];
    card.options.forEach((option) => sources.push(option.label || ''));
    sources.forEach((source) => {
      (source.toLowerCase().match(/[a-z']+/g) || []).forEach((word) => spoken.add(word));
    });
  }

  return uniqueInOrder(
    vocabulary.filter((word) => spoken.has(normalizeWord(word))),
    MAX_CHIPS,
  );
}

// Sample evenly across the list so a section is represented by its whole span.
// Taking the first few made consecutive briefings show the same opening phrases.
function spread(values: string[], limit: number) {
  if (values.length <= limit) return values;
  const step = (values.length - 1) / (limit - 1);
  return Array.from({ length: limit }, (_, position) => values[Math.round(position * step)]);
}

function phraseChips(lesson: Lesson, segment: StageSegment) {
  const phrases: string[] = [];
  for (let index = segment.start; index <= segment.end; index += 1) {
    const card = lesson.cards[index];
    if (!card) continue;
    const correct = card.options.find((option) => option.id === card.correct_option_id);
    const label = correct?.label?.trim() || card.prompt.trim();
    // Visual completion markers and empty recognize prompts are not readable chips.
    if (!label || label.includes('_')) continue;
    phrases.push(label);
  }
  return spread(uniqueInOrder(phrases, Number.MAX_SAFE_INTEGER), MAX_PHRASE_CHIPS);
}

function doneChipsFor(lesson: Lesson, segment: StageSegment) {
  const vocabulary = vocabularyChips(lesson, segment);
  if (segment.stage === 'Learn') return vocabulary;
  const phrases = phraseChips(lesson, segment);
  return phrases.length > 0 ? phrases : vocabulary.slice(0, MAX_PHRASE_CHIPS);
}

function listenMechanic(lesson: Lesson, segment: StageSegment) {
  // Reuse the shared photo/phrase rule so the briefing cannot drift from the
  // instruction the learner then sees on the card itself.
  const options = lesson.cards[segment.start]?.options ?? [];
  return `${listeningChoiceInstruction(options)} Toca 🔊 para repetir.`;
}

export function sectionBriefingForBoundary(
  lesson: Lesson | null | undefined,
  fromIndex: number | null,
): SectionBriefing | null {
  if (!lesson || !Array.isArray(lesson.cards) || lesson.cards.length === 0) return null;
  // Missions present one continuous story and must never show the stage journey.
  if (isMissionLesson(lesson)) return null;

  const segments = lessonStageSegments(lesson.cards);
  if (segments.length < 2) return null;

  const isOpening = fromIndex === null;
  const nextCardIndex = isOpening ? 0 : fromIndex + 1;
  if (!isOpening) {
    const current = lesson.cards[fromIndex];
    const next = lesson.cards[nextCardIndex];
    if (!current || !next || current.stage === next.stage) return null;
  }

  const nextSegment = segmentAt(segments, nextCardIndex);
  if (!nextSegment) return null;

  const doneSegment = isOpening ? null : segmentAt(segments, fromIndex);
  const copy = stageCopy(nextSegment.stage);
  const mechanic = nextSegment.stage === 'Listen'
    ? listenMechanic(lesson, nextSegment)
    : copy.mechanic;

  return {
    accentColor: lessonStageColorForSegment(nextSegment.index),
    doneChips: doneSegment
      ? doneChipsFor(lesson, doneSegment)
      : uniqueInOrder(Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [], MAX_CHIPS),
    doneLabel: doneSegment ? lessonStageLabel(lesson.id, doneSegment.stage) : null,
    doneSegmentIndex: doneSegment ? doneSegment.index : null,
    doneStage: doneSegment ? doneSegment.stage : null,
    doneSummary: doneSegment ? stageCopy(doneSegment.stage).summary : null,
    kind: isOpening ? 'opening' : 'bridge',
    nextCardIndex,
    nextCount: nextSegment.end - nextSegment.start + 1,
    nextIntro: copy.intro,
    nextLabel: lessonStageLabel(lesson.id, nextSegment.stage),
    nextMechanic: mechanic,
    nextSegmentIndex: nextSegment.index,
    nextStage: nextSegment.stage,
  };
}
