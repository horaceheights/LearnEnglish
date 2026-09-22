import type { LessonCard } from './types';
import { spanishTranslationFor } from './sentenceTranslations';
import { constructionMistakeHint, isOrderedCompletion } from './constructionTeaching';

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
  home: 'hogar', sofa: 'sofá', window: 'ventana', library: 'biblioteca', bank: 'banco',
  orange: 'naranja', pear: 'pera', cloudy: 'nublado', shoes: 'zapatos', skirt: 'falda',
  near: 'cerca', far: 'lejos', hello: 'hola', goodbye: 'adiós', morning: 'mañana',
  under: 'debajo', on: 'encima', in: 'dentro', yes: 'sí', no: 'no',
  monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves',
  friday: 'viernes', saturday: 'sábado', sunday: 'domingo',
  ana: 'Ana', luis: 'Luis', sofia: 'Sofía', diego: 'Diego',
  canada: 'Canadá', spain: 'España', american: 'estadounidense', canadian: 'canadiense',
  dressed: 'vestido', wake: 'despertarse',
  'thank you': 'gracias', 'here you are': 'aquí tienes',
  'good morning': 'buenos días', 'how much': 'cuánto cuesta',
  what: 'qué', where: 'dónde', who: 'quién',
  'next to': 'al lado de', 'far from': 'lejos de',
  'need': 'necesitar', 'needs': 'necesita', 'want': 'querer', 'wants': 'quiere',
  'can': 'puede', 'cannot': 'no puede',
  i: 'yo', you: 'tú', we: 'nosotros', they: 'ellos', he: 'él', she: 'ella',
  his: 'de él', her: 'de ella', your: 'tu', my: 'mi', us: 'Estados Unidos',
  cook: 'cocinero', brush: 'cepillar', wash: 'lavar',
  study: 'estudiar', goes: 'va', walks: 'camina', likes: 'le gusta',
  '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro', '5': 'cinco',
  '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve', '10': 'diez',
  mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves',
  fri: 'viernes', sat: 'sábado', sun: 'domingo',
  night: 'noche', pair: 'dos personas', only: 'sin girar', then: 'después',
  crossing: 'cruce', crosses: 'cruza', stops: 'se detiene',
  allowed: 'permitido', blocked: 'bloqueado', open: 'abierto',
  accepts: 'acepta', declines: 'rechaza', request: 'pedido', handoff: 'entrega',
  invites: 'invita', tv: 'televisión',
  rain: 'lluvia', next: 'al lado',
  asks: 'pregunta', slow: 'despacio', speech: 'habla',
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

const PERSON_PRONOUNS: Record<string, { meaning: string; scope: string }> = {
  he: { meaning: 'él', scope: 'solo del niño o del hombre' },
  she: { meaning: 'ella', scope: 'solo de la niña o de la mujer' },
  they: { meaning: 'ellos', scope: 'de dos o más personas' },
};

