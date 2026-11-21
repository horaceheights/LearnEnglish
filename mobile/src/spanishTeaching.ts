import type { LessonCard } from './types';

// Spanish course cards (target_language "es") are for English speakers: their
// mistake explanations are English and follow Spanish word order and agreement.
// Like the German and English construction teachers, every word of a Spanish
// construction must belong to a supported pattern; the course-wide hint gate
// rejects anything else. Lower-case Latin letters keep niño and bebé whole.
const WORD = /[a-zà-öø-ÿ]+/gi;
const spanishWords = (text: string) => text.match(WORD) || [];
const key = (word: string) => word.toLowerCase();
const set = (value: string) => new Set(value.split(' '));

// Article → the nouns it goes with, by gender and number.
const ARTICLE_KIND: Record<string, string> = {
  un: 'masculine singular', una: 'feminine singular', el: 'masculine singular', la: 'feminine singular',
  los: 'masculine plural', las: 'feminine plural',
};
const NOUN_KIND: Record<string, string> = {
  niño: 'masculine singular', niña: 'feminine singular', hombre: 'masculine singular', mujer: 'feminine singular',
  familia: 'feminine singular', bebé: 'masculine singular', bebés: 'masculine plural', niños: 'masculine plural',
  hermano: 'masculine singular', hermanos: 'masculine plural', hermana: 'feminine singular', hermanas: 'feminine plural',
  adulto: 'masculine singular', adultos: 'masculine plural',
  padre: 'masculine singular', madre: 'feminine singular', padres: 'masculine plural',
  abuelo: 'masculine singular', abuela: 'feminine singular', abuelos: 'masculine plural', nietos: 'masculine plural',
  perro: 'masculine singular', gato: 'masculine singular', pájaro: 'masculine singular', conejo: 'masculine singular',
  // mascota and persona are always feminine, whoever they name.
  mascota: 'feminine singular', mascotas: 'feminine plural', persona: 'feminine singular', personas: 'feminine plural',
  amiga: 'feminine singular', amigas: 'feminine plural', esposo: 'masculine singular', esposa: 'feminine singular',
  hijo: 'masculine singular', hija: 'feminine singular',
};
const PRONOUNS = set('él ella ellos ellas');
const PLURAL_PRONOUNS = set('ellos ellas');
const SER = set('es son');
const ESTAR = set('está están');
const ACTIONS = set('comiendo bebiendo leyendo escribiendo corriendo nadando durmiendo jugando estudiando trabajando cocinando hablando');
// Who-questions: quién (one person) takes es and él/ella; quiénes takes son and ellos/ellas.
const QUESTION_WORDS: Record<string, boolean> = { quién: false, quiénes: true };
// "Sitting" is a state word that agrees with who is sitting.
const STATES: Record<string, string> = {
  sentado: 'masculine singular', sentada: 'feminine singular', sentados: 'masculine plural',
};
// One person against more than one: the verb is the only difference.
const NUMBER_PAIRS: Record<string, string> = { es: 'son', está: 'están', sentado: 'sentados' };
// Who someone is (ser) against what someone is doing (estar).
const SER_ESTAR: Record<string, string> = { es: 'está', son: 'están', está: 'es', están: 'son' };
const quote = (text: string) => `“${text}”`;

