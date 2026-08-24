const SUBJECT_TRANSLATIONS: Record<string, string> = {
  ___: '___',
  'a baby': 'Un bebé',
  'a brother': 'Un hermano',
  'a child': 'Un niño',
  'a father': 'Un padre',
  'a grandfather': 'Un abuelo',
  'a grandmother': 'Una abuela',
  'a mother': 'Una madre',
  'a sister': 'Una hermana',
  'an adult': 'Un adulto',
  children: 'Los niños',
  grandparents: 'Los abuelos',
  he: 'Él',
  parents: 'Los padres',
  she: 'Ella',
  'the adults': 'Los adultos',
  'the baby': 'El bebé',
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
  and: 'Y',
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
  are: 'Son / están',
  babies: 'Bebés',
  baby: 'Bebé',
  boy: 'Niño',
  brothers: 'Hermanos',
  child: 'Niño',
  children: 'Niños',
  family: 'Familia',
  father: 'Padre',
  girl: 'Niña',
  grandfather: 'Abuelo',
  grandmother: 'Abuela',
  grandparents: 'Abuelos',
  he: 'Él',
  is: 'Es / está',
  'is not': 'No es / no está',
  man: 'Hombre',
  mother: 'Madre',
  not: 'No',
  parents: 'Padres',
  she: 'Ella',
  sisters: 'Hermanas',
  'the father': 'El padre',
  'the grandfather': 'El abuelo',
  'the grandmother': 'La abuela',
  'the mother': 'La madre',
  'the parents': 'Los padres',
  'the grandparents': 'Los abuelos',
  'the boy and the girl': 'El niño y la niña',
  'the boy': 'El niño',
  'the girl': 'La niña',
  'the man': 'El hombre',
  'the woman': 'La mujer',
  they: 'Ellos',
  woman: 'Mujer',
};

const IDENTITY_PREDICATE_TRANSLATIONS: Record<string, string> = {
  'a child': 'un niño',
  'a family': 'una familia',
  adults: 'adultos',
  babies: 'bebés',
  brothers: 'hermanos',
  children: 'niños',
  sisters: 'hermanas',
  'the brothers': 'los hermanos',
  'the children': 'los niños',
  'the father': 'el padre',
  'the grandfather': 'el abuelo',
  'the grandmother': 'la abuela',
  'the mother': 'la madre',
  'the parents': 'los padres',
  'the grandparents': 'los abuelos',
  'the sisters': 'las hermanas',
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
  'actions': 'Acciones',
  'find the children.': 'Encuentra a los niños.',
  'find the grandparents.': 'Encuentra a los abuelos.',
  'find the parents.': 'Encuentra a los padres.',
  'he, she, and they': 'Él, ella y ellos',
  'is, are, and not': 'Es/está, son/están y no',
  'listen and choose.': 'Ahora escucha y elige.',
  'meet the family.': 'Conoce a la familia.',
  'people': 'Personas',
  'the boy is eating, ___ is eating.': 'El niño está comiendo, ___ está comiendo.',
  'the girl is writing, ___ is writing.': 'La niña está escribiendo, ___ está escribiendo.',
  'the man is reading, ___ is reading.': 'El hombre está leyendo, ___ está leyendo.',
  'the woman is drinking, ___ is drinking.': 'La mujer está bebiendo, ___ está bebiendo.',
  'the boy ___ the girl are running.': 'El niño ___ la niña están corriendo.',
  'who ___ he?': '¿Quién ___ él?',
  'who ___ she?': '¿Quién ___ ella?',
  'who ___ they?': '¿Quiénes ___ ellos?',
  'who are they?': '¿Quiénes son ellos?',
  'who is he?': '¿Quién es él?',
  'who is she?': '¿Quién es ella?',
  'what is it?': '¿Qué es?',
  '___ are reading.': '___ están leyendo.',
  '___.': '___.',
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

  const identityQuestion = [
    ['who is he?', '¿Quién es él?'],
    ['who is she?', '¿Quién es ella?'],
    ['who are they?', '¿Quiénes son ellos?'],
  ].find(([question]) => normalized.startsWith(`${question} `));
  if (identityQuestion) {
    const [question, translatedQuestion] = identityQuestion;
    const translatedAnswer = translateOneSentence(trimmed.slice(question.length).trim());
    if (translatedAnswer) return `${translatedQuestion} ${translatedAnswer}`;
  }

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

  const identitySentence = withoutPeriod.match(/^(he|she|they|the boy) (is|are) (.+)$/);
  if (identitySentence) {
    const [, subjectKey, verb, predicateKey] = identitySentence;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    const predicate = IDENTITY_PREDICATE_TRANSLATIONS[predicateKey];
    if (subject && predicate) return `${subject} ${verb === 'is' ? 'es' : 'son'} ${predicate}.`;
  }

  const definiteBlank = withoutPeriod.match(/^(he|she|they) (is|are) the ___$/);
  if (definiteBlank) {
    const [, subjectKey] = definiteBlank;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    const article = subjectKey === 'she' ? 'la' : subjectKey === 'they' ? 'los' : 'el';
    return `${subject} ${subjectKey === 'they' ? 'son' : 'es'} ${article} ___.`;
  }

  const articleBlank = withoutPeriod.match(/^(the boy|they) (is|are) a ___$/);
  if (articleBlank) {
    const [, subjectKey] = articleBlank;
    return `${SUBJECT_TRANSLATIONS[subjectKey]} ${subjectKey === 'they' ? 'son' : 'es'} un/una ___.`;
  }

  const actionBlankWithVerb = withoutPeriod.match(/^(.+?) (is|are) ___$/);
  if (actionBlankWithVerb) {
    const [, subjectKey, verb] = actionBlankWithVerb;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    if (subject) return `${subject} ${verb === 'is' ? 'es/está' : 'son/están'} ___.`;
  }

  const missingModifier = withoutPeriod.match(/^(.+?) (is|are) ___ ([a-z]+ing)$/);
  if (missingModifier) {
    const [, subjectKey, , actionKey] = missingModifier;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    const action = actionTranslation(actionKey, subjectKey);
    if (subject && action) return `${subject} ___ ${action}.`;
  }

  const missingVerb = withoutPeriod.match(/^(.+?) ___ ([a-z]+ing)$/);
  if (missingVerb) {
    const [, subjectKey, actionKey] = missingVerb;
    const subject = SUBJECT_TRANSLATIONS[subjectKey];
    const action = actionTranslation(actionKey, subjectKey);
    if (subject && action) return `${subject} ___ ${action}.`;
  }

  if (withoutPeriod === 'a ___') return 'Un/una ___.';
  if (withoutPeriod === '___') return '___.';

  return null;
}

export function spanishTranslationFor(sentence: string): string {
  const parts = sentence.trim().match(/[^.]+(?:\.|$)/g) ?? [];
  const translated = parts.map(translateOneSentence);
  if (translated.every((part): part is string => Boolean(part))) return translated.join(' ');
  return 'Traducción no disponible todavía.';
}