// Reviewed descriptions for image-only choices whose semantic IDs cannot be
// explained accurately by a single vocabulary contrast.
const IMAGE_CHOICE_MEANINGS: Record<string, string> = {
  'luis go work': 'Luis yendo al trabajo', 'luis work': 'Luis trabajando',
  'likes bananas': 'gusto por los plátanos', 'likes apples': 'gusto por las manzanas',
  'server hands drink': 'la entrega de una bebida',
  'learner requests drink': 'una petición de bebida',
  'crosses and stops at hospital': 'cruzar y detenerse en el hospital',
  'crosses and passes hospital': 'cruzar y pasar de largo el hospital',
  'pair cannot enter train station': 'dos personas que no pueden tomar el tren',
  'pair boards train': 'dos personas que suben al tren',
  'pair can go by bus': 'dos personas que pueden ir en autobús',
  'pair cannot go by bus': 'dos personas que no pueden ir en autobús',
  'gets attention': 'pedir atención con cortesía',
  'says goodbye': 'despedirse',
  'likes listening to music': 'gusto por escuchar música',
  'likes watching tv': 'gusto por ver televisión',
  'likes reading': 'gusto por leer', 'likes tv': 'gusto por ver televisión',
  'likes music': 'gusto por escuchar música', 'rejects tv': 'rechazo a ver televisión',
  'invites tv': 'una invitación a ver televisión',
  'invites music': 'una invitación a escuchar música',
  'invites reading': 'una invitación a leer',
  'invites playing': 'una invitación a jugar',
  'invites swimming': 'una invitación a nadar',
  'does not understand': 'alguien que no entiende',
  // Unit 5 review contrasts: each caption-free pair names what its picture shows.
  'likes fish': 'gusto por el pescado', 'dislikes fish': 'rechazo al pescado',
  'dislikes bananas': 'rechazo a los plátanos', 'dislikes milk': 'rechazo a la leche',
  'likes and needs': 'algo que gusta y se necesita', 'wants juice': 'querer jugo',
  'eggs breakfast': 'huevos en el desayuno', 'tea breakfast': 'té en el desayuno',
  'tea dinner': 'té en la cena', 'rice lunch': 'arroz en el almuerzo',
  'rice dinner': 'arroz en la cena', 'meals': 'el desayuno, el almuerzo y la cena',
  'three red apples': 'tres manzanas rojas', 'two red apples': 'dos manzanas rojas',
  'five oranges': 'cinco naranjas', 'fruit plate': 'un plato de fruta',
  'pair wants two eggs': 'dos personas que quieren dos huevos',
  'pair wants three eggs': 'dos personas que quieren tres huevos',
  'pair wants two apples': 'dos personas que quieren dos manzanas',
  'boy wants two eggs': 'un niño que quiere dos huevos',
  'price two dollars': 'un precio de dos dólares',
  'price four dollars': 'un precio de cuatro dólares',
  'seven dollars': 'un precio de siete dólares',
  'coffee five': 'un café de cinco dólares', 'coffee seven': 'un café de siete dólares',
  'cafe order': 'la entrega de un café', 'yes please': 'aceptar lo que ofrecen',
  'food and drinks': 'comida y bebidas', cafe: 'un café',
  understands: 'alguien que sí entiende',
};

