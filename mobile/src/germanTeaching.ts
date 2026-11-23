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
// German Unit 4: a der-word after the verb takes den/einen/meinen (Wir putzen den Tisch);
// after auf, unter, neben and in comes dem or der (auf dem Tisch, neben der Lampe).
const OBJECT_FORMS: Record<string, string> = { den: 'der', einen: 'ein', meinen: 'mein' };
for (const article of 'den einen dem'.split(' ')) ARTICLES.add(article);
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
  ['der', 'park laden bus kuli rucksack stuhl tisch schreibtisch bleistift hund name'],
  ['die', 'schule straße brücke tasche klasse schülerin zahl farbe katze eins zwei drei vier fünf sechs sieben acht neun zehn '
    + 'null elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig adresse telefonnummer'],
  ['das', 'haus restaurant krankenhaus auto fahrrad buch handy klassenzimmer heft papier gepäck'],
]) for (const noun of nouns.split(' ')) { GENDER[noun] = gender; NOUNS.add(noun); }
// German Unit 4: the home, the day and the calendar.
for (const [gender, nouns] of [
  ['der', 'computer garten boden schlüssel stift monat tag geburtstag großvater bus mann sohn freund jungen'],
  ['die', 'küche lampe tür kleidung wohnung wand treppe toilette woche mutter großmutter frau tochter freundin'],
  ['das', 'zuhause schlafzimmer badezimmer wohnzimmer esszimmer bett sofa fenster dach jahr wochenende gesicht frühstück kind'],
]) for (const noun of nouns.split(' ')) { GENDER[noun] = gender; NOUNS.add(noun); }
const PLURALS = set('autos bücher handys kulis rucksäcke taschen stühle tische hefte bleistifte fahrräder busse häuser usa '
  + 'lampen betten tage monate freunde zähne erwachsenen kinder');
for (const noun of PLURALS) { NOUNS.add(noun); BARE_PLURALS.add(noun); }
// A role or job takes no article: Sie ist Schülerin.
const ROLES = set('schülerin');
// German Unit 3: jobs and nationalities work like roles, in a man's and a woman's
// form (Lehrer, Lehrerin), with no article after sein: Sie ist Ärztin.
for (const role of ('lehrer lehrerin arzt ärztin koch köchin fahrer fahrerin bauer bäuerin krankenpfleger krankenpflegerin '
  + 'kellner kellnerin polizist polizistin künstler künstlerin sänger sängerin arbeiter arbeiterin mechaniker mechanikerin '
  + 'mexikaner mexikanerin amerikaner amerikanerin kanadier kanadierin spanier spanierin').split(' ')) ROLES.add(role);
const NAMES = set('ana luis sofia diego');
const POSSESSIVES = set('mein meine dein deine sein seine ihr ihre unser unsere meinen meiner meinem');
const AGES = set('elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig');
const COUNTRIES = set('mexiko kanada spanien');
const QUESTION_WORDS: Record<string, string> = { wie: 'how', woher: 'where from', was: 'what', wo: 'where' };
const DAYS = set('montag dienstag mittwoch donnerstag freitag samstag sonntag');
const MONTHS = set('januar februar märz april mai juni juli august september oktober november dezember');
// Es ist Morgen / Nachmittag / Abend / Nacht / Wochenende: a time of day with no article.
const TIMES = set('morgen nachmittag abend nacht wochenende');
const HOURS = set('ein eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig');
const DAYPARTS: Record<string, string> = { morgens: 'in the morning', nachmittags: 'in the afternoon', abends: 'in the evening', nachts: 'at night' };
// A time word can start the sentence; then the verb still comes second.
const LEADERS: Record<string, string> = { zuerst: 'first', dann: 'then', danach: 'after that', heute: 'today', morgen: 'tomorrow' };
const PLACE_WORDS: Record<string, string> = { in: 'in', auf: 'on', unter: 'under', neben: 'next to' };
// Where someone goes: nach Hause, zu mir nach Hause, zu mir (to my place), zur Schule, zum Park.
const DIRECTIONS = ['zu mir nach hause', 'zu mir', 'nach hause', 'zur schule', 'zum park'];
const BARE_OBJECTS = set('frühstück');
const SEPARABLE: Record<string, string> = { auf: 'aufwachen (wake up)', an: 'anziehen (get dressed)' };
const ADJECTIVES = set('rot blau grün gelb schwarz weiß braun rosa lila grau groß klein neu alt gleich verschieden');
// Before a counted plural a color ends in -e (rosa and lila never change).
const COUNTED = set('rote blaue grüne gelbe schwarze weiße braune graue rosa lila');
// German Unit 4: after der/die/das a color before the noun also ends in -e: das blaue Buch.
const NAMED = set('rote blaue grüne gelbe schwarze weiße braune graue');
const COUNTS = set('zwei drei vier fünf sechs sieben acht neun zehn');
// Words that describe the person after ist/sind, with no article.
const DESCRIPTIONS = set('erwachsen');
const PRONOUNS = set('er sie ich du wir es');
const QUESTION_OBJECTS = set('er sie das');
const VERBS = set('ist sind isst trinkt liest schreibt essen lesen schreiben rennt rennen sitzt sitzen schwimmt schwimmen schläft schlafen spielt spielen lernt lernen arbeitet arbeiten kocht kochen redet reden frisst fressen hat haben');
// German Unit 3: ich, du and wir forms, heißen, kommen, machen and haben.
for (const verb of ('bin bist esse trinke trinkst lese schreibe schreibst renne rennst sitze schwimme schwimmst schlafe schläfst '
  + 'spiele spielst lerne lernst arbeite arbeitest koche kochst rede redest heiße heißt komme kommst kommt kommen '
  + 'mache machst macht machen habe hast').split(' ')) VERBS.add(verb);
