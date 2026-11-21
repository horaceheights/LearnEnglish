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
const SER = set('soy eres es somos son');
const ESTAR = set('estoy estás está estamos están');
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

// Unit 3: yo, tú and nosotros; tener; where someone is from; jobs and nationalities; mi/tu/su/nuestro.
const PRONOUN_PERSON: Record<string, string> = {
  yo: '1s', tú: '2s', él: '3s', ella: '3s', nosotros: '1p', nosotras: '1p', ellos: '3p', ellas: '3p',
};
const VERB_PERSON: Record<string, string> = {
  soy: '1s', eres: '2s', es: '3s', somos: '1p', son: '3p', estoy: '1s', estás: '2s', está: '3s', estamos: '1p', están: '3p',
  tengo: '1s', tienes: '2s', tiene: '3s', tenemos: '1p', tienen: '3p',
};
const VERB_ENGLISH: Record<string, string> = {
  soy: 'I am', eres: 'you are', somos: 'we are', estoy: 'I am', estás: 'you are', estamos: 'we are',
  tengo: 'I have', tienes: 'you have', tiene: 'he or she has', tenemos: 'we have', tienen: 'they have',
};
const NOT_ENGLISH: Record<string, string> = {
  soy: 'am not', estoy: 'am not', eres: 'are not', estás: 'are not', somos: 'are not', estamos: 'are not',
  tengo: 'do not have', tienes: 'do not have', tiene: 'does not have', tenemos: 'do not have', tienen: 'do not have',
};
const DROPPED: Record<string, string> = { '1s': '“yo”', '2s': '“tú”', '1p': '“nosotros”', '3s': '“él” or “ella”', '3p': '“ellos”' };
const TENER = set('tengo tienes tiene tenemos tienen');
const AGES = set('once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte');
for (const number of ['cero', ...AGES]) NUMBER_NAMES.add(number);
const COUNTRIES = set('méxico españa canadá');
// Nationalities and jobs agree with the person: -o/-or for él, -a/-ora for ella; the others never change.
const PERSON_WORD_KIND: Record<string, string> = {};
for (const [man, woman] of [['mexicano', 'mexicana'], ['español', 'española'], ['maestro', 'maestra'], ['doctor', 'doctora'],
  ['cocinero', 'cocinera'], ['conductor', 'conductora'], ['agricultor', 'agricultora'], ['enfermero', 'enfermera'],
  ['mesero', 'mesera'], ['trabajador', 'trabajadora'], ['mecánico', 'mecánica']]) {
  PERSON_WORD_KIND[man] = 'masculine';
  PERSON_WORD_KIND[woman] = 'feminine';
}
for (const word of ['canadiense', 'estadounidense', 'policía', 'artista', 'cantante']) PERSON_WORD_KIND[word] = 'any';
const PERSON_WORD_PLURAL: Record<string, string> = {
  mexicanos: 'masculine', mexicanas: 'feminine', españoles: 'masculine', canadienses: 'any', estadounidenses: 'any',
};
const POSSESSIVE_KIND: Record<string, string> = {
  mi: 'singular', mis: 'plural', tu: 'singular', tus: 'plural', su: 'singular', sus: 'plural',
  nuestro: 'masculine singular', nuestra: 'feminine singular', nuestros: 'masculine plural', nuestras: 'feminine plural',
};
const POSSESSIVE_ENGLISH: Record<string, string> = {
  mi: 'my', mis: 'my', tu: 'your', tus: 'your', su: 'his, her or their', sus: 'his, her or their',
  nuestro: 'our', nuestra: 'our', nuestros: 'our', nuestras: 'our',
};
Object.assign(NOUN_KIND, { dirección: 'feminine singular', nombre: 'masculine singular', equipaje: 'masculine singular' });
const NAMES = set('ana luis sofía diego');
// Fixed questions: each word in order, with what it does.
const FIXED_QUESTIONS: Record<string, string[]> = {
  'cómo te llamas': ['“Cómo” (how) starts the question.', '“te” (yourself) comes before the verb.', '“llamas” ends the question: “¿Cómo te llamas?” asks your name.'],
  'cuántos años tienes': ['“Cuántos” (how many) starts the question.', '“años” (years) comes right after “Cuántos”.', '“tienes” (you have) ends it: Spanish asks how many years you have.'],
  'de dónde eres': ['“De” (from) starts the question in Spanish.', '“dónde” (where) comes right after “De”.', '“eres” (you are) ends it: “¿De dónde eres?” is “Where are you from?”.'],
  'en qué trabajas': ['“En” (in) starts the question.', '“qué” (what) comes right after “En”.', '“trabajas” (you work) ends it: “¿En qué trabajas?” asks your job.'],
  'cuál es tu dirección': ['“Cuál” (which, what) starts the question.', '“es” comes right after “Cuál”.', '“tu” (your) goes right before “dirección”.', '“dirección” (address) ends the question.'],
  'qué estás haciendo': ['“Qué” (what) starts the question.', '“estás” (you are) comes right after “Qué”.', '“haciendo” (doing) ends it.'],
  'qué está haciendo él': ['“Qué” (what) starts the question.', '“está” comes right after “Qué”.', '“haciendo” (doing) comes after “está”.', '“él” comes last in the question.'],
  'qué está haciendo ella': ['“Qué” (what) starts the question.', '“está” comes right after “Qué”.', '“haciendo” (doing) comes after “está”.', '“ella” comes last in the question.'],
  'qué están haciendo ellos': ['“Qué” (what) starts the question.', '“están” comes right after “Qué”.', '“haciendo” (doing) comes after “están”.', '“ellos” comes last in the question.'],
};

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
  const possessivePhrase = () => {
    // mi libro, nuestras casas: the possessive comes first and matches the thing.
    const word = tokens[index] || '';
    const noun = tokens[index + 1] || '';
    const possessive = POSSESSIVE_KIND[key(word)];
    const kind = NOUN_KIND[key(noun)];
    if (!possessive || !kind || !(possessive.includes(' ') ? possessive === kind : kind.endsWith(possessive))) return null;
    explanations[index] = `${quote(word)} (${POSSESSIVE_ENGLISH[key(word)]}) goes right before ${quote(noun)} and matches it: ${kind}.`;
    explanations[index + 1] = `${quote(noun)} comes right after ${quote(word)}.`;
    relations.push({ start: index, end: index + 2, explanation: `${quote(`${word} ${noun}`)}: the possessive comes first and matches the noun.` });
    index += 2;
    return { text: `${word} ${noun}`, kind };
  };
  const countryPhrase = () => {
    // de México, de Estados Unidos
    if (COUNTRIES.has(key(tokens[index] || ''))) {
      explanations[index] = `${quote(tokens[index] || '')} is the country, so it comes right after “de”.`;
      index += 1;
      return true;
    }
    if (key(tokens[index] || '') === 'estados' && key(tokens[index + 1] || '') === 'unidos') {
      explanations[index] = '“Estados” starts the country name “Estados Unidos”.';
      explanations[index + 1] = '“Unidos” ends the country name “Estados Unidos”.';
      index += 2;
      return true;
    }
    return false;
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  const lower = tokens.map(key);
  const done = () => ({ explanations, relations, supported: index === tokens.length && explanations.every(Boolean) });
  if (FIXED_QUESTIONS[lower.join(' ')]) {
    FIXED_QUESTIONS[lower.join(' ')].forEach((text, at) => { explanations[at] = text; });
    relations.push({ start: 0, end: tokens.length, explanation: `Spanish asks ${quote(`¿${tokens.join(' ')}?`)} in this order.` });
    return { explanations, relations, supported: explanations.length === FIXED_QUESTIONS[lower.join(' ')].length };
  }
  if (tokens.length === 1 && (lower[0] === 'sí' || lower[0] === 'no')) {
    explanations[0] = lower[0] === 'sí' ? '“Sí” (yes) answers first, then the rest of the answer.' : '“No” answers first; a second “no” goes before the verb.';
    return { explanations, relations, supported: true };
  }
  if (tokens.length === 3 && lower[0] === 'me' && lower[1] === 'llamo' && NAMES.has(lower[2])) {
    explanations[0] = '“Me” (myself) comes first: Spanish says “Me llamo”, I call myself.';
    explanations[1] = '“llamo” comes right after “Me”.';
    explanations[2] = `${quote(tokens[2] || '')} is the name, so it comes last.`;
    relations.push({ start: 0, end: 2, explanation: '“Me llamo” is “my name is”: “Me” before “llamo”.' });
    return { explanations, relations, supported: true };
  }
  if (lower[0] === 'esto' && lower[1] === 'es') {
    explanations[0] = '“Esto” (this) points to a place you show, so it comes first.';
    explanations[1] = '“es” comes right after “Esto”.';
    index = 2;
    if (!countryPhrase()) return { explanations, relations, supported: false };
    return done();
  }
  if (POSSESSIVE_KIND[lower[0]]) {
    // Tu nombre es Luis. Su nombre es Sofía.
    const owned = possessivePhrase();
    if (!owned || key(tokens[index] || '') !== 'es' || !NAMES.has(key(tokens[index + 1] || ''))) return { explanations, relations, supported: false };
    explanations[index] = `“es” comes right after ${quote(owned.text)}.`;
    explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the name, so it comes last.`;
    index += 2;
    return done();
  }
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
      const thing = possessivePhrase() || nounPhrase();
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
  let person = '';
  const subjectKinds: string[] = [];
  if (PRONOUN_PERSON[key(tokens[index] || '')]) {
    subject = tokens[index] || '';
    person = PRONOUN_PERSON[key(subject)];
    plural = person.endsWith('p');
    subjectKinds.push(key(subject).startsWith('ella') ? 'feminine' : PRONOUNS.has(key(subject)) ? 'masculine' : 'any');
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
  } else if (ARTICLE_KIND[key(tokens[index])]) {
    const first = nounPhrase();
    if (!first) return { explanations, relations, supported: false };
    subject = first.text;
    plural = first.plural;
    person = plural ? '3p' : '3s';
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
      person = '3p';
    }
  }
  if (index < tokens.length) {
    // "no" goes right before the verb (Él no está), where English puts "not" after it.
    const negation = key(tokens[index] || '') === 'no' ? index : -1;
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
    if (!SER.has(verbKey) && !ESTAR.has(verbKey) && !TENER.has(verbKey)) return { explanations, relations, supported: false };
    const verbPerson = VERB_PERSON[verbKey] || '';
    const verbPlural = verbPerson.endsWith('p');
    if (subject && verbPerson !== person) return { explanations, relations, supported: false };
    if (!subject) person = verbPerson;
    // Things (Unit 2) are described, people are identified.
    const thing = !subject || Boolean(UNIT2_NOUNS[key(subject.split(' ').pop() || '')]);
    const meaning = TENER.has(verbKey) ? 'what someone has' : SER.has(verbKey) ? (thing ? 'what something is' : 'who someone is') : 'what someone is doing';
    const notEnglish = NOT_ENGLISH[verbKey] || (verbPlural ? 'are not' : 'is not');
    if (negation >= 0) {
      explanations[negation] = `“no” goes right before ${quote(verb)}: Spanish says ${quote(`no ${verb}`)} where English says “${notEnglish}”.`;
      relations.push({ start: negation, end: index + 1, explanation: `“no” comes before the verb: Spanish says ${quote(`no ${verb}`)}, English says “${notEnglish}”.` });
    }
    explanations[index] = !subject && VERB_ENGLISH[verbKey]
      ? `${quote(verb)} ${negation >= 0 ? 'comes right after “no”' : 'starts the sentence'}: Spanish leaves out ${DROPPED[verbPerson]}, and ${quote(verb)} already means “${VERB_ENGLISH[verbKey]}”.`
      : !subject && negation >= 0
        ? `${quote(verb)} comes right after “no”; it says ${meaning}.`
        : !subject
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
      const gender = subjectKinds.length === 1 && !subjectKinds[0].startsWith('any') ? subjectKinds[0].split(' ')[0] : '';
      if (!complement && key(word) === 'de') {
        const at = index;
        index += 1;
        if (!countryPhrase()) return { explanations, relations, supported: false };
        explanations[at] = `“de” (from) comes right after ${quote(verb)}, before the country.`;
        complement = tokens.slice(at, index).join(' ');
      }
      const personKind = verbPlural ? PERSON_WORD_PLURAL[key(word)] : PERSON_WORD_KIND[key(word)];
      if (!complement && personKind && (personKind === 'any' || !gender || personKind === gender)) {
        explanations[index] = personKind === 'any'
          ? `${quote(word)} comes right after ${quote(verb)} with no article; it is the same for a man or a woman.`
          : `${quote(word)} comes right after ${quote(verb)} with no article, and its ending matches ${gender ? quote(subject) : 'the speaker'} (${personKind}).`;
        complement = word;
        index += 1;
      }
      if (!complement && NAMES.has(key(word))) {
        explanations[index] = `${quote(word)} is the name, so it comes right after ${quote(verb)}.`;
        complement = word;
        index += 1;
        if (verbPlural && key(tokens[index] || '') === 'y' && NAMES.has(key(tokens[index + 1] || ''))) {
          explanations[index] = `“y” joins the two names.`;
          explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the second name.`;
          complement = `${word} y ${tokens[index + 1]}`;
          index += 2;
        }
      }
      if (!complement) complement = possessivePhrase()?.text;
      if (!complement && verbKey === 'son' && NOUN_KIND[key(word)]?.endsWith('plural')) {
        complement = word;
        explanations[index] = `${quote(word)} is a plural, so after “son” it needs no article.`;
        index += 1;
      }
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: ADJECTIVE_KIND[key(complement)]
        ? `After ${quote(verb)} comes the color or size, matching ${quote(subject)}: ${quote(complement)}.`
        : `After ${quote(verb)} comes ${thing ? 'what it is' : 'who they are'}: ${quote(complement)}.` });
    } else if (TENER.has(verbKey)) {
      let had = '';
      if (AGES.has(key(word)) && key(tokens[index + 1] || '') === 'años') {
        explanations[index] = `${quote(word)} is the age, so it comes right after ${quote(verb)}.`;
        explanations[index + 1] = '“años” (years) comes after the number: Spanish says how many years someone has.';
        relations.push({ start: verbIndex, end: index + 2, explanation: `Age uses tener: ${quote(`${verb} ${word} años`)}, not ser.` });
        had = `${word} años`;
        index += 2;
      }
      if (!had) had = possessivePhrase()?.text || nounPhrase()?.text || '';
      if (!had && NOUN_KIND[key(word)]?.endsWith('plural')) {
        explanations[index] = `${quote(word)} is a plural, so after ${quote(verb)} it needs no article.`;
        had = word;
        index += 1;
      }
      if (!had) return { explanations, relations, supported: false };
      if (!AGES.has(key(word))) relations.push({ start: verbIndex, end: index, explanation: `After ${quote(verb)} comes what someone has: ${quote(had)}.` });
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
