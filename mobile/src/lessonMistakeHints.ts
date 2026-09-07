import type { LessonCard } from './types';
import { spanishTranslationFor } from './sentenceTranslations';

const SUBJECT_LABELS: Record<string, string> = {
  'a baby': '“A baby” (un bebé)',
  'a brother': '“A brother” (un hermano)',
  'a child': '“A child” (un niño)',
  'a sister': '“A sister” (una hermana)',
  he: '“He” (él)',
  she: '“She” (ella)',
  'the baby': '“The baby” (el bebé)',
  'the boy': '“The boy” (el niño)',
  'the father': '“The father” (el padre)',
  'the girl': '“The girl” (la niña)',
  'the grandfather': '“The grandfather” (el abuelo)',
  'the grandmother': '“The grandmother” (la abuela)',
  'the man': '“The man” (el hombre)',
  'the mother': '“The mother” (la madre)',
  'the woman': '“The woman” (la mujer)',
};

const PLURAL_SUBJECT_LABELS: Record<string, string> = {
  children: '“Children” (los niños)',
  'the adults': '“The adults” (los adultos)',
  'the boy and the girl': '“The boy and the girl” (el niño y la niña)',
  'the brothers': '“The brothers” (los hermanos)',
  'the children': '“The children” (los niños)',
  'the grandparents': '“The grandparents” (los abuelos)',
  'the parents': '“The parents” (los padres)',
  'the sisters': '“The sisters” (las hermanas)',
  they: '“They” (ellos o ellas)',
};

const IDENTITY_CHOICE_LABELS: Record<string, string> = {
  adults: 'a los adultos',
  brothers: 'a los hermanos',
  children: 'a los niños',
  father: 'al padre',
  grandfather: 'al abuelo',
  grandmother: 'a la abuela',
  grandparents: 'a los abuelos',
  mother: 'a la madre',
  parents: 'a los padres',
  sisters: 'a las hermanas',
};

// Meanings of the actual answer contrasts, never inferred from asset filenames.
const MEANINGS: Record<string, string> = {
  adult: 'adulto', adults: 'adultos', baby: 'bebé', babies: 'bebés',
  boy: 'niño', girl: 'niña', man: 'hombre', woman: 'mujer', child: 'niño', children: 'niños',
  father: 'padre', mother: 'madre', parents: 'padres', grandfather: 'abuelo', grandmother: 'abuela',
  grandparents: 'abuelos', brother: 'hermano', brothers: 'hermanos', sister: 'hermana', sisters: 'hermanas', family: 'familia',
  running: 'corriendo', walking: 'caminando', reading: 'leyendo', writing: 'escribiendo',
  eating: 'comiendo', drinking: 'bebiendo', cooking: 'cocinando', working: 'trabajando',
  studying: 'estudiando', playing: 'jugando', swimming: 'nadando', sleeping: 'durmiendo',
  sitting: 'sentado', talking: 'hablando',
  red: 'rojo', blue: 'azul', green: 'verde', yellow: 'amarillo', black: 'negro', white: 'blanco',
  one: 'uno', two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis', seven: 'siete',
  eight: 'ocho', nine: 'nueve', ten: 'diez', eleven: 'once', twelve: 'doce', thirteen: 'trece',
  fourteen: 'catorce', fifteen: 'quince', sixteen: 'dieciséis', seventeen: 'diecisiete',
  eighteen: 'dieciocho', nineteen: 'diecinueve', twenty: 'veinte',
  park: 'parque', school: 'escuela', store: 'tienda', house: 'casa', restaurant: 'restaurante',
  hospital: 'hospital', street: 'calle', bridge: 'puente', bus: 'autobús', car: 'automóvil',
  bike: 'bicicleta', book: 'libro', books: 'libros', pen: 'bolígrafo', pens: 'bolígrafos',
  phone: 'teléfono', phones: 'teléfonos', bag: 'bolsa', chair: 'silla', table: 'mesa', cars: 'automóviles',
  bed: 'cama', bedroom: 'dormitorio', kitchen: 'cocina', 'living room': 'sala', 'dining room': 'comedor',
  computer: 'computadora', door: 'puerta', lamp: 'lámpara', doctor: 'médico', nurse: 'enfermero o enfermera',
  teacher: 'profesor o profesora', driver: 'conductor', farmer: 'agricultor', job: 'trabajo', name: 'nombre',
  mexico: 'México', mexican: 'mexicano o mexicana', spanish: 'español o española', 'the united states': 'Estados Unidos',
  'wake up': 'despertarse', 'get dressed': 'vestirse', 'wash my face': 'lavarme la cara',
  'brush my teeth': 'cepillarme los dientes', 'eat breakfast': 'desayunar', 'go to school': 'ir a la escuela',
  'go to work': 'ir al trabajo', 'come home': 'volver a casa', 'study english': 'estudiar inglés',
  sleep: 'dormir', work: 'trabajar',
  apple: 'manzana', apples: 'manzanas', banana: 'plátano', grapes: 'uvas', strawberry: 'fresa',
  bread: 'pan', egg: 'huevo', eggs: 'huevos', rice: 'arroz', milk: 'leche', fish: 'pescado',
  juice: 'jugo', water: 'agua', breakfast: 'desayuno', lunch: 'almuerzo', dinner: 'cena',
  drink: 'beber', coffee: 'café', tea: 'té', chicken: 'pollo',
  station: 'estación', pharmacy: 'farmacia', train: 'tren', taxi: 'taxi', walk: 'caminar',
  left: 'izquierda', right: 'derecha', straight: 'recto, sin girar', cross: 'cruzar',
  leaves: 'sale', arrives: 'llega', afternoon: 'tarde', head: 'cabeza', eyes: 'ojos',
  mouth: 'boca', hands: 'manos', legs: 'piernas', feet: 'pies', ears: 'orejas', arms: 'brazos',
  jacket: 'chaqueta', happy: 'feliz', sad: 'triste', tired: 'cansado', hungry: 'hambriento',
  thirsty: 'sediento', shirt: 'camisa', pants: 'pantalones', dress: 'vestido', socks: 'calcetines',
  sunny: 'soleado', rainy: 'lluvioso', hot: 'caluroso', cold: 'frío', windy: 'con viento',
  umbrella: 'paraguas', boots: 'botas', hat: 'sombrero', 'watching tv': 'ver televisión',
  'listening to music': 'escuchar música', read: 'leer', play: 'jugar', help: 'ayuda',
  understand: 'entender', repeat: 'repetir', slowly: 'despacio', bathroom: 'baño',
};