// Unit 2: things and places with their gender, and words that agree with them.
const UNIT2_NOUNS: Record<string, string> = {
  autobús: 'masculine singular', carro: 'masculine singular', carros: 'masculine plural', bicicleta: 'feminine singular',
  puente: 'masculine singular', calle: 'feminine singular', parque: 'masculine singular', escuela: 'feminine singular',
  tienda: 'feminine singular', hospital: 'masculine singular', casa: 'feminine singular', restaurante: 'masculine singular',
  libro: 'masculine singular', libros: 'masculine plural', pluma: 'feminine singular', plumas: 'feminine plural',
  teléfono: 'masculine singular', teléfonos: 'masculine plural', mochila: 'feminine singular', mochilas: 'feminine plural',
  bolsa: 'feminine singular', bolsas: 'feminine plural', silla: 'feminine singular', sillas: 'feminine plural',
  mesa: 'feminine singular', escritorio: 'masculine singular', clase: 'feminine singular', salón: 'masculine singular',
  cuaderno: 'masculine singular', lápiz: 'masculine singular', papel: 'masculine singular', número: 'masculine singular',
};
Object.assign(NOUN_KIND, UNIT2_NOUNS);
// Colors and sizes: -o/-a words show gender and number; the others only number.
const ADJECTIVE_KIND: Record<string, string> = {};
for (const stem of ['roj', 'amarill', 'negr', 'blanc', 'morad', 'pequeñ', 'nuev', 'usad']) {
  Object.assign(ADJECTIVE_KIND, {
    [`${stem}o`]: 'masculine singular', [`${stem}a`]: 'feminine singular',
    [`${stem}os`]: 'masculine plural', [`${stem}as`]: 'feminine plural',
  });
}
for (const [one, many] of [['azul', 'azules'], ['verde', 'verdes'], ['gris', 'grises'], ['café', 'cafés'], ['rosa', 'rosas'],
  ['grande', 'grandes'], ['igual', 'iguales'], ['diferente', 'diferentes']]) {
  ADJECTIVE_KIND[one] = 'singular';
  ADJECTIVE_KIND[many] = 'plural';
}
const agrees = (adjective: string, kind: string) => {
  const adj = ADJECTIVE_KIND[key(adjective)];
  return Boolean(adj) && (adj.includes(' ') ? adj === kind : kind.endsWith(adj));
};
const agreementNote = (adjective: string, noun: string, kind: string) => ADJECTIVE_KIND[key(adjective)].includes(' ')
  ? `${quote(adjective)} matches ${quote(noun)} (${kind}), so it ends in ${quote(key(adjective).replace(/^.*?(os|as|o|a)$/, '-$1'))}.`
  : `${quote(adjective)} is the same for el and la words; it only adds -s or -es for more than one.`;
const NUMBER_WORDS = set('dos tres cuatro cinco seis siete ocho nueve diez');
const NUMBER_NAMES = set('uno dos tres cuatro cinco seis siete ocho nueve diez');
// este/esta (this), ese/esa (that), estos/estas (these) agree with the thing they point to.
const DEMONSTRATIVE_KIND: Record<string, string> = {
  este: 'masculine singular', esta: 'feminine singular', ese: 'masculine singular', esa: 'feminine singular',
  estos: 'masculine plural', estas: 'feminine plural',
};
// A role after es takes no article: Ella es estudiante.
const ROLES = set('estudiante');

type Relation = { start: number; end: number; explanation: string };
type ClausePlan = { explanations: string[]; relations: Relation[]; supported: boolean };

