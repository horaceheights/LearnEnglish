import type { LessonCard } from './types';

// German course cards (target_language "de") are for English speakers: their
// mistake explanations are English and follow German word order. Like the
// English construction teacher, every word of a German construction must belong
// to a supported pattern; the course-wide hint gate rejects anything else.
// Lower-case Latin letters keep Mädchen and schläft as single words.
const WORD = /[a-zßà-öø-ÿ]+/gi;
const germanWords = (text: string) => text.match(WORD) || [];
const key = (word: string) => word.toLowerCase();
const set = (value: string) => new Set(value.split(' '));
const ARTICLES = set('der die das ein eine kein keine');
const NOUNS = set('junge mädchen mann frau');
// German 1.5-1.6: family nouns. Plurals can follow sind without an article.
for (const noun of 'familie baby babys kind kinder bruder brüder schwester schwestern erwachsenen'.split(' ')) NOUNS.add(noun);
// German 1.7-1.12: parents and grandparents, pets, friends and people.
for (const noun of 'vater mutter eltern großvater großmutter großeltern enkelkinder hund katze vogel kaninchen haustier haustiere freundin freundinnen ehemann ehefrau sohn tochter person leute'.split(' ')) NOUNS.add(noun);
const BARE_PLURALS = set('babys kinder brüder schwestern haustiere freundinnen');
// German Unit 2: places and things carry a grammatical gender (der/die/das
// word), and numbers named as nouns are die-words (die Eins). Plurals follow
// sind or a number without an article.
const GENDER: Record<string, string> = {};
for (const [gender, nouns] of [
  ['der', 'park laden bus kuli rucksack stuhl tisch schreibtisch bleistift hund'],
  ['die', 'schule straße brücke tasche klasse schülerin zahl farbe katze eins zwei drei vier fünf sechs sieben acht neun zehn'],
  ['das', 'haus restaurant krankenhaus auto fahrrad buch handy klassenzimmer heft papier'],
]) for (const noun of nouns.split(' ')) { GENDER[noun] = gender; NOUNS.add(noun); }
const PLURALS = set('autos bücher handys kulis rucksäcke taschen stühle tische hefte bleistifte fahrräder busse häuser');
for (const noun of PLURALS) { NOUNS.add(noun); BARE_PLURALS.add(noun); }
// A role or job takes no article: Sie ist Schülerin.
const ROLES = set('schülerin');
const ADJECTIVES = set('rot blau grün gelb schwarz weiß braun rosa lila grau groß klein neu alt gleich verschieden');
// Before a counted plural a color ends in -e (rosa and lila never change).
const COUNTED = set('rote blaue grüne gelbe schwarze weiße braune graue rosa lila');
const COUNTS = set('zwei drei vier fünf sechs sieben acht neun zehn');
// Words that describe the person after ist/sind, with no article.
const DESCRIPTIONS = set('erwachsen');
const PRONOUNS = set('er sie');
const QUESTION_OBJECTS = set('er sie das');
const VERBS = set('ist sind isst trinkt liest schreibt essen lesen schreiben rennt rennen sitzt sitzen schwimmt schwimmen schläft schlafen spielt spielen lernt lernen arbeitet arbeiten kocht kochen redet reden frisst fressen hat haben');
// One person against two: the verb ending is the only difference after sie.
const NUMBER_PAIRS: Record<string, string> = {
  isst: 'essen', liest: 'lesen', schreibt: 'schreiben',
  rennt: 'rennen', sitzt: 'sitzen', schwimmt: 'schwimmen', schläft: 'schlafen', ist: 'sind',
  spielt: 'spielen', lernt: 'lernen', arbeitet: 'arbeiten', kocht: 'kochen', redet: 'reden', frisst: 'fressen',
};
const quote = (text: string) => `“${text}”`;

type Relation = { start: number; end: number; explanation: string };
type ClausePlan = { explanations: string[]; relations: Relation[]; supported: boolean };