// German Unit 4: routines, chores and everyday verbs.
for (const verb of ('wache wachst wacht wachen wasche wäschst wäscht waschen putze putzt putzen frühstücke frühstückst frühstückt frühstücken '
  + 'ziehe ziehst zieht ziehen gehe gehst geht gehen öffne öffnest öffnet öffnen schließe schließt schließen sehe siehst sieht sehen '
  + 'benutze benutzt benutzen finde findest findet finden gebe gibst gibt geben').split(' ')) VERBS.add(verb);
const BE = set('ist sind bin bist');
const HAVE = set('habe hast hat haben');
const COME = set('komme kommst kommt kommen');
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
    const determiner = key(tokens[index] || '');
    if (!(ARTICLES.has(determiner) || POSSESSIVES.has(determiner))) return null;
    if (['der', 'die', 'das'].includes(determiner) && NAMED.has(key(tokens[index + 1] || '')) && NOUNS.has(key(tokens[index + 2] || ''))) {
      // German 4.3: das blaue Buch. The color sits between the article and the noun, with -e.
      const [article = '', color = '', noun = ''] = tokens.slice(index, index + 3);
      explanations[index] = `${quote(article)} goes with ${quote(noun)}, so it starts ${quote(`${article} ${color} ${noun}`)}.`;
      explanations[index + 1] = `${quote(color)} describes ${quote(noun)}: it goes between ${quote(article)} and the noun, with -e after der/die/das.`;
      explanations[index + 2] = `${quote(noun)} comes last, after its color ${quote(color)}.`;
      relations.push({ start: index, end: index + 3, explanation: `Article, color, noun: ${quote(`${article} ${color} ${noun}`)}.` });
      index += 3;
      return `${article} ${color} ${noun}`;
    }
    if (!NOUNS.has(key(tokens[index + 1] || ''))) return null;
    const [article = '', noun = ''] = [tokens[index], tokens[index + 1]];
    const kind = PLURALS.has(key(noun)) ? 'more than one' : GENDER[key(noun)] ? `a ${GENDER[key(noun)]}-word` : '';
    explanations[index] = OBJECT_FORMS[determiner] && GENDER[key(noun)] === 'der'
      // German 4.4-4.11: der Tisch -> den Tisch, ein Computer -> einen Computer after the verb.
      ? `${quote(article)} is ${quote(OBJECT_FORMS[determiner] || '')} changed for a der-word after the verb, so it comes right before ${quote(noun)}.`
      : POSSESSIVES.has(determiner)
      // German 3.10-3.12: mein/dein/sein/ihr/unser say whose it is; -e before a die-word or a plural.
      ? `${quote(article)} says whose ${quote(noun)} it is${kind ? ` (${kind})` : ''}, so it comes right before it.`
      : kind
        ? `${quote(article)} goes with ${quote(noun)} (${kind}), so it comes right before it.`
        : `${quote(article)} is the article of ${quote(noun)}, so it comes right before it.`;
    explanations[index + 1] = `${quote(noun)} comes right after its article ${quote(article)}.`;
    relations.push({ start: index, end: index + 2, explanation: `In ${quote(`${article} ${noun}`)} the article comes first, then the noun.` });
    index += 2;
    return `${article} ${noun}`;
  };
  const placePhrase = () => {
    const word = key(tokens[index] || '');
    const next = tokens[index + 1] || '';
    if (word === 'im' && (NOUNS.has(key(next)) || MONTHS.has(key(next)))) {
      // German 2.5 and 4.1: im (in dem) before a der- or das-place; German 4.14: im Juli.
      explanations[index] = MONTHS.has(key(next))
        ? `${quote(tokens[index] || '')} means “in” before a month, so it comes right before ${quote(next)}.`
        : `${quote(tokens[index] || '')} (in dem) goes before ${quote(next)}, a ${GENDER[key(next)] || 'der'}-word.`;
      explanations[index + 1] = `${quote(next)} comes right after ${quote(tokens[index] || '')}.`;
      const phrase = `${tokens[index]} ${next}`;
      relations.push({ start: index, end: index + 2, explanation: `${quote(phrase)} says where or when, as one piece.` });
      index += 2;
      return phrase;
    }
    const article = key(next);
    const noun = tokens[index + 2] || '';
    if (PLACE_WORDS[word] && ['dem', 'der'].includes(article) && NOUNS.has(key(noun))) {
      // German 4.3: auf dem Tisch, unter dem Stuhl, neben der Lampe, in der Küche.
      const prep = tokens[index] || '';
      const phrase = `${prep} ${next} ${noun}`;
      explanations[index] = `${quote(prep)} means “${PLACE_WORDS[word]}”, so it starts the place: ${quote(phrase)}.`;
      explanations[index + 1] = `${quote(next)} comes after ${quote(prep)} because ${quote(noun)} is a ${GENDER[key(noun)] || (article === 'der' ? 'die' : 'der')}-word.`;
      explanations[index + 2] = `${quote(noun)} is the place, so it ends ${quote(phrase)}.`;
      relations.push({ start: index, end: index + 3, explanation: `The place is one piece: ${quote(phrase)}.` });
      index += 3;
      return phrase;
    }
    return null;
  };
  const restOfClause = (verb: string) => {
    // German Unit 4: after the verb come mir/mich, am Morgen, who or what, the place, jetzt,
    // the separable auf/an and nicht.
    let progress = true;
    while (progress && index < tokens.length) {
      progress = false;
      const word = key(tokens[index] || '');
      const start = index;
      const next = tokens[index + 1] || '';
      if (['mir', 'mich'].includes(word)) {
        explanations[index] = `${quote(tokens[index] || '')} means “myself” here; it comes right after the verb ${quote(verb)}.`;
        index += 1;
      } else if (word === 'am' && key(next) === 'morgen') {
        const phrase = `${tokens[index]} ${next}`;
        explanations[index] = `${quote(tokens[index] || '')} starts ${quote(phrase)} (in the morning).`;
        explanations[index + 1] = `${quote(next)} comes right after ${quote(tokens[index] || '')}.`;
        relations.push({ start, end: index + 2, explanation: `${quote(phrase)} says when, as one piece.` });
        index += 2;
      } else if (word === 'jetzt') {
        explanations[index] = `${quote(tokens[index] || '')} (now) says when, so it comes after ${quote(verb)}.`;
        index += 1;
      } else if (word === 'nicht') {
        // German 1.9: nicht goes after the verb, at the end of a short sentence.
        explanations[index] = `${quote(tokens[index] || '')} says the action is not happening; it goes after the verb ${quote(verb)}, at the end.`;
        relations.push({ start: Math.max(0, index - 1), end: index + 1, explanation: `German puts “nicht” near the end: ${quote(tokens.slice(0, index + 1).join(' '))}.` });
        index += 1;
      } else if (SEPARABLE[word] && index === tokens.length - 1) {
        explanations[index] = `${quote(tokens[index] || '')} belongs to ${SEPARABLE[word]}: it leaves ${quote(verb)} and goes to the very end.`;
        relations.push({ start: 0, end: index + 1, explanation: `${quote(verb)} stays second and ${quote(tokens[index] || '')} closes the sentence.` });
        index += 1;
      } else if (word === 'und' && VERBS.has(key(next))) {
        // German 1.8: two actions, verb und verb.
        explanations[index] = `“und” joins the two actions ${quote(verb)} and ${quote(next)}.`;
        explanations[index + 1] = `${quote(next)} is the second action, so it comes after “und”.`;
        relations.push({ start: Math.max(0, index - 1), end: index + 2, explanation: `Two actions: ${quote(`${verb} und ${next}`)}.` });
        index += 2;
      } else if (word === 'und' && PRONOUNS.has(key(next)) && VERBS.has(key(tokens[index + 2] || ''))) {
        // German 4.17: Ich spiele und ich renne im Park.
        explanations[index] = `“und” joins two short sentences, so it comes before the second ${quote(next)}.`;
        explanations[index + 1] = `${quote(next)} starts the second sentence, right after “und”.`;
        explanations[index + 2] = `${quote(tokens[index + 2] || '')} comes right after ${quote(next)}.`;
        index += 3;
      } else if (word === 'und' && (ARTICLES.has(key(next)) || POSSESSIVES.has(key(next)))) {
        index += 1;
        if (!nounPhrase()) { index = start; break; }
        explanations[start] = `“und” joins the two people or things, so it goes between them.`;
      } else {
        const direction = DIRECTIONS.find(d => tokens.slice(index, index + d.split(' ').length).map(key).join(' ') === d);
        if (direction) {
          const size = direction.split(' ').length;
          const phrase = tokens.slice(index, index + size).join(' ');
          for (let at = index; at < index + size; at++) explanations[at] = `${quote(tokens[at] || '')} is part of ${quote(phrase)} (where to), which comes after ${quote(verb)}.`;
          relations.push({ start: index, end: index + size, explanation: `Where to is one piece: ${quote(phrase)}.` });
          index += size;
        } else if ((COUNTS.has(word) || AGES.has(word)) && PLURALS.has(key(next))) {
          // German 4.4 and 4.12: Es gibt drei Bücher. Eine Woche hat sieben Tage.
          explanations[index] = `${quote(tokens[index] || '')} says how many, so it comes right before ${quote(next)}.`;
          explanations[index + 1] = `${quote(next)} is what you count, right after the number.`;
          relations.push({ start, end: index + 2, explanation: `Number, then the plural: ${quote(`${tokens[index]} ${next}`)}.` });
          index += 2;
        } else if (BARE_OBJECTS.has(word) || (BARE_PLURALS.has(word) && HAVE.has(key(verb)))) {
          explanations[index] = `${quote(tokens[index] || '')} is what ${quote(verb)} is about, so it comes after it with no article.`;
          index += 1;
        } else if (!placePhrase() && nounPhrase()) {
          relations.push({ start, end: index, explanation: `After ${quote(verb)} comes who or what: ${quote(tokens.slice(start, index).join(' '))}.` });
        }
      }
      if (index > start) progress = true;
    }
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  let subject = '';
  let pointsAtThing = false;
  const subjectStart = index;
  if (key(tokens[0] || '') === 'wer' || (key(tokens[0] || '') === 'was' && ['ist', 'sind'].includes(key(tokens[1] || '')))) {
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
  if (['welche', 'welcher'].includes(key(tokens[0] || ''))) {
    // German 2.7-2.8: Welche Farbe hat das? / Welche Zahl ist das? German 4.9 and 4.13:
    // Welcher Tag ist heute? Welcher Monat ist es?
    const [welche = '', what = '', verb = '', object = ''] = tokens;
    if (tokens.length !== 4 || !['farbe', 'zahl', 'tag', 'monat'].includes(key(what)) || !['hat', 'haben', 'ist'].includes(key(verb))
      || !(QUESTION_OBJECTS.has(key(object)) || ['heute', 'es'].includes(key(object)))) {
      return { explanations, relations, supported: false };
    }
    explanations[0] = `${quote(welche)} means “which”, so it starts the question.`;
    explanations[1] = `${quote(what)} comes right after ${quote(welche)}: ${quote(`${welche} ${what}`)}.`;
    explanations[2] = `The verb comes second, right after ${quote(`${welche} ${what}`)}.`;
    explanations[3] = `${quote(object)} is what you ask about, so it comes last.`;
    relations.push({ start: 0, end: 4, explanation: `A which-question: ${quote(`${welche} ${what}`)}, then the verb, then ${quote(object)}.` });
    return { explanations, relations, supported: true };
  }
  if (tokens.length === 1 && ['ja', 'nein'].includes(key(tokens[0]))) {
    // German 3.4: Ja, ... / Nein, ... answers a yes/no question before the comma.
    explanations[0] = `${quote(tokens[0])} answers the question, so it comes first.`;
    return { explanations, relations, supported: true };
  }
  if (QUESTION_WORDS[key(tokens[0] || '')]) {
    // German 3.1-3.13: Wie heißt du? Wie alt bist du? Woher kommst du? Was machst du?
    // Was bist du von Beruf? Wie ist deine Adresse? The verb comes second.
    const word = tokens[0] || '';
    let at = 1;
    let asked = word;
    explanations[0] = `${quote(word)} means “${QUESTION_WORDS[key(word)]}”, so it starts the question.`;
    if (key(word) === 'wie' && ['alt', 'spät'].includes(key(tokens[1] || ''))) {
      const alt = tokens[1] || '';
      explanations[1] = `${quote(alt)} goes with ${quote(word)}: ${quote(`${word} ${alt}`)} means “${key(alt) === 'alt' ? 'how old' : 'what time'}”.`;
      asked = `${word} ${alt}`;
      at = 2;
    }
    const verb = tokens[at] || '';
    if (!VERBS.has(key(verb))) return { explanations, relations, supported: false };
    explanations[at] = `The verb comes second, right after ${quote(asked)}.`;
    index = at + 1;
    let about = '';
    if (PRONOUNS.has(key(tokens[index] || ''))) {
      about = tokens[index] || '';
      explanations[index] = `${quote(about)} is who you ask about, so it comes after ${quote(verb)}.`;
      index += 1;
    } else {
      about = nounPhrase() || '';
      if (!about) return { explanations, relations, supported: false };
    }
    if (key(tokens[index] || '') === 'von' && key(tokens[index + 1] || '') === 'beruf') {
      explanations[index] = `${quote(tokens[index])} starts ${quote(`${tokens[index]} ${tokens[index + 1]}`)} (by job), which ends the question.`;
      explanations[index + 1] = `${quote(tokens[index + 1])} comes last, right after ${quote(tokens[index])}.`;
      index += 2;
    }
    relations.push({ start: 0, end: index, explanation: `Question word first, then the verb, then who you ask about: ${quote(tokens.slice(0, index).join(' '))}.` });
    return { explanations, relations, supported: index === tokens.length && explanations.every(Boolean) };
  }
  if (VERBS.has(key(tokens[0] || '')) && tokens.length >= 2) {
    // German 3.4-3.14: a yes/no question puts the verb first: Isst er? Ist sie Ärztin?
    const verb = tokens[0] || '';
    explanations[0] = `A yes/no question starts with the verb: ${quote(verb)} comes first.`;
    index = 1;
    let about = '';
    if (PRONOUNS.has(key(tokens[1] || '')) || (key(tokens[1] || '') === 'das' && BE.has(key(verb)))) {
      about = tokens[1] || '';
      explanations[1] = `${quote(about)} comes right after the verb ${quote(verb)}.`;
      index = 2;
    } else {
      about = nounPhrase() || '';
      if (!about) return { explanations, relations, supported: false };
    }
    const asked = tokens[index] || '';
    if (asked && (ROLES.has(key(asked)) || AGES.has(key(asked)))) {
      explanations[index] = `${quote(asked)} is what you ask about, so it comes last.`;
      index += 1;
    } else if (!(BE.has(key(verb)) && key(about) === 'das' && nounPhrase())) {
      // German 4.8: Rennst du im Park? Putzt du den Tisch? (German 4.2: Ist das eine Tür? above.)
      restOfClause(verb);
    }
    relations.push({ start: 0, end: index, explanation: `A yes/no question: the verb first, then ${quote(about)}: ${quote(tokens.slice(0, index).join(' '))}.` });
    return { explanations, relations, supported: index === tokens.length && explanations.every(Boolean) };
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
  if (tokens.length <= 3) {
    // German 4.1-4.15: a Learn word with its article: Das Wohnzimmer, Eine Woche.
    if (nounPhrase() && index === tokens.length) return { explanations, relations, supported: true };
    index = 0;
    explanations.fill('');
    relations.length = 0;
  }
  let leader = '';
  if (LEADERS[key(tokens[0] || '')] && VERBS.has(key(tokens[1] || ''))) leader = tokens[0] || '';
  if (key(tokens[0] || '') === 'zum' && key(tokens[1] || '') === 'schluss' && VERBS.has(key(tokens[2] || ''))) leader = `${tokens[0]} ${tokens[1]}`;
  if (leader) {
    // German 4.6, 4.9 and 4.12: Zuerst wache ich auf. Heute ist Montag. The verb stays second,
    // so who does it moves after the verb.
    const size = leader.split(' ').length;
    for (let at = 0; at < size; at++) explanations[at] = `${quote(leader)} (${LEADERS[key(leader)] || 'finally'}) starts the sentence.`;
    const verb = tokens[size] || '';
    explanations[size] = `The verb stays second: ${quote(verb)} comes right after ${quote(leader)}.`;
    relations.push({ start: 0, end: size + 1, explanation: `A time word first, then the verb: ${quote(`${leader} ${verb}`)}.` });
    index = size + 1;
    if (PRONOUNS.has(key(tokens[index] || ''))) {
      explanations[index] = `${quote(tokens[index] || '')} comes after the verb, because ${quote(leader)} took the first place.`;
      relations.push({ start: size, end: index + 1, explanation: `After a time word, who does it follows the verb: ${quote(`${verb} ${tokens[index]}`)}.` });
      index += 1;
    } else if (BE.has(key(verb)) && DAYS.has(key(tokens[index] || ''))) {
      explanations[index] = `${quote(tokens[index] || '')} is the day, so it comes last.`;
      index += 1;
    } else return { explanations, relations, supported: false };
    restOfClause(verb);
    return { explanations, relations, supported: index === tokens.length && explanations.every(Boolean) };
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
    relations.push({ start: subjectStart, end: index + 1, explanation: pointsAtThing || key(subject) === 'es'
      ? `The verb comes second, right after ${quote(subject)}: ${quote(`${subject} ${verb}`)}.`
      : `German puts the verb right after who does it: ${quote(`${subject} ${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    if (BE.has(key(verb))) {
      const word = tokens[index] || '';
      let kind = '';
      const describesThing = ADJECTIVES.has(key(word)) || key(word) === 'sehr';
      let complement = nounPhrase();
      if (!complement && NAMES.has(key(word))) {
        // German 3.2 and 3.10: Ich bin Ana. Mein Name ist Ana.
        explanations[index] = `${quote(word)} is the name, so it comes after ${quote(verb)}.`;
        complement = word;
        index += 1;
      } else if (!complement && ['kein', 'keine'].includes(key(word)) && ROLES.has(key(tokens[index + 1] || ''))) {
        // German 3.7-3.14: Nein, er ist kein Kellner. kein before a job or nationality.
        const role = tokens[index + 1];
        explanations[index] = `${quote(word)} means “not a”, so it goes right before ${quote(role)}.`;
        explanations[index + 1] = `${quote(role)} comes right after ${quote(word)}.`;
        complement = `${word} ${role}`;
        index += 2;
      } else if (!complement && AGES.has(key(word)) && key(tokens[index + 1] || '') !== 'uhr') {
        // German 3.5-3.6: Er ist elf Jahre alt. / Ja, sie ist sechzehn.
        explanations[index] = `${quote(word)} is the age, so it comes right after ${quote(verb)}.`;
        complement = word;
        index += 1;
        if (key(tokens[index] || '') === 'jahre' && key(tokens[index + 1] || '') === 'alt') {
          explanations[index] = `${quote(tokens[index])} comes after the number: ${quote(`${word} ${tokens[index]}`)}.`;
          explanations[index + 1] = `${quote(tokens[index + 1])} ends the age: ${quote(`${word} ${tokens[index]} ${tokens[index + 1]}`)}.`;
          complement = `${word} ${tokens[index]} ${tokens[index + 1]}`;
          index += 2;
        }
      }
      if (!complement && key(subject) === 'es' && (TIMES.has(key(word)) || MONTHS.has(key(word)))) {
        // German 4.10, 4.12-4.14: Es ist Morgen. Es ist Wochenende. Es ist Januar.
        explanations[index] = `${quote(word)} says the time, so it comes right after ${quote(verb)} with no article.`;
        complement = word;
        kind = 'time';
        index += 1;
      } else if (!complement && key(subject) === 'es' && HOURS.has(key(word)) && key(tokens[index + 1] || '') === 'uhr') {
        // German 4.10: Es ist sieben Uhr (morgens). The number, then Uhr, then the part of the day.
        explanations[index] = `${quote(word)} is the hour, so it comes right after ${quote(verb)}.`;
        explanations[index + 1] = `${quote(tokens[index + 1] || '')} (o'clock) comes right after the hour.`;
        complement = `${word} ${tokens[index + 1]}`;
        kind = 'time';
        index += 2;
        const part = key(tokens[index] || '');
        if (DAYPARTS[part]) {
          explanations[index] = `${quote(tokens[index] || '')} (${DAYPARTS[part]}) comes last, after “Uhr”.`;
          complement += ` ${tokens[index]}`;
          index += 1;
        }
      } else if (!complement && placePhrase()) {
        // German 4.1-4.3: Das Kind ist im Schlafzimmer. Das Buch ist auf dem Tisch.
        complement = tokens.slice(verbIndex + 1, index).join(' ');
        kind = 'place';
      }
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
      relations.push({ start: verbIndex, end: index, explanation: kind === 'place'
        ? `After ${quote(verb)} comes where: ${quote(complement)}.`
        : kind === 'time'
          ? `After ${quote(verb)} comes the time: ${quote(complement)}.`
          : describesThing
        ? `After ${quote(verb)} comes what it is like: ${quote(complement)}.`
        : pointsAtThing
          ? `After ${quote(verb)} comes what it is: ${quote(complement)}.`
          : `After ${quote(verb)} comes what the person is: ${quote(complement)}.` });
    } else if (['heiße', 'heißt'].includes(key(verb)) && NAMES.has(key(tokens[index] || ''))) {
      // German 3.1: Ich heiße Ana. The name comes right after heißen.
      explanations[index] = `${quote(tokens[index])} is the name, so it comes right after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `After ${quote(verb)} comes the name: ${quote(`${verb} ${tokens[index]}`)}.` });
      index += 1;
    } else if (COME.has(key(verb)) && key(tokens[index] || '') === 'aus') {
      // German 3.7-3.8: Ich komme aus Mexiko. Er kommt aus den USA.
      const aus = tokens[index] || '';
      explanations[index] = `${quote(aus)} means “from”, so it comes right after ${quote(verb)}.`;
      index += 1;
      if (COUNTRIES.has(key(tokens[index] || ''))) {
        explanations[index] = `${quote(tokens[index] || '')} is the country, right after ${quote(aus)}.`;
        index += 1;
      } else if (key(tokens[index] || '') === 'den' && key(tokens[index + 1] || '') === 'usa') {
        explanations[index] = `${quote(tokens[index] || '')} goes before ${quote(tokens[index + 1] || '')} after ${quote(aus)}: ${quote(`${aus} ${tokens[index]} ${tokens[index + 1]}`)}.`;
        explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the country, so it comes last.`;
        index += 2;
      } else return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: `Where someone is from comes after the verb: ${quote(tokens.slice(verbIndex, index).join(' '))}.` });
    }
    // German 3.12 and Unit 4: what they have or do, where, when, and nicht.
    restOfClause(verb);
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
      // German Unit 3: a job or nationality has a man's form and a woman's form with -in.
      const [man, woman] = [expected, picked].sort((a, b) => a.length - b.length);
      if (ROLES.has(man) && woman === `${man}in`) {
        const word = (form: string) => germanWords(form === expected ? correct?.label || '' : wrong?.label || '').find(w => key(w) === form) || form;
        return `${base} ${quote(word(woman))} is for a woman; ${quote(word(man))} is for a man.`;
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