// Reviewed, compact meanings for whole-sentence contrasts that cannot be
// reduced to one changed word. New generated pairs must extend this table or
// supply an equally specific teaching pattern; the course gate audits both.
const CHOICE_CONCEPTS: Record<string, string> = {
  'a strawberry': 'una fresa', grapes: 'uvas',
  'an adult': 'una persona adulta', 'a boy': 'un niño', 'a girl': 'una niña',
  'i am canadian': 'mi nacionalidad canadiense', 'i am from canada': 'mi origen en Canadá',
  'they are babies': 'varios bebés', 'he is a baby': 'un solo niño bebé',
  'she is a baby': 'una sola niña bebé',
  'i walk': 'caminar', 'i go by bike': 'ir en bicicleta',
  'yes': 'aceptar',
  'it is rainy i need an umbrella': 'lluvia y un paraguas',
  'do you want to read': 'una invitación a leer',
  'do you want to watch tv': 'una invitación a ver televisión',
  'i do not understand': 'que no entiendo',
  'i do not like music': 'que no me gusta la música',
  'can you help me': 'una petición de ayuda', 'coffee please': 'un pedido de café',
  'coffee please no thank you': 'café y un rechazo', 'coffee please thank you': 'café y agradecimiento',
  'cross the street': 'cruzar la calle', 'cross the street stop': 'cruzar la calle y detenerse',
  'go straight turn right': 'seguir recto y girar a la derecha',
  'go straight turn left': 'seguir recto y girar a la izquierda',
  'i cannot walk there': 'no poder caminar hasta allá',
  'stop': 'detenerse',
  'do you want to play sorry no': 'una invitación rechazada',
  'do you want to play yes thank you': 'una invitación aceptada',
  'excuse me': 'pedir atención con cortesía',
  'excuse me can you help me': 'pedir ayuda con cortesía',
  'excuse me i need help': 'decir que necesito ayuda',
  'goodbye my name is ana': 'despedirse y presentarse',
  'he is a brother': 'un hermano', 'he is not cooking': 'él no está cocinando',
  'he is studying': 'él está estudiando', 'he is the boy': 'el niño',
  'hello water please': 'saludar y pedir agua', 'here you are': 'entregar algo',
  'how are you': 'cómo está alguien', 'how much is it': 'el precio',
  'how old are you': 'la edad', 'i am eighteen years old': 'tener dieciocho años',
  'i am from mexico': 'ser de México', 'i do not like bread': 'que no me gusta el pan',
  'i drink tea for breakfast': 'beber té en el desayuno',
  'i eat bread for breakfast': 'comer pan en el desayuno',
  'i like rice': 'que me gusta el arroz', 'it is a book': 'un libro',
  'it is rainy at night': 'lluvia por la noche', 'it is rainy in the morning': 'lluvia por la mañana',
  'it is rainy i need boots': 'lluvia y botas', 'it is windy i need a jacket': 'viento y una chaqueta',
  'my name is ana': 'presentarme como Ana', 'my name is luis': 'presentarme como Luis',
  'no thank you': 'rechazar con cortesía', 'please repeat': 'pedir que repitan',
  'please speak slowly': 'pedir que hablen despacio',
  'she is a sister': 'una hermana', 'she is cooking': 'ella está cocinando',
  'she is not studying': 'ella no está estudiando', 'she is the girl': 'la niña',
  'sorry no': 'rechazar con una disculpa', 'sorry no thank you': 'rechazar y agradecer',
  'tea please': 'un pedido de té', 'thank you goodbye': 'agradecer y despedirse',
  'thank you here you are': 'agradecer y entregar algo',
  'that is her car': 'su auto, señalado de lejos',
  'that is his book': 'su libro, señalado de lejos',
  'the baby is sleeping': 'el bebé durmiendo', 'the boy': 'solo un niño',
  'the boy and the girl': 'el niño y la niña juntos',
  'the boy and the girl are running': 'el niño y la niña corriendo',
  'the boy and the girl are running they are running': 'dos niños corriendo',
  'the boy is eating he is eating': 'un niño comiendo',
  'the father is talking': 'el padre hablando', 'the girl': 'solo una niña',
  'the girl is writing': 'la niña escribiendo',
  'the girl is writing she is writing': 'una niña escribiendo',
  'the grandparents and the grandchildren are family': 'abuelos y nietos como familia',
  'the grandparents are sitting and talking': 'los abuelos sentados y hablando',
  'the man': 'un hombre', 'the man is reading he is reading': 'un hombre leyendo',
  'the parents and the children are a family': 'padres e hijos como familia',
  'the sister is playing': 'una hermana jugando', 'the sisters are playing': 'las hermanas jugando',
  'the train arrives at four in the afternoon': 'el tren llegando a las cuatro de la tarde',
  'the train leaves at four at night': 'el tren saliendo a las cuatro de la noche',
  'there are two bags under the table': 'dos bolsas debajo de la mesa',
  'there are two books under the table': 'dos libros debajo de la mesa',
  'there are two chairs in the dining room': 'dos sillas en el comedor',
  'there is a bed in the bedroom': 'una cama en el dormitorio',
  'they are a book': 'personas descritas como un libro',
  'they are brothers': 'varios hermanos', 'they are not sleeping': 'varias personas que no duermen',
  'they are sisters': 'varias hermanas', 'they are working': 'varias personas trabajando ahora',
  'they work every day': 'varias personas que trabajan a diario',
  'this is my book': 'mi libro, señalado de cerca',
  'this is the dining room': 'el comedor', 'this is the living room': 'la sala',
  'this is your car': 'tu auto, señalado de cerca',
  'we are talking': 'nosotros hablando ahora',
  'we study english every day': 'nosotros estudiando inglés a diario',
  'what is it': 'qué es un objeto', 'what is your job': 'cuál es tu trabajo',
  'what is your name': 'cómo te llamas',
  'what is your name my name is ana': 'preguntar el nombre y responder Ana',
  'where are you from': 'de dónde eres',
  'where is the bathroom': 'dónde está el baño',
  'where is the book': 'dónde está el libro',
  'where is the store': 'dónde está la tienda',
  'who is he': 'quién es él', 'who is she': 'quién es ella',
  'yes please': 'aceptar con cortesía', 'yes thank you': 'aceptar y agradecer',
  'thank you': 'agradecer',
};