function teachClause(text: string): ClausePlan {
  const tokens = spanishWords(text);
  const explanations: string[] = tokens.map(() => '');
  const relations: Relation[] = [];
  let index = 0;
  const nounPhrase = () => {
    const article = tokens[index] || '';
    const noun = tokens[index + 1] || '';
    if (!ARTICLE_KIND[key(article)] || ARTICLE_KIND[key(article)] !== NOUN_KIND[key(noun)]) return null;
    explanations[index] = `${quote(article)} is the ${ARTICLE_KIND[key(article)]} article for ${quote(noun)}, so it comes right before it.`;
    explanations[index + 1] = `${quote(noun)} comes right after its article ${quote(article)}.`;
    relations.push({ start: index, end: index + 2, explanation: `In ${quote(`${article} ${noun}`)} the article comes first and matches the noun.` });
    index += 2;
    let text = `${article} ${noun}`;
    if (key(noun) === 'salón' && key(tokens[index] || '') === 'de' && key(tokens[index + 1] || '') === 'clases') {
      explanations[index] = '“de clases” follows “salón”: “salón de clases” is one name, a classroom.';
      explanations[index + 1] = '“clases” ends the name “salón de clases”.';
      index += 2;
      text += ' de clases';
    }
    return { text, plural: NOUN_KIND[key(noun)].endsWith('plural'), kind: NOUN_KIND[key(noun)] };
  };
  const placePhrase = () => {
    // en + el/la + place: where it happens comes last.
    if (key(tokens[index] || '') !== 'en') return false;
    const at = index;
    index += 1;
    const place = nounPhrase();
    if (!place) return false;
    explanations[at] = `“en” (in, at) comes before the place ${quote(place.text)}.`;
    relations.push({ start: at, end: index, explanation: `Where comes last: ${quote(`en ${place.text}`)}.` });
    return true;
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  const lower = tokens.map(key);
  const done = () => ({ explanations, relations, supported: index === tokens.length && explanations.every(Boolean) });
  if (lower.join(' ') === 'qué es esto') {
    explanations[0] = '“Qué” asks what, so the question starts with it.';
    explanations[1] = '“es” comes right after “Qué”: “¿Qué es…?” is “What is…?”.';
    explanations[2] = '“esto” is the thing you point to, so it comes last.';
    relations.push({ start: 0, end: 3, explanation: 'Spanish asks “¿Qué es esto?”: what, is, this.' });
    index = 3;
    return done();
  }
  if (tokens.length === 4 && lower.slice(0, 3).join(' ') === 'de qué color' && SER.has(lower[3])) {
    const many = lower[3] === 'son';
    explanations[0] = '“De” starts the question: Spanish asks “of what color”.';
    explanations[1] = '“qué” comes after “De”: “De qué” means “of what”.';
    explanations[2] = '“color” follows “De qué”, so “De qué color” is “What color”.';
    explanations[3] = `${quote(tokens[3])} comes last: ${many ? 'more than one thing' : 'one thing'}.`;
    relations.push({ start: 0, end: 4, explanation: `Spanish asks ${quote(`De qué color ${tokens[3]}`)}: of what color ${many ? 'are they' : 'is it'}.` });
    index = 4;
    return done();
  }
  if (lower[0] === 'no' && ARTICLE_KIND[lower[1] || '']) {
    // Es un carro, no un autobús: "no" + the other thing names what it is not.
    explanations[0] = '“no” comes first: Spanish says “no un…” where English says “not a…”.';
    index = 1;
    const thing = nounPhrase();
    if (!thing) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: index, explanation: `${quote(`no ${thing.text}`)} names what it is not.` });
    return done();
  }
  if (DEMONSTRATIVE_KIND[lower[0]]) {
    const pointer = tokens[0] || '';
    const kind = DEMONSTRATIVE_KIND[lower[0]];
    const verb = tokens[1] || '';
    const many = kind.endsWith('plural');
    if (key(verb) !== (many ? 'son' : 'es')) return { explanations, relations, supported: false };
    explanations[0] = `${quote(pointer)} points to the ${kind} thing, so it comes first.`;
    explanations[1] = `${quote(verb)} comes right after ${quote(pointer)}: ${many ? 'more than one thing' : 'one thing'}.`;
    index = 2;
    let named = '';
    if (many && NOUN_KIND[lower[2] || ''] === kind) {
      named = tokens[2] || '';
      explanations[2] = `${quote(named)} is a plural, so after “son” it needs no article.`;
      index = 3;
    } else {
      const thing = nounPhrase();
      if (!thing || thing.kind !== kind) return { explanations, relations, supported: false };
      named = thing.text;
    }
    relations.push({ start: 0, end: index, explanation: `${quote(pointer)} matches ${quote(named)}: ${kind}.` });
    return done();
  }
  if (NUMBER_WORDS.has(lower[0])) {
    // Tres libros verdes: the number, the plural noun, then the color that matches it.
    const noun = tokens[1] || '';
    const kind = NOUN_KIND[key(noun)] || '';
    if (!kind.endsWith('plural')) return { explanations, relations, supported: false };
    explanations[0] = `${quote(tokens[0] || '')} counts the things, so it comes first.`;
    explanations[1] = `${quote(noun)} is plural and comes right after the number.`;
    relations.push({ start: 0, end: 2, explanation: `The number comes before the plural noun: ${quote(`${tokens[0] || ''} ${noun}`)}.` });
    index = 2;
    if (index < tokens.length) {
      const adjective = tokens[2] || '';
      if (!agrees(adjective, kind)) return { explanations, relations, supported: false };
      explanations[2] = `${quote(adjective)} comes after ${quote(noun)}, not before it. ${agreementNote(adjective, noun, kind)}`;
      relations.push({ start: 1, end: 3, explanation: `The color comes after the noun in Spanish: ${quote(`${noun} ${adjective}`)}.` });
      index = 3;
    }
    return done();
  }
  if (key(tokens[0] || '') in QUESTION_WORDS) {
    const who = tokens[0] || '';
    const verb = tokens[1] || '';
    const pronoun = tokens[2] || '';
    const many = QUESTION_WORDS[key(who)];
    const fits = tokens.length === 3 && key(verb) === (many ? 'son' : 'es')
      && PRONOUNS.has(key(pronoun)) && PLURAL_PRONOUNS.has(key(pronoun)) === many;
    if (!fits) return { explanations, relations, supported: false };
    explanations[0] = `${quote(who)} asks who${many ? ' about more than one person' : ''}, so the question starts with it.`;
    explanations[1] = `${quote(verb)} comes right after ${quote(who)}: ${quote(key(who))} goes with ${quote(key(verb))}.`;
    explanations[2] = `${quote(pronoun)} is who you are asking about, so it comes last.`;
    relations.push({ start: 0, end: 2, explanation: `The question word comes first, then its verb: ${quote(`${who} ${verb}`)}.` });
    return { explanations, relations, supported: true };
  }
  const subjectStart = index;
  let subject = '';
  let plural = false;
  const subjectKinds: string[] = [];
  if (PRONOUNS.has(key(tokens[index]))) {
    subject = tokens[index];
    plural = PLURAL_PRONOUNS.has(key(subject));
    subjectKinds.push(key(subject).startsWith('ella') ? 'feminine' : 'masculine');
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
  } else if (ARTICLE_KIND[key(tokens[index])]) {
    const first = nounPhrase();
    if (!first) return { explanations, relations, supported: false };
    subject = first.text;
    plural = first.plural;
    subjectKinds.push(first.kind);
    if (key(tokens[index] || '') === 'y') {
      const andIndex = index;
      index += 1;
      const second = nounPhrase();
      if (!second) return { explanations, relations, supported: false };
      explanations[andIndex] = `“y” joins ${quote(first.text)} and ${quote(second.text)}, so it goes between them.`;
      relations.push({ start: subjectStart, end: index, explanation: `One person, then “y”, then the other; each noun keeps its own article.` });
      subject = `${first.text} y ${second.text}`;
      subjectKinds.push(second.kind);
      plural = true;
    }
  }
  if (index < tokens.length) {
    // "no" goes right before the verb (Él no está), where English puts "not" after it.
    const negation = key(tokens[index]) === 'no' && subject ? index : -1;
    if (negation >= 0) index += 1;
    const verb = tokens[index] || '';
    const verbKey = key(verb);
    if (verbKey === 'trabaja' && subject && !plural && negation < 0) {
      // El hombre trabaja en el hospital: works + en + the place.
      explanations[index] = `${quote(verb)} comes right after ${quote(subject)}; it says what the person does.`;
      relations.push({ start: subjectStart, end: index + 1, explanation: `The verb comes right after who it is about: ${quote(`${subject} ${verb}`)}.` });
      index += 1;
      return placePhrase() ? done() : { explanations, relations, supported: false };
    }
    if (!SER.has(verbKey) && !ESTAR.has(verbKey)) return { explanations, relations, supported: false };
    if (negation >= 0 && !ESTAR.has(verbKey)) return { explanations, relations, supported: false };
    const verbPlural = verbKey === 'son' || verbKey === 'están';
    if (subject && verbPlural !== plural) return { explanations, relations, supported: false };
    // Things (Unit 2) are described, people are identified.
    const thing = !subject || Boolean(UNIT2_NOUNS[key(subject.split(' ').pop() || '')]);
    const meaning = SER.has(verbKey) ? (thing ? 'what something is' : 'who someone is') : 'what someone is doing';
    if (negation >= 0) {
      explanations[negation] = `“no” goes right before ${quote(verb)}: Spanish says ${quote(`no ${verb}`)} where English says “${verbPlural ? 'are' : 'is'} not”.`;
      relations.push({ start: negation, end: index + 1, explanation: `“no” comes before the verb: Spanish says ${quote(`no ${verb}`)}, English says “${verbPlural ? 'are' : 'is'} not”.` });
    }
    explanations[index] = !subject
      ? `${quote(verb)} starts the sentence: Spanish leaves out ${verbPlural ? '“ellos”' : '“it”'}, and ${quote(verb)} already means ${verbPlural ? '“they are”' : '“it is”'}.`
      : negation >= 0
        ? `${quote(verb)} comes right after “no”; it says ${meaning}${verbPlural ? (thing ? ' for more than one thing' : ' for more than one person') : ''}.`
        : `${quote(verb)} comes right after ${quote(subject)}; it says ${meaning}${verbPlural ? (thing ? ' for more than one thing' : ' for more than one person') : ''}.`;
    if (subject) relations.push({ start: subjectStart, end: index + 1, explanation: `The verb comes right after who it is about: ${quote(`${subject} ${negation >= 0 ? 'no ' : ''}${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    const word = tokens[index] || '';
    if (SER.has(verbKey)) {
      const named = nounPhrase();
      let complement = named?.text;
      if (named && key(named.text) === 'el número' && NUMBER_NAMES.has(key(tokens[index] || ''))) {
        explanations[index] = `${quote(tokens[index])} names the number, so it comes right after “el número”.`;
        complement = `${named.text} ${tokens[index]}`;
        index += 1;
      }
      const subjectKind = subjectKinds.length === 1 && subjectKinds[0].includes(' ') ? subjectKinds[0] : '';
      if (!complement && subjectKind) {
        // El carro es rojo: a color or size after es/son matches the noun.
        const veryIndex = key(tokens[index] || '') === 'muy' ? index : -1;
        if (veryIndex >= 0) index += 1;
        const adjective = tokens[index] || '';
        if (agrees(adjective, subjectKind)) {
          if (veryIndex >= 0) explanations[veryIndex] = `“muy” (very) goes right before ${quote(adjective)}.`;
          explanations[index] = `${quote(adjective)} comes after ${quote(verb)}. ${agreementNote(adjective, subject, subjectKind)}`;
          complement = adjective;
          index += 1;
        } else if (veryIndex >= 0) {
          return { explanations, relations, supported: false };
        }
      }
      if (!complement && ROLES.has(key(word)) && PRONOUNS.has(key(subject)) && !plural) {
        explanations[index] = `${quote(word)} is a role, so after ${quote(verb)} it takes no article: ${quote(`${subject} ${verb} ${word}`)}.`;
        complement = word;
        index += 1;
      }
      if (!complement && verbKey === 'son' && NOUN_KIND[key(word)]?.endsWith('plural')) {
        complement = word;
        explanations[index] = `${quote(word)} is a plural, so after “son” it needs no article.`;
        index += 1;
      }
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: ADJECTIVE_KIND[key(complement)]
        ? `After ${quote(verb)} comes the color or size, matching ${quote(subject)}: ${quote(complement)}.`
        : `After ${quote(verb)} comes ${thing ? 'what it is' : 'who they are'}: ${quote(complement)}.` });
    } else if (ACTIONS.has(key(word))) {
      explanations[index] = `${quote(word)} is the action, so it comes right after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `${quote(verb)} + the action: ${quote(`${verb} ${word}`)}.` });
      index += 1;
      if (key(tokens[index] || '') === 'en' && !placePhrase()) return { explanations, relations, supported: false };
    } else if (STATES[key(word)] && STATES[key(word)].endsWith('plural') === verbPlural
      // sentado/sentada agrees with who is sitting; any masculine noun makes the group masculine.
      && (!subjectKinds.length || STATES[key(word)].startsWith(subjectKinds.some(kind => kind.startsWith('masculine')) ? 'masculine' : 'feminine'))) {
      // A group with any masculine noun takes the masculine plural: las amigas y el conejo → sentados.
      const mixed = verbPlural && subjectKinds.some(kind => kind.startsWith('feminine')) && subjectKinds.some(kind => kind.startsWith('masculine'));
      explanations[index] = `${quote(word)} describes how they are and matches ${verbPlural ? 'more than one person' : 'one person'}, so it comes after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: mixed
        ? `${quote(verb)} + ${quote(word)}: a group with a masculine noun takes the masculine plural ${quote('sentados')}.`
        : `${quote(verb)} + ${quote(word)}: sitting is ${quote(key(word))}, never an -ando form.` });
      index += 1;
    } else {
      return { explanations, relations, supported: false };
    }
  }
  return { explanations, relations, supported: index === tokens.length && explanations.every(Boolean) };
}