function normalized(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/[?.!,]+$/g, '');
}

function meaning(text: string) {
  const key = normalized(text);
  if (MEANINGS[key]) return MEANINGS[key];
  const translated = spanishTranslationFor(text);
  return translated.includes('Traducción no disponible') ? '' : translated.replace(/[.]+$/, '');
}

function contrast(correct: string, wrong: string) {
  const correctWords = normalized(correct).split(/\s+/);
  const wrongWords = normalized(wrong).split(/\s+/);
  while (correctWords.length && wrongWords.length && correctWords[0] === wrongWords[0]) {
    correctWords.shift(); wrongWords.shift();
  }
  while (correctWords.length && wrongWords.length && correctWords[correctWords.length - 1] === wrongWords[wrongWords.length - 1]) {
    correctWords.pop(); wrongWords.pop();
  }
  return [correctWords.join(' '), wrongWords.join(' ')];
}

/** Teach the first mistaken slot, or the meaning that distinguishes the choices.
 * Prompt audio may be a question or contain blanks; it is never the answer source.
 */
export function lessonMistakeHint(card: LessonCard, selected?: string | string[] | null): string {
  const ids = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : [];
  const slot = Math.max(0, ids.findIndex((id, index) => selectedIds[index] !== id));
  const labels = ids.map((id) => card.options.find((option) => option.id === id)?.label || '');
  const correctOption = card.options.find((option) => option.id === ids[slot]);
  const wrongOption = card.options.find((option) => option.id === selectedIds[slot]);
  let blank = 0;
  const prompt = card.prompt.replace(/\[blank\]|\{blank\}/gi, '___');
  const completed = prompt.replace(/_{2,}/g, () => labels[blank++] || '');
  const isCompletion = /_{2,}/.test(prompt);
  const label = correctOption?.label || '';
  const contextualAudio = label && normalized(card.audio_text).split(/\s+/).includes(normalized(label))
    ? card.audio_text : '';
  const target = card.answer_audio_text || (isCompletion ? completed : contextualAudio || label) || card.audio_text || card.prompt;
  const correct = labels[slot] || target;
  const wrong = wrongOption?.label || '';
  const [difference, wrongDifference] = contrast(correct, wrong);
  const focus = normalized(isCompletion ? correct : difference || correct);
  const before = isCompletion ? prompt.split(/_{2,}/)[slot] : target.slice(0, normalized(target).indexOf(focus));

  const after = isCompletion ? prompt.split(/_{2,}/)[slot + 1]?.split(/[.!?]/)[0] || '' : '';
  const clause = isCompletion
    ? `${before.replace(/^.*[.!?]\s*/, '')}${correct}${after}`.trim()
    : target;
  const inContext = (explanation: string) => `En “${clause.replace(/[.!?]+$/, '')}”: ${explanation}`;

  if (card.mission_game?.instruction_es?.trim()) {
    return `${card.mission_game.instruction_es.trim()} Aquí corresponde “${correct}”.`;
  }

  if (/^(a|an)$/.test(focus)) {
    const next = (isCompletion ? prompt.split(/_{2,}/)[slot + 1]?.trim().split(/\s+/)[0] : target.match(/\b(?:a|an)\s+(\w+)/i)?.[1])?.replace(/[?.!,]+$/, '');
    return `La respuesta es “${focus} ${next}”: “${next}” empieza con sonido ${focus === 'an' ? 'de vocal' : 'de consonante'}, por eso usamos “${focus}” y no “${focus === 'an' ? 'a' : 'an'}”.`;
  }
  if (/^(am|is|are)$/.test(focus)) {
    let subject = normalized(before).replace(/^.*[.!?]\s*/, '').trim();
    if (/^(who|what|where|how old)$/.test(subject)) {
      subject = normalized(target).match(/(?:who|what|where|how old)\s+(?:am|is|are)\s+([^?.!]+)/)?.[1]?.replace(/\s+from$/, '') || subject;
    }
    if (subject === 'there') {
      return inContext(`“There ${focus}” significa “hay”; usamos “${focus}” porque hablamos de ${focus === 'is' ? 'una sola cosa' : 'varias cosas'}.`);
    }
    const key = /\b(he|she|it|i|you|we|they)\b/.exec(subject)?.[1] || subject;
    const label = SUBJECT_LABELS[key] || PLURAL_SUBJECT_LABELS[key] || `“${key || target}”`;
    if (focus === 'am') return inContext('Con “I” (yo) usamos “am”, que aquí expresa soy o estoy.');
    if (key === 'you') return inContext('Con “you” (tú o ustedes) usamos “are”, incluso al hablar con una sola persona.');
    if (key === 'we') return inContext('“We” significa nosotros o nosotras; por eso usamos “are”.');
    return inContext(`${label} es ${focus === 'is' ? 'singular' : 'plural'}; usamos “${focus}”.`);
  }
  if (/^(he|she|it|they|i|you|we|they are)$/.test(focus)) {
    const rules: Record<string, string> = {
      he: '“He” (él) reemplaza al hombre o niño del que hablamos.',
      she: '“She” (ella) reemplaza a la mujer o niña de la que hablamos.',
      it: '“It” se refiere aquí a una sola cosa; “he” y “she” se usan para personas.',
      they: '“They” (ellos o ellas) reemplaza al grupo; se combina con “are”.',
      'they are': 'El grupo se reemplaza por “they”; con “they” usamos “are”.',
      i: '“I” significa yo: la persona habla de sí misma.',
      you: '“You” significa tú o ustedes: hablamos con esa persona o grupo.',
      we: '“We” significa nosotros o nosotras: incluye a quien habla.',
    };
    return inContext(rules[focus]);
  }
  if (/^(my|your|his|her)$/.test(focus)) {
    const owner = { my: 'de quien habla (mi)', your: 'de la persona a quien hablamos (tu)', his: 'de él (su)', her: 'de ella (su)' }[focus];
    return inContext(`“${focus}” indica que el nombre u objeto es ${owner}.`);
  }
  if (/^(have|has)$/.test(focus)) return inContext(`usamos “${focus}” con “${before.trim()}”; ${focus === 'has' ? 'he/she/it lleva “has”' : 'I/you/we/they lleva “have”'}.`);
  if (/^(not|do not|do not like|cannot|can)$/.test(focus)) {
    if (focus === 'not' && /\bdo\s*$/i.test(before)) return inContext('“not” va entre “do” y “like” para negar la preferencia.');
    if (focus === 'not') return inContext('“Not” indica que la acción no está ocurriendo; va después de “is” o “are”.');
    if (focus === 'can' || focus === 'cannot') return inContext(`“${focus}” significa “${focus === 'can' ? 'puede' : 'no puede'}”; después va el verbo sin cambiar.`);
    return inContext('“Do not like” significa “no me gusta”: “do not” niega la preferencia.');
  }
  if (focus === 'in' && /\bin the (morning|afternoon|evening)\b/i.test(target)) return inContext('usamos “in” para las partes del día como “the morning” (la mañana).');
  if (focus === 'on' && /\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(target)) return inContext('usamos “on” antes de los días de la semana; “on Monday” significa “el lunes”.');
  if (/^(dollar|dollars)$/.test(focus)) return focus === 'dollar'
    ? 'Con “one” usamos “dollar” en singular: un dólar. Para más de uno, usamos “dollars”.'
    : 'Aquí hay más de un dólar, por eso usamos el plural “dollars”, con -s.';
  if (focus === 'some') return '“Some” expresa una cantidad sin contar unidades: “some water” es algo de agua; no usamos “a water” para esa cantidad.';
  if (!difference && /^(not|do not)$/.test(wrongDifference)) return `Aquí afirmamos “${correct}”; añadir “${wrongDifference}” lo niega y cambia el significado.`;
  if (/^(wants|needs|goes|want|need|go|work|works)$/.test(focus) && /^(want|need|go|work)/.test(wrongDifference)) {
    return inContext(`usamos “${focus}”: en presente, he/she/it lleva -s o -es; I/you/we/they usa la forma base.`);
  }
  const rules: Record<string, string> = {
    this: '“This” significa esto o esta cosa: se usa para algo cercano a quien habla.',
    that: '“That” significa eso o aquella cosa: se usa para algo más lejano de quien habla.',
    in: '“In” significa dentro de; “on” significa sobre una superficie y “under”, debajo.',
    on: '“On” significa sobre una superficie; “in” significa dentro y “under”, debajo.',
    under: '“Under” significa debajo de: el objeto está más abajo que la referencia.',
    'next to': '“Next to” significa al lado de: las dos cosas están una junto a la otra.',
    from: '“From” indica el lugar de origen: “from Mexico” significa “de México”.',
    what: '“What” pregunta qué es algo; “where” pregunta dónde está.',
    where: '“Where” pregunta dónde está algo; “what” pregunta qué es.',
    first: '“First” significa primero: introduce la acción que ocurre antes.',
    then: '“Then” significa después: introduce la acción que sigue.',
    and: '“And” significa y: une las dos personas, cosas o acciones.',
    old: 'La edad se expresa con “am/is/are” + número + “years old”. “Old” completa esa expresión.',
    much: '“How much is it?” pregunta cuánto cuesta. “Much” completa la pregunta por el precio.',
    please: '“Please” significa por favor: convierte el pedido en una petición cortés.',
    by: '“By” indica el medio de transporte: “by bus” significa en autobús.',
    at: 'Usamos “at” antes de una hora: “at eight” significa a las ocho.',
    near: '“Near” significa cerca de; “far from” significa lejos de. La distancia cambia el significado.',
    'far from': '“Far from” significa lejos de; “near” significa cerca de. La distancia cambia el significado.',
    to: /\blisten/i.test(before)
      ? '“Listen to” significa escuchar: en inglés necesitamos “to” antes de lo que escuchamos.'
      : 'Después de “want” usamos “to” antes de otro verbo: “want to listen” significa querer escuchar.',
  };
  if (rules[focus]) return inContext(rules[focus]);
  if (card.interaction_type === 'mission-word-parts') {
    return `“${labels.join('')}” se forma uniendo ${labels.map((label) => `“${label}”`).join(' + ')} en ese orden.`;
  }
  if (card.interaction_type === 'mission-sentence') {
    return `El orden es “${labels.join(' ')}”: primero de quién hablamos, luego lo que decimos de esa persona o grupo.`;
  }
  if (card.stage === 'Recognize' && normalized(card.prompt).startsWith('who ') && wrongOption) {
    const expectedIdentity = IDENTITY_CHOICE_LABELS[ids[slot]];
    const chosenIdentity = IDENTITY_CHOICE_LABELS[wrongOption.id];
    if (expectedIdentity && chosenIdentity) return `La imagen muestra ${expectedIdentity}, no ${chosenIdentity}.`;
  }
  if (normalized(correct).split(' ').sort().join(' ') === normalized(wrong).split(' ').sort().join(' ') && correct !== wrong) {
    return `El orden es “${correct}”: en este grupo de palabras, la cantidad va primero, luego el color y al final el objeto.`;
  }
  const irregularPlural: Record<string, string> = { children: 'child', babies: 'baby', feet: 'foot' };
  if (irregularPlural[focus] === wrongDifference) {
    return `“${focus}” significa ${meaning(focus)}: es el plural de “${wrongDifference}”; la opción elegida habla de uno solo.`;
  }
  const correctMeaning = meaning(focus);
  const wrongMeaning = meaning(wrongDifference);
  if (correctMeaning) {
    return wrongMeaning && wrongMeaning !== correctMeaning
      ? `Aquí “${focus}” significa ${correctMeaning}; “${wrongDifference}” significa ${wrongMeaning}.`
      : `Aquí corresponde “${focus}”, que significa ${correctMeaning}.`;
  }
  // Authored Spanish is the meaning of the target, not an invented visual cue.
  const translation = !/_{2,}|\[(blank|pausa)\]/i.test(card.spanish_translation || '') ? card.spanish_translation : meaning(target);
  return `La respuesta es “${target}”: ${(translation || meaning(correct)).replace(/[.]+$/, '')}.`;
}