function choiceConcept(text: string) {
  return CHOICE_CONCEPTS[normalized(text).replace(/[?.!,]/g, '')];
}

function sentenceChoiceContrast(card: LessonCard, correct: string, wrong: string): string {
  const expected = choiceConcept(correct);
  const selected = choiceConcept(wrong);
  if (!expected || !selected || expected === selected) return '';
  if (/^a2|^listen/.test(card.interaction_type || '')) {
    return `Tu opción dice “${selected}”; escuchas “${expected}”.`;
  }
  if (/^t2|image$/.test(card.interaction_type || '')) {
    return `La imagen elegida muestra “${selected}”; la frase pide “${expected}”.`;
  }
  return `Tu opción dice “${selected}”; la imagen muestra “${expected}”.`;
}

function grammarChoiceContrast(correct: string, wrong: string): string {
  const expected = normalized(correct);
  const selected = normalized(wrong);
  if (expected === 'it is a book' && selected === 'he is a book') {
    return '“He” se usa para personas; la imagen muestra un libro, por eso usamos “It”.';
  }
  if (expected === 'it is a book' && selected === 'they are a book') {
    return '“They” habla de personas; la imagen muestra un libro, por eso usamos “It”.';
  }
  if (/^first,/.test(expected) && /^then,/.test(selected)) {
    return '“Then” marca lo que pasa después; aquí es la primera acción, por eso usamos “First”.';
  }
  if (/^then,/.test(expected) && /^first,/.test(selected)) {
    return '“First” marca el inicio; aquí la acción viene después, por eso usamos “Then”.';
  }
  const [right, mistake] = contrast(correct, wrong);
  if (['this', 'that'].includes(right) && ['this', 'that'].includes(mistake)) {
    return `“${mistake}” señala algo ${mistake === 'this' ? 'cercano' : 'lejano'}; aquí está ${right === 'this' ? 'cerca' : 'lejos'}, por eso usamos “${right}”.`;
  }
  if (['am', 'is', 'are'].includes(right) && ['am', 'is', 'are'].includes(mistake)) {
    const subject = /\b(i|you|he|she|it|we|they|there)\s+(?:am|is|are)\b/i.exec(correct)?.[1] || '';
    if (subject) return `Con “${subject}” usamos “${right}”, no “${mistake}”.`;
  }
  if (['have', 'has'].includes(right) && ['have', 'has'].includes(mistake)) {
    const subject = /\b(i|you|he|she|it|we|they)\s+(?:have|has)\b/i.exec(correct)?.[1] || '';
    if (subject) return `Con “${subject}” usamos “${right}”, no “${mistake}”.`;
  }
  if (['can', 'cannot'].includes(right) && ['can', 'cannot'].includes(mistake)) {
    return `“${mistake}” significa “${mistake === 'can' ? 'puede' : 'no puede'}”; aquí ${right === 'can' ? 'sí puede' : 'no puede'}, por eso usamos “${right}”.`;
  }
  if ((right === 'do not' && !mistake) || (mistake === 'do not' && !right)) {
    return right ? 'Tu opción afirma que le gusta; “do not” indica que no le gusta.'
      : 'Tu opción dice que no le gusta; aquí sí le gusta.';
  }
  if (right === 'not' && !mistake) return 'Tu opción afirma la acción; “not” indica que aquí no ocurre.';
  if (mistake === 'not' && !right) return 'Tu opción niega la acción; aquí sí ocurre.';
  if (/^(want|wants|need|needs|go|goes|work|works)$/.test(right) && /^(want|wants|need|needs|go|goes|work|works)$/.test(mistake)) {
    if (right.replace(/(?:es|s)$/, '') === mistake.replace(/(?:es|s)$/, '')) {
      const subject = /\b(i|you|he|she|it|we|they)\s+(?:can\s+)?(?:want|wants|need|needs|go|goes|work|works)\b/i.exec(correct)?.[1] || '';
      if (/\bcan\b/i.test(correct)) return `Después de “can” va “${right}”, sin -s; “${mistake}” no va aquí.`;
      if (subject) return `Con “${subject}” usamos “${right}”, no “${mistake}”.`;
    }
  }
  if (right === 'we' && mistake === 'they') return '“They” excluye a quien habla; “We” lo incluye.';
  if (right === 'we' && mistake === 'you') return '“You” habla de la otra persona; “We” incluye a quien habla.';
  if (/^(in|on|under|next to|near|far from)$/.test(right) && /^(in|on|under|next to|near|far from)$/.test(mistake)) {
    const wanted = meaning(right);
    const chosen = meaning(mistake);
    if (wanted && chosen && wanted !== chosen) return `“${mistake}” significa ${chosen}; aquí el objeto está ${wanted}, por eso usamos “${right}”.`;
  }
  return '';
}