/** The same plan shape as the English construction teacher, for Spanish cards. */
export function spanishConstructionPlan(card: LessonCard) {
  const ids = card.correct_option_ids || [];
  const labels = ids.map(id => card.options.find(option => option.id === id)?.label || '');
  const tokenSlots: number[] = [];
  let slot = 0;
  let tokenCount = 0;
  const target = card.prompt.replace(/\[blank\]|\{blank\}/gi, '___').split(/(_{2,})/).map(part => {
    if (/^_{2,}$/.test(part)) {
      tokenSlots.push(tokenCount);
      const label = labels[slot++] || '';
      tokenCount += spanishWords(label).length;
      return label;
    }
    tokenCount += spanishWords(part).length;
    return part;
  }).join('');
  const plans = (target.match(/[^.!?,]+[.!?,]?/g) || []).map(teachClause);
  const explanations = plans.flatMap(plan => plan.explanations);
  let offset = 0;
  const relations = plans.flatMap(plan => {
    const result = plan.relations.map(relation => ({ ...relation, start: relation.start + offset, end: relation.end + offset }));
    offset += plan.explanations.length;
    return result;
  });
  const sameWords = (left: string, right: string) => spanishWords(left).map(key).join(' ') === spanishWords(right).map(key).join(' ');
  return {
    target,
    labels,
    tokenSlots,
    relations,
    explanations: tokenSlots.map(index => explanations[index] || ''),
    supported: slot === ids.length && labels.every(Boolean) && plans.length > 0 && plans.every(plan => plan.supported)
      && (!card.answer_audio_text || sameWords(target, card.answer_audio_text)),
  };
}