function teachClause(text: string): ClausePlan {
  const tokens = germanWords(text);
  const explanations: string[] = tokens.map(() => '');
  const relations: Relation[] = [];
  let index = 0;
  const nounPhrase = () => {
    if (!ARTICLES.has(key(tokens[index] || '')) || !NOUNS.has(key(tokens[index + 1] || ''))) return null;
    const [article, noun] = [tokens[index], tokens[index + 1]];
    const kind = PLURALS.has(key(noun)) ? 'more than one' : GENDER[key(noun)] ? `a ${GENDER[key(noun)]}-word` : '';
    explanations[index] = kind
      ? `${quote(article)} goes with ${quote(noun)} (${kind}), so it comes right before it.`
      : `${quote(article)} is the article of ${quote(noun)}, so it comes right before it.`;
    explanations[index + 1] = `${quote(noun)} comes right after its article ${quote(article)}.`;
    relations.push({ start: index, end: index + 2, explanation: `In ${quote(`${article} ${noun}`)} the article comes first, then the noun.` });
    index += 2;
    return `${article} ${noun}`;
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  let subject = '';
  let pointsAtThing = false;
  const subjectStart = index;
  if (key(tokens[0] || '') === 'wer' || key(tokens[0] || '') === 'was') {
    // German 1.10: Wer + ist/sind + er/sie asks who someone is; German 2.4: Was ist das?
    const [wer = '', verb = '', pronoun = ''] = tokens;
    const what = key(wer) === 'wer' ? 'who' : 'what';
    if (tokens.length !== 3 || !['ist', 'sind'].includes(key(verb)) || !QUESTION_OBJECTS.has(key(pronoun))) {
      return { explanations, relations, supported: false };
    }
    explanations[0] = `${quote(wer)} means “${what}”, so it starts the question.`;
    explanations[1] = `The verb comes second, right after ${quote(wer)}: ${quote(`${wer} ${verb}`)}.`;
    explanations[2] = `${quote(pronoun)} is who you ask about, so it comes after ${quote(verb)}.`;
    relations.push({ start: 0, end: 3, explanation: what === 'who'
      ? `A who-question: ${quote(wer)}, then the verb, then the person: ${quote(`${wer} ${verb} ${pronoun}`)}.`
      : `A what-question: ${quote(wer)}, then the verb, then ${quote(pronoun)}: ${quote(`${wer} ${verb} ${pronoun}`)}.` });
    return { explanations, relations, supported: true };
  }
  if (key(tokens[0] || '') === 'welche') {
    // German 2.7-2.8: Welche Farbe hat das? / Welche Farbe haben sie? / Welche Zahl ist das?
    const [welche = '', what = '', verb = '', object = ''] = tokens;
    if (tokens.length !== 4 || !['farbe', 'zahl'].includes(key(what)) || !['hat', 'haben', 'ist'].includes(key(verb)) || !QUESTION_OBJECTS.has(key(object))) {
      return { explanations, relations, supported: false };
    }
    explanations[0] = `${quote(welche)} means “which”, so it starts the question.`;
    explanations[1] = `${quote(what)} comes right after ${quote(welche)}: ${quote(`${welche} ${what}`)}.`;
    explanations[2] = `The verb comes second, right after ${quote(`${welche} ${what}`)}.`;
    explanations[3] = `${quote(object)} is what you ask about, so it comes last.`;
    relations.push({ start: 0, end: 4, explanation: `A which-question: ${quote(`${welche} ${what}`)}, then the verb, then ${quote(object)}.` });
    return { explanations, relations, supported: true };
  }
  if (tokens.length === 2 && ['kein', 'keine'].includes(key(tokens[0])) && NOUNS.has(key(tokens[1]))) {
    // German 2.2: ..., kein Bus. says what it is not.
    const [kein, noun] = tokens;
    const kind = GENDER[key(noun)] ? ` (a ${GENDER[key(noun)]}-word)` : '';
    explanations[0] = `${quote(kein)} means “not a” and goes right before ${quote(noun)}${kind}.`;
    explanations[1] = `${quote(noun)} comes right after ${quote(kein)}.`;
    relations.push({ start: 0, end: 2, explanation: `${quote(`${kein} ${noun}`)} says what it is not: ${quote(kein)} first, then the noun.` });
    return { explanations, relations, supported: true };
  }
  if (COUNTS.has(key(tokens[0] || ''))) {
    // German 2.6-2.9: number + (color ending in -e) + plural noun.
    const [count = '', ...rest] = tokens;
    const color = rest.length === 2 ? rest[0] || '' : '';
    const noun = rest[rest.length - 1] || '';
    if (rest.length < 1 || rest.length > 2 || (color && !COUNTED.has(key(color))) || !PLURALS.has(key(noun))) {
      return { explanations, relations, supported: false };
    }
    explanations[0] = `${quote(count)} says how many, so it comes first.`;
    if (color) explanations[1] = `${quote(color)} is the color: it goes between the number and ${quote(noun)}${/e$/.test(key(color)) ? ', with -e before a counted plural' : ''}.`;
    explanations[tokens.length - 1] = `${quote(noun)} is what you count, so it comes last.`;
    relations.push({ start: 0, end: tokens.length, explanation: `German order: number, ${color ? 'color, ' : ''}then the thing: ${quote(tokens.join(' '))}.` });
    return { explanations, relations, supported: true };
  }
  if (PRONOUNS.has(key(tokens[index]))) {
    subject = tokens[index];
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
  } else if (key(tokens[index]) === 'das' && ['ist', 'sind'].includes(key(tokens[index + 1] || ''))) {
    // German 2.1: Das ist / Das sind points at a thing (this, that, it, these, those).
    subject = tokens[index];
    explanations[index] = `${quote(subject)} points at the thing, so it comes first.`;
    pointsAtThing = true;
    index += 1;
  } else {
    const first = nounPhrase();
    if (!first) return { explanations, relations, supported: false };
    subject = first;
    if (key(tokens[index] || '') === 'und') {
      const andIndex = index;
      index += 1;
      const second = nounPhrase();
      if (!second) return { explanations, relations, supported: false };
      explanations[andIndex] = `“und” joins ${quote(first)} and ${quote(second)}, so it goes between them.`;
      relations.push({ start: subjectStart, end: index, explanation: `One person, then “und”, then the other; each noun keeps its own article: ${quote(first)}, ${quote(second)}.` });
      subject = `${first} und ${second}`;
    }
  }
  if (index < tokens.length) {
    const verb = tokens[index];
    if (!VERBS.has(key(verb))) return { explanations, relations, supported: false };
    explanations[index] = `In German the verb comes second: ${quote(verb)} goes right after ${quote(subject)}.`;
    relations.push({ start: subjectStart, end: index + 1, explanation: pointsAtThing
      ? `The verb comes second, right after ${quote(subject)}: ${quote(`${subject} ${verb}`)}.`
      : `German puts the verb right after who does it: ${quote(`${subject} ${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    if (key(verb) === 'ist' || key(verb) === 'sind') {
      const word = tokens[index] || '';
      const describesThing = ADJECTIVES.has(key(word)) || key(word) === 'sehr';
      let complement = nounPhrase();
      if (!complement && (BARE_PLURALS.has(key(word)) || DESCRIPTIONS.has(key(word)) || ROLES.has(key(word)))) {
        complement = word;
        explanations[index] = BARE_PLURALS.has(key(word))
          ? `${quote(word)} is a plural, so it comes right after ${quote(verb)} with no article.`
          : ROLES.has(key(word))
            ? `${quote(word)} is a role: it comes right after ${quote(verb)}, with no article in German.`
            : `${quote(word)} describes who they are, so it comes right after ${quote(verb)}.`;
        index += 1;
      }
      if (!complement && key(word) === 'sehr' && ADJECTIVES.has(key(tokens[index + 1] || ''))) {
        // German 2.13: sehr goes right before the adjective.
        explanations[index] = `${quote(word)} means “very”, so it goes right before ${quote(tokens[index + 1])}.`;
        explanations[index + 1] = `${quote(tokens[index + 1])} says what it is like, so it comes last.`;
        complement = `${word} ${tokens[index + 1]}`;
        index += 2;
      } else if (!complement && ADJECTIVES.has(key(word))) {
        // German 2.8-2.11: color and size go after ist/sind and keep their plain form.
        explanations[index] = `${quote(word)} says what it is like, so it comes after ${quote(verb)}.`;
        complement = word;
        index += 1;
      }
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: describesThing
        ? `After ${quote(verb)} comes what it is like: ${quote(complement)}.`
        : pointsAtThing
          ? `After ${quote(verb)} comes what it is: ${quote(complement)}.`
          : `After ${quote(verb)} comes what the person is: ${quote(complement)}.` });
    } else if (key(tokens[index] || '') === 'und' && VERBS.has(key(tokens[index + 1] || ''))) {
      // German 1.8: two actions, verb und verb.
      const second = tokens[index + 1];
      explanations[index] = `“und” joins the two actions ${quote(verb)} and ${quote(second)}.`;
      explanations[index + 1] = `${quote(second)} is the second action, so it comes after “und”.`;
      relations.push({ start: verbIndex, end: index + 2, explanation: `Two actions: ${quote(`${verb} und ${second}`)}.` });
      index += 2;
    }
    if (key(tokens[index] || '') === 'im' && NOUNS.has(key(tokens[index + 1] || ''))) {
      // German 2.5: im (in dem) before a der- or das-place.
      const place = tokens[index + 1];
      explanations[index] = `${quote(tokens[index])} (in dem) goes before ${quote(place)}, a ${GENDER[key(place)] || 'der'}-word.`;
      explanations[index + 1] = `${quote(place)} is the place, right after ${quote(tokens[index])}.`;
      relations.push({ start: verbIndex, end: index + 2, explanation: `The place comes after the action: ${quote(`${verb} ${tokens[index]} ${place}`)}.` });
      index += 2;
    } else if (key(tokens[index] || '') === 'in' && key(tokens[index + 1] || '') === 'der' && NOUNS.has(key(tokens[index + 2] || ''))) {
      // German 2.5: in der before a die-place.
      const place = tokens[index + 2];
      explanations[index] = `${quote(tokens[index])} starts the place: ${quote(`${tokens[index]} ${tokens[index + 1]} ${place}`)}.`;
      explanations[index + 1] = `${quote(tokens[index + 1])} comes after “in” because ${quote(place)} is a die-word.`;
      explanations[index + 2] = `${quote(place)} is the place, so it comes last.`;
      relations.push({ start: verbIndex, end: index + 3, explanation: `The place comes after the action: ${quote(`${verb} ${tokens[index]} ${tokens[index + 1]} ${place}`)}.` });
      index += 3;
    }
    if (key(tokens[index] || '') === 'nicht') {
      // German 1.9: nicht goes after the verb, at the end of a short sentence.
      explanations[index] = `${quote(tokens[index])} says the action is not happening; it goes after the verb ${quote(verb)}, at the end.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `German puts “nicht” after the verb: ${quote(`${verb} ${tokens[index]}`)}.` });
      index += 1;
    }
  }
  return { explanations, relations, supported: index === tokens.length && explanations.every(Boolean) };
}

/** The same plan shape as the English construction teacher, for German cards. */
export function germanConstructionPlan(card: LessonCard) {
  const ids = card.correct_option_ids || [];
  const labels = ids.map(id => card.options.find(option => option.id === id)?.label || '');
  const tokenSlots: number[] = [];
  let slot = 0;
  let tokenCount = 0;
  const target = card.prompt.replace(/\[blank\]|\{blank\}/gi, '___').split(/(_{2,})/).map(part => {
    if (/^_{2,}$/.test(part)) {
      tokenSlots.push(tokenCount);
      const label = labels[slot++] || '';
      tokenCount += germanWords(label).length;
      return label;
    }
    tokenCount += germanWords(part).length;
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
  const sameWords = (left: string, right: string) => germanWords(left).map(key).join(' ') === germanWords(right).map(key).join(' ');
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

/** Choice feedback for German cards: the answer, its English meaning, and the
 * one-or-two-people contrast when only the verb ending separates the choices. */
export function germanChoiceHint(card: LessonCard, selectedId?: string | null): string {
  const correct = card.options.find(option => option.id === card.correct_option_id);
  const wrong = card.options.find(option => option.id === selectedId);
  const answer = (card.answer_audio_text || correct?.label || card.audio_text || '').trim().replace(/[.!?]+$/, '');
  const meaning = (card.spanish_translation || '').trim().replace(/[.!?]+$/, '');
  const lead = /listen/i.test(card.stage) ? 'You heard' : 'The answer is';
  const base = `${lead} ${quote(answer)}${meaning ? `: ${meaning}` : ''}.`;
  const right = germanWords(correct?.label || '').map(key);
  const chosen = germanWords(wrong?.label || '').map(key);
  if (right.length && right.length === chosen.length) {
    const differences = right.map((word, index) => [word, chosen[index]]).filter(([a, b]) => a !== b);
    if (differences.length === 1) {
      const [expected, picked] = differences[0];
      const singular = NUMBER_PAIRS[expected] ? expected : NUMBER_PAIRS[picked] ? picked : '';
      if (singular && (NUMBER_PAIRS[singular] === expected || NUMBER_PAIRS[singular] === picked)) {
        return `${base} ${quote(singular)} is for one person; ${quote(NUMBER_PAIRS[singular])} is for two.`;
      }
      // German Unit 2: ein/eine, kein/keine and der/die/das follow the noun's gender.
      const at = right.indexOf(expected);
      if (ARTICLES.has(expected) && ARTICLES.has(picked) && GENDER[right[at + 1] || '']) {
        const noun = germanWords(correct?.label || '')[at + 1];
        return `${base} ${quote(noun)} is a ${GENDER[right[at + 1]]}-word, so it takes ${quote(expected)}.`;
      }
    }
  }
  return base;
}
