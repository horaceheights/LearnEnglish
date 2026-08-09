const SUBJECT_TRANSLATIONS: Record<string, string> = {
  'a baby': 'Un bebé',
  'a brother': 'Un hermano',
  'a child': 'Un niño',
  'a father': 'Un padre',
  'a grandfather': 'Un abuelo',
  'a mother': 'Una madre',
  'a sister': 'Una hermana',
  'an adult': 'Un adulto',
  children: 'Los niños',
  grandparents: 'Los abuelos',
  he: 'Él',
  parents: 'Los padres',
  she: 'Ella',
  'the adults': 'Los adultos',
  'the boy': 'El niño',
  'the boy and the girl': 'El niño y la niña',
  'the boy and the man': 'El niño y el hombre',
  'the brother': 'El hermano',
  'the children': 'Los niños',
  'the father': 'El padre',
  'the girl': 'La niña',
  'the girl and the woman': 'La niña y la mujer',
  'the grandparents': 'Los abuelos',
  'the man': 'El hombre',
  'the man and the woman': 'El hombre y la mujer',
  'the mother': 'La madre',
  'the parents': 'Los padres',
  'the sister': 'La hermana',
  'the woman': 'La mujer',
  they: 'Ellos',
};

const ACTION_TRANSLATIONS: Record<string, string> = {
  cooking: 'cocinando',
  drinking: 'bebiendo',
  eating: 'comiendo',
  playing: 'jugando',
  reading: 'leyendo',
  running: 'corriendo',
  sitting: 'sentado',
  sleeping: 'durmiendo',
  standing: 'de pie',
  studying: 'estudiando',
  swimming: 'nadando',
  talking: 'hablando',
  walking: 'caminando',
  working: 'trabajando',
  writing: 'escribiendo',
};

const VOCABULARY_TRANSLATIONS: Record<string, string> = {
  'a baby': 'Un bebé',
  'a brother': 'Un hermano',
  'a child': 'Un niño',
  'a family': 'Una familia',
  'a father': 'Un padre',
  'a grandfather': 'Un abuelo',
  'a grandmother': 'Una abuela',
  'a mother': 'Una madre',
  'a sister': 'Una hermana',
  'an adult': 'Un adulto',
  adults: 'Adultos',
  babies: 'Bebés',
  brothers: 'Hermanos',
  children: 'Niños',
  grandparents: 'Abuelos',
  he: 'Él',
  parents: 'Padres',
  she: 'Ella',
  sisters: 'Hermanas',
  'the boy': 'El niño',
  'the girl': 'La niña',
  'the man': 'El hombre',
  'the woman': 'La mujer',
  they: 'Ellos',
};

const PLACE_TRANSLATIONS: Record<string, { article: 'un' | 'una'; noun: string }> = {
  bike: { article: 'una', noun: 'bicicleta' },
  bridge: { article: 'un', noun: 'puente' },
  building: { article: 'un', noun: 'edificio' },
  bus: { article: 'un', noun: 'autobús' },
  car: { article: 'un', noun: 'auto' },
  house: { article: 'una', noun: 'casa' },
  park: { article: 'un', noun: 'parque' },
  school: { article: 'una', noun: 'escuela' },
  store: { article: 'una', noun: 'tienda' },
  street: { article: 'una', noun: 'calle' },
};

const EXACT_TRANSLATIONS: Record<string, string> = {
  'listen and choose.': 'Ahora escucha y elige.',
  'what is it?': '¿Qué es?',
};

function sentenceCase(text: string) {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function actionTranslation(actionKey: string, subjectKey: string) {
  if (actionKey !== 'sitting') return ACTION_TRANSLATIONS[actionKey];
  if (subjectKey.includes(' and ') || ['children', 'grandparents', 'parents', 'the adults', 'the children', 'the grandparents', 'the parents', 'they'].includes(subjectKey)) {
    return 'sentados';
  }
  if (['she', 'the girl', 'the woman', 'the mother', 'the sister'].includes(subjectKey)) return 'sentada';
  return 'sentado';
}

function translateOneSentence(sentence: string): string | null {
  const trimmed = sentence.trim();
  const normalized = trimmed.toLowerCase();
  if (!normalized) return null;

  const exact = EXACT_TRANSLATIONS[normalized];
  if (exact) return exact;

  const withoutPeriod = normalized.replace(/\.$/, '');
  const vocabulary = VOCABULARY_TRANSLATIONS[withoutPeriod];
  if (vocabulary) return `${vocabulary}${trimmed.endsWith('.') ? '.' : ''}`;

  const standaloneAction = ACTION_TRANSLATIONS[withoutPeriod];
  if (standaloneAction) return sentenceCase(standaloneAction);

  const placeVocabulary = withoutPeriod.match(/^a (park|house|school|street|bridge|store|building|car|bike|bus)$/);
  if (placeVocabulary) {
    const place = PLACE_TRANSLATIONS[placeVocabulary[1]];
    return `${sentenceCase(place.article)} ${place.noun}`;
  }

  const placeSentence = withoutPeriod.match(/^it (is|is not|___) a (park|house|school|street|bridge|store|building|car|bike|bus)$/);
  if (placeSentence) {
    const [, verb, placeKey] = placeSentence;
    const place = PLACE_TRANSLATIONS[placeKey];
    const translatedVerb = verb === 'is' ? 'Es' : verb === 'is not' ? 'No es' : '___';
    return `${translatedVerb} ${place.article} ${place.noun}.`;
  }

  const actionSentence = withoutPeriod.match(/^(.+?) (is|are|___) (not )?([a-z]+ing)$/);
  if (actionSentence) {
    const [, subjectKey, verb, negative, actionKey] = actionSentence;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    const action = actionTranslation(actionKey, subjectKey);
    if (subject && action) {
      const translatedVerb = verb === '___'
        ? '___'
        : `${negative ? 'no ' : ''}${verb === 'is' ? 'está' : 'están'}`;
      return `${subject} ${translatedVerb} ${action}.`;
    }
  }

  return null;
}

export function spanishTranslationFor(sentence: string): string {
  const parts = sentence.trim().match(/[^.]+(?:\.|$)/g) ?? [];
  const translated = parts.map(translateOneSentence);
  if (translated.every((part): part is string => Boolean(part))) return translated.join(' ');
  return 'Traducción no disponible todavía.';
}