/** Choice feedback for Spanish cards: the answer, its English meaning, and the
 * one contrast that separates it from the choice picked, when there is one. */
export function spanishChoiceHint(card: LessonCard, selectedId?: string | null): string {
  const correct = card.options.find(option => option.id === card.correct_option_id);
  const wrong = card.options.find(option => option.id === selectedId);
  const answer = (card.answer_audio_text || correct?.label || card.audio_text || '').trim().replace(/[.!?]+$/, '');
  const meaning = (card.spanish_translation || '').trim().replace(/[.!?]+$/, '');
  const lead = /listen/i.test(card.stage) ? 'You heard' : 'The answer is';
  const base = `${lead} ${quote(answer)}${meaning ? `: ${meaning}` : ''}.`;
  const right = spanishWords(correct?.label || '').map(key);
  const chosen = spanishWords(wrong?.label || '').map(key);
  // The same sentence with or without "no": doing it against not doing it.
  const withoutNo = (words: string[]) => words.filter(word => word !== 'no').join(' ');
  if (right.length && chosen.length && Math.abs(right.length - chosen.length) === 1 && withoutNo(right) === withoutNo(chosen)) {
    return `${base} “no” before the verb means “not”.`;
  }
  if (!right.length || right.length !== chosen.length) return base;
  const differences = right.map((word, index) => [word, chosen[index]]).filter(([a, b]) => a !== b);
  if (differences.length === 1) {
    const [expected, picked] = differences[0];
    if (SER_ESTAR[expected] === picked) {
      const ser = SER.has(expected) ? expected : picked;
      return `${base} ${quote(ser)} says who someone is; ${quote(SER_ESTAR[ser])} says what someone is doing.`;
    }
    const singular = NUMBER_PAIRS[expected] ? expected : NUMBER_PAIRS[picked] ? picked : '';
    if (singular && (NUMBER_PAIRS[singular] === expected || NUMBER_PAIRS[singular] === picked)) {
      return `${base} ${quote(singular)} is for one person; ${quote(NUMBER_PAIRS[singular])} is for more than one.`;
    }
  }
  return base;
}
