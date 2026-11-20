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
};
const PRONOUNS = set('él ella ellos ellas');
const PLURAL_PRONOUNS = set('ellos ellas');
const SER = set('es son');
const ESTAR = set('está están');
const ACTIONS = set('comiendo bebiendo leyendo escribiendo corriendo nadando durmiendo jugando estudiando trabajando cocinando hablando');
// Who-questions: quién (one person) takes es and él/ella; quiénes takes son and ellos/ellas.
const QUESTION_WORDS: Record<string, boolean> = { quién: false, quiénes: true };
// "Sitting" is a state word that agrees with who is sitting.
const STATES: Record<string, string> = { sentado: 'masculine singular', sentados: 'masculine plural' };
// One person against more than one: the verb is the only difference.
const NUMBER_PAIRS: Record<string, string> = { es: 'son', está: 'están', sentado: 'sentados' };
// Who someone is (ser) against what someone is doing (estar).
const SER_ESTAR: Record<string, string> = { es: 'está', son: 'están', está: 'es', están: 'son' };
const quote = (text: string) => `“${text}”`;

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
    return { text: `${article} ${noun}`, plural: NOUN_KIND[key(noun)].endsWith('plural') };
  };
  if (!tokens.length) return { explanations, relations, supported: false };
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
  if (PRONOUNS.has(key(tokens[index]))) {
    subject = tokens[index];
    plural = PLURAL_PRONOUNS.has(key(subject));
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
  } else if (ARTICLE_KIND[key(tokens[index])]) {
    const first = nounPhrase();
    if (!first) return { explanations, relations, supported: false };
    subject = first.text;
    plural = first.plural;
    if (key(tokens[index] || '') === 'y') {
      const andIndex = index;
      index += 1;
      const second = nounPhrase();
      if (!second) return { explanations, relations, supported: false };
      explanations[andIndex] = `“y” joins ${quote(first.text)} and ${quote(second.text)}, so it goes between them.`;
      relations.push({ start: subjectStart, end: index, explanation: `One person, then “y”, then the other; each noun keeps its own article.` });
      subject = `${first.text} y ${second.text}`;
      plural = true;
    }
  }
  if (index < tokens.length) {
    // "no" goes right before the verb (Él no está), where English puts "not" after it.
    const negation = key(tokens[index]) === 'no' && subject ? index : -1;
    if (negation >= 0) index += 1;
    const verb = tokens[index] || '';
    const verbKey = key(verb);
    if (!SER.has(verbKey) && !ESTAR.has(verbKey)) return { explanations, relations, supported: false };
    if (negation >= 0 && !ESTAR.has(verbKey)) return { explanations, relations, supported: false };
    const verbPlural = verbKey === 'son' || verbKey === 'están';
    if (subject && verbPlural !== plural) return { explanations, relations, supported: false };
    const meaning = SER.has(verbKey) ? 'who someone is' : 'what someone is doing';
    if (negation >= 0) {
      explanations[negation] = `“no” goes right before ${quote(verb)}: Spanish says ${quote(`no ${verb}`)} where English says “${verbPlural ? 'are' : 'is'} not”.`;
      relations.push({ start: negation, end: index + 1, explanation: `“no” comes before the verb: Spanish says ${quote(`no ${verb}`)}, English says “${verbPlural ? 'are' : 'is'} not”.` });
    }
    explanations[index] = !subject
      ? `${quote(verb)} starts the sentence: Spanish can leave out “ellos”, and ${quote(verb)} already means “they are”.`
      : negation >= 0
        ? `${quote(verb)} comes right after “no”; it says ${meaning}${verbPlural ? ' for more than one person' : ''}.`
        : `${quote(verb)} comes right after ${quote(subject)}; it says ${meaning}${verbPlural ? ' for more than one person' : ''}.`;
    if (subject) relations.push({ start: subjectStart, end: index + 1, explanation: `The verb comes right after who it is about: ${quote(`${subject} ${negation >= 0 ? 'no ' : ''}${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    const word = tokens[index] || '';
    if (SER.has(verbKey)) {
      let complement = nounPhrase()?.text;
      if (!complement && verbKey === 'son' && NOUN_KIND[key(word)]?.endsWith('plural')) {
        complement = word;
        explanations[index] = `${quote(word)} is a plural, so after “son” it needs no article.`;
        index += 1;
      }
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: `After ${quote(verb)} comes who they are: ${quote(complement)}.` });
    } else if (ACTIONS.has(key(word))) {
      explanations[index] = `${quote(word)} is the action, so it comes right after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `${quote(verb)} + the action: ${quote(`${verb} ${word}`)}.` });
      index += 1;
    } else if (STATES[key(word)] && STATES[key(word)].endsWith('plural') === verbPlural) {
      explanations[index] = `${quote(word)} describes how they are and matches ${verbPlural ? 'more than one person' : 'one person'}, so it comes after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `${quote(verb)} + ${quote(word)}: sitting is ${quote('sentado')}, never an -ando form.` });
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