function pronounChoiceHint(correct: string, wrong: string, card: LessonCard): string {
  const expected = PERSON_PRONOUNS[normalized(correct)];
  const selected = PERSON_PRONOUNS[normalized(wrong)];
  if (!expected || !selected || expected === selected) return '';
  if (normalized(correct) === 'they') {
    // This reviewed image shows the two children introduced on the preceding card.
    const isReviewedPair = card.prompt_image_url === '/lesson-assets/they_boy_girl.webp';
    const scope = isReviewedPair && normalized(wrong) === 'he' ? 'solo del niño'
      : isReviewedPair && normalized(wrong) === 'she' ? 'solo de la niña' : selected.scope;
    const group = isReviewedPair ? 'dos niños' : 'dos o más personas';
    return `“${wrong}” habla ${scope}. Aquí aparecen ${group}, por eso usamos “${correct}” (“${expected.meaning}”).`;
  }
  return `“${wrong}” habla ${selected.scope}. Aquí hablamos ${expected.scope}, por eso usamos “${correct}” (“${expected.meaning}”).`;
}

/** Taught multi-word phrases whose alternatives have a different word count. */
const PHRASE_MEANINGS: Record<string, string> = {
  'in the morning': 'en la mañana', 'in the afternoon': 'en la tarde', 'at night': 'en la noche',
  'wake up': 'despertarme', 'wash my face': 'lavarme la cara', 'brush my teeth': 'lavarme los dientes',
  'get dressed': 'vestirme', 'eat breakfast': 'desayunar', 'go to school': 'ir a la escuela',
  'go to work': 'ir al trabajo', 'come home': 'regresar a casa', 'study english': 'estudiar inglés',
  'on the left': 'a la izquierda', 'on the right': 'a la derecha',
  'far from the park': 'lejos del parque', 'next to the store': 'al lado de la tienda',
  sleep: 'dormir', 'a pear': 'una pera', grapes: 'uvas', 'a strawberry': 'una fresa',
};

function phraseMeaning(text: string) {
  return PHRASE_MEANINGS[normalized(text)] || meaning(text);
}

