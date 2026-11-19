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
const ARTICLES = set('der die das ein eine');
const NOUNS = set('junge mädchen mann frau');
const PRONOUNS = set('er sie');
const VERBS = set('ist isst trinkt liest schreibt essen lesen schreiben');
// One person against two: the verb ending is the only difference after sie.
const NUMBER_PAIRS: Record<string, string> = { isst: 'essen', liest: 'lesen', schreibt: 'schreiben' };
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
    explanations[index] = `${quote(article)} is the article of ${quote(noun)}, so it comes right before it.`;
    explanations[index + 1] = `${quote(noun)} comes right after its article ${quote(article)}.`;
    relations.push({ start: index, end: index + 2, explanation: `In ${quote(`${article} ${noun}`)} the article comes first, then the noun.` });
    index += 2;
    return `${article} ${noun}`;
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  let subject = '';
  const subjectStart = index;
  if (PRONOUNS.has(key(tokens[index]))) {
    subject = tokens[index];
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
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
    relations.push({ start: subjectStart, end: index + 1, explanation: `German puts the verb right after who does it: ${quote(`${subject} ${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    if (key(verb) === 'ist') {
      const complement = nounPhrase();
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: `After “ist” comes what the person is: ${quote(complement)}.` });
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
    }
  }
  return base;
}
