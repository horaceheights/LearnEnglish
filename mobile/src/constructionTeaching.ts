import type { LessonCard } from './types';
import { germanConstructionPlan } from './germanTeaching';
import { spanishConstructionPlan } from './spanishTeaching';

// These are teaching patterns, not guesses based on a word appearing in a card.
// Every word of a generated construction must belong to a supported pattern.
// The course-wide hint gate rejects new patterns until their explanation is added.
const words = (value: string) => value.toLowerCase().replace(/\b([ap])\.m\./g, '$1m').match(/[a-z]+(?:'[a-z]+)?/g) || [];
const set = (value: string) => new Set(value.split(' '));
const DETERMINERS = set('a an the my your his her our their this that these those');
// A1+ 1.10 (2026-11-18): its, the possessive for an animal or a thing (The dog plays with its ball.).
DETERMINERS.add('its');
const NUMBERS = set('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty');
// A1 5.12 (2026-11-15): the tens from thirty to one hundred.
for (const number of 'thirty forty fifty sixty seventy eighty ninety hundred'.split(' ')) NUMBERS.add(number);
// A1 3.13 (2026-11-15): zero, and an address.
NUMBERS.add('zero');
const COLORS = set('red blue green yellow black white');
const NOUNS = set('boy girl man woman baby babies child children adult adults brother brothers sister sisters father mother parents grandfather grandmother grandparents grandchildren family park restaurant hospital store house street bridge bus car cars bike book books pen pens chair chairs table phone phones bag bags kitchen bedroom room bed lamp door computer sofa apple apples banana grapes strawberry strawberries orange oranges egg eggs rice milk bread fish juice water chicken food breakfast lunch dinner tea coffee dollar dollars station pharmacy bank library train taxi head eyes mouth arms hands legs feet jacket shoes shirt dress skirt pants socks boots umbrella hat name job face teeth help bathroom music school work night morning afternoon evening day mexico canada ana luis sofia english tv monday tuesday wednesday thursday friday saturday sunday today');
for (const noun of words('teacher doctor nurse driver cook farmer left right')) NOUNS.add(noun);
for (const noun of words('spain diego states')) NOUNS.add(noun);
// A1+ 3.6 (2026-11-20): twins.
NOUNS.add('twins');
for (const noun of words('home window clothes')) NOUNS.add(noun);
NOUNS.add('shower');
// Unit 5 (2026-09-26): fruit and food words that its constructions name.
for (const noun of words('fruit pear pears bananas drinks')) NOUNS.add(noun);
// A1 5.13 and 5.14 (2026-11-15): more food, and things at the table.
for (const noun of words('meat cheese vegetables potato tomato salad soup sandwich')) NOUNS.add(noun);
for (const noun of words('cup glass bottle plate salt sugar cake')) NOUNS.add(noun);
// Unit 7 (2026-09-27): the body word its constructions name.
NOUNS.add('ears');
// Expanded body, weather and activity vocabulary uses the same nominal rules.
for (const noun of words('nose fingers toes coat sweater scarf gloves shorts weather photos football')) NOUNS.add(noun);
// A1 7.10 to 7.13 (2026-11-15): seasons, outdoors, animals, sports and music.
for (const noun of words('spring summer fall winter sun rain snow')) NOUNS.add(noun);
for (const noun of words('tree flower river sea beach mountain lake sky')) NOUNS.add(noun);
for (const noun of words('cow horse sheep pig lion elephant snake monkey')) NOUNS.add(noun);
for (const noun of words('sport ball team game tennis song guitar')) NOUNS.add(noun);
// A1 3.14 and 6.13 (2026-11-16): more jobs; in the city.
for (const noun of words('waiter officer artist singer worker mechanic')) NOUNS.add(noun);
for (const noun of words('city town road market building map')) NOUNS.add(noun);
for (const noun of words('mall supermarket airplane boat hotel office museum theater stop airport corner ticket')) NOUNS.add(noun);
// A1+ 1.4 (2026-11-04): the extended family.
for (const noun of words('aunt uncle cousin')) NOUNS.add(noun);
// A1+ 1.1 (2026-11-10): what people look like.
for (const noun of words('hair beard')) NOUNS.add(noun);
// A1 1.10 (2026-11-14): pets.
for (const noun of words('dog cat bird rabbit pet pets')) NOUNS.add(noun);
// A1+ 1.10 (2026-11-18): the four pets' names (Its name is Max.).
for (const noun of words('max luna rio coco')) NOUNS.add(noun);
// A1 2.12 (2026-11-15): in the classroom.
for (const noun of words('classroom class student desk pencil paper notebook')) NOUNS.add(noun);
// A1 1.11 (2026-11-14): friends and people.
for (const noun of words('friend friends husband wife son daughter person people')) NOUNS.add(noun);
// A1 4.12 (2026-11-14): the calendar (It is a week., There are twelve months in a year.).
for (const noun of words('days week weekend month months year')) NOUNS.add(noun);
// A1 4.13 (2026-11-15): the first six months, used like the day names (It is March.).
for (const noun of words('january february march april may june')) NOUNS.add(noun);
// A1 4.14 (2026-11-15): the last six months, and birthday (My birthday is in July.).
for (const noun of words('july august september october november december birthday')) NOUNS.add(noun);
// A1 4.15 (2026-11-15): more at home.
for (const noun of words('apartment garden floor wall stairs roof toilet key')) NOUNS.add(noun);
// A1 5.11 (2026-11-14): buying things (The price is five dollars.).
for (const noun of words('money price')) NOUNS.add(noun);
// A1+ 2.1 and 2.3 (2026-11-19): places people go (the gym, the pool) and things they have.
for (const noun of words('gym pool watch wallet headphones camera')) NOUNS.add(noun);
// A1+ 2.8 and 2.9 (2026-11-19): a favorite color; the -es and irregular plurals.
for (const noun of words('color buses watches men women')) NOUNS.add(noun);
// A1+ 2.12 (2026-11-20): classroom commands (Don't eat in the classroom. / Don't write on the desk.).
for (const noun of words('classroom desk')) NOUNS.add(noun);
// A1+ 3.13 (2026-11-20): a neighbor (My neighbor lives at 18 Park Street.).
NOUNS.add('neighbor');
// A1+ Unit 6 (2026-11-20): places, transport, travel things and the hotel (Sofia takes the subway to work.).
for (const noun of words('bakery bookstore subway motorcycle platform gate passport suitcase backpack reservation elevator tickets')) NOUNS.add(noun);
// A1+ 2.11 (2026-11-20): two people or things compared with -er and than (Luis is taller than Sofia.).
const COMPARATIVES: Record<string, string> = {
  taller: 'más alto o más alta', shorter: 'más bajo o más baja', bigger: 'más grande',
  smaller: 'más pequeño o más pequeña', older: 'mayor', younger: 'menor',
};
// A1+ 2.13 (2026-11-20): light or dark before a color (light blue, a dark blue bag).
const SHADES: Record<string, string> = { light: 'claro', dark: 'oscuro' };
// A1+ 2.6 and 2.7 (2026-11-19): ordinal numbers between "the" and a noun (the second floor).
const ORDINALS = set('second third fourth fifth sixth seventh eighth ninth tenth');
for (const noun of words('address')) NOUNS.add(noun);
const COMPOUND_NOUNS: Record<string, string> = { 'post office': 'oficina de correos', 'movie theater': 'cine', 'bus stop': 'parada de autobús', 'next stop': 'próxima parada', 'police officer': 'policía' };
// A1+ 6.1 (2026-11-20): two more places named with two words (Is there a gas station near here?).
Object.assign(COMPOUND_NOUNS, { 'police station': 'estación de policía', 'gas station': 'gasolinera' });
const STATES = set('red blue green yellow black white happy sad tired hungry thirsty sunny rainy cold hot windy cloudy mexican spanish american canadian');
// A1 2.13 (2026-11-15): four more colors, before a noun (a brown dog) and after "is" (It is brown.).
for (const color of words('brown pink purple gray')) { COLORS.add(color); STATES.add(color); }
// A1+ 1.1 (2026-11-10): what people look like, after "is" (Luis is tall.) or before a noun (an old man, long hair).
const DESCRIPTIONS = set('tall short old young long');
// A1+ 1.5 (2026-11-11): brothers and sisters before a noun (an older sister, my younger brother).
for (const description of words('older younger')) DESCRIPTIONS.add(description);
// A1 2.11 (2026-11-14): things after "is" (The car is new.) or before a noun (a big dog); the same / different.
for (const description of words('big small new used same different')) DESCRIPTIONS.add(description);
// A1 5.11 (2026-11-14): The bag is cheap. / The bag is expensive.
for (const description of words('cheap expensive')) DESCRIPTIONS.add(description);
// A1 7.9 (2026-11-15): how someone is (I am fine.) and how something is (The apple is good.); 7.10: It is warm.
for (const description of words('good bad great fine sick angry afraid warm')) DESCRIPTIONS.add(description);
// A1+ 2.8 (2026-11-19): favorite before a noun (my favorite color).
DESCRIPTIONS.add('favorite');
// A1+ 3.8 (2026-11-20): a nationality before a noun (a Mexican teacher, two Spanish men).
for (const description of words('mexican canadian american spanish')) DESCRIPTIONS.add(description);
for (const state of DESCRIPTIONS) STATES.add(state);
// A1+ 6.10 and 6.12 (2026-11-20): how far a place is and when someone arrives (It's far. / Luis is late.).
for (const state of words('far late early')) STATES.add(state);
const OWNERS = set('mine yours ours');
const OWNER_MEANINGS: Record<string, string> = { mine: 'mío', yours: 'tuyo', ours: 'nuestro' };
// A1+ 3.12 (2026-11-20): his, hers and theirs stand alone after be (The camera is hers.).
for (const owner of words('his hers theirs')) OWNERS.add(owner);
Object.assign(OWNER_MEANINGS, { his: 'de él', hers: 'de ella', theirs: 'de ellos' });
const PRONOUNS = set('i you he she it we they this that these those there');
const VERBS = set('am is are have has like want wants need needs do work works study wake get eat wash brush come go goes sleep drink walk play watch can cannot leaves arrives open close clean run take');
for (const verb of words('speak speaks')) VERBS.add(verb);
// A1 7.13 (2026-11-15): I sing. / They sing.
for (const verb of words('sing')) VERBS.add(verb);
// A1 6.13 (2026-11-16): I drive a car. / They visit the museum.
for (const verb of words('drive visit')) VERBS.add(verb);
for (const verb of words('leave arrive start starts finish finishes studies meet put')) VERBS.add(verb);
// A1+ 1.2 (2026-10-29): the he/she forms of A1 routine verbs.
for (const verb of words('wakes gets eats brushes')) VERBS.add(verb);
// A1+ 4.5 (2026-11-20): the he/she form of wash (Luis washes his face.).
VERBS.add('washes');
// A1+ 4.3 (2026-11-20): the pets and the tree of Luna is behind the door. / Max is in front of the tree.
for (const noun of words('tree max luna')) NOUNS.add(noun);
// A1+ 4.1 (2026-11-20): where someone is in a house (She's upstairs.); A1+ 4.2: whether a thing works (The TV is off.).
const PLACE_ADVERBS: Record<string, string> = { upstairs: 'arriba', downstairs: 'abajo' };
const SWITCHED: Record<string, string> = { on: 'prendido', off: 'apagado' };
// A1+ 1.4 (2026-11-04): where someone lives, and who with.
for (const verb of words('live lives')) VERBS.add(verb);
// A1+ 1.2 (2026-11-10): what people do (Luis drinks coffee., Diego eats fruit.).
for (const verb of words('drinks reads writes')) VERBS.add(verb);
// A1+ 1.3 (2026-11-10): what two people do (They swim., Diego runs in the park.).
for (const verb of words('swim swims runs')) VERBS.add(verb);
// A1 4.11 (2026-11-14): everyday verbs (I make breakfast., I see the bus.); "come" was already listed.
for (const verb of words('make see use find give')) VERBS.add(verb);
// A1 5.11 (2026-11-14): I buy bread. / I pay five dollars.
for (const verb of words('buy pay')) VERBS.add(verb);
// A1+ 1.8 (2026-11-13): cook as a habit after don't/doesn't (Diego doesn't cook dinner.); after an article it stays A1's noun.
VERBS.add('cook');
// A1+ 1.10 (2026-11-18): a pet's habit with its thing (The dog plays with its ball.).
VERBS.add('plays');
// A1+ 1.11 (2026-11-18): who people do things with (He cooks dinner with her. / They read with her.).
for (const verb of words('cooks read')) VERBS.add(verb);
// A1+ 2.2 (2026-11-19): Sofia walks to the park.
VERBS.add('walks');
// A1+ Unit 6 (2026-11-20): Sofia takes the subway. / Diego buys a ticket. / Cross the bridge. / Can I sit here?
for (const verb of words('takes buys cross sit ride forget turn drives')) VERBS.add(verb);
// A word that is both a noun and a verb ("drinks", "work") is the noun right after an article or a
// possessive (The drinks are on the table.) and the verb after its subject (Luis drinks coffee.).
const NOUN_MARKERS = set('a an the my your his her its our their');
const ACTIONS = set('eating drinking reading writing running walking swimming sitting sleeping playing studying working cooking talking watching listening going');
// A1+ 6.8 (2026-11-20): Ana is crossing the bridge.
ACTIONS.add('crossing');
const BE = set('am is are');
const FREQUENCY = set('always usually sometimes never');
const ROUTINE_BASE = set('leave arrive start finish study work wake get eat wash brush come go sleep drink walk play watch open close clean run take put meet cook');
// A1+ 1.9 (2026-11-18): live after does (Where does your aunt live?).
ROUTINE_BASE.add('live');

type Relation = { start: number; end: number; explanation: string };
type ClausePlan = { explanations: string[]; relations: Relation[]; supported: boolean };
const quote = (value: string) => `“${value}”`;

function teachClause(text: string): ClausePlan {
  const tokens: string[] = Array.from(text.match(/[a-z]+(?:'[a-z]+)?/gi) || []);
  const keys = tokens.map(word => word.toLowerCase());
  const explanations = tokens.map(() => '');
  const relations: Relation[] = [];
  const phrase = (start: number, end: number) => tokens.slice(start, end).join(' ');
  const teach = (start: number, end: number, why: string) => {
    relations.push({ start, end, explanation: why });
    for (let i = start; i < end; i++) explanations[i] = why;
  };
  const nominal = (start: number, end: number): boolean => {
    if (start >= end) return false;
    const and = keys.indexOf('and', start);
    if (and > start && and < end) {
      if (!nominal(start, and) || !nominal(and + 1, end)) return false;
      teach(and, and + 1, `En ${quote(phrase(start, end))}, “and” une las dos cosas y va entre ellas.`);
      relations.push({ start, end, explanation: `En ${quote(phrase(start, end))}, “and” une las dos cosas y va entre ellas.` });
      return true;
    }
    let head = start;
    if (DETERMINERS.has(keys[head]) || NUMBERS.has(keys[head]) || keys[head] === 'some') head++;
    // "This one" / "that one" (A1+ 2.5): here "one" stands for the thing, not the number.
    const pointedOne = keys[head] === 'one' && head + 1 === end && ['this', 'that'].includes(keys[start]);
    if (head > start && DETERMINERS.has(keys[start]) && NUMBERS.has(keys[head]) && !pointedOne) head++;
    const owner = keys[head]?.endsWith("'s") && NOUNS.has(keys[head].slice(0, -2)) ? head : -1;
    if (owner >= 0) head++;
    if (keys[head] === 'united' && keys[head + 1] === 'states') head++;
    const ordinal = head > start && ORDINALS.has(keys[head]) ? head++ : -1;
    const shade = head > start && SHADES[keys[head]] && COLORS.has(keys[head + 1]) ? head++ : -1;
    if (COLORS.has(keys[head])) head++;
    const described = DESCRIPTIONS.has(keys[head]) ? head++ : -1;
    if (['living', 'dining'].includes(keys[head]) && keys[head + 1] === 'room') head++;
    const compound = COMPOUND_NOUNS[`${keys[head]} ${keys[head + 1]}`] ? head++ : -1;
    // "The red one": after a color, "one" stands in for the noun already named; A1+ 2.5 (2026-11-19)
    // adds "this one" and "that one" (This one is red, but that one is blue.).
    const pointed = keys[head] === 'one' && head === start + 1 && ['this', 'that'].includes(keys[start]);
    // A1+ 2.10 (2026-11-19): "ones" stands in for more than one thing (the red ones).
    const standIn = (keys[head] === 'one' || keys[head] === 'ones') && head > start
      && (COLORS.has(keys[head - 1]) || pointed);
    if (head !== end - 1 || !(NOUNS.has(keys[head]) || standIn)) return false;
    if (owner >= 0) {
      teach(start, end, `En ${quote(phrase(start, end))}, ${quote(tokens[owner])} indica de quién es: el dueño con 's va antes del nombre ${quote(phrase(owner + 1, end))}.`);
      return true;
    }
    if (head > start) {
      const first = keys[start];
      const why = pointed
        ? `En ${quote(phrase(start, end))}, ${quote(tokens[start])} señala lo que está ${keys[start] === 'this' ? 'cerca' : 'lejos'} y va antes de “one”, que reemplaza al nombre para no repetirlo.`
        : standIn && keys[head] === 'ones'
        ? `En ${quote(phrase(start, end))}, el color va antes de “ones”, que reemplaza a las cosas ya nombradas para no repetirlas.`
        : standIn
        ? `En ${quote(phrase(start, end))}, el color va antes de “one”, que reemplaza al nombre para no repetirlo.`
        : ordinal >= 0
        ? `En ${quote(phrase(start, end))}, ${quote(tokens[ordinal])} dice el orden (primero, segundo…) y va entre ${quote(tokens[start])} y el nombre.`
        : shade >= 0
        ? `En ${quote(phrase(start, end))}, ${quote(tokens[shade])} (${SHADES[keys[shade]]}) va antes del color ${quote(tokens[shade + 1])}, y el color va antes del nombre.`
        : COLORS.has(first) || COLORS.has(keys[start + 1])
        ? `En ${quote(phrase(start, end))}, ${NUMBERS.has(first) ? 'la cantidad va primero, después el color y al final el nombre' : 'el color va antes del nombre que describe'}.`
        : described >= 0
        ? `En ${quote(phrase(start, end))}, ${quote(tokens[described])} describe ${quote(tokens[head])} y va antes del nombre.`
        : NUMBERS.has(first) || first === 'some'
          ? `En ${quote(phrase(start, end))}, la cantidad va antes del nombre: primero cuánto hay y después qué es.`
          : ['my', 'your', 'his', 'her', 'its', 'our', 'their'].includes(first)
            ? `En ${quote(phrase(start, end))}, ${quote(tokens[start])} indica de quién es y va antes del nombre ${quote(phrase(start + 1, end))}.`
            : DETERMINERS.has(first)
              ? `En ${quote(phrase(start, end))}, ${quote(tokens[start])} acompaña al nombre ${quote(phrase(start + 1, end))} y va delante de él.`
              : `Para nombrar esta habitación usamos ${quote(phrase(start, end))}: ${quote(tokens[start])} indica qué tipo de ${quote(tokens[head])} es y va antes.`;
      teach(start, end, why);
    }
    if (compound >= 0) teach(compound, compound + 2,
      `${quote(phrase(compound, compound + 2))} significa ${COMPOUND_NOUNS[keys.slice(compound, compound + 2).join(' ')]}: ${quote(tokens[compound])} va antes de ${quote(tokens[compound + 1])}.`);
    return true;
  };
  const subject = (start: number, end: number) => {
    if (end === start + 1 && PRONOUNS.has(keys[start])) return true;
    const and = keys.indexOf('and', start);
    if (and > start && and < end) {
      if (!nominal(start, and) || !nominal(and + 1, end)) return false;
      teach(and, and + 1, `En ${quote(phrase(start, end))}, “and” une las dos personas o cosas y va entre ellas.`);
      relations.push({ start, end, explanation: `En ${quote(phrase(start, end))}, “and” une las dos partes y va entre ellas.` });
      for (let i = start; i < end; i++) {
        if (!explanations[i]) explanations[i] = `En ${quote(phrase(start, end))}, “and” une las dos partes y va entre ellas.`;
      }
      return true;
    }
    return nominal(start, end);
  };
  const complement = (start: number, end: number, anchor: string): boolean => {
    if (start === end) return true;
    const tail = keys.slice(start, end).join(' ');
    const original = phrase(start, end);
    if (/^from (?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) to (?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)$/.test(tail)) {
      teach(start, end, `En ${quote(original)}, “from” va antes de la hora inicial y “to” antes de la hora final.`);
      teach(start, start + 2, `“From” introduce la hora inicial y va antes de ${quote(tokens[start + 1])}: ${quote(phrase(start, start + 2))}.`);
      teach(start + 2, end, `“To” introduce la hora final y va antes de ${quote(tokens[start + 3])}: ${quote(phrase(start + 2, end))}.`);
      return true;
    }
    if (keys[start] === 'before' || keys[start] === 'after') {
      const valid = nominal(start + 1, end);
      teach(start, end, `“${tokens[start]}” significa ${keys[start] === 'before' ? 'antes de' : 'después de'}; va antes de ${quote(phrase(start + 1, end))}, el momento de referencia.`);
      return valid;
    }
    if (tail === 'today') {
      teach(start, end, `En este modelo, “today” va al final, después de ${quote(anchor)}, para situar la acción en hoy.`);
      return true;
    }
    const anchorStart = start - words(anchor).length;
    if (anchorStart >= 0 && phrase(anchorStart, start).toLowerCase() === anchor.toLowerCase()) {
      const progressive = /^(am|is|are)( not)?$/i.exec(anchor);
      const isProgressive = progressive && ACTIONS.has(keys[start]);
      const describes = BE.has(anchor.toLowerCase());
      const object = ({ like: 'lo que nos gusta', want: 'lo que queremos', wants: 'lo que quiere', need: 'lo que necesitamos', needs: 'lo que necesita', have: 'lo que tenemos', has: 'lo que tiene', eating: 'lo que come', drinking: 'lo que bebe', eat: 'lo que comemos', drink: 'lo que bebemos', study: 'lo que estudiamos', watching: 'lo que mira' } as Record<string, string>)[anchor.toLowerCase()];
      relations.push({ start: anchorStart, end: isProgressive ? start + 1 : end, explanation: isProgressive
        ? progressive[2]
          ? `${quote(tokens[anchorStart])} es el auxiliar; “not” va antes del verbo ${quote(tokens[start])}: ${quote(phrase(anchorStart, start + 1))}.`
          : `${quote(tokens[anchorStart])} es el auxiliar y va antes del verbo ${quote(tokens[start])}: ${quote(phrase(anchorStart, start + 1))}.`
        : describes && end === start + 1 && OWNERS.has(keys[start])
        ? `${quote(original)} significa ${quote(OWNER_MEANINGS[keys[start]])}: indica de quién es y va después de ${quote(anchor)}.`
        : describes
        ? `Después de ${quote(anchor)} va ${quote(original)}, que describe al sujeto de esta afirmación.`
        : object ? `Después de ${quote(anchor)} va ${object}: ${quote(original)}.`
          : `Primero ${quote(anchor)} expresa la acción o relación; después ${quote(original)} la completa.` });
    }
    const notIndex = keys.indexOf('not', start + 1);
    if (notIndex > start && notIndex < end) {
      if (!complement(start, notIndex, anchor)) return false;
      teach(notIndex, notIndex + 1, `Primero afirmamos ${quote(phrase(start, notIndex))}; después “not” introduce lo que descartamos: ${quote(phrase(notIndex, end))}.`);
      return complement(notIndex + 1, end, 'not');
    }
    // A1+ 2.11 (2026-11-20): Luis is taller than Sofia. / I am older than my brother. / … than me.
    if (end - start >= 3 && COMPARATIVES[keys[start]] && keys[start + 1] === 'than' && BE.has(anchor.toLowerCase())) {
      const other = start + 2;
      teach(start, end, `${quote(tokens[start])} compara a dos personas o cosas y va después de ${quote(anchor)}; “than” va después y antes de ${quote(phrase(other, end))}, con quien comparamos.`);
      teach(start, other, `${quote(tokens[start])} (${COMPARATIVES[keys[start]]}) termina en -er para comparar; “than” (que) va justo después: ${quote(phrase(start, other))}.`);
      if (end === other + 1 && keys[other] === 'me') {
        teach(other, end, '“me” va después de “than”: es la persona que habla, con quien se compara (que yo).');
        return true;
      }
      // A1+ 3.12 (2026-11-20): His bag is bigger than hers.
      if (end === other + 1 && OWNERS.has(keys[other])) {
        teach(other, end, `${quote(tokens[other])} significa ${quote(OWNER_MEANINGS[keys[other]])}: va después de “than” y reemplaza al dueño y a la cosa, para no repetirla.`);
        return true;
      }
      return nominal(other, end);
    }
    // A1+ 2.13 (2026-11-20): My bag is light blue.
    if (end - start === 2 && SHADES[keys[start]] && COLORS.has(keys[start + 1]) && BE.has(anchor.toLowerCase())) {
      teach(start, end, `En ${quote(original)}, ${quote(tokens[start])} (${SHADES[keys[start]]}) va antes del color ${quote(tokens[start + 1])}; juntos describen al sujeto y van después de ${quote(anchor)}.`);
      return true;
    }
    if (/^(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty) years old$/.test(tail)) {
      teach(start, end, `Para decir la edad, después de ${quote(anchor)} va el número y luego “years old”: ${quote(original)}.`);
      return true;
    }
    if (end - start >= 2 && NUMBERS.has(keys[start]) && keys[start + 1] === "o'clock") {
      teach(start, start + 2, `Para decir la hora, el número va antes de “o'clock”: ${quote(phrase(start, start + 2))}.`);
      // A part of the day may follow the time: "seven o'clock in the morning", "nine o'clock at night".
      return end - start === 2 || complement(start + 2, end, phrase(start, start + 2));
    }
    if (end - start === 2 && NUMBERS.has(keys[start]) && ['am', 'pm'].includes(keys[start + 1])) {
      const notation = keys[start + 1] === 'am' ? 'a.m.' : 'p.m.';
      teach(start, end, `Para decir la hora, primero va el número y después “${notation}”: ${quote(tokens[start] + ' ' + notation)}. “a.m.” indica antes del mediodía; “p.m.”, después.`);
      return true;
    }
    if (end - start === 2 && keys[start] === 'number' && NUMBERS.has(keys[start + 1]) && BE.has(anchor.toLowerCase())) {
      teach(start, end, `Para decir qué número es, después de ${quote(anchor)} va “number” y luego el número: ${quote(original)}.`);
      return true;
    }
    if (end - start === 1 && NUMBERS.has(keys[start]) && BE.has(anchor.toLowerCase())) {
      teach(start, end, `Para decir qué número es, después de ${quote(anchor)} va el número: ${quote(original)}.`);
      return true;
    }
    if (end - start === 1 && PLACE_ADVERBS[keys[start]] && BE.has(anchor.toLowerCase())) {
      teach(start, end, `${quote(original)} (${PLACE_ADVERBS[keys[start]]}) dice en qué piso de la casa está; va después de ${quote(anchor)}.`);
      return true;
    }
    if (end - start === 1 && SWITCHED[keys[start]] && BE.has(anchor.toLowerCase())) {
      teach(start, end, `${quote(original)} (${SWITCHED[keys[start]]}) dice cómo está la cosa; va después de ${quote(anchor)}.`);
      return true;
    }
    if (tail === 'here' || tail === 'there') {
      teach(start, end, `${quote(original)} significa ${tail === 'here' ? 'aquí' : 'allá'} e indica dónde ocurre la acción; va después de ${quote(anchor)}.`);
      return true;
    }
    // A preference/invitation's infinitive is an activity, not a destination.
    if (/\b(?:like|want|wants)$/.test(anchor.toLowerCase())
      && /^to (watch tv|listen to music|dance|draw|paint|ride a bike|take photos|play football|read)$/.test(tail)) {
      teach(start, end, `Después de ${quote(anchor)} va “to” y luego la actividad ${quote(phrase(start + 1, end))}: indica lo que gusta o lo que se quiere hacer.`);
      teach(start, start + 2, `“To” conecta ${quote(anchor)} con el verbo ${quote(tokens[start + 1])}; va antes de ese verbo.`);
      if (keys[start + 1] === 'listen') teach(start + 2, end, 'En “listen to music”, el segundo “to” va entre “listen” y lo que escuchamos: “music”.');
      return true;
    }
    // A1+ 3.14 (2026-11-20): what someone wants to be (She wants to be a singer.) or to do (He wants to drive buses.).
    if (/^(?:want|wants)$/.test(anchor.toLowerCase()) && /^to (?:be (?:a|an)|drive) /.test(tail)) {
      const be = keys[start + 1] === 'be';
      teach(start, start + 2, be
        ? `“to be” (ser) va después de ${quote(anchor)}: ${quote(anchor + ' to be')} dice lo que alguien quiere ser.`
        : `“to” conecta ${quote(anchor)} con el verbo ${quote(tokens[start + 1])}; va antes de ese verbo.`);
      if (be) relations.push({ start: start - 1, end, explanation: `Después de ${quote(anchor + ' to be')} va el trabajo con “a” o “an”: ${quote(phrase(start + 2, end))}.` });
      return nominal(start + 2, end);
    }
    // A1+ 3.13 (2026-11-20): where someone lives, at + house number + street (She lives at eighteen Park
    // Street.) or on + the street alone (He lives on Park Street.).
    const street = /^(at|on) (?:([a-z]+) )?([a-z]+) street$/.exec(tail);
    if (street && /^(?:live|lives)$/.test(anchor.toLowerCase())
      && (street[1] === 'at') === Boolean(street[2] && NUMBERS.has(street[2]))) {
      const name = street[2] ? start + 2 : start + 1;
      teach(start, name, street[2]
        ? `“at” va después de ${quote(anchor)} y antes de la dirección completa: primero el número de la casa, ${quote(tokens[start + 1])}, y después la calle.`
        : `“on” va después de ${quote(anchor)} y antes del nombre de la calle sola, sin número.`);
      teach(name, end, `${quote(phrase(name, end))} es el nombre de la calle y cierra la frase.`);
      return true;
    }
    if (tail === 'fast' && /^(speak|speaks)$/.test(anchor.toLowerCase())) {
      teach(start, end, '“Fast” significa rápido e indica cómo habla la persona; va después de “speak”.');
      return true;
    }
    // A1+ 6.3 (2026-11-20): a place and what for, with to + a verb (going to the bakery to buy bread).
    const purpose = keys.findIndex((key, index) => index > start + 1 && index < end && key === 'to' && VERBS.has(keys[index + 1] || ''));
    if (keys[start] === 'to' && purpose > 0) {
      if (!complement(start, purpose, anchor)) return false;
      teach(purpose, purpose + 2, `${quote(phrase(purpose, purpose + 2))} dice para qué va: “to” va antes de la acción ${quote(tokens[purpose + 1])}, después del lugar.`);
      if (purpose + 2 === end) return true;
      teach(purpose + 2, end, `${quote(phrase(purpose + 2, end))} completa ${quote(tokens[purpose + 1])} y cierra la frase.`);
      return nominal(purpose + 2, end);
    }
    // A1+ 6.6 and 6.8 (2026-11-20): opposite (enfrente de) and along (por la orilla de) before a place.
    const beside = /^(opposite|along) (.+)$/.exec(tail);
    if (beside) {
      teach(start, end, `${quote(tokens[start])} (${beside[1] === 'opposite' ? 'enfrente de' : 'por la orilla de'}) va antes de ${quote(phrase(start + 1, end))}. Juntos completan ${quote(anchor)}.`);
      return nominal(start + 1, end);
    }
    // A1+ 6.12 (2026-11-20): Ana is on time.; A1+ 6.1: The bank is near here.
    if ((tail === 'on time' || tail === 'near here') && BE.has(anchor.toLowerCase())) {
      teach(start, end, `${quote(original)} (${tail === 'on time' ? 'a tiempo' : 'cerca de aquí'}) va después de ${quote(anchor)}: ${quote(tokens[start + 1])} va después de ${quote(tokens[start])}.`);
      return true;
    }
    // A1+ 4.3 (2026-11-20) adds behind and in front of (Luna is behind the door.).
    const prep = /^(next to|far from|across from|in front of|behind|between|in|on|under|near|from|by|at|for|to|with) (.+)$/.exec(tail);
    if (prep) {
      const length = words(prep[1]).length;
      const nounStart = start + length;
      const nextPrep = keys.findIndex((key, index) => index > nounStart && index < end && ['at', 'in', 'on', 'every', 'by', 'before', 'after', 'today'].includes(key));
      const nounEnd = nextPrep < 0 ? end : nextPrep;
      const location = phrase(nounStart, nounEnd);
      const relation = prep[1] === 'by' ? 'el medio de transporte'
        : prep[1] === 'for' ? 'la comida del día'
          : prep[1] === 'from' ? 'el lugar de origen'
            : prep[1] === 'with' ? 'con quién'
            : prep[1] === 'to' && /listen/i.test(anchor) ? 'lo que escuchamos'
              : NUMBERS.has(keys[nounStart]) || /night|morning|afternoon|evening|day$/.test(keys[nounEnd - 1]) ? 'cuándo ocurre'
                : 'el lugar o la dirección';
      teach(start, nounEnd, `${quote(phrase(start, nounStart))} va antes de ${quote(location)}: introduce ${relation}. Juntos completan ${quote(anchor)}.`);
      const clockTime = nounEnd === nounStart + 2 && NUMBERS.has(keys[nounStart]) && keys[nounStart + 1] === "o'clock";
      // A1+ 1.11 (2026-11-18): after "with", him, her and them stand for the person (She reads with them.).
      const objectPronoun = prep[1] === 'with' && nounEnd === nounStart + 1 && ['him', 'her', 'them'].includes(keys[nounStart]);
      if (objectPronoun) teach(nounStart, nounEnd, `${quote(tokens[nounStart])} reemplaza a ${keys[nounStart] === 'them' ? 'las personas' : 'la persona'} y va después de “with”: ${quote(phrase(start, nounEnd))} significa ${({ him: 'con él', her: 'con ella', them: 'con ellos o con ellas' } as Record<string, string>)[keys[nounStart]]}.`);
      // A1+ 6.4 (2026-11-20): platform four, gate twelve; A1+ 6.1: on Park Street; near here.
      const numbered = nounEnd === nounStart + 2 && ['platform', 'gate'].includes(keys[nounStart]) && NUMBERS.has(keys[nounStart + 1]);
      if (numbered) teach(nounStart, nounEnd, `En ${quote(location)}, el número va después de ${quote(tokens[nounStart])}, sin “the”.`);
      const streetName = nounEnd === nounStart + 2 && keys[nounStart + 1] === 'street' && !DETERMINERS.has(keys[nounStart]);
      if (streetName) teach(nounStart, nounEnd, `${quote(location)} es el nombre de la calle: el nombre va antes de “Street”.`);
      const valid = clockTime || objectPronoun || numbered || streetName || (nounEnd === nounStart + 1 && (NUMBERS.has(keys[nounStart]) || ['left', 'right', 'there', 'here'].includes(keys[nounStart]))) || nominal(nounStart, nounEnd);
      return valid && (nextPrep < 0 || complement(nextPrep, end, phrase(start, nounEnd)));
    }
    if (tail === 'every day') {
      teach(start, end, '“Every day” significa todos los días: “every” va antes de “day”, y el grupo indica cuándo ocurre la acción.');
      return true;
    }
    if (end - start === 1 && OWNERS.has(keys[start])) {
      teach(start, end, `${quote(original)} significa ${quote(OWNER_MEANINGS[keys[start]])}: reemplaza al dueño y a la cosa, y va después de ${quote(anchor)}.`);
      return true;
    }
    if (end - start === 1 && STATES.has(keys[start])) {
      teach(start, end, `${quote(original)} describe cómo es o cómo está el sujeto; en esta afirmación va después de ${quote(anchor)}.`);
      return true;
    }
    if (end - start === 3 && STATES.has(keys[start]) && keys[start + 1] === 'and' && STATES.has(keys[start + 2])) {
      teach(start, end, `En ${quote(original)}, “and” va entre las dos características para unirlas.`);
      return true;
    }
    // Lesson 7.4 says when the weather holds: "sunny today", "cold in the morning".
    if (end - start > 1 && STATES.has(keys[start]) && (keys[start + 1] === 'today' || keys[start + 1] === 'in')) {
      teach(start, start + 1, `${quote(tokens[start])} describe cómo es o cómo está; va después de ${quote(anchor)}.`);
      if (keys[start + 1] === 'today') {
        teach(start + 1, end, `“Today” va al final, después de ${quote(tokens[start])}, e indica cuándo: hoy.`);
        return end - start === 2;
      }
      return complement(start + 1, end, tokens[start]);
    }
    if (ACTIONS.has(keys[start])) {
      teach(start, start + 1, `${quote(tokens[start])} expresa la acción; aquí va después de ${quote(anchor)}.`);
      if (keys[start] === 'listening' && keys[start + 1] === 'to') {
        teach(start, start + 2, 'En “listening to music”, “to” une “listening” con lo que escuchamos y va entre ambos.');
      }
      return complement(start + 1, end, tokens[start]);
    }
    // A noun group may be followed by where/when it occurs or a contrast.
    // A1+ 1.11 (2026-11-18): the noun group may also be followed by who it is done with (cooks dinner with him).
    // A1+ Unit 6 (2026-11-20) adds to, from, along and opposite (takes the subway to work).
    const boundary = keys.findIndex((key, index) => index > start && index < end && ['in', 'on', 'under', 'next', 'near', 'by', 'at', 'for', 'every', 'not', 'here', 'there', 'before', 'after', 'today', 'with', 'to', 'from', 'along', 'opposite'].includes(key));
    const nounEnd = boundary < 0 ? end : boundary;
    teach(start, nounEnd, `${quote(phrase(start, nounEnd))} indica ${/^(am|is|are)$/i.test(anchor) ? 'qué es el sujeto' : 'qué recibe o completa la acción'}; en esta frase va después de ${quote(anchor)}.`);
    if (!nominal(start, nounEnd)) return false;
    if (boundary < 0) return true;
    if (keys[boundary] === 'not') {
      teach(boundary, boundary + 1, `Primero afirmamos ${quote(phrase(start, boundary))}; después “not” introduce lo que descartamos: ${quote(phrase(boundary, end))}.`);
      return complement(boundary + 1, end, 'not');
    }
    return complement(boundary, end, phrase(start, boundary));
  };

  const joined = keys.join(' ');
  // A1+ 4.6 (2026-11-20): "and then" joins two actions of one person; the second has no subject
  // (He gets dressed and then eats breakfast.).
  const andThen = keys.findIndex((key, index) => index > 1 && key === 'and' && keys[index + 1] === 'then');
  if (andThen > 0 && andThen + 2 < keys.length && !text.trim().endsWith('?') && ['he', 'she'].includes(keys[0])) {
    const left = teachClause(phrase(0, andThen) + '.');
    const right = teachClause(tokens[0] + ' ' + phrase(andThen + 2, keys.length) + '.');
    if (left.supported && right.supported) {
      left.explanations.forEach((why, index) => { explanations[index] = why; });
      right.explanations.slice(1).forEach((why, index) => { explanations[andThen + 2 + index] = why; });
      relations.push(...left.relations, ...right.relations.filter(relation => relation.start > 0)
        .map(relation => ({ ...relation, start: relation.start + andThen + 1, end: relation.end + andThen + 1 })));
      teach(andThen, andThen + 2, '“and then” (y luego) va entre las dos acciones: la primera ocurre antes que la segunda.');
      teach(andThen + 2, andThen + 3, `${quote(tokens[andThen + 2])} es la segunda acción: va después de “and then” y no repite ${quote(tokens[0])}.`);
      return { explanations, relations, supported: explanations.every(Boolean) };
    }
  }
  // Compose reviewed clauses while retaining their local relations. A connector
  // relates the clauses; it must not turn their verbs into noun complements.
  const connector = keys.findIndex((key, index) => index > 0 && ['before', 'after', 'because', 'but'].includes(key));
  if (connector > 0 && !text.trim().endsWith('?')) {
    const left = teachClause(phrase(0, connector) + '.');
    const right = teachClause(phrase(connector + 1, keys.length) + '.');
    if (left.supported && right.supported) {
      const meaning = { before: 'la primera acción ocurre antes de la segunda', after: 'la primera acción ocurre después de la segunda', because: 'la segunda parte da el motivo de la primera', but: 'la segunda parte contrasta con la primera' }[keys[connector]];
      const why = `En este modelo, “${tokens[connector]}” va entre las dos partes: ${meaning}.`;
      teach(0, keys.length, why);
      for (const [plan, offset] of [[left, 0], [right, connector + 1]] as const) {
        plan.explanations.forEach((explanation, index) => { explanations[index + offset] = explanation; });
        relations.push(...plan.relations.map(relation => ({ ...relation, start: relation.start + offset, end: relation.end + offset })));
      }
      return { explanations, relations, supported: explanations.every(Boolean) };
    }
  }
  if (keys[0] === 'because' || keys[0] === 'today') {
    const inner = teachClause(phrase(1, keys.length) + '.');
    if (inner.supported) {
      const why = keys[0] === 'because'
        ? '“Because” abre esta respuesta y va antes del motivo: contesta a una pregunta con “Why”.'
        : 'En este modelo, “Today” abre la oración, antes del sujeto, para situar la acción en hoy.';
      teach(0, keys.length, why);
      inner.explanations.forEach((explanation, index) => { explanations[index + 1] = explanation; });
      relations.push(...inner.relations.map(relation => ({ ...relation, start: relation.start + 1, end: relation.end + 1 })));
      return { explanations, relations, supported: true };
    }
  }
  const frequency = keys.findIndex(key => FREQUENCY.has(key));
  if (frequency > 0 && (ROUTINE_BASE.has(keys[frequency + 1]?.replace(/ies$/, 'y').replace(/s$/, '')) || ['finishes', 'goes'].includes(keys[frequency + 1]))) {
    if (!subject(0, frequency)) return { explanations, relations, supported: false };
    const inner = teachClause(tokens.filter((_, index) => index !== frequency).join(' ') + '.');
    if (!inner.supported) return { explanations, relations, supported: false };
    inner.explanations.forEach((explanation, index) => { explanations[index < frequency ? index : index + 1] = explanation; });
    relations.push(...inner.relations.map(relation => ({ ...relation, start: relation.start < frequency ? relation.start : relation.start + 1, end: relation.end <= frequency ? relation.end : relation.end + 1 })));
    teach(0, frequency + 1, `En este modelo, ${quote(phrase(0, frequency))} dice quién hace la acción y va antes de ${quote(tokens[frequency])}, que indica la frecuencia.`);
    teach(frequency, frequency + 2, `En este modelo, ${quote(tokens[frequency])} indica la frecuencia y va antes del verbo ${quote(tokens[frequency + 1])}.`);
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  // Do/does frames share the ordinary action's complement rules. The synthetic
  // first-person subject is discarded; no explanation may refer to that subject.
  // A1+ 1.9 (2026-11-18) asks about a family member (Does your grandmother drink tea?) and who
  // someone lives with (Who does your cousin live with?), where "with" closes the question.
  // A1+ 2.2 (2026-11-19) asks how someone goes somewhere (How does Luis go to the gym?); "How do I get to …?"
  // keeps its own A1 6.10 frame below.
  const howGo = /^how (?:do|does) (?:i |you |we |they |he |she |ana |luis |sofia |diego )?go /.test(joined + ' ');
  const routineQuestion = !joined.startsWith('how do') || howGo
    ? /^(?:(what time|how often|how|when|where|why|who) )?(do|does) /.exec(joined) : null;
  const routineQuestionSubject = routineQuestion ? (routineQuestion[1] ? words(routineQuestion[1]).length : 0) + 1 : -1;
  if (routineQuestion && text.trim().endsWith('?')
    && (routineQuestion[1] || routineQuestion[2] === 'does')
    && (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'ana', 'luis', 'sofia', 'diego', 'my', 'your', 'his', 'her', 'our', 'their'].includes(keys[routineQuestionSubject])
      // A family member with the (Does the father work at home?); "What time does the bus leave?" keeps its own frame below.
      || (keys[routineQuestionSubject] === 'the' && routineQuestion[1] !== 'what time'))) {
    const auxiliary = routineQuestion[1] ? words(routineQuestion[1]).length : 0;
    const subjectStart = auxiliary + 1;
    const action = keys.findIndex((key, index) => index > subjectStart && ROUTINE_BASE.has(key));
    if (action < 0 || !subject(subjectStart, action)) return { explanations, relations, supported: false };
    const person = keys.slice(subjectStart, action).join(' ');
    const head = keys[action - 1];
    const thirdPerson = ['he', 'she', 'it', 'ana', 'luis', 'sofia', 'diego'].includes(person)
      || (!['i', 'you', 'we', 'they'].includes(person) && !person.includes(' and ')
        && !/s$|^children$|^people$/.test(head));
    if ((keys[auxiliary] === 'does') !== thirdPerson) return { explanations, relations, supported: false };
    const closingWith = routineQuestion[1] === 'who' && keys[keys.length - 1] === 'with' && keys.length - 1 > action;
    if (routineQuestion[1] === 'who' && !closingWith) return { explanations, relations, supported: false };
    const innerEnd = closingWith ? keys.length - 1 : keys.length;
    const inner = teachClause('I ' + phrase(action, innerEnd) + '.');
    if (!inner.supported) return { explanations, relations, supported: false };
    teach(0, keys.length, `En esta pregunta, ${auxiliary ? `${quote(phrase(0, auxiliary))} va primero; después ` : 'primero va '}“${tokens[auxiliary]}”, luego ${quote(phrase(subjectStart, action))} y la acción ${quote(tokens[action])}${closingWith ? ', y “with” al final' : ''}.`);
    if (auxiliary) teach(0, auxiliary, `${quote(phrase(0, auxiliary))} pregunta ${routineQuestion[1] === 'what time' ? 'la hora' : routineQuestion[1] === 'how often' ? 'la frecuencia' : routineQuestion[1] === 'where' ? 'el lugar' : routineQuestion[1] === 'when' ? 'cuándo' : routineQuestion[1] === 'who' ? 'por la persona' : routineQuestion[1] === 'how' ? 'la manera, cómo' : 'el motivo'} y va antes del auxiliar ${quote(tokens[auxiliary])}.`);
    teach(auxiliary, action, `En esta pregunta, el auxiliar ${quote(tokens[auxiliary])} va antes del sujeto ${quote(phrase(subjectStart, action))}.`);
    teach(subjectStart, action + 1, `Después de ${quote(tokens[auxiliary])}, el sujeto ${quote(phrase(subjectStart, action))} va antes de ${quote(tokens[action])}, la acción en forma base.`);
    inner.explanations.slice(2).forEach((explanation, index) => { explanations[action + index + 1] = explanation; });
    relations.push(...inner.relations.filter(relation => relation.start > 0).map(relation => ({ ...relation, start: relation.start + action - 1, end: relation.end + action - 1 })));
    if (closingWith) teach(keys.length - 1, keys.length, `“With” cierra la pregunta: “Who … with?” pregunta con quién, después de ${quote(tokens[action])}.`);
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  // A1+ 2.12 (2026-11-20): classroom commands have no subject. The action goes first (Write your name.),
  // after "Don't" for what not to do (Don't eat in the classroom.), or after "Please" (Please sit down.).
  const posture = /^please (sit down|stand up)$/.exec(joined);
  if (posture) {
    teach(0, keys.length, `En esta instrucción no hay sujeto: “Please” pide con cortesía y va antes de la acción ${quote(phrase(1, 3))}.`);
    teach(1, 3, `${quote(phrase(1, 3))} significa ${posture[1] === 'sit down' ? 'sentarse' : 'levantarse'}: ${quote(tokens[2])} va después de ${quote(tokens[1])}.`);
    return { explanations, relations, supported: true };
  }
  // A1+ 4.2 (2026-11-20): Please turn on the lamp. / Please turn off the TV.
  const turn = /^please turn (on|off) /.exec(joined + ' ');
  if (turn && keys.length > 3 && !text.trim().endsWith('?')) {
    teach(0, 1, '“Please” pide con cortesía y va primero; en una petición no hay sujeto.');
    teach(1, 3, `${quote(phrase(1, 3))} significa ${turn[1] === 'on' ? 'prender' : 'apagar'}: ${quote(tokens[2])} va justo después de “turn”.`);
    relations.push({ start: 1, end: keys.length, explanation: `Después de ${quote(phrase(1, 3))} va lo que ${turn[1] === 'on' ? 'prendemos' : 'apagamos'}: ${quote(phrase(3, keys.length))}.` });
    const supported = nominal(3, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  const command = /^(don't )?(write|eat|use) /.exec(joined + ' ');
  if (command && keys.length > (command[1] ? 2 : 1) && !text.trim().endsWith('?')) {
    const verb = command[1] ? 1 : 0;
    teach(0, verb + 1, command[1]
      ? `“Don't” va primero, antes de la acción ${quote(tokens[1])}: dice lo que no se debe hacer. En una instrucción no hay sujeto.`
      : `En una instrucción no hay sujeto: la acción ${quote(tokens[0])} va primero.`);
    const supported = complement(verb + 1, keys.length, tokens[verb]);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  const negative = keys.findIndex(key => ["doesn't", "don't"].includes(key));
  // A1+ 2.3 (2026-11-19): I don't have a camera.
  if (negative > 0 && (ROUTINE_BASE.has(keys[negative + 1]) || keys[negative + 1] === 'have') && subject(0, negative)) {
    const person = phrase(0, negative).toLowerCase();
    const thirdPerson = ['he', 'she', 'it', 'ana', 'luis', 'sofia', 'diego'].includes(person);
    if ((keys[negative] === "doesn't") !== thirdPerson) return { explanations, relations, supported: false };
    const inner = teachClause('I ' + phrase(negative + 1, keys.length) + '.');
    if (!inner.supported) return { explanations, relations, supported: false };
    teach(0, keys.length, `En esta negación, primero ${quote(phrase(0, negative))}, luego ${quote(tokens[negative])} y después la acción ${quote(tokens[negative + 1])}.`);
    teach(0, negative + 1, `El sujeto ${quote(phrase(0, negative))} va antes del auxiliar negativo ${quote(tokens[negative])}.`);
    teach(negative, negative + 2, `${quote(tokens[negative])} niega la acción y va antes de ${quote(tokens[negative + 1])}, que queda en forma base.`);
    inner.explanations.slice(2).forEach((explanation, index) => { explanations[negative + index + 2] = explanation; });
    relations.push(...inner.relations.filter(relation => relation.start > 0).map(relation => ({ ...relation, start: relation.start + negative, end: relation.end + negative })));
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  if (/^(yes|no) (he|she|it) (does|doesn't)$/.test(joined) && (keys[0] === 'yes') === (keys[2] === 'does')) {
    teach(0, keys.length, `En esta respuesta corta, primero ${quote(tokens[0])}, después ${quote(tokens[1])} y al final ${quote(tokens[2])}, sin repetir la acción.`);
    teach(1, 3, `El sujeto ${quote(tokens[1])} va antes de ${quote(tokens[2])}, el auxiliar que responde a la pregunta con “Does”.`);
    return { explanations, relations, supported: true };
  }
  // A1+ Unit 6 (2026-11-20): travel and directions.
  const ticketGroup = (from: number, to: number): boolean => {
    // a one-way ticket, a round-trip ticket (the tokenizer splits one-way into one + way), two tickets.
    const kind = keys[from + 1] === 'one' && keys[from + 2] === 'way' ? 'sencillo, solo de ida'
      : keys[from + 1] === 'round' && keys[from + 2] === 'trip' ? 'redondo, de ida y vuelta' : '';
    if (kind && keys[from] === 'a' && to === from + 4 && keys[from + 3] === 'ticket') {
      teach(from, to, `En ${quote(phrase(from, to))}, ${quote(phrase(from + 1, from + 3))} (${kind}) describe el boleto y va entre “a” y “ticket”.`);
      return true;
    }
    return nominal(from, to);
  };
  if (keys[keys.length - 1] === 'please' && keys.length > 2 && !text.trim().endsWith('?') && !keys.some(key => VERBS.has(key))) {
    const to = keys.indexOf('to');
    const groupEnd = to > 0 ? to : keys.length - 1;
    teach(keys.length - 1, keys.length, '“Please” va al final, después de lo que pedimos, para pedirlo con cortesía.');
    let supported = ticketGroup(0, groupEnd);
    if (supported && to > 0) {
      teach(to, keys.length - 1, `“to” va antes del destino ${quote(phrase(to + 1, keys.length - 1))}, después del boleto.`);
      supported = nominal(to + 1, keys.length - 1);
    }
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  if (/^can i have a (?:one way|round trip) ticket please$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, 3, 'En “Can I have”, “Can” va primero, antes de “I” y de “have”: así empieza la petición.');
    teach(keys.length - 1, keys.length, '“Please” va al final, después de lo que pedimos, para pedirlo con cortesía.');
    return { explanations, relations, supported: ticketGroup(3, keys.length - 1) && explanations.every(Boolean) };
  }
  if (/^how much is (?:a (?:one way|round trip) ticket|it)$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, 2, '“How much” pregunta el precio: “How” va antes de “much”.');
    teach(2, 3, '“is” va después de “How much” y antes de lo que cuesta.');
    if (joined === 'how much is it') {
      teach(3, 4, '“it” va al final: es la cosa de la que preguntamos el precio.');
      return { explanations, relations, supported: true };
    }
    return { explanations, relations, supported: ticketGroup(3, keys.length) && explanations.every(Boolean) };
  }
  const whichOne = /^which (platform|gate) is it$/.exec(joined);
  if (whichOne && text.trim().endsWith('?')) {
    teach(0, 2, `${quote(phrase(0, 2))} pregunta cuál ${whichOne[1] === 'platform' ? 'andén' : 'puerta'} y va primero.`);
    teach(2, 4, '“is it” va después: “is” antes de “it”, como en una pregunta.');
    return { explanations, relations, supported: true };
  }
  const floorQuestion = /^what floor is (my|your|his|her) room on$/.exec(joined);
  if (floorQuestion && text.trim().endsWith('?')) {
    teach(0, 2, '“What floor” (qué piso) abre la pregunta.');
    teach(2, 3, '“is” va después de “What floor” y antes del cuarto.');
    teach(3, 5, `${quote(phrase(3, 5))} va después de “is”: ${quote(tokens[3])} dice de quién es el cuarto.`);
    teach(5, 6, '“on” va al final de la pregunta: en qué piso está.');
    return { explanations, relations, supported: true };
  }
  const couldTell = /^could you tell me where (.+) is$/.exec(joined);
  if (couldTell && text.trim().endsWith('?')) {
    teach(0, 2, '“Could you” pide con cortesía: “Could” va antes de “you”.');
    teach(2, 4, '“tell me” (decirme) va después de “Could you”.');
    teach(4, 5, '“where” va después de “tell me” y antes del lugar que buscamos.');
    teach(keys.length - 1, keys.length, `“is” va al final, después de ${quote(phrase(5, keys.length - 1))}: dentro de esta pregunta el orden es como en una afirmación.`);
    return { explanations, relations, supported: nominal(5, keys.length - 1) && explanations.every(Boolean) };
  }
  if (keys[0] === "there's" && keys[1] === 'one' && keys.length > 2 && !text.trim().endsWith('?')) {
    teach(0, 1, '“There’s” es la forma corta de “There is” (hay) y va primero.');
    teach(1, 2, '“one” reemplaza al lugar ya nombrado para no repetirlo; va después de “There’s”.');
    return { explanations, relations, supported: complement(2, keys.length, 'one') && explanations.every(Boolean) };
  }
  if (joined === 'here it is') {
    teach(0, 1, '“Here” (aquí) va primero, al dar algo.');
    teach(1, 3, '“it is” va después: “it” antes de “is”. “Here it is” significa aquí está.');
    return { explanations, relations, supported: true };
  }
  if (keys[0] === "here's" && keys.length > 1 && !text.trim().endsWith('?')) {
    teach(0, 1, '“Here’s” es la forma corta de “Here is” (aquí está) y va primero, al dar algo.');
    return { explanations, relations, supported: nominal(1, keys.length) && explanations.every(Boolean) };
  }
  if (/^(no you can't|yes you can)$/.test(joined)) {
    teach(0, 1, `${quote(tokens[0])} responde primero.`);
    teach(1, 3, `Después va “you” y al final ${quote(tokens[2])}, sin repetir la acción.`);
    return { explanations, relations, supported: true };
  }
  const canI = /^can i (\w+)/.exec(joined);
  if (canI && text.trim().endsWith('?') && VERBS.has(canI[1]) && !['have', 'help'].includes(canI[1])) {
    teach(0, 2, 'Para pedir permiso, “Can” va primero, antes de “I”.');
    const sitDown = keys[2] === 'sit' && keys[3] === 'down' ? 4 : 3;
    teach(2, sitDown, sitDown === 4
      ? '“sit down” (sentarse) es la acción que queremos hacer: “down” va después de “sit”, y los dos van después de “Can I”.'
      : `${quote(tokens[2])} es la acción que queremos hacer; va después de “Can I”.`);
    return { explanations, relations, supported: complement(sitDown, keys.length, phrase(2, sitDown)) && explanations.every(Boolean) };
  }
  if (keys[0] === 'you' && keys[1] === "can't" && keys.length > 2 && VERBS.has(keys[2]) && !text.trim().endsWith('?')) {
    teach(0, 1, '“You” va primero: la persona a quien decimos la regla.');
    teach(1, 2, '“can’t” (no puedes) es la forma corta de “cannot”; va antes de la acción.');
    teach(2, 3, `${quote(tokens[2])} es la acción que no se puede hacer; va después de “can’t”.`);
    return { explanations, relations, supported: complement(3, keys.length, tokens[2]) && explanations.every(Boolean) };
  }
  if (keys[0] === "don't" && keys[1] === 'forget' && keys.length > 2 && !text.trim().endsWith('?')) {
    teach(0, 2, '“Don’t forget” (no olvides) va primero: en este recordatorio no hay sujeto.');
    return { explanations, relations, supported: nominal(2, keys.length) && explanations.every(Boolean) };
  }
  if (/^walk along .+$/.test(joined)) {
    teach(0, 1, 'En esta indicación, primero va la acción “Walk”, sin sujeto.');
    return { explanations, relations, supported: complement(1, keys.length, 'Walk') && explanations.every(Boolean) };
  }
  // A1+ 6.10 (2026-11-20): a yes or no before it's (No, it's near here. / Yes, it's far.).
  if (['yes', 'no'].includes(keys[0]) && keys[1] === "it's" && keys.length > 2 && !text.trim().endsWith('?')) {
    const inner = teachClause(phrase(1, keys.length) + '.');
    if (inner.supported) {
      inner.explanations.forEach((why, index) => { explanations[index + 1] = why; });
      relations.push(...inner.relations.map(relation => ({ ...relation, start: relation.start + 1, end: relation.end + 1 })));
      teach(0, 1, `${quote(tokens[0])} responde primero; después va la frase completa.`);
      return { explanations, relations, supported: explanations.every(Boolean) };
    }
  }
  // Two directions joined with and (Cross the bridge and walk along the river.).
  const andStep = keys.indexOf('and');
  const stepVerbs = ['go', 'turn', 'cross', 'walk', 'take'];
  if (andStep > 0 && stepVerbs.includes(keys[0]) && stepVerbs.includes(keys[andStep + 1] || '') && !text.trim().endsWith('?')) {
    const left = teachClause(phrase(0, andStep) + '.');
    const right = teachClause(phrase(andStep + 1, keys.length) + '.');
    if (left.supported && right.supported) {
      left.explanations.forEach((why, index) => { explanations[index] = why; });
      right.explanations.forEach((why, index) => { explanations[andStep + 1 + index] = why; });
      relations.push(...left.relations, ...right.relations.map(relation => ({ ...relation, start: relation.start + andStep + 1, end: relation.end + andStep + 1 })));
      teach(andStep, andStep + 1, '“and” une las dos indicaciones y va entre ellas: primero una y después la otra.');
      return { explanations, relations, supported: explanations.every(Boolean) };
    }
  }
  const fixed: Record<string, string> = {
    hello: '“Hello” abre el saludo antes de ofrecer ayuda o hacer un pedido.',
    'me too': '“Me too” significa yo también: primero “Me” y después “too”. Responde a una afirmación positiva.',
    'me neither': '“Me neither” significa yo tampoco: primero “Me” y después “neither”. Responde a una afirmación negativa.',
    'how can i help you': 'Para ofrecer ayuda, primero “How”, después “can I”, luego “help” y al final “you”, la persona a quien ayudamos.',
    'thank you': '“Thank you” significa gracias: “thank” va antes de “you”, la persona a quien agradecemos.',
    'excuse me': '“Excuse me” significa disculpe: primero “excuse” y después “me”, quien pide permiso o atención.',
    'here you are': 'Para entregar algo decimos “Here you are”: primero “here”, después “you” y al final “are”. Es una expresión fija.',
    'sorry no': 'Para rechazar con cortesía, primero “Sorry” (lo siento) y después “no”: “Sorry, no”.',
    'no thank you': 'Para rechazar con cortesía, primero “No” y después agradecemos con “thank you”: “No, thank you”.',
    'yes thank you': 'Para aceptar con cortesía, primero “Yes” y después agradecemos con “thank you”: “Yes, thank you”.',
    // Lesson 2.10 asks which of two things someone means before "The red one."
    'which one': 'Para preguntar cuál de varias cosas decimos “Which one?”: primero “Which” y después “one”.',
    // Unit 3 short answers: "Yes." or "No." comes first, then the subject and its be.
    yes: 'En la respuesta corta, “Yes” va primero para decir que sí; después repetimos el sujeto y el verbo.',
    no: 'En la respuesta corta, “No” va primero para decir que no; después repetimos el sujeto, el verbo y “not”.',
    // Unit 7: the greeting question and the two free-time activities are fixed chunks.
    'how are you': 'Para preguntar cómo está alguien decimos “How are you?”: primero “How”, luego “are” y al final “you”.',
    'listening to music': 'En “Listening to music”, primero la actividad “Listening”, después “to” y al final lo que escuchamos, “music”.',
    'watching tv': 'En “Watching TV”, primero la actividad “Watching” y después lo que miramos, “TV”.',
    ok: '“OK” acepta la propuesta; puede ir antes de repetir la actividad que vamos a hacer juntos.',
    'why not': '“Why not?” pregunta el motivo de un rechazo: primero “Why” y después “not”.',
  };
  if (fixed[joined]) {
    teach(0, keys.length, fixed[joined]);
    return { explanations, relations, supported: true };
  }
  if (/^(yes|no) i can(?:not)?$/.test(joined)) {
    teach(0, keys.length, 'En esta respuesta corta, primero “Yes” o “No”, después “I” y al final “can” o “cannot”; no repetimos la acción.');
    teach(1, 3, `${quote(tokens[1])} dice quién responde y va antes de ${quote(tokens[2])}, que expresa si puede hacerlo.`);
    return { explanations, relations, supported: true };
  }
  if (/^here (is|are) your .+/.test(joined)) {
    teach(0, keys.length, 'Al entregar algo, primero “Here”, después “is” para una cosa o “are” para varias, y luego “your” y lo que entregamos.');
    teach(0, 2, `“Here ${tokens[1]}” presenta lo que entregamos y va antes de nombrarlo.`);
    const supported = nominal(2, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  if (/^(yes|water|juice|coffee) please$/.test(joined)) {
    teach(0, keys.length, `Primero ${quote(tokens[0])} indica lo que aceptamos o pedimos; después “please” añade cortesía: ${quote(tokens.join(' '))}.`);
    return { explanations, relations, supported: true };
  }
  if (/^please (repeat|speak slowly)$/.test(joined)) {
    teach(0, keys.length, `En esta petición, “Please” va antes de la acción ${quote(tokens[1])}${keys[2] ? '; “slowly” va después para indicar cómo hablar' : ' para pedirla con cortesía'}.`);
    return { explanations, relations, supported: true };
  }
  const sequencedCommand = /^(first|then|finally|after that) (?:go|turn|cross|stop|take)\b/.exec(joined);
  if (sequencedCommand) {
    const offset = words(sequencedCommand[1]).length;
    const inner = teachClause(tokens.slice(offset).join(' ') + '.');
    teach(0, offset, `${quote(phrase(0, offset))} conecta este paso con la secuencia y va antes de la indicación ${quote(tokens[offset])}.`);
    inner.explanations.forEach((why, i) => { explanations[i + offset] = why; });
    relations.push(...inner.relations.map(relation => ({ ...relation, start: relation.start + offset, end: relation.end + offset })));
    relations.push({ start: 0, end: offset + 1, explanation: explanations[0] });
    return { explanations, relations, supported: inner.supported && explanations.every(Boolean) };
  }
  if (/^go past .+$/.test(joined)) {
    teach(0, keys.length, 'En esta indicación, primero “Go past” (pase junto a) y después el lugar que dejamos atrás.');
    teach(0, 2, '“Go past” indica pasar junto a un lugar: “past” va después de “Go”.');
    const supported = nominal(2, keys.length);
    return { explanations, relations, supported };
  }
  if (/^take .+$/.test(joined)) {
    teach(0, keys.length, 'En esta indicación, primero “Take” (tome) y después el transporte que debe usar.');
    return { explanations, relations, supported: nominal(1, keys.length) };
  }
  if (/^(go straight|turn (left|right)( at .+)?|stop at .+|cross .+)$/.test(joined)) {
    teach(0, keys.length, `Para dar esta indicación, primero va la acción ${quote(tokens[0])} y después ${quote(phrase(1, keys.length))}, que dice hacia dónde o dónde realizarla.`);
    const supported = keys[0] === 'go' || (keys[0] === 'turn'
      ? keys.length === 2 || complement(2, keys.length, phrase(0, 2))
      : complement(1, keys.length, tokens[0]));
    return { explanations, relations, supported };
  }
  // Lesson 7.7 proposes with "Let's": it opens the proposal and the activity follows.
  if (/^let's (play|read|watch|listen|dance|draw|paint|ride|take|meet)\b/.test(joined)) {
    teach(0, keys.length, `Para proponer algo, primero va “Let's” y después la actividad: ${quote(phrase(1, keys.length))}.`);
    teach(0, 1, '“Let\'s” va primero: abre la propuesta, antes de la actividad.');
    teach(1, 2, `${quote(tokens[1])} es la actividad que proponemos; va después de “Let's”.`);
    let next = 2;
    if (keys[1] === 'listen' && keys[2] === 'to') {
      teach(2, 3, '“To” une “listen” con lo que escuchamos y va entre ambos.');
      next = 3;
    }
    const supported = next === keys.length || complement(next, keys.length, phrase(0, next));
    if (keys[1] === 'meet') relations.push({ start: 0, end: 2,
      explanation: 'Para proponer una reunión, “Let\'s” va antes de la actividad “meet”: “Let\'s meet”.' });
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  if (joined === 'can you help me') {
    teach(0, keys.length, 'Para pedir ayuda preguntamos “Can you help me?”: “Can” va antes de “you”, luego “help” y al final “me”, quien necesita ayuda.');
    return { explanations, relations, supported: true };
  }
  if (/^do you want to (read|play|watch tv|listen to music)$/.test(joined)) {
    teach(0, keys.length, 'En esta pregunta, primero “Do”, después “you” y luego “want to” seguido de la actividad que proponemos.');
    teach(3, 4, '“To” une “want” con la actividad que proponemos: va después de “want” y antes del siguiente verbo.');
    relations.push({ start: 2, end: 5, explanation: explanations[3] });
    if (keys[4] === 'listen') teach(5, keys.length, '“Listen to music” significa escuchar música; “to” va entre “listen” y lo que escuchamos.');
    return { explanations, relations, supported: true };
  }
  // Lesson 5.4 counts with "How many ... are there?": the question words and the counted noun come first.
  const howMany = /^how many (.+) are there$/.exec(joined);
  if (howMany && text.trim().endsWith('?')) {
    teach(0, keys.length, `En esta pregunta, primero “How many”, después lo que contamos ${quote(phrase(2, keys.length - 2))} y al final “are there”.`);
    teach(0, 2, '“How many” pregunta la cantidad: “How” va antes de “many” y las dos palabras abren la pregunta.');
    teach(keys.length - 2, keys.length, '“Are there” cierra la pregunta: en la pregunta “are” va antes de “there”, al revés que en “There are”.');
    const supported = nominal(2, keys.length - 2);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // A1+ 1.5 asks "How many brothers and sisters do you have?": "How many" and what we count open the
  // question; then the auxiliary "do", the person and "have".
  const howManyHave = /^how many (.+) (do|does) (you|he|she|we|they|ana|luis|sofia|diego) have$/.exec(joined);
  if (howManyHave && text.trim().endsWith('?')) {
    const auxiliary = keys.length - 3;
    const thirdPerson = ['he', 'she', 'ana', 'luis', 'sofia', 'diego'].includes(keys[auxiliary + 1]);
    if ((keys[auxiliary] === 'does') !== thirdPerson) return { explanations, relations, supported: false };
    teach(0, keys.length, `En esta pregunta, primero “How many” y lo que contamos, ${quote(phrase(2, auxiliary))}; después ${quote(tokens[auxiliary])}, luego ${quote(tokens[auxiliary + 1])} y al final “have”.`);
    teach(0, 2, '“How many” pregunta la cantidad: “How” va antes de “many” y las dos palabras abren la pregunta.');
    const supported = nominal(2, auxiliary);
    teach(auxiliary, auxiliary + 2, `En esta pregunta, el auxiliar ${quote(tokens[auxiliary])} va antes de ${quote(tokens[auxiliary + 1])}, la persona a quien preguntamos.`);
    teach(auxiliary + 1, keys.length, `Después de ${quote(tokens[auxiliary + 1])} va “have”, la acción en forma base: ${quote(phrase(auxiliary, keys.length))}.`);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // Polite requests use the taught "Can I have ..., please?" frame.
  const canHave = /^can i have (.+) please$/.exec(joined);
  if (canHave && text.trim().endsWith('?')) {
    teach(0, keys.length, 'Para pedir algo con cortesía decimos “Can I have …, please?”: primero “Can I have”, después lo que pedimos y al final “please”.');
    teach(0, 3, 'En “Can I have”, “Can” va primero, antes de “I” y de “have”: así empieza la petición.');
    teach(keys.length - 1, keys.length, '“Please” va al final, después de lo que pedimos, para pedirlo con cortesía.');
    const supported = nominal(3, keys.length - 1);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // Current-action questions keep the same word order with the taught subjects.
  if (/^where (?:am|is|are) .+ going$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, keys.length, 'Para preguntar el destino actual, primero “Where”, luego el auxiliar “am/is/are”, después la persona y al final “going”.');
    teach(1, 3, `En esta pregunta, el auxiliar ${quote(tokens[1])} va antes de la persona ${quote(tokens[2])}.`);
    relations.push({ start: 2, end: keys.length, explanation: `La persona ${quote(phrase(2, keys.length - 1))} va antes de “going”, el verbo que expresa el desplazamiento.` });
    return { explanations, relations, supported: subject(2, keys.length - 1) };
  }
  if (/^how do i get to .+$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, keys.length, 'Para preguntar cómo llegar, primero “How do I get to” y después el destino.');
    teach(0, 3, '“How” abre la pregunta; el auxiliar “do” va antes de “I”, la persona que necesita llegar.');
    teach(3, 5, 'En “get to”, “to” va después de “get” y antes del destino: expresa llegar a ese lugar.');
    return { explanations, relations, supported: nominal(5, keys.length) };
  }
  if (/^which (?:bus|train) goes to .+$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, keys.length, '“Which” va antes del transporte por el que preguntamos, luego “goes to” y al final el destino.');
    teach(0, 2, `“Which” pregunta cuál y va antes de ${quote(tokens[1])}.`);
    teach(2, 4, '“Goes” expresa va; “to” lo conecta con el destino y va después de “goes”.');
    return { explanations, relations, supported: nominal(4, keys.length) };
  }
  if (/^what time does .+ (?:leave|arrive)$/.test(joined) && text.trim().endsWith('?')) {
    const last = keys.length - 1;
    teach(0, keys.length, 'Para preguntar el horario, primero “What time”, luego “does”, el transporte y al final “leave” o “arrive”, sin -s.');
    teach(0, 2, '“What time” pregunta a qué hora: “What” va antes de “time”.');
    teach(2, 3, 'En esta pregunta, “does” va antes del transporte; el verbo final queda en su forma base, sin -s.');
    relations.push({ start: 2, end: last, explanation: `El auxiliar “does” va antes de ${quote(phrase(3, last))}, el transporte del que preguntamos.` });
    relations.push({ start: 3, end: keys.length, explanation: `${quote(phrase(3, last))} va antes de ${quote(tokens[last])}, que indica ${keys[last] === 'leave' ? 'salir' : 'llegar'}.` });
    return { explanations, relations, supported: nominal(3, last) };
  }
  if (/^what (?:are (?:you|they)|is (?:he|she)) doing$/.test(joined) && text.trim().endsWith('?')) {
    teach(0, keys.length, `Para preguntar por la acción actual, primero “What”, luego ${quote(tokens[1])}, después ${quote(tokens[2])} y al final “doing”.`);
    teach(1, 3, `En esta pregunta usamos ${quote(tokens[1])} con ${quote(tokens[2])}; el auxiliar va antes de la persona: ${quote(phrase(1, 3))}.`);
    relations.push({ start: 2, end: 4, explanation: `${quote(tokens[2])} indica por quién preguntamos y va antes de “doing”, la acción que queremos conocer.` });
    return { explanations, relations, supported: true };
  }
  const question = /^(who|what number|what color|what time|what day|what|where|how old|how much|how) (am|is|are) (.+)$/.exec(joined);
  if (question && text.trim().endsWith('?')) {
    const verbIndex = words(question[1]).length;
    const dayToday = ((keys[0] === 'what' && keys[1] === 'day') || (keys[0] === 'how' && keys.includes('weather')))
      && keys[keys.length - 1] === 'today';
    const subjectEnd = keys[keys.length - 1] === 'from' || dayToday ? keys.length - 1 : keys.length;
    teach(0, keys.length, `En esta pregunta, primero ${quote(phrase(0, verbIndex))}, luego ${quote(tokens[verbIndex])} y después ${quote(phrase(verbIndex + 1, subjectEnd))}. El verbo va antes de quien preguntamos.`);
    if (verbIndex === 2 && keys[0] === 'what') {
      const asks = keys[1] === 'color' ? 'de qué color es' : keys[1] === 'time' ? 'qué hora es' : keys[1] === 'day' ? 'qué día es' : 'qué número es';
      teach(0, 2, `“What ${keys[1]}” pregunta ${asks}: “What” va antes de “${keys[1]}” y las dos palabras abren la pregunta.`);
    }
    else if (verbIndex === 2) teach(0, 2, `“How ${tokens[1]}” pregunta ${keys[1] === 'old' ? 'la edad' : 'el precio'}: “How” va antes de ${quote(tokens[1])} y las dos palabras abren la pregunta.`);
    const supported = subject(verbIndex + 1, subjectEnd);
    if (dayToday) {
      const closing = `“Today” significa hoy y cierra esta pregunta, después de ${quote(phrase(verbIndex + 1, subjectEnd))}; indica cuándo preguntamos.`;
      teach(subjectEnd, keys.length, closing);
      relations.push({ start: subjectEnd - 1, end: keys.length, explanation: closing });
    }
    else if (subjectEnd < keys.length) teach(subjectEnd, keys.length, 'En “Where are you from?”, “Where” pregunta el lugar y “from” cierra la pregunta para indicar el origen.');
    return { explanations, relations, supported };
  }
  // Lesson 4.8 asks about a routine with "Do you ...?": "Do" opens the question and the
  // rest is the ordinary statement "you + action" that it asks about.
  if (/^do you /.test(joined) && text.trim().endsWith('?')) {
    const inner = teachClause(tokens.slice(1).join(' '));
    const opening = 'En una pregunta de sí o no sobre una rutina, “Do” va primero, antes de “you” y de la acción: “Do you …?”.';
    relations.push({ start: 0, end: keys.length, explanation: opening },
      ...inner.relations.map(relation => ({ ...relation, start: relation.start + 1, end: relation.end + 1 })));
    explanations[0] = opening;
    inner.explanations.forEach((why, index) => { explanations[index + 1] = why; });
    teach(0, 2, opening);
    return { explanations, relations, supported: inner.supported && explanations.every(Boolean) };
  }
  const shortDo = /^(yes|no) i do( not)?$/.exec(joined);
  if (shortDo && (shortDo[1] === 'yes') === !shortDo[2]) {
    teach(0, keys.length, `En la respuesta corta a “Do you …?”, ${quote(tokens[0])} va primero y después ${quote(phrase(1, keys.length))}, sin repetir la acción.`);
    teach(1, 3, '“I” va antes de “do”: repetimos quién responde y el verbo de la pregunta.');
    if (shortDo[2]) teach(3, 4, 'En la respuesta corta, “not” va al final, después de “do”, para decir que no.');
    return { explanations, relations, supported: true };
  }
  // A1+ 3.1 (2026-11-20): introducing a friend (This is my friend Luis.) and the fixed reply
  // Nice to meet you., with too when it answers (Nice to meet you, too.) or a name when it greets someone.
  if (/^this is my friend [a-z]+$/.test(joined) && !text.trim().endsWith('?')) {
    teach(0, 2, '“This is” presenta a una persona y va primero, antes de quién es.');
    teach(2, 4, '“my friend” (mi amigo o amiga) va después de “This is” y antes del nombre.');
    teach(4, 5, `${quote(tokens[4])} es el nombre de la persona y cierra la frase.`);
    return { explanations, relations, supported: true };
  }
  const meet = /^nice to meet you(?: (too|[a-z]+))?$/.exec(joined);
  if (meet && !text.trim().endsWith('?')) {
    teach(0, 4, '“Nice to meet you” (mucho gusto) es una frase fija: “Nice to meet” va antes de “you”.');
    if (meet[1] === 'too') teach(4, 5, '“Too” (también) va al final: responde a quien ya dijo “Nice to meet you”.');
    else if (meet[1]) teach(4, 5, `${quote(tokens[4])}, el nombre de la persona saludada, va al final.`);
    return { explanations, relations, supported: true };
  }
  // A1+ 3.6 (2026-11-20): two people's ages in common (They are both sixteen. / They are not the same age.).
  const both = /^(they|we) are both ([a-z]+)$/.exec(joined);
  if (both && NUMBERS.has(both[2]) && !text.trim().endsWith('?')) {
    teach(0, 2, `En esta afirmación, primero ${quote(tokens[0])}, de quiénes hablamos, y después ${quote(tokens[1])}.`);
    teach(2, 3, `“both” (los dos) va después de ${quote(tokens[1])} y antes de lo que tienen en común.`);
    teach(3, 4, `${quote(tokens[3])} es la edad de los dos y cierra la frase.`);
    return { explanations, relations, supported: true };
  }
  const sameAge = /^(they|we) are (not )?the same age$/.exec(joined);
  if (sameAge && !text.trim().endsWith('?')) {
    const at = sameAge[2] ? 3 : 2;
    teach(0, 2, `En esta afirmación, primero ${quote(tokens[0])}, de quiénes hablamos, y después ${quote(tokens[1])}.`);
    if (sameAge[2]) teach(2, 3, `“not” niega y va después de ${quote(tokens[1])}, antes de “the same age”.`);
    teach(at, at + 3, '“the same age” (la misma edad) va junto, en este orden: “the”, “same” y al final “age”.');
    return { explanations, relations, supported: true };
  }
  // A1+ 3.7 (2026-11-20): what language people speak, and where.
  const speak = /^(i|we|you|they|he|she|ana|luis|sofia|diego) (speak|speaks) (spanish|english)(?: and (spanish|english))?$/.exec(joined);
  if (speak && (speak[2] === 'speaks') === ['he', 'she', 'ana', 'luis', 'sofia', 'diego'].includes(speak[1])) {
    teach(0, 1, `${quote(tokens[0])} indica quién habla y va antes de ${quote(tokens[1])}.`);
    teach(1, 2, speak[2] === 'speaks'
      ? `Con ${quote(tokens[0])} el verbo lleva -s: ${quote(tokens[1])} va después de quién habla.`
      : `${quote(tokens[1])} (hablar) va después de ${quote(tokens[0])} y antes del idioma.`);
    teach(2, keys.length, speak[4]
      ? `Los idiomas van después de ${quote(tokens[1])}, unidos por “and”.`
      : `${quote(tokens[2])} es el idioma y va después de ${quote(tokens[1])}.`);
    return { explanations, relations, supported: true };
  }
  const country = /^in (mexico|spain|canada|the united states) people speak (spanish|english)$/.exec(joined);
  if (country) {
    const end = keys.indexOf('people');
    teach(0, end, `${quote(phrase(0, end))} dice dónde y abre la frase, antes de “people”.`);
    teach(end, end + 2, '“people speak” (la gente habla) va después del lugar: primero “people” y después “speak”.');
    teach(end + 2, keys.length, `${quote(tokens[end + 2])} es el idioma y cierra la frase.`);
    return { explanations, relations, supported: true };
  }
  if (joined === 'what language do you speak' && text.trim().endsWith('?')) {
    teach(0, 2, '“What language” (qué idioma) abre la pregunta.');
    teach(2, 4, '“do you” va después de “What language”, como en “Do you …?”.');
    teach(4, 5, '“speak” (hablar) cierra la pregunta.');
    return { explanations, relations, supported: true };
  }
  // A1+ 4.6 (2026-11-20): What does he do first? / What does he do after that? asks for an action in order.
  const doNext = /^what (does (?:he|she)|do you) do (first|after that)$/.exec(joined);
  if (doNext && text.trim().endsWith('?')) {
    teach(0, 1, '“What” abre la pregunta.');
    teach(1, 3, `${quote(phrase(1, 3))} va después de “What”: ${keys[1] === 'does' ? '“does” con he o she' : '“do” con you'}.`);
    teach(3, 4, 'El último “do” es el verbo hacer: pregunta qué acción hace.');
    teach(4, keys.length, doNext[2] === 'first'
      ? '“first” (primero) cierra la pregunta: pide la primera acción.'
      : '“after that” (después de eso) cierra la pregunta: pide la acción que sigue.');
    return { explanations, relations, supported: true };
  }
  // A1+ 3.9 (2026-11-20): What do you do? / What does she do? asks about someone's work.
  const doWhat = /^what (do you|does (?:he|she|ana|luis|sofia|diego)) do$/.exec(joined);
  if (doWhat && text.trim().endsWith('?')) {
    teach(0, 1, '“What” abre la pregunta.');
    teach(1, 3, `${quote(phrase(1, 3))} va después de “What”: ${keys[1] === 'does' ? '“does” con he, she o un nombre' : '“do” con you'}.`);
    teach(3, 4, 'El último “do” es el verbo hacer y cierra la pregunta: pregunta a qué se dedica.');
    return { explanations, relations, supported: true };
  }
  // A1+ 3.12 (2026-11-20): Whose camera is this? asks who a thing belongs to.
  const whose = /^whose ([a-z]+) (is|are) (this|that|these|those)$/.exec(joined);
  if (whose && text.trim().endsWith('?') && NOUNS.has(whose[1])) {
    teach(0, 2, `“Whose” (de quién) abre la pregunta y va justo antes de la cosa: ${quote(phrase(0, 2))}.`);
    teach(2, 3, `${quote(tokens[2])} va después de la cosa y antes de ${quote(tokens[3])}.`);
    teach(3, 4, `${quote(tokens[3])} señala la cosa y cierra la pregunta.`);
    return { explanations, relations, supported: true };
  }
  // A1+ 3.5 (2026-11-20): how much older or younger, a number of years before the comparative
  // (She is three years older than him.). Short forms reach this rule as their full forms.
  const years = /^(he|she|i|you|we|they) (is|am|are) (two|three|four|five) years (older|younger) than (him|her|me|you|us|them)$/.exec(joined);
  if (years && !text.trim().endsWith('?')) {
    teach(0, 2, `En esta afirmación, primero ${quote(tokens[0])}, de quién hablamos, y después ${quote(tokens[1])}.`);
    teach(2, 4, `${quote(phrase(2, 4))} dice cuánto: va después de ${quote(tokens[1])} y antes de ${quote(tokens[4])}.`);
    teach(4, 6, `${quote(phrase(4, 6))} compara: ${quote(tokens[4])} va antes de “than”.`);
    teach(6, 7, `${quote(tokens[6])} es con quién comparamos; va después de “than”.`);
    relations.push({ start: 2, end: 6, explanation: `${quote(phrase(2, 4))} va antes de ${quote(phrase(4, 6))}: primero cuántos años, después la comparación.` });
    return { explanations, relations, supported: true };
  }
  // A1+ 2.4 (2026-11-19): the short forms of be. A1 writes the full forms, so these never meet an A1 card.
  if (joined === "what's this" && text.trim().endsWith('?')) {
    teach(0, 2, '“What’s” es la forma corta de “what is”: pregunta qué es y va antes de “this”, lo que señalamos.');
    return { explanations, relations, supported: true };
  }
  // A1+ 2.8 (2026-11-19): What's your favorite color? asks with the short form before what we ask about.
  if (keys[0] === "what's" && keys.length > 2 && text.trim().endsWith('?') && nominal(1, keys.length)) {
    teach(0, 1, '“What’s” es la forma corta de “what is”: la pregunta empieza con él.');
    teach(1, keys.length, `${quote(phrase(1, keys.length))} es lo que preguntamos; va después de “What’s”.`);
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  // A1+ 4.1 (2026-11-20): Where's the boy? asks where someone is with the short form of where is.
  if (keys[0] === "where's" && keys.length > 1 && text.trim().endsWith('?')) {
    teach(0, 1, '“Where’s” es la forma corta de “Where is”: pregunta dónde está y va primero.');
    relations.push({ start: 0, end: keys.length, explanation: `Después de “Where’s” va la persona o la cosa que buscamos: ${quote(phrase(1, keys.length))}.` });
    const supported = subject(1, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // A1+ 4.4 (2026-11-20): what there is not in a place (There isn't a TV in the bedroom.); "aren't"
  // reaches this rule as "are not".
  const thereNot = /^there (?:isn't|(?:is|are) not) /.exec(joined + ' ');
  if (thereNot && !text.trim().endsWith('?')) {
    const verbEnd = keys[1] === "isn't" ? 2 : 3;
    teach(0, verbEnd, keys[1] === "isn't"
      ? '“There isn’t” (no hay) es la forma corta de “There is not” y va primero, antes de lo que no hay.'
      : `${quote(phrase(0, verbEnd))} (no hay) va primero, antes de lo que no hay.`);
    const place = keys.findIndex((key, index) => index > verbEnd && ['in', 'on', 'under', 'next'].includes(key));
    const thingEnd = place < 0 ? keys.length : place;
    relations.push({ start: 0, end: thingEnd, explanation: `${quote(phrase(verbEnd, thingEnd))} es lo que no hay; va después de ${quote(phrase(0, verbEnd))}.` });
    if (!nominal(verbEnd, thingEnd)) return { explanations, relations, supported: false };
    const supported = place < 0 || complement(place, keys.length, phrase(verbEnd, thingEnd));
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // A1+ 2.10 (2026-11-19): Which ones do you want? asks which group someone chooses.
  const whichDo = /^which (ones?) do you want$/.exec(joined);
  if (whichDo && text.trim().endsWith('?')) {
    teach(0, 2, `${quote(phrase(0, 2))} pregunta cuál${whichDo[1] === 'ones' ? 'es' : ''} y va primero, antes de “do you want”.`);
    teach(2, keys.length, '“do you want” va después: “do” antes de “you”, y al final “want”, lo que quieres.');
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  const shortIs = keys[0] === "it's" ? 1 : keys[0] === 'it' && keys[1] === "isn't" ? 2 : 0;
  if (shortIs && keys.length > shortIs && !text.trim().endsWith('?')) {
    teach(0, shortIs, shortIs === 1
      ? '“It’s” es la forma corta de “it is”: “it” (eso) y “is” (es) van juntos al principio.'
      : '“Isn’t” es la forma corta de “is not”: va después de “It” y niega lo que sigue.');
    teach(shortIs, keys.length, `${quote(phrase(shortIs, keys.length))} dice qué ${shortIs === 1 ? 'es' : 'no es'}; va después de ${quote(phrase(0, shortIs))}.`);
    // A1+ Unit 6 (2026-11-20): It's on the corner. / It's opposite the park. / It's ten dollars.
    const placed = ['on', 'opposite', 'near', 'in', 'at'].includes(keys[shortIs]);
    const supported = keys.length === shortIs + 1 && STATES.has(keys[shortIs]) ? true
      : placed ? complement(shortIs, keys.length, tokens[shortIs - 1]) : nominal(shortIs, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  // A closing "isn't" negates without repeating the description (… but that one isn't.).
  if (keys.length >= 2 && keys[keys.length - 1] === "isn't" && !text.trim().endsWith('?')) {
    const end = keys.length - 1;
    if (!subject(0, end)) return { explanations, relations, supported: false };
    teach(end, end + 1, `“Isn’t” (is not) va después de ${quote(phrase(0, end))} y cierra la frase: niega sin repetir la descripción.`);
    return { explanations, relations, supported: explanations.every(Boolean) };
  }
  const yesNo = /^(am|is|are) /.exec(joined);
  if (yesNo && text.trim().endsWith('?') && keys.length >= 3) {
    teach(0, keys.length, `En una pregunta de sí o no, el verbo ${quote(tokens[0])} va primero, antes de quien preguntamos.`);
    // The subject is a pronoun ("Is he …?") or a determiner and its noun ("Are the babies …?").
    const subjectEnd = DETERMINERS.has(keys[1]) ? 3 : 2;
    if (!subject(1, subjectEnd)) return { explanations, relations, supported: false };
    teach(0, subjectEnd, `En esta pregunta, ${quote(tokens[0])} va antes del sujeto ${quote(phrase(1, subjectEnd))}.`);
    relations.push({ start: 1, end: keys.length, explanation: `Después de ${quote(tokens[0])} va el sujeto ${quote(phrase(1, subjectEnd))} y luego ${quote(phrase(subjectEnd, keys.length))}.` });
    const supported = complement(subjectEnd, keys.length, tokens[0]);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  let start = 0;
  if (keys[0] === 'after' && keys[1] === 'that') {
    teach(0, 2, '“After that” significa después de eso: “after” va antes de “that”. El grupo abre esta frase y conecta la acción con el paso anterior.');
    start = 2;
  } else if (['first', 'then', 'finally'].includes(keys[0])) {
    const order = keys[0] === 'first' ? 'qué ocurre primero' : keys[0] === 'finally' ? 'el último paso' : 'qué ocurre después';
    teach(0, 1, `${quote(tokens[0])} indica ${order} y abre esta frase, antes de quien realiza la acción.`);
    start = 1;
  }
  const verbIndex = keys.findIndex((key, index) => index > start && VERBS.has(key)
    && !(NOUNS.has(key) && NOUN_MARKERS.has(keys[index - 1])));
  if (verbIndex < 0) {
    const supported = subject(start, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  const verb = keys[verbIndex];
  const actionIndex = verbIndex + (keys[verbIndex + 1] === 'not' ? 2 : 1);
  const progressive = BE.has(verb) && ACTIONS.has(keys[actionIndex]);
  teach(start, keys.length, progressive
    ? `En esta afirmación, primero el sujeto ${quote(phrase(start, verbIndex))}, después el auxiliar ${quote(tokens[verbIndex])}${actionIndex > verbIndex + 1 ? ' y “not”' : ''}, y luego el verbo principal en -ing ${quote(tokens[actionIndex])}.`
    : `Primero ${quote(phrase(start, verbIndex))}, de quién o qué hablamos; después ${quote(tokens[verbIndex])} y el resto de la afirmación.`);
  teach(start, verbIndex + 1, progressive
    ? `En esta afirmación, el sujeto ${quote(phrase(start, verbIndex))} va antes de ${quote(tokens[verbIndex])}, el auxiliar del verbo ${quote(tokens[actionIndex])}.`
    : BE.has(verb)
    ? `En esta afirmación, primero ${quote(phrase(start, verbIndex))}, de quién hablamos, y después ${quote(tokens[verbIndex])}, que lo une con su descripción.`
    : `En esta afirmación, ${quote(phrase(start, verbIndex))} indica quién realiza la acción y va antes de ${quote(tokens[verbIndex])}.`);
  if (keys[start] === 'there') teach(start, verbIndex + 1, `Para decir que hay algo usamos ${quote(phrase(start, verbIndex + 1))}: “There” va primero, después ${quote(tokens[verbIndex])} y luego lo que hay.`);
  if (!subject(start, verbIndex)) return { explanations, relations, supported: false };
  let rest = verbIndex + 1;
  if (keys[rest] === 'not') {
    teach(rest, rest + 1, rest + 1 === keys.length
      ? `En la respuesta corta, “not” va al final, después de ${quote(tokens[verbIndex])}, para decir que no.`
      : `“Not” niega lo que sigue; aquí va después de ${quote(tokens[verbIndex])} y antes de ${quote(tokens[rest + 1] || '')}.`);
    relations.push({ start: verbIndex, end: rest + 2, explanation: explanations[rest] });
    rest++;
  }
  if (['do', 'can', 'cannot'].includes(verb)) {
    if (!['like', 'want', 'need', 'understand', 'walk', 'turn', 'go', 'cross'].includes(keys[rest])) return { explanations, relations, supported: false };
    teach(rest, rest + 1, `${quote(tokens[rest])} es la acción y va después de ${quote(phrase(verbIndex, rest))}.`);
    const action = keys[rest++];
    if (rest === keys.length) return { explanations, relations, supported: true };
    if ((action === 'turn' && ['left', 'right'].includes(keys[rest])) || (action === 'walk' && keys[rest] === 'there')) {
      teach(rest, keys.length, `${quote(tokens[rest])} indica hacia dónde; va después de la acción ${quote(tokens[rest - 1])}.`);
      return { explanations, relations, supported: rest === keys.length - 1 };
    }
  }
  // A he/she form (wakes, gets) follows its base verb's phrasal rules.
  const base = [verb.slice(0, -1), verb.slice(0, -2)].find(stem => verb.endsWith('s') && ROUTINE_BASE.has(stem)) || verb;
  const pair = `${base} ${keys[rest]}`;
  if (['put on', 'take off', 'get up'].includes(pair)) {
    const meaning = pair === 'put on' ? 'ponerse' : pair === 'take off' ? 'quitarse' : 'levantarse';
    teach(verbIndex, rest + 1, `${quote(phrase(verbIndex, rest + 1))} significa ${meaning}: ${quote(tokens[rest])} completa el verbo y va después de ${quote(tokens[verbIndex])}.`);
    rest++;
  }
  if (base === 'get' && (['on', 'off', 'in'].includes(keys[rest]) || (keys[rest] === 'out' && keys[rest + 1] === 'of'))) {
    const end = rest + (keys[rest] === 'out' ? 2 : 1);
    const action = phrase(verbIndex, end);
    const meaning = keys[rest] === 'on' ? 'subir al transporte' : keys[rest] === 'off' ? 'bajar del transporte'
      : keys[rest] === 'in' ? 'entrar al auto o taxi' : 'salir del auto o taxi';
    teach(verbIndex, end, `${quote(action)} significa ${meaning}: ${quote(phrase(rest, end))} completa “get” y va después, antes del vehículo.`);
    rest = end;
  }
  if (['wake up', 'get dressed', 'come home'].includes(pair)) {
    teach(verbIndex, rest + 1, `${quote(phrase(verbIndex, rest + 1))} expresa ${base === 'wake' ? 'despertarse' : base === 'get' ? 'vestirse' : 'volver a casa'}; ${quote(tokens[rest])} completa la acción y va después de ${quote(tokens[verbIndex])}.`);
    rest++;
  }
  const supported = complement(rest, keys.length, phrase(verbIndex, rest));
  return { explanations, relations, supported: supported && explanations.every(Boolean) };
}

export const isOrderedCompletion = (card: LessonCard) => card.stage === 'Use'
  && !card.mission_game && (card.correct_option_ids?.length || 0) > 1
  && (['complete2', 'complete-sentence'].includes(card.interaction_type || '')
    || card.options.length === card.correct_option_ids?.length);

export const awaitingConstructionRetry = (card: LessonCard | null | undefined, result: string | null) =>
  Boolean(card && isOrderedCompletion(card) && result === 'wrong');

export function constructionTeachingPlan(card: LessonCard) {
  if (card.target_language === 'de') return germanConstructionPlan(card);
  if (card.target_language === 'es') return spanishConstructionPlan(card);
  const ids = card.correct_option_ids || [];
  const labels = ids.map(id => card.options.find(option => option.id === id)?.label || '');
  const tokenSlots: number[] = [];
  let slot = 0;
  let tokenCount = 0;
  const target = card.prompt.replace(/\[blank\]|\{blank\}/gi, '___').split(/(_{2,})/).map(part => {
    if (/^_{2,}$/.test(part)) {
      tokenSlots.push(tokenCount);
      const label = labels[slot++] || '';
      tokenCount += words(label).length;
      return label;
    }
    tokenCount += words(part).length;
    return part;
  }).join('');
  const { explanations, relations, supported } = shortBePlan(target);
  return {
    target,
    labels,
    tokenSlots,
    relations,
    explanations: tokenSlots.map(index => explanations[index] || ''),
    supported: slot === ids.length && labels.every(Boolean) && supported
      && (!card.answer_audio_text || words(target).join(' ') === words(card.answer_audio_text).join(' ')),
  };
}

function sentencePlan(target: string): ClausePlan {
  // A comma can join two complete statements, but does not split “No, thank
  // you”, a noun contrast, or the introductory “First,” / “Then,”.
  // Periods inside a.m./p.m. belong to one time token, not three clauses.
  const clauses = target.replace(/\b([ap])\.m\./gi, '$1m')
    .replace(/,\s*(?=(?:he|she|it|they|we|you|i)\s+(?:am|is|are)\b)/gi,
      (comma: string, offset: number, full: string) => /(?:^|[.!?])\s*(?:first|then|finally|after that)$/i.test(full.slice(0, offset)) ? comma : '. ')
    .match(/[^.!?]+[.!?]?/g) || [];
  const plans = clauses.map(teachClause);
  const explanations = plans.flatMap(plan => plan.explanations);
  let offset = 0;
  const relations = plans.flatMap(plan => {
    const result = plan.relations.map(relation => ({ ...relation, start: relation.start + offset, end: relation.end + offset }));
    offset += plan.explanations.length;
    return result;
  });
  return { explanations, relations, supported: plans.length > 0 && plans.every(plan => plan.supported) };
}

// A1+ 3.2-3.5 (2026-11-20): a person's short form of be (I'm, you're, we're, he's, she's, they're)
// and aren't are taught through their full forms, which the patterns above already explain; the
// short form is one tile, so it gets its own explanation and the full form's words are quoted as it.
const SHORT_BE: Record<string, [string, string]> = {
  "i'm": ['I', 'am'], "you're": ['you', 'are'], "we're": ['we', 'are'], "he's": ['he', 'is'],
  "she's": ['she', 'is'], "they're": ['they', 'are'], "aren't": ['are', 'not'],
};

function shortBePlan(target: string): ClausePlan {
  const pattern = /\b(?:i'm|you're|we're|he's|she's|they're|aren't)\b/gi;
  if (!pattern.test(target.replace(/’/g, "'"))) return sentencePlan(target);
  const map: number[] = []; // full-form word index -> short-form word index
  const shorts: { index: number; label: string; halves: string[]; from: number }[] = [];
  let wordIndex = 0;
  const full = target.replace(/’/g, "'").replace(/[a-z]+(?:'[a-z]+)?/gi, (word: string) => {
    const halves = SHORT_BE[word.toLowerCase()];
    if (!halves) {
      map.push(wordIndex++);
      return word;
    }
    const first = /^[A-Z]/.test(word) ? halves[0][0].toUpperCase() + halves[0].slice(1) : halves[0];
    shorts.push({ index: wordIndex, label: word, halves: [first, halves[1]], from: map.length });
    map.push(wordIndex, wordIndex);
    wordIndex++;
    return `${first} ${halves[1]}`;
  });
  const plan = sentencePlan(full);
  // The full form's verb (am, is, are; are not) is quoted as the short form nearest to the word being
  // explained; a subject alone ("They" in "They aren't …") is its own tile and stays as it is.
  const nearest = (position: number, test: (item: typeof shorts[number]) => boolean) => shorts
    .filter(test).sort((a, b) => Math.abs(a.from - position) - Math.abs(b.from - position))[0];
  const requote = (why: string, position: number) => why.replace(/“([^”]+)”/g, (match: string, quoted: string) => {
    const parts = quoted.split(' ');
    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const word = parts[i].toLowerCase(), next = (parts[i + 1] || '').toLowerCase();
      const pair = next && nearest(position, item => item.halves[0].toLowerCase() === word && item.halves[1] === next);
      if (pair) { out.push(pair.label); i++; continue; }
      const verb = ['am', 'is', 'are'].includes(word) && nearest(position, item => item.halves[0].toLowerCase() === word
        || (item.halves[1] === word && item.halves[1] !== 'not'));
      if (verb) {
        out.push(verb.label);
        if (next === 'not' && verb.halves[1] === 'not') i++;
        continue;
      }
      out.push(parts[i]);
    }
    const rebuilt = out.filter((part, i) => part !== out[i - 1]).join(' ');
    return rebuilt === quoted ? match : quote(rebuilt);
  });
  const explanations: string[] = Array.from({ length: wordIndex }, () => '');
  plan.explanations.forEach((why, position) => {
    if (!explanations[map[position]]) explanations[map[position]] = why ? requote(why, position) : '';
  });
  for (const item of shorts) {
    const [subject, verb] = item.halves;
    explanations[item.index] = verb === 'not'
      ? `${quote(item.label)} es la forma corta de “are not”: niega y va justo después de quien hace la acción.`
      : `${quote(item.label)} es la forma corta de “${subject} ${verb}”: el sujeto y el verbo van juntos en una sola palabra.`;
  }
  const relations = plan.relations.map(relation => ({
    start: map[relation.start],
    end: map[Math.max(relation.start, relation.end - 1)] + 1,
    explanation: requote(relation.explanation, relation.start),
  }));
  return { explanations, relations, supported: plan.supported && explanations.every(Boolean) };
}

export function constructionMistakeHint(card: LessonCard, selected: string[]): string {
  const plan = constructionTeachingPlan(card);
  const actual = selected.map(id => card.options.find(option => option.id === id)?.label || '');
  // An unfinished attempt is not a grammatical error. Identical occurrences
  // compare by their accepted label, just like construction scoring.
  if (actual.length !== plan.labels.length || actual.some(label => !label)) return '';
  const index = plan.labels.findIndex((label, i) => label !== actual[i]);
  if (index < 0) return '';
  const other = (card.correct_option_ids || []).indexOf(selected[index]);
  const positions = [plan.tokenSlots[index], plan.tokenSlots[other]];
  const relations = plan.relations.filter(relation => positions.every(position => position >= relation.start && position < relation.end)).reverse();
  relations.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  const why = relations[0]?.explanation || plan.explanations[index];
  // Unsupported authored patterns are release-blocking in the course audit.
  // Do not invent a grammatical rule if unvalidated content reaches the client.
  if (!plan.supported || !why) return '';
  // German and Spanish course cards are for English speakers, so their feedback is English.
  if (card.target_language === 'de' || card.target_language === 'es') return `You put ${quote(actual[index])} where ${quote(plan.labels[index])} goes. ${why}`;
  return `Pusiste ${quote(actual[index])} donde va ${quote(plan.labels[index])}. ${why}`;
}