function wordChoiceContrast(correct: string, wrong: string, isAudioChoice: boolean): string {
  if (!correct || !wrong || normalized(correct) === normalized(wrong)) return '';
  const correctWords = normalized(correct).replace(/[?.!,]/g, '').split(/\s+/);
  const wrongWords = normalized(wrong).replace(/[?.!,]/g, '').split(/\s+/);
  while (correctWords.length && wrongWords.length && correctWords[0] === wrongWords[0]) {
    correctWords.shift(); wrongWords.shift();
  }
  while (correctWords.length && wrongWords.length && correctWords[correctWords.length - 1] === wrongWords[wrongWords.length - 1]) {
    correctWords.pop(); wrongWords.pop();
  }
  if (!correctWords.length || !wrongWords.length) return '';
  if (correctWords.length !== wrongWords.length) {
    // The alternatives differ by a whole phrase, such as "in the morning" against "at night".
    const expectedPhrase = correctWords.join(' ');
    const selectedPhrase = wrongWords.join(' ');
    const expectedPhraseMeaning = phraseMeaning(expectedPhrase);
    const selectedPhraseMeaning = phraseMeaning(selectedPhrase);
    if (!expectedPhraseMeaning || !selectedPhraseMeaning || expectedPhraseMeaning === selectedPhraseMeaning) return '';
    const source = isAudioChoice ? 'la frase escuchada' : 'la imagen';
    return `“${selectedPhrase}” significa ${selectedPhraseMeaning}; ${source} corresponde a “${expectedPhrase}” (${expectedPhraseMeaning}).`;
  }
  const changes = correctWords.flatMap((word, index) => word === wrongWords[index] ? [] : [[word, wrongWords[index]]]);
  if (!changes.length) return '';
  const grammatical = new Set(['am', 'is', 'are', 'a', 'an', 'the', 'he', 'she', 'they', 'it', 'i', 'you', 'we', 'not']);
  const [expected, selected] = changes.find(([right, mistake]) => !grammatical.has(right) && !grammatical.has(mistake) && meaning(right) && meaning(mistake)) || changes[0];
  const expectedMeaning = meaning(expected);
  const selectedMeaning = meaning(selected);
  if (!expectedMeaning || !selectedMeaning || expectedMeaning === selectedMeaning) return '';
  const evidence = isAudioChoice ? 'La frase escuchada' : 'La imagen';
  return `“${selected}” significa ${selectedMeaning}; ${evidence.toLowerCase()} corresponde a “${expected}” (${expectedMeaning}).`;
}

/** Option IDs on caption-free image banks are authored semantic concepts, not media paths. */
function imageOptionConcept(id: string): string {
  const semantic = id.replace(/-\d+$/, '');
  const clock = /^clock(\d+)$/.exec(semantic);
  if (clock) return `clock ${clock[1]}`;
  if (/^n\d+$/.test(semantic)) {
    const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
      'eighteen', 'nineteen', 'twenty'];
    return numbers[Number(semantic.slice(1))] || '';
  }
  return semantic.replace(/-/g, ' ');
}

function imageChoiceContrast(card: LessonCard, correctId: string, wrongId: string): string {
  const correct = imageOptionConcept(correctId);
  const wrong = imageOptionConcept(wrongId);
  if (!correct || !wrong || correct === wrong) return '';
  if (IMAGE_CHOICE_MEANINGS[correct] && IMAGE_CHOICE_MEANINGS[wrong]) {
    const cue = /listen/i.test(card.stage) ? 'la frase escuchada' : 'la frase';
    return `Elegiste “${IMAGE_CHOICE_MEANINGS[wrong]}”; ${cue} pide “${IMAGE_CHOICE_MEANINGS[correct]}”.`;
  }
  const expected = correct.split(' ');
  const selected = wrong.split(' ');
  const difference = expected.find((word, index) => word !== selected[index] && meaning(word) && meaning(selected[index] || ''));
  const wrongDifference = selected[expected.indexOf(difference || '')];
  const extraExpected = expected.find(word => !selected.includes(word) && meaning(word));
  const extraWrong = selected.find(word => !expected.includes(word) && meaning(word));
  const evidenceWord = difference && wrongDifference ? difference : extraExpected;
  const mistakenWord = difference && wrongDifference ? wrongDifference : extraWrong;
  if (evidenceWord && mistakenWord && meaning(mistakenWord)) {
    const answer = /listen/i.test(card.stage) ? 'La frase escuchada' : 'La frase';
    return `La imagen elegida muestra “${mistakenWord}” (${meaning(mistakenWord)}); ${answer.toLowerCase()} pide “${evidenceWord}” (${meaning(evidenceWord)}).`;
  }
  const wrongMeaning = meaning(wrong);
  const correctMeaning = meaning(correct);
  if (wrongMeaning && correctMeaning && wrongMeaning !== correctMeaning) {
    return `La imagen elegida muestra ${wrongMeaning}; la frase pide ${correctMeaning}.`;
  }
  return '';
}

/** Teach the first mistaken slot, or the meaning that distinguishes the choices.
 * Prompt audio may be a question or contain blanks; it is never the answer source.
 */
export function lessonMistakeHint(card: LessonCard, selected?: string | string[] | null): string {
  const ids = card.correct_option_ids?.length ? card.correct_option_ids : [card.correct_option_id];
  const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : [];
  if (isOrderedCompletion(card)) return constructionMistakeHint(card, selectedIds);
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
  if (!correctOption?.label && !wrongOption?.label && correctOption?.image_url && wrongOption?.image_url) {
    const imageHint = imageChoiceContrast(card, correctOption.id, wrongOption.id);
    if (imageHint) return imageHint;
  }
  if (!isCompletion) {
    const pronounHint = pronounChoiceHint(correct, wrong, card);
    if (pronounHint) return pronounHint;
    if (!card.mission_game && wrong) {
      if (card.stage === 'Recognize' && normalized(card.prompt).startsWith('who ') && wrongOption) {
        const expectedIdentity = IDENTITY_CHOICE_LABELS[ids[slot]];
        const chosenIdentity = IDENTITY_CHOICE_LABELS[wrongOption.id];
        if (expectedIdentity && chosenIdentity) return `La imagen muestra ${expectedIdentity}, no ${chosenIdentity}.`;
      }
      if (normalized(correct).split(' ').sort().join(' ') === normalized(wrong).split(' ').sort().join(' ') && correct !== wrong) {
        return `El orden es “${correct}”: primero la cantidad, luego el color y al final el objeto.`;
      }
      const grammarContrast = grammarChoiceContrast(correct, wrong);
      if (grammarContrast) return grammarContrast;
      const preciseContrast = wordChoiceContrast(correct, wrong, /listen/i.test(card.stage));
      if (preciseContrast) return preciseContrast;
      const sentenceContrast = sentenceChoiceContrast(card, correct, wrong);
      if (sentenceContrast) return sentenceContrast;
    }
  }
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
    const next = target.match(/\b(?:a|an)\s+(\w+)/i)?.[1] || '';
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
      they: '“They” (ellos o ellas) se refiere a las personas juntas.',
      'they are': '“They” se refiere al grupo completo.',
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
  const irregularPlural: Record<string, string> = { children: 'child', babies: 'baby', feet: 'foot' };
  if (irregularPlural[focus] === wrongDifference) {
    return `“${focus}” significa ${meaning(focus)}: es el plural de “${wrongDifference}”; la opción elegida habla de uno solo.`;
  }
  const correctMeaning = meaning(focus);
  const wrongMeaning = meaning(wrongDifference);
  if (correctMeaning) {
    return wrongMeaning && wrongMeaning !== correctMeaning
      ? `“${wrongDifference}” significa ${wrongMeaning}; aquí corresponde “${focus}” (${correctMeaning}).`
      : `Aquí corresponde “${focus}”, que significa ${correctMeaning}.`;
  }
  // Authored Spanish is the meaning of the target, not an invented visual cue.
  const translation = !/_{2,}|\[(blank|pausa)\]/i.test(card.spanish_translation || '') ? card.spanish_translation : meaning(target);
  return `La respuesta es “${target}”: ${(translation || meaning(correct)).replace(/[.]+$/, '')}.`;
}
