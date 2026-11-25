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
const ACTIONS = set('tomando comiendo bebiendo leyendo escribiendo corriendo nadando durmiendo jugando estudiando trabajando cocinando hablando');
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

// Unit 4: home, where things are, hay, the morning, chores, days, time and months.
Object.assign(NOUN_KIND, {
  recámara: 'feminine singular', sala: 'feminine singular', cocina: 'feminine singular', baño: 'masculine singular',
  comedor: 'masculine singular', cama: 'feminine singular', camas: 'feminine plural', computadora: 'feminine singular',
  puerta: 'feminine singular', lámpara: 'feminine singular', lámparas: 'feminine plural', sofá: 'masculine singular',
  ventana: 'feminine singular', jardín: 'masculine singular', llave: 'feminine singular', inodoro: 'masculine singular',
  pared: 'feminine singular', departamento: 'masculine singular', piso: 'masculine singular', techo: 'masculine singular',
  escaleras: 'feminine plural', ropa: 'feminine singular', hogar: 'masculine singular', año: 'masculine singular',
  mes: 'masculine singular', semana: 'feminine singular', días: 'masculine plural', meses: 'masculine plural',
  desayuno: 'masculine singular', dientes: 'masculine plural', cara: 'feminine singular', cumpleaños: 'masculine singular',
  mañana: 'feminine singular', tarde: 'feminine singular', noche: 'feminine singular', amigos: 'masculine plural',
  fin: 'masculine singular',
});
for (const number of ['once', 'doce']) NUMBER_WORDS.add(number);
// Present tense: the ending says who does it.
const PRESENT_FORMS: [string, string, string[]][] = [
  ['abr', 'open', ['abro', 'abres', 'abre', 'abrimos', 'abren']], ['cerr', 'close', ['cierro', 'cierras', 'cierra', 'cerramos', 'cierran']],
  ['limpi', 'clean', ['limpio', 'limpias', 'limpia', 'limpiamos', 'limpian']], ['lav', 'wash', ['lavo', 'lavas', 'lava', 'lavamos', 'lavan']],
  ['us', 'use', ['uso', 'usas', 'usa', 'usamos', 'usan']], ['ven', 'come', ['vengo', 'vienes', 'viene', 'venimos', 'vienen']],
  ['encontr', 'find', ['encuentro', 'encuentras', 'encuentra', 'encontramos', 'encuentran']],
  ['hac', 'make', ['hago', 'haces', 'hace', 'hacemos', 'hacen']], ['v', 'see', ['veo', 'ves', 've', 'vemos', 'ven']],
  ['desayun', 'eat breakfast', ['desayuno', 'desayunas', 'desayuna', 'desayunamos', 'desayunan']],
  ['ir', 'go', ['voy', 'vas', 'va', 'vamos', 'van']], ['jug', 'play', ['juego', 'juegas', 'juega', 'jugamos', 'juegan']],
  ['corr', 'run', ['corro', 'corres', 'corre', 'corremos', 'corren']], ['estudi', 'study', ['estudio', 'estudias', 'estudia', 'estudiamos', 'estudian']],
  ['trabaj', 'work', ['trabajo', 'trabajas', 'trabaja', 'trabajamos', 'trabajan']], ['d', 'give', ['doy', 'das', 'da', 'damos', 'dan']],
];
const PRESENT = new Set<string>();
const registerPresent = () => {
  for (const [, english, forms] of PRESENT_FORMS) {
    forms.forEach((form, at) => {
      const person = PERSONS[at] || '';
      PRESENT.add(form);
      if (!VERB_PERSON[form]) VERB_PERSON[form] = person;
      if (!VERB_ENGLISH[form]) VERB_ENGLISH[form] = `${WHO_ENGLISH[person]} ${person === '3s' ? english.replace(/^(\w+)/, (verb: string) => (verb === 'go' ? 'goes' : /[^aeiou]y$/.test(verb) ? `${verb.slice(0, -1)}ies` : /(sh|ch|ss|x)$/.test(verb) ? `${verb}es` : `${verb}s`)) : english}`;
    });
  }
};
const PERSONS = ['1s', '2s', '3s', '1p', '3p'];
const WHO_ENGLISH: Record<string, string> = { '1s': 'I', '2s': 'you', '3s': 'he or she', '1p': 'we', '3p': 'they' };
// Reflexive morning verbs: me + verb (me despierto, me visto, me lavo, me cepillo).
const REFLEXIVE: Record<string, string> = { despierto: 'wake up', visto: 'get dressed', lavo: 'wash', cepillo: 'brush' };
const SEQUENCE: Record<string, string> = { primero: 'First', luego: 'Then', después: 'After that' };
const DAYS = set('lunes martes miércoles jueves viernes sábado domingo');
const MONTHS = set('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre');
const HOURS = set('una dos tres cuatro cinco seis siete ocho nueve diez once doce');
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
FIXED_QUESTIONS['qué día es hoy'] = ['“Qué” (what) starts the question.', '“día” (day) comes right after “Qué”.', '“es” comes after “Qué día”.', '“hoy” (today) ends the question.'];
FIXED_QUESTIONS['qué hora es'] = ['“Qué” (what) starts the question.', '“hora” (time, hour) comes right after “Qué”.', '“es” ends it: Spanish asks “what hour is it”.'];

// Unit 5: food and drinks, gustar, quantities, prices and ordering.
Object.assign(NOUN_KIND, {
  plátano: 'masculine singular', plátanos: 'masculine plural', pera: 'feminine singular', peras: 'feminine plural',
  fresa: 'feminine singular', fresas: 'feminine plural', manzana: 'feminine singular', manzanas: 'feminine plural',
  naranja: 'feminine singular', naranjas: 'feminine plural', uvas: 'feminine plural', huevo: 'masculine singular',
  huevos: 'masculine plural', papa: 'feminine singular', tomate: 'masculine singular', sándwich: 'masculine singular',
  pastel: 'masculine singular', botella: 'feminine singular', taza: 'feminine singular', vaso: 'masculine singular',
  plato: 'masculine singular', bebidas: 'feminine plural', verduras: 'feminine plural', dólar: 'masculine singular',
  dólares: 'masculine plural', precio: 'masculine singular', almuerzo: 'masculine singular', cena: 'feminine singular',
  pan: 'masculine singular', pollo: 'masculine singular', pescado: 'masculine singular', arroz: 'masculine singular',
  café: 'masculine singular', leche: 'feminine singular', té: 'masculine singular', jugo: 'masculine singular',
  agua: 'feminine singular', fruta: 'feminine singular', comida: 'feminine singular', queso: 'masculine singular',
  carne: 'feminine singular', ensalada: 'feminine singular', sopa: 'feminine singular', sal: 'feminine singular',
  azúcar: 'masculine singular', dinero: 'masculine singular',
});
// Foods and drinks you do not count: no article after a verb (Tomo café) or after "un poco de".
const MASS = set('pan pollo pescado arroz café leche té jugo agua fruta comida queso carne ensalada sopa sal azúcar dinero');
for (const stem of ['barat', 'car']) {
  Object.assign(ADJECTIVE_KIND, {
    [`${stem}o`]: 'masculine singular', [`${stem}a`]: 'feminine singular', [`${stem}os`]: 'masculine plural', [`${stem}as`]: 'feminine plural',
  });
}
for (const number of ['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa', 'cien']) {
  NUMBER_WORDS.add(number);
  NUMBER_NAMES.add(number);
}
PRESENT_FORMS.push(
  ['com', 'eat', ['como', 'comes', 'come', 'comemos', 'comen']], ['tom', 'drink', ['tomo', 'tomas', 'toma', 'tomamos', 'toman']],
  ['necesit', 'need', ['necesito', 'necesitas', 'necesita', 'necesitamos', 'necesitan']],
  ['quer', 'want', ['quiero', 'quieres', 'quiere', 'queremos', 'quieren']], ['compr', 'buy', ['compro', 'compras', 'compra', 'compramos', 'compran']],
  ['pag', 'pay', ['pago', 'pagas', 'paga', 'pagamos', 'pagan']], ['cost', 'cost', ['cuesto', 'cuestas', 'cuesta', 'costamos', 'cuestan']],
  ['almorz', 'eat lunch', ['almuerzo', 'almuerzas', 'almuerza', 'almorzamos', 'almuerzan']],
);
registerPresent();

// Unit 6: places in town, travel, where places are, directions, poder and timetables.
Object.assign(NOUN_KIND, {
  banco: 'masculine singular', biblioteca: 'feminine singular', plaza: 'feminine singular', farmacia: 'feminine singular',
  estación: 'feminine singular', supermercado: 'masculine singular', parada: 'feminine singular', hotel: 'masculine singular',
  cine: 'masculine singular', museo: 'masculine singular', correo: 'masculine singular', aeropuerto: 'masculine singular',
  esquina: 'feminine singular', edificio: 'masculine singular', ciudad: 'feminine singular', mapa: 'masculine singular',
  mercado: 'masculine singular', carretera: 'feminine singular', pueblo: 'masculine singular', boleto: 'masculine singular',
  taxi: 'masculine singular', tren: 'masculine singular', avión: 'masculine singular', barco: 'masculine singular',
});
PRESENT_FORMS.push(
  ['camin', 'walk', ['camino', 'caminas', 'camina', 'caminamos', 'caminan']], ['sal', 'leave', ['salgo', 'sales', 'sale', 'salimos', 'salen']],
  ['lleg', 'arrive', ['llego', 'llegas', 'llega', 'llegamos', 'llegan']], ['manej', 'drive', ['manejo', 'manejas', 'maneja', 'manejamos', 'manejan']],
  ['visit', 'visit', ['visito', 'visitas', 'visita', 'visitamos', 'visitan']],
);
registerPresent();
// subirse / bajarse: me subo al autobús, nos bajamos del barco, se suben al tren.
const GET_ON_OFF: Record<string, [string, string, string]> = {
  subo: ['me', 'get on', 'al'], subimos: ['nos', 'get on', 'al'], suben: ['se', 'get on', 'al'],
  bajo: ['me', 'get off', 'del'], bajamos: ['nos', 'get off', 'del'], bajan: ['se', 'get off', 'del'],
};
// Directions with tú: the command form ends the way “tú” verbs end without the -s.
const COMMANDS: Record<string, string> = { dobla: 'turn', sigue: 'keep going', cruza: 'cross', para: 'stop', pasa: 'go past', toma: 'take' };
const VEHICLES = set('autobús taxi tren avión barco carro');
const PODER: Record<string, string> = { puedo: 'I can', puedes: 'you can', pueden: 'they can' };
const INFINITIVES: Record<string, string> = { cruzar: 'cross', ir: 'go', ayudar: 'help' };
Object.assign(FIXED_QUESTIONS, {
  disculpa: ['“Disculpa” (excuse me) is how you start talking to someone you do not know.'],
  'me puedes ayudar': ['“Me” (me) comes before the verb.', '“puedes” (you can) comes right after “Me”.', '“ayudar” (help) ends it: “¿Me puedes ayudar?” is “Can you help me?”.'],
  'lo siento': ['“Lo” starts “Lo siento” (I am sorry).', '“siento” ends “Lo siento”.'],
  'sigue derecho': ['“Sigue” (keep going, tú) starts the direction.', '“derecho” (straight) comes right after “Sigue”.'],
});
// gustar: what is liked is the subject, so gusta goes with one thing and gustan with more than one.
const GUSTAR_WHO: Record<string, string> = { me: 'I like', te: 'you like', le: 'he or she likes', les: 'they like' };
// Courtesy phrases: each word in order, with what it does.
Object.assign(FIXED_QUESTIONS, {
  hola: ['“Hola” (hello) is a greeting on its own.'],
  gracias: ['“Gracias” (thank you) is one word in Spanish.'],
  'muchas gracias': ['“Muchas” (many) comes first: Spanish says “many thanks”.', '“gracias” (thanks) comes right after “Muchas”.'],
  'por favor': ['“por” starts “por favor” (please).', '“favor” ends “por favor”.'],
  'aquí tiene': ['“Aquí” (here) comes first.', '“tiene” (you have, with usted) comes after “Aquí”: “Aquí tiene” is “Here you are”.'],
  'a mí también': ['“A” starts “A mí”: with gustar, Spanish agrees with “a mí” (to me).', '“mí” comes right after “A”.', '“también” (too) ends it: “A mí también” is “Me too”.'],
  'a mí tampoco': ['“A” starts “A mí”: with gustar, Spanish agrees with “a mí” (to me).', '“mí” comes right after “A”.', '“tampoco” (neither) ends it: “A mí tampoco” is “Me neither”.'],
  'en qué le puedo ayudar': ['“En” starts the question.', '“qué” (what) comes right after “En”.', '“le” (you, with usted) comes before the verb.', '“puedo” (I can) comes after “le”.', '“ayudar” (help) ends it: “¿En qué le puedo ayudar?” is “How can I help you?”.'],
});

// Unit 7: the body, feelings, clothes, weather, free time, invitations, repair phrases,
// seasons, outdoors, animals, sports and music.
Object.assign(NOUN_KIND, {
  cabeza: 'feminine singular', ojos: 'masculine plural', orejas: 'feminine plural', nariz: 'feminine singular',
  boca: 'feminine singular', brazos: 'masculine plural', manos: 'feminine plural', dedos: 'masculine plural',
  piernas: 'feminine plural', pies: 'masculine plural',
  camisa: 'feminine singular', pantalones: 'masculine plural', vestido: 'masculine singular', falda: 'feminine singular',
  chamarra: 'feminine singular', sombrero: 'masculine singular', calcetines: 'masculine plural', zapatos: 'masculine plural',
  abrigo: 'masculine singular', suéter: 'masculine singular', bufanda: 'feminine singular', guantes: 'masculine plural',
  paraguas: 'masculine singular', botas: 'feminine plural', shorts: 'masculine plural',
  día: 'masculine singular', sol: 'masculine singular', lluvia: 'feminine singular', nieve: 'feminine singular',
  árbol: 'masculine singular', flor: 'feminine singular', río: 'masculine singular', montaña: 'feminine singular',
  lago: 'masculine singular', playa: 'feminine singular', mar: 'masculine singular', cielo: 'masculine singular',
  vaca: 'feminine singular', caballo: 'masculine singular', oveja: 'feminine singular', cerdo: 'masculine singular',
  león: 'masculine singular', elefante: 'masculine singular', serpiente: 'feminine singular', mono: 'masculine singular',
  deporte: 'masculine singular', pelota: 'feminine singular', equipo: 'masculine singular', partido: 'masculine singular',
  canción: 'feminine singular', guitarra: 'feminine singular', tenis: 'masculine singular', tele: 'feminine singular',
  ayuda: 'feminine singular', fotos: 'feminine plural',
});
Object.assign(ADJECTIVE_KIND, { frío: 'masculine singular', fría: 'feminine singular', fríos: 'masculine plural', frías: 'feminine plural' });
PRESENT_FORMS.push(
  ['cant', 'sing', ['canto', 'cantas', 'canta', 'cantamos', 'cantan']], ['habl', 'speak', ['hablo', 'hablas', 'habla', 'hablamos', 'hablan']],
  ['entend', 'understand', ['entiendo', 'entiendes', 'entiende', 'entendemos', 'entienden']],
);
registerPresent();
// How someone feels uses estar; -o/-a feelings match the person, the others never change.
const FEELINGS: Record<string, [string, string]> = {
  feliz: ['happy', 'any'], triste: ['sad', 'any'], bien: ['fine', 'any'],
  cansado: ['tired', 'masculine singular'], cansada: ['tired', 'feminine singular'],
  enfermo: ['sick', 'masculine singular'], enferma: ['sick', 'feminine singular'],
  enojado: ['angry', 'masculine singular'], enojada: ['angry', 'feminine singular'],
};
// Hunger, thirst and fear use tener + a noun: tengo hambre, “I have hunger”.
const TENER_FEELINGS: Record<string, string> = { hambre: 'hungry', sed: 'thirsty', miedo: 'afraid' };
// Weather: hace + sol/viento/frío/calor; está + nublado/lloviendo/templado.
const HACE_WEATHER: Record<string, string> = { sol: 'sunny', viento: 'windy', frío: 'cold', calor: 'hot' };
const HACE_LITERAL: Record<string, string> = { sol: 'sun', viento: 'wind', frío: 'cold', calor: 'heat' };
const ESTA_WEATHER: Record<string, string> = { nublado: 'cloudy', lloviendo: 'raining', templado: 'warm' };
const SEASONS = set('primavera verano otoño invierno');
const SPORTS = set('fútbol tenis');
// Activities in their -r form, with the words that complete them.
const ACTIVITIES: Record<string, [string[], string][]> = {
  ver: [[['la', 'tele'], 'watch TV']], escuchar: [[['música'], 'listen to music']], bailar: [[[], 'dance']],
  dibujar: [[[], 'draw']], pintar: [[[], 'paint']], andar: [[['en', 'bicicleta'], 'ride a bike']],
  tomar: [[['fotos'], 'take photos']], jugar: [[['fútbol'], 'play football'], [['tenis'], 'play tennis']],
  leer: [[[], 'read']], cantar: [[[], 'sing']],
};
const QUERER = set('quiero quieres quiere queremos quieren');
Object.assign(FIXED_QUESTIONS, {
  'qué tiempo hace hoy': ['“Qué” (what) starts the question.', '“tiempo” (weather) comes right after “Qué”.', '“hace” comes after “Qué tiempo”: Spanish asks what weather it makes.', '“hoy” (today) ends the question.'],
  'está bien': ['“Está” starts “Está bien” (OK).', '“bien” (well, fine) ends it: “Está bien” is “OK”.'],
  'no entiendo': ['“No” goes right before the verb.', '“entiendo” (I understand) comes right after “No”: “No entiendo” is “I do not understand”.'],
  repite: ['“Repite” (repeat, tú) asks someone to say it again.'],
  'hablas rápido': ['“Hablas” (you speak) starts the sentence; Spanish leaves out “tú”.', '“rápido” (fast) comes after the verb.'],
  'habla despacio': ['“Habla” (speak, tú) tells someone what to do, so it comes first.', '“despacio” (slowly) comes right after “Habla”.'],
});

// Spanish A1+ Unit 1: what people look like, family, habits, how often, pets and “con”.
Object.assign(NOUN_KIND, {
  mamá: 'feminine singular', papá: 'masculine singular', tía: 'feminine singular', tío: 'masculine singular',
  primo: 'masculine singular', prima: 'feminine singular', amigo: 'masculine singular', pelo: 'masculine singular',
  barba: 'feminine singular',
});
for (const stem of ['alt', 'baj', 'larg']) {
  Object.assign(ADJECTIVE_KIND, {
    [`${stem}o`]: 'masculine singular', [`${stem}a`]: 'feminine singular', [`${stem}os`]: 'masculine plural', [`${stem}as`]: 'feminine plural',
  });
}
for (const [one, many] of [['mayor', 'mayores'], ['menor', 'menores'], ['joven', 'jóvenes']]) {
  ADJECTIVE_KIND[one] = 'singular';
  ADJECTIVE_KIND[many] = 'plural';
}
PRESENT_FORMS.push(
  ['le', 'read', ['leo', 'lees', 'lee', 'leemos', 'leen']], ['escrib', 'write', ['escribo', 'escribes', 'escribe', 'escribimos', 'escriben']],
  ['nad', 'swim', ['nado', 'nadas', 'nada', 'nadamos', 'nadan']], ['viv', 'live', ['vivo', 'vives', 'vive', 'vivimos', 'viven']],
  ['cocin', 'cook', ['cocino', 'cocinas', 'cocina', 'cocinamos', 'cocinan']],
  ['cen', 'eat dinner', ['ceno', 'cenas', 'cena', 'cenamos', 'cenan']], ['bail', 'dance', ['bailo', 'bailas', 'baila', 'bailamos', 'bailan']],
);
registerPresent();
// A name is who the sentence is about; its gender is the person's.
const NAME_KIND: Record<string, string> = {
  ana: 'feminine singular', sofía: 'feminine singular', luis: 'masculine singular', diego: 'masculine singular',
};
const PET_NAMES = set('max luna rio coco toby');
// How often: one word (or “a veces”) right before the verb.
const FREQUENCY: Record<string, string> = { siempre: 'always', normalmente: 'usually', nunca: 'never' };
// After “con” (with), Spanish uses the same words as for who does it: con él is “with him”.
const WITH_ENGLISH: Record<string, string> = { él: 'him', ella: 'her', ellos: 'them', ellas: 'them' };
const PEOPLE = set('hombre mujer niño niña persona');
Object.assign(FIXED_QUESTIONS, {
  'cuántos hermanos y hermanas tienes': ['“Cuántos” (how many) starts the question and matches “hermanos”.', '“hermanos” (brothers) comes right after “Cuántos”.',
    '“y” (and) joins “hermanos” and “hermanas”.', '“hermanas” (sisters) comes after “y”.', '“tienes” (you have) ends the question.'],
  'cómo se llama': ['“Cómo” (how) starts the question.', '“se” comes before the verb: Spanish asks how it is called.', '“llama” ends it: “¿Cómo se llama?” asks a name.'],
  'cómo se llama él': ['“Cómo” (how) starts the question.', '“se” comes before the verb: Spanish asks how he is called.', '“llama” comes after “se”.', '“él” comes last in the question.'],
});

// Spanish A1+ Unit 2: places and things, floors, favorite colors, plurals, “the red ones”, comparisons,
// classroom commands, light and dark colors.
Object.assign(UNIT2_NOUNS, {
  gimnasio: 'masculine singular', alberca: 'feminine singular', oficina: 'feminine singular', trabajo: 'masculine singular',
  reloj: 'masculine singular', relojes: 'masculine plural', cámara: 'feminine singular', cartera: 'feminine singular',
  audífonos: 'masculine plural', autobuses: 'masculine plural', pupitre: 'masculine singular', color: 'masculine singular',
});
Object.assign(NOUN_KIND, UNIT2_NOUNS, { hombres: 'masculine plural', mujeres: 'feminine plural' });
VEHICLES.add('bicicleta');
// Ordinals go before the noun and match it; before a masculine singular noun
// primero and tercero drop their -o (el primer piso, el tercer piso).
const ORDINAL_KIND: Record<string, [string, string]> = { primer: ['first', 'masculine singular'], tercer: ['third', 'masculine singular'] };
for (const [stem, english] of [['primer', 'first'], ['segund', 'second'], ['tercer', 'third'], ['cuart', 'fourth'], ['quint', 'fifth'],
  ['sext', 'sixth'], ['séptim', 'seventh'], ['octav', 'eighth'], ['noven', 'ninth'], ['décim', 'tenth']]) {
  if (!ORDINAL_KIND[`${stem}o`]) ORDINAL_KIND[`${stem}o`] = [english, ['primer', 'tercer'].includes(stem) ? '' : 'masculine singular'];
  ORDINAL_KIND[`${stem}a`] = [english, 'feminine singular'];
}
Object.assign(ADJECTIVE_KIND, {
  favorito: 'masculine singular', favorita: 'feminine singular', favoritos: 'masculine plural', favoritas: 'feminine plural',
});
// Colors; claro (light) and oscuro (dark) follow the color, which then keeps its el form: una bolsa azul claro.
const COLORS = new Set<string>(['azul', 'azules', 'verde', 'verdes', 'gris', 'grises', 'café', 'cafés', 'rosa', 'rosas']);
for (const stem of ['roj', 'amarill', 'negr', 'blanc', 'morad']) for (const end of ['o', 'a', 'os', 'as']) COLORS.add(`${stem}${end}`);
const SHADES: Record<string, string> = { claro: 'light', oscuro: 'dark' };
const COLOR_ENGLISH: [string, string][] = [['roj', 'red'], ['amarill', 'yellow'], ['negr', 'black'], ['blanc', 'white'], ['morad', 'purple'],
  ['azul', 'blue'], ['verde', 'green'], ['gris', 'gray'], ['café', 'brown'], ['rosa', 'pink']];
const colorEnglish = (word: string) => COLOR_ENGLISH.find(([stem]) => key(word).startsWith(stem))?.[1] || '';
// Plurals: a word ending in a vowel adds -s, one ending in a consonant adds -es.
const SINGULAR_OF: Record<string, string> = { autobuses: 'autobús', relojes: 'reloj', mujeres: 'mujer', hombres: 'hombre' };
const pluralNote = (word: string) => {
  const one = SINGULAR_OF[key(word)];
  if (!one) return '';
  return /[aeiouáéíóú]$/.test(one) ? ` It is ${quote(one)} + -s.` : ` ${quote(one)} ends in a consonant, so it adds -es${one === 'autobús' ? ' and drops the accent' : ''}.`;
};
// “Don’t” commands with tú use a different form from the plain command (come → no comas).
const NEGATIVE_COMMANDS: Record<string, [string, string]> = { comas: ['eat', 'come'], uses: ['use', 'usa'], escribas: ['write', 'escribe'] };
Object.assign(FIXED_QUESTIONS, {
  'cuál es tu color favorito': ['“Cuál” (which, what) starts the question.', '“es” comes right after “Cuál”.', '“tu” (your) goes right before “color”.',
    '“color” comes right after “tu”.', '“favorito” (favorite) comes after “color”: Spanish puts it after the noun.'],
  'cuáles quieres': ['“Cuáles” (which ones) starts the question; it is plural, for more than one thing.', '“quieres” (you want) comes right after “Cuáles”.'],
  siéntate: ['“Siéntate” (sit down) is one word: “te” (yourself) is joined to the end of the command.'],
  levántate: ['“Levántate” (stand up) is one word: “te” (yourself) is joined to the end of the command.'],
});

type Relation = { start: number; end: number; explanation: string };
type ClausePlan = { explanations: string[]; relations: Relation[]; supported: boolean };

function teachClause(text: string): ClausePlan {
  const tokens = spanishWords(text);
  const explanations: string[] = tokens.map(() => '');
  const relations: Relation[] = [];
  let index = 0;
  const toes = () => {
    // dedos de los pies: toes are “fingers of the feet”.
    if (key(tokens[index - 1] || '') !== 'dedos' || key(tokens[index] || '') !== 'de' || key(tokens[index + 1] || '') !== 'los' || key(tokens[index + 2] || '') !== 'pies') return false;
    explanations[index] = '“de” follows “dedos”: “dedos de los pies” (toes) is “fingers of the feet”.';
    explanations[index + 1] = '“los” is the article for “pies”.';
    explanations[index + 2] = '“pies” (feet) ends “dedos de los pies”.';
    index += 3;
    return true;
  };
  const dayPhrase = () => {
    // el sábado: “el” before a day means “on”.
    if (key(tokens[index] || '') !== 'el' || !DAYS.has(key(tokens[index + 1] || ''))) return false;
    explanations[index] = '“el” before a day means “on”: “el sábado” is “on Saturday”.';
    explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the day; Spanish days have no capital letter.`;
    index += 2;
    return true;
  };
  const activity = () => {
    // ver la tele, jugar fútbol, bailar: the -r form names the activity.
    const at = index;
    const choices = ACTIVITIES[key(tokens[at] || '')];
    const found = choices?.find(([tail]) => tail.every((word, i) => key(tokens[at + 1 + i] || '') === word));
    if (!found) return '';
    const [tail, english] = found;
    explanations[at] = `${quote(tokens[at] || '')} is the -r form, the way Spanish names an activity.`;
    tail.forEach((_, i) => { explanations[at + 1 + i] = `${quote(tokens[at + 1 + i] || '')} completes ${quote(tokens.slice(at, at + 1 + tail.length).join(' '))} (${english}).`; });
    index = at + 1 + tail.length;
    relations.push({ start: at, end: index, explanation: `${quote(tokens.slice(at, index).join(' '))} is “${english}”.` });
    return tokens.slice(at, index).join(' ');
  };
  const shadeOf = (colorAt: number, kind: string) => {
    // azul claro, verde oscuro: 0 = no shade, 1 = a shade that fits, -1 = a shade on the wrong form.
    const shade = key(tokens[colorAt + 1] || '');
    if (!SHADES[shade] || !COLORS.has(key(tokens[colorAt] || ''))) return 0;
    const form = ADJECTIVE_KIND[key(tokens[colorAt] || '')];
    if ((form !== 'singular' && form !== 'masculine singular') || !kind.endsWith('singular')) return -1;
    explanations[colorAt + 1] = `${quote(tokens[colorAt + 1] || '')} (${SHADES[shade]}) comes right after ${quote(tokens[colorAt] || '')} and never changes its ending.`;
    return 1;
  };
  const shadedNote = (color: string) => ADJECTIVE_KIND[key(color)] === 'singular'
    ? `${quote(color)} stays as it is: with “claro” or “oscuro” after it, the color never changes.`
    : `${quote(color)} keeps its el form: with “claro” or “oscuro” after it, the color does not change, even for a la word.`;
  const colorName = () => {
    // el morado, el verde oscuro: a color named on its own is an el word.
    const color = tokens[index + 1] || '';
    const form = ADJECTIVE_KIND[key(color)];
    if (key(tokens[index] || '') !== 'el' || !COLORS.has(key(color)) || (form !== 'singular' && form !== 'masculine singular')) return '';
    explanations[index] = `“el” comes before ${quote(color)}: a color named on its own is an el word.`;
    explanations[index + 1] = `${quote(color)} (${colorEnglish(color)}) is the color, named right after “el”.`;
    const shaded = shadeOf(index + 1, 'masculine singular');
    if (shaded < 0) return '';
    index += 2 + shaded;
    return tokens.slice(index - 2 - shaded, index).join(' ');
  };
  const nounPhrase = () => {
    const article = tokens[index] || '';
    const noun = tokens[index + 1] || '';
    if (['buen', 'mal'].includes(key(noun)) && ARTICLE_KIND[key(article)] === 'masculine singular' && NOUN_KIND[key(tokens[index + 2] || '')] === 'masculine singular') {
      // un buen día, un mal día: buen and mal go before the noun.
      explanations[index] = `${quote(article)} is the article for ${quote(tokens[index + 2] || '')}, so it comes first.`;
      explanations[index + 1] = `${quote(noun)} (${key(noun) === 'buen' ? 'good' : 'bad'}) comes before the noun: Spanish says ${quote(`${key(noun)} día`)}.`;
      explanations[index + 2] = `${quote(tokens[index + 2] || '')} comes right after ${quote(noun)}.`;
      relations.push({ start: index, end: index + 3, explanation: `${quote(tokens.slice(index, index + 3).join(' '))}: “buen” and “mal” go before the noun.` });
      index += 3;
      return { text: tokens.slice(index - 3, index).join(' '), plural: false, kind: 'masculine singular' };
    }
    if (key(noun) === 'siguiente' && ARTICLE_KIND[key(article)] === NOUN_KIND[key(tokens[index + 2] || '')]) {
      // la siguiente parada: “siguiente” (next) goes before the noun.
      explanations[index] = `${quote(article)} is the article for ${quote(tokens[index + 2] || '')}, so it comes first.`;
      explanations[index + 1] = '“siguiente” (next) comes before the noun, right after the article.';
      explanations[index + 2] = `${quote(tokens[index + 2] || '')} comes right after “siguiente”.`;
      relations.push({ start: index, end: index + 3, explanation: `${quote(tokens.slice(index, index + 3).join(' '))}: Spanish puts “siguiente” before the noun.` });
      const kind = NOUN_KIND[key(tokens[index + 2] || '')];
      index += 3;
      return { text: tokens.slice(index - 3, index).join(' '), plural: kind.endsWith('plural'), kind };
    }
    if (ORDINAL_KIND[key(noun)]) {
      // el segundo piso, la quinta casa: the ordinal goes between the article and the noun and matches them.
      const [english, ordinalKind] = ORDINAL_KIND[key(noun)];
      const thing = tokens[index + 2] || '';
      const kind = NOUN_KIND[key(thing)] || '';
      if (!ordinalKind || ARTICLE_KIND[key(article)] !== kind || ordinalKind !== kind) return null;
      explanations[index] = `${quote(article)} is the article for ${quote(thing)}, so it comes first.`;
      explanations[index + 1] = ['primer', 'tercer'].includes(key(noun))
        ? `${quote(noun)} (${english}) goes before ${quote(thing)}; before an el word Spanish drops the -o of “${key(noun)}o”.`
        : `${quote(noun)} (${english}) goes before ${quote(thing)}, right after the article, and matches it.`;
      explanations[index + 2] = `${quote(thing)} comes right after ${quote(noun)}.`;
      relations.push({ start: index, end: index + 3, explanation: `${quote(tokens.slice(index, index + 3).join(' '))}: the number word comes before the noun.` });
      index += 3;
      return { text: tokens.slice(index - 3, index).join(' '), plural: false, kind };
    }
    if (!ARTICLE_KIND[key(article)] || ARTICLE_KIND[key(article)] !== NOUN_KIND[key(noun)]) return null;
    explanations[index] = `${quote(article)} is the ${ARTICLE_KIND[key(article)]} article for ${quote(noun)}, so it comes right before it.`;
    explanations[index + 1] = `${quote(noun)} comes right after its article ${quote(article)}.`;
    relations.push({ start: index, end: index + 2, explanation: `In ${quote(`${article} ${noun}`)} the article comes first and matches the noun.` });
    index += 2;
    let text = `${article} ${noun}`;
    if (toes()) text += ' de los pies';
    if (key(noun) === 'fin' && key(tokens[index] || '') === 'de' && key(tokens[index + 1] || '') === 'semana') {
      explanations[index] = '“de” follows “fin”: “fin de semana” is one name, the weekend.';
      explanations[index + 1] = '“semana” ends the name “fin de semana”.';
      index += 2;
      text += ' de semana';
    }
    const after = tokens[index] || '';
    const shaded = shadeOf(index, NOUN_KIND[key(noun)] || '');
    if (shaded < 0) return null;
    if (ADJECTIVE_KIND[key(after)] && (shaded || agrees(after, NOUN_KIND[key(noun)] || '')) && !SER.has(key(tokens[index - 1] || ''))) {
      explanations[index] = shaded ? `${quote(after)} comes after ${quote(noun)}. ${shadedNote(after)}` : `${quote(after)} comes after ${quote(noun)} in Spanish and matches it.`;
      relations.push({ start: index - 1, end: index + 1, explanation: `The color or size comes after the noun: ${quote(`${noun} ${after}`)}.` });
      index += 1 + shaded;
      text += ` ${tokens.slice(index - 1 - shaded, index).join(' ')}`;
    }
    if (key(noun) === 'parada' && key(tokens[index] || '') === 'de' && key(tokens[index + 1] || '') === 'autobús') {
      explanations[index] = '“de” follows “parada”: “parada de autobús” is one name, a bus stop.';
      explanations[index + 1] = '“autobús” ends the name “parada de autobús”.';
      index += 2;
      text += ' de autobús';
    }
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
    const after = tokens[index] || '';
    if (ADJECTIVE_KIND[key(after)] && agrees(after, kind)) {
      explanations[index] = `${quote(after)} comes after ${quote(noun)} in Spanish and matches it.`;
      index += 1;
      return { text: `${word} ${noun} ${after}`, kind };
    }
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
  const contracted = (word: string, at: number) => {
    // del = de + el, al = a + el: one word before a masculine singular noun.
    const noun = tokens[at + 1] || '';
    if (NOUN_KIND[key(noun)] !== 'masculine singular') return null;
    explanations[at] = `${quote(word)} is ${key(word) === 'del' ? '“de” + “el”' : '“a” + “el”'}, one word before the masculine noun ${quote(noun)}.`;
    explanations[at + 1] = `${quote(noun)} comes right after ${quote(word)}.`;
    index = at + 2;
    return `${word} ${noun}`;
  };
  const locationPhrase = () => {
    // en / sobre / debajo de / al lado de + the place.
    const start = index;
    const first = key(tokens[index] || '');
    const side = key(tokens[index + 2] || '');
    if (first === 'a' && key(tokens[index + 1] || '') === 'la' && (side === 'izquierda' || side === 'derecha')) {
      explanations[index] = '“a” starts the side: “a la izquierda” / “a la derecha”.';
      explanations[index + 1] = `“la” comes before ${quote(tokens[index + 2] || '')}.`;
      explanations[index + 2] = `${quote(tokens[index + 2] || '')} (${side === 'izquierda' ? 'left' : 'right'}) ends it.`;
      index += 3;
      relations.push({ start, end: index, explanation: `Which side comes after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
      return true;
    }
    if (first === 'cruzando' && key(tokens[index + 1] || '') === 'la' && key(tokens[index + 2] || '') === 'calle') {
      explanations[index] = '“cruzando” (crossing) starts “cruzando la calle”: across the street.';
      explanations[index + 1] = '“la” is the article for “calle”.';
      explanations[index + 2] = '“calle” (street) ends it.';
      index += 3;
      return true;
    }
    if (first === 'entre') {
      explanations[index] = '“entre” (between) comes before the two places.';
      index += 1;
      const one = nounPhrase();
      if (!one || key(tokens[index] || '') !== 'y') return false;
      explanations[index] = '“y” joins the two places after “entre”.';
      index += 1;
      if (!nounPhrase()) return false;
      relations.push({ start, end: index, explanation: `${quote(tokens.slice(start, index).join(' '))}: “entre” + one place + “y” + the other.` });
      return true;
    }
    if (['cerca', 'lejos', 'enfrente'].includes(first)) {
      explanations[index] = `${quote(tokens[index] || '')} (${first === 'cerca' ? 'near' : first === 'lejos' ? 'far' : 'across'}) comes before “de” and the place.`;
      index += 1;
      const link = key(tokens[index] || '');
      if (link === 'del') {
        if (!contracted(tokens[index] || '', index)) return false;
      } else if (link === 'de') {
        explanations[index] = '“de” links it to the place.';
        index += 1;
        if (!nounPhrase()) return false;
      } else {
        return false;
      }
      relations.push({ start, end: index, explanation: `Where comes after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
      return true;
    }
    if (first === 'en' && VEHICLES.has(key(tokens[index + 1] || ''))) {
      explanations[index] = '“en” (by) comes before the vehicle: Spanish says “en tren”, “en autobús”.';
      explanations[index + 1] = `${quote(tokens[index + 1] || '')} takes no article after “en” for how you travel.`;
      index += 2;
      relations.push({ start, end: index, explanation: `How you travel: ${quote(tokens.slice(start, index).join(' '))}.` });
      return true;
    }
    if (first === 'en' && key(tokens[index + 1] || '') === 'casa') {
      explanations[index] = '“en” starts “en casa” (at home).';
      explanations[index + 1] = '“casa” takes no article in “en casa”.';
      index += 2;
      relations.push({ start, end: index, explanation: 'Where comes after the verb: “en casa” (at home).' });
      return true;
    }
    if (first === 'en' && (COUNTRIES.has(key(tokens[index + 1] || '')) || key(tokens[index + 1] || '') === 'estados')) {
      explanations[index] = '“en” (in) comes before the country, which takes no article.';
      index += 1;
      if (!countryPhrase()) return false;
      relations.push({ start, end: index, explanation: `Where comes after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
      return true;
    }
    if (first === 'en' || first === 'sobre') {
      explanations[index] = first === 'en' ? '“en” (in, at) comes before the place.' : '“sobre” (on) comes before the thing underneath.';
      index += 1;
      const place = nounPhrase() || possessivePhrase();
      if (!place) return false;
    } else if (first === 'debajo' || (first === 'al' && key(tokens[index + 1] || '') === 'lado')) {
      const words = first === 'debajo' ? 1 : 2;
      for (let at = 0; at < words; at += 1) explanations[index + at] = first === 'debajo' ? '“debajo” (under) comes before “de” and the place.' : (at ? '“lado” follows “al”: “al lado de” is “next to”.' : '“al” starts “al lado de” (next to).');
      index += words;
      const link = key(tokens[index] || '');
      if (link === 'del') {
        if (!contracted(tokens[index] || '', index)) return false;
      } else if (link === 'de') {
        explanations[index] = '“de” links the place word to the place.';
        index += 1;
        if (!nounPhrase()) return false;
      } else {
        return false;
      }
    } else {
      return false;
    }
    relations.push({ start, end: index, explanation: `Where comes after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
    return true;
  };
  const objectPhrase = () => {
    // what or whom: la mesa, mi libro, a mis amigos, al gato, a casa, a la escuela.
    const first = key(tokens[index] || '');
    if (first === 'al') return Boolean(contracted(tokens[index] || '', index));
    if (first === 'a') {
      const at = index;
      index += 1;
      if (key(tokens[index] || '') === 'casa') {
        explanations[at] = '“a” (to) comes before “casa”: “a casa” is “home”.';
        explanations[index] = '“casa” takes no article in “a casa”.';
        index += 1;
        return true;
      }
      const whom = possessivePhrase() || nounPhrase();
      if (!whom) return false;
      explanations[at] = `“a” comes before ${quote(whom.text)}: it marks where to or the person or animal you see.`;
      return true;
    }
    if (possessivePhrase() || nounPhrase()) return true;
    return false;
  };
  const quantity = () => {
    // un poco de + a food you do not count; a number + a plural; a bare food or plural; or el/la/mi + noun.
    const at = index;
    const first = key(tokens[index] || '');
    if (first === 'un' && key(tokens[index + 1] || '') === 'poco' && key(tokens[index + 2] || '') === 'de' && MASS.has(key(tokens[index + 3] || ''))) {
      explanations[at] = '“un” starts “un poco de” (some).';
      explanations[at + 1] = '“poco” follows “un”: “un poco de” is “some, a little”.';
      explanations[at + 2] = '“de” links “un poco” to the food.';
      explanations[at + 3] = `${quote(tokens[at + 3] || '')} is a food you do not count, so it takes no article after “un poco de”.`;
      index += 4;
      return tokens.slice(at, index).join(' ');
    }
    if (NUMBER_WORDS.has(first) && NOUN_KIND[key(tokens[index + 1] || '')]?.endsWith('plural')) {
      explanations[at] = `${quote(tokens[at] || '')} counts the things, so it comes first.`;
      explanations[at + 1] = `${quote(tokens[at + 1] || '')} is plural and comes right after the number.`;
      index += 2;
      toes();
      return tokens.slice(at, index).join(' ');
    }
    if (POSSESSIVE_KIND[first]?.endsWith('plural') && NUMBER_WORDS.has(key(tokens[index + 1] || '')) && NOUN_KIND[key(tokens[index + 2] || '')]?.endsWith('plural')) {
      explanations[at] = `${quote(tokens[at] || '')} (${POSSESSIVE_ENGLISH[first]}) comes first and is plural, like the things.`;
      explanations[at + 1] = `${quote(tokens[at + 1] || '')} counts the things, right after ${quote(tokens[at] || '')}.`;
      explanations[at + 2] = `${quote(tokens[at + 2] || '')} is plural and comes after the number.`;
      index += 3;
      return tokens.slice(at, index).join(' ');
    }
    if (SPORTS.has(first)) {
      explanations[at] = `${quote(tokens[at] || '')} is a sport: after “jugar” Spanish names it with no article.`;
      index += 1;
      return tokens[at] || '';
    }
    if (first === 'ayuda') {
      explanations[at] = '“ayuda” (help) takes no article after the verb.';
      index += 1;
      return tokens[at] || '';
    }
    if (MASS.has(first)) {
      explanations[at] = `${quote(tokens[at] || '')} is a food or drink you do not count, so it needs no article here.`;
      index += 1;
      return tokens[at] || '';
    }
    if (NOUN_KIND[first]?.endsWith('plural')) {
      explanations[at] = `${quote(tokens[at] || '')} is plural and means some in general, so it needs no article.${pluralNote(tokens[at] || '')}`;
      index += 1;
      return tokens[at] || '';
    }
    const phrase = possessivePhrase() || nounPhrase();
    if (phrase) return phrase.text;
    const color = tokens[at + 1] || '';
    if (['el', 'la', 'los', 'las'].includes(first) && COLORS.has(key(color)) && agrees(color, ARTICLE_KIND[first])) {
      // Quiero los rojos: with the noun left out, article + color is “the red ones”.
      const kind = ARTICLE_KIND[first];
      const ones = kind.endsWith('plural') ? 'ones' : 'one';
      explanations[at] = `${quote(tokens[at] || '')} matches the ${kind} ${ones === 'ones' ? 'things' : 'thing'} you mean, with no noun: ${quote(`${first} ${key(color)}`)} is “the ${colorEnglish(color)} ${ones}”.`;
      explanations[at + 1] = `${quote(color)} comes right after ${quote(tokens[at] || '')} and matches it, as if the noun were there.`;
      index = at + 2;
      return tokens.slice(at, index).join(' ');
    }
    return '';
  };
  const items = () => {
    // One thing, or two joined by y: café y huevos, una papa y un tomate.
    const start = index;
    const first = quantity();
    if (!first) return '';
    if (key(tokens[index] || '') === 'y') {
      const andAt = index;
      index += 1;
      const second = quantity();
      if (!second) return '';
      explanations[andAt] = `“y” (and) joins ${quote(first)} and ${quote(second)}, so it goes between them.`;
    }
    return tokens.slice(start, index).join(' ');
  };
  const dayPart = () => {
    // en la mañana, en la noche; de noche (at night).
    const at = index;
    if (key(tokens[at] || '') === 'de' && key(tokens[at + 1] || '') === 'noche') {
      explanations[at] = '“de” starts “de noche” (at night), with no article.';
      explanations[at + 1] = '“noche” (night) ends “de noche”; when comes after the verb.';
      relations.push({ start: at, end: at + 2, explanation: 'When comes after the verb: “de noche” (at night).' });
      index += 2;
      return true;
    }
    if (key(tokens[at] || '') !== 'en' || key(tokens[at + 1] || '') !== 'la' || !['mañana', 'tarde', 'noche'].includes(key(tokens[at + 2] || ''))) return false;
    explanations[at] = '“en” comes before the part of the day.';
    explanations[at + 1] = `“la” is the article for ${quote(tokens[at + 2] || '')}.`;
    explanations[at + 2] = `${quote(tokens[at + 2] || '')} says which part of the day.`;
    relations.push({ start: at, end: at + 3, explanation: `When comes after the verb: ${quote(tokens.slice(at, at + 3).join(' '))}.` });
    index += 3;
    return true;
  };
  const withPhrase = () => {
    // con él, con ella, con ellos; con su papá, con mis abuelos, con los niños.
    const at = index;
    if (key(tokens[at] || '') !== 'con') return false;
    index += 1;
    const pronoun = key(tokens[index] || '');
    if (WITH_ENGLISH[pronoun]) {
      explanations[index] = `${quote(tokens[index] || '')} after “con” is “${WITH_ENGLISH[pronoun]}”: Spanish uses the same word as for who does it.`;
      index += 1;
    } else if (!(possessivePhrase() || nounPhrase())) {
      return false;
    }
    explanations[at] = `“con” (with) comes before ${quote(tokens.slice(at + 1, index).join(' '))}.`;
    relations.push({ start: at, end: index, explanation: `Who with comes after the verb: ${quote(tokens.slice(at, index).join(' '))}.` });
    return true;
  };
  const attempt = (part: () => boolean) => {
    const at = index;
    if (part()) return true;
    index = at;
    return false;
  };
  const adjuncts = () => {
    // Where, when and who with can follow one another after the verb.
    while (index < tokens.length) {
      if (!(attempt(dayPart) || attempt(withPhrase) || attempt(locationPhrase))) return false;
    }
    return true;
  };
  const frequency = () => {
    // siempre, normalmente, a veces, nunca: how often goes right before the verb.
    const word = key(tokens[index] || '');
    if (FREQUENCY[word]) {
      explanations[index] = `${quote(tokens[index] || '')} (${FREQUENCY[word]}) goes right before the verb.`;
      index += 1;
      return tokens[index - 1] || '';
    }
    if (word === 'a' && key(tokens[index + 1] || '') === 'veces') {
      explanations[index] = `${quote(tokens[index] || '')} starts “a veces” (sometimes).`;
      explanations[index + 1] = '“veces” ends “a veces”; it goes right before the verb.';
      index += 2;
      return tokens.slice(index - 2, index).join(' ');
    }
    return '';
  };
  const timePhrase = () => {
    // a la una, a las siete: “a” + the hour.
    const at = index;
    if (key(tokens[at] || '') !== 'a') return false;
    const article = key(tokens[at + 1] || '');
    const hour = key(tokens[at + 2] || '');
    if (!((article === 'la' && hour === 'una') || (article === 'las' && HOURS.has(hour) && hour !== 'una'))) return false;
    explanations[at] = '“a” (at) comes before the time.';
    explanations[at + 1] = article === 'la' ? '“la” is for one o’clock only: “a la una”.' : '“las” is for every hour after one: “a las …”.';
    explanations[at + 2] = `${quote(tokens[at + 2] || '')} is the hour.`;
    relations.push({ start: at, end: at + 3, explanation: `The time comes last: ${quote(tokens.slice(at, at + 3).join(' '))}.` });
    index += 3;
    return true;
  };
  if (!tokens.length) return { explanations, relations, supported: false };
  const lower = tokens.map(key);
  const doneHere = () => ({ explanations, relations, supported: index === tokens.length && explanations.every(Boolean) });
  if (tokens.length <= 2 && (SEQUENCE[lower[0]] || (lower[0] === 'por' && lower[1] === 'último')) && (tokens.length === 1 || lower[0] === 'por')) {
    if (lower[0] === 'por') {
      explanations[0] = '“Por” starts “Por último” (finally).';
      explanations[1] = '“último” ends “Por último”; a comma follows it.';
    } else {
      explanations[0] = `${quote(tokens[0] || '')} (${SEQUENCE[lower[0]]}) starts the sentence; a comma follows it.`;
    }
    index = tokens.length;
    return doneHere();
  }
  {
    // Hace sol. Hace frío y viento. Hace frío y está nublado. Está lloviendo. Hoy hace viento. El sábado hace sol.
    const lead = lower[0] === 'hoy' ? 1 : lower[0] === 'el' && DAYS.has(lower[1] || '') ? 2 : 0;
    const weatherAt = (at: number) => (lower[at] === 'hace' && HACE_WEATHER[lower[at + 1] || '']) || (lower[at] === 'está' && ESTA_WEATHER[lower[at + 1] || '']);
    if (weatherAt(lead)) {
      if (lead === 1) explanations[0] = '“Hoy” (today) can come first; the weather follows.';
      index = lead === 2 ? 0 : lead;
      if (lead === 2) dayPhrase();
      const one = () => {
        const verb = lower[index] || '';
        const word = lower[index + 1] || '';
        const english = verb === 'hace' ? HACE_WEATHER[word] : ESTA_WEATHER[word];
        explanations[index] = verb === 'hace'
          ? `${quote(tokens[index] || '')} starts the weather: Spanish says “hace ${word}” (it makes ${HACE_LITERAL[word]}) for “it is ${english}”.`
          : `${quote(tokens[index] || '')} starts the weather: “está ${word}” is “it is ${english}”.`;
        explanations[index + 1] = `${quote(tokens[index + 1] || '')} (${english}) comes right after ${quote(tokens[index] || '')}.`;
        relations.push({ start: index, end: index + 2, explanation: `Weather: ${quote(tokens.slice(index, index + 2).join(' '))}, with no word for “it”.` });
        index += 2;
        return verb;
      };
      const firstVerb = one();
      if (lower[index] === 'y') {
        const andAt = index;
        index += 1;
        if (firstVerb === 'hace' && HACE_WEATHER[lower[index] || '']) {
          explanations[index] = `${quote(tokens[index] || '')} (${HACE_WEATHER[lower[index] || '']}) shares “hace” with the first weather word.`;
          index += 1;
        } else if (weatherAt(index)) {
          one();
        } else {
          return { explanations, relations, supported: false };
        }
        explanations[andAt] = '“y” (and) joins the two kinds of weather.';
      }
      if (index < tokens.length) {
        if (lower[index] !== 'en' || lower[index + 1] !== 'la' || !['mañana', 'tarde', 'noche'].includes(lower[index + 2] || '')) return { explanations, relations, supported: false };
        explanations[index] = '“en” comes before the part of the day.';
        explanations[index + 1] = `“la” is the article for ${quote(tokens[index + 2] || '')}.`;
        explanations[index + 2] = `${quote(tokens[index + 2] || '')} says which part of the day, so it comes last.`;
        index += 3;
      }
      return doneHere();
    }
  }
  if (lower[0] === 'cómo' && (lower[1] === 'estás' || lower[1] === 'está')) {
    // ¿Cómo estás? ¿Cómo está ella? ¿Cómo está el abuelo?
    explanations[0] = '“Cómo” (how) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} comes right after “Cómo”: how someone feels uses estar.`;
    index = 2;
    if (lower[1] === 'está') {
      if (PRONOUNS.has(lower[2] || '') && !PLURAL_PRONOUNS.has(lower[2] || '')) {
        explanations[2] = `${quote(tokens[2] || '')} comes last in the question.`;
        index = 3;
      } else {
        const who = nounPhrase();
        if (!who || who.plural) return { explanations, relations, supported: false };
      }
    }
    relations.push({ start: 0, end: 2, explanation: `${quote(`Cómo ${tokens[1]}`)}: “how are you”, with estar.` });
    return doneHere();
  }
  if (lower[0] === 'hay') {
    // Hay una cama en la recámara. Hay dos sillas. Hay doce meses en un año.
    explanations[0] = '“Hay” (there is, there are) comes first; it is the same for one thing or more.';
    index = 1;
    if (NUMBER_WORDS.has(lower[1] || '') && NOUN_KIND[lower[2] || '']?.endsWith('plural')) {
      explanations[1] = `${quote(tokens[1] || '')} counts the things, right after “Hay”.`;
      explanations[2] = `${quote(tokens[2] || '')} is plural and comes after the number.`;
      index = 3;
    } else if (!(lower[1] === 'un' && lower[2] === 'poco' ? quantity() : nounPhrase())) {
      return { explanations, relations, supported: false };
    }
    if (index < tokens.length && !locationPhrase()) return { explanations, relations, supported: false };
    return doneHere();
  }
  if (lower[0] === 'me' && REFLEXIVE[lower[1] || '']) {
    explanations[0] = `“Me” (myself) comes before ${quote(tokens[1] || '')}: Spanish says it for things you do to yourself.`;
    explanations[1] = `${quote(tokens[1] || '')} (I ${REFLEXIVE[lower[1] || '']}) comes right after “Me”.`;
    relations.push({ start: 0, end: 2, explanation: `${quote(`Me ${tokens[1]}`)}: “me” goes before the verb.` });
    index = 2;
    if (ARTICLE_KIND[lower[2] || ''] && !nounPhrase()) return { explanations, relations, supported: false };
    if (index < tokens.length && !locationPhrase()) return { explanations, relations, supported: false };
    return doneHere();
  }
  if ((lower[0] === 'son' && lower[1] === 'las' && HOURS.has(lower[2] || '') && lower[2] !== 'una') || (lower[0] === 'es' && lower[1] === 'la' && lower[2] === 'una')) {
    explanations[0] = lower[0] === 'es' ? '“Es” is for one o’clock only: “Es la una”.' : '“Son” is for every hour after one: “Son las …”.';
    explanations[1] = `${quote(tokens[1] || '')} comes before the hour: Spanish says “the hours”.`;
    explanations[2] = `${quote(tokens[2] || '')} is the hour.`;
    index = 3;
    if (lower[3] === 'de' && lower[4] === 'la' && ['mañana', 'tarde', 'noche'].includes(lower[5] || '')) {
      explanations[3] = '“de” links the hour to the part of the day.';
      explanations[4] = `“la” is the article for ${quote(tokens[5] || '')}.`;
      explanations[5] = `${quote(tokens[5] || '')} says which part of the day.`;
      index = 6;
    }
    relations.push({ start: 0, end: 3, explanation: `Time: ${quote(tokens.slice(0, 3).join(' '))}.` });
    return doneHere();
  }
  if ((lower[0] === 'hoy' || lower[0] === 'mañana') && lower[1] === 'es' && DAYS.has(lower[2] || '') && tokens.length === 3) {
    explanations[0] = `${quote(tokens[0] || '')} (${lower[0] === 'hoy' ? 'today' : 'tomorrow'}) comes first.`;
    explanations[1] = `“es” comes right after ${quote(tokens[0] || '')}.`;
    explanations[2] = `${quote(tokens[2] || '')} is the day; Spanish days have no capital letter.`;
    return { explanations, relations, supported: true };
  }
  if (lower[0] === 'es' && MONTHS.has(lower[1] || '') && tokens.length === 2) {
    explanations[0] = '“Es” starts the sentence: Spanish leaves out “it”.';
    explanations[1] = `${quote(tokens[1] || '')} is the month; Spanish months have no capital letter.`;
    return { explanations, relations, supported: true };
  }
  if (lower[0] === 'dónde' && PRESENT.has(lower[1] || '') && VERB_PERSON[lower[1] || ''] === '3s') {
    // ¿Dónde vive tu tía? The verb comes before who it is about.
    explanations[0] = '“Dónde” (where) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} comes right after “Dónde”: in the question the verb comes before who it is about.`;
    index = 2;
    if (NAME_KIND[lower[2] || '']) {
      explanations[2] = `${quote(tokens[2] || '')} comes last: it is who you ask about.`;
      index = 3;
    } else if (!(possessivePhrase() || nounPhrase())) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: index, explanation: `Spanish asks ${quote(tokens.join(' '))}: where, the verb, then who.` });
    return doneHere();
  }
  if (lower[0] === 'con' && lower[1] === 'quién' && PRESENT.has(lower[2] || '') && VERB_PERSON[lower[2] || ''] === '3s') {
    // ¿Con quién vive tu primo? ¿Con quién cocina la cena la abuela?
    explanations[0] = '“Con” (with) starts the question: Spanish puts it before “quién”.';
    explanations[1] = '“quién” (who) comes right after “Con”: “Con quién” is “who … with”.';
    explanations[2] = `${quote(tokens[2] || '')} comes after “Con quién”, before who it is about.`;
    index = 3;
    if (!(possessivePhrase() || nounPhrase())) return { explanations, relations, supported: false };
    if (index < tokens.length && !(possessivePhrase() || nounPhrase())) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: 3, explanation: `${quote(tokens.slice(0, 3).join(' '))}: “Con quién” first, then the verb.` });
    return doneHere();
  }
  if (lower[0] === 'con' && lower[1] === 'qué' && lower[2] === 'frecuencia' && PRESENT.has(lower[3] || '')) {
    // ¿Con qué frecuencia estudias de noche?
    explanations[0] = '“Con” starts the question: Spanish asks “with what frequency”.';
    explanations[1] = '“qué” (what) comes right after “Con”.';
    explanations[2] = '“frecuencia” follows “Con qué”: “Con qué frecuencia” is “How often”.';
    explanations[3] = `${quote(tokens[3] || '')} (${VERB_ENGLISH[lower[3] || '']}) comes after “Con qué frecuencia”; Spanish leaves out ${DROPPED[VERB_PERSON[lower[3] || ''] || ''] || 'who'}.`;
    relations.push({ start: 0, end: 3, explanation: '“Con qué frecuencia” is “How often”.' });
    index = 4;
    const start = index;
    if (index < tokens.length && !['en', 'de', 'con'].includes(lower[index] || '') && !items()) return { explanations, relations, supported: false };
    if (index > start) relations.push({ start, end: index, explanation: `What comes right after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
    if (!adjuncts()) return { explanations, relations, supported: false };
    return doneHere();
  }
  {
    // Se llama Max. Él se llama Luis. “se llama” is “is called”: Spanish names someone this way.
    const lead = PRONOUNS.has(lower[0] || '') && !PLURAL_PRONOUNS.has(lower[0] || '') && lower[1] === 'se' ? 1 : 0;
    const named = key(tokens[lead + 2] || '');
    if (lower[lead] === 'se' && lower[lead + 1] === 'llama' && tokens.length === lead + 3 && (NAMES.has(named) || PET_NAMES.has(named))) {
      if (lead) explanations[0] = `${quote(tokens[0] || '')} is who you name, so it comes first.`;
      explanations[lead] = `${quote(tokens[lead] || '')} comes before the verb: Spanish says “se llama”, is called.`;
      explanations[lead + 1] = `“llama” comes right after ${quote(tokens[lead] || '')}.`;
      explanations[lead + 2] = `${quote(tokens[lead + 2] || '')} is the name, so it comes last.`;
      relations.push({ start: lead, end: lead + 2, explanation: '“se llama” is “its name is” or “his/her name is”: “se” before “llama”.' });
      return { explanations, relations, supported: true };
    }
  }
  if (lower[0] === 'dónde' && lower[1] === 'está') {
    explanations[0] = '“Dónde” (where) starts the question.';
    explanations[1] = '“está” comes right after “Dónde”: location uses estar.';
    index = 2;
    if (!nounPhrase()) return { explanations, relations, supported: false };
    return doneHere();
  }
  if (tokens.length === 1 && MASS.has(lower[0])) {
    // Agua, por favor: the thing you ask for, then “por favor”.
    explanations[0] = `${quote(tokens[0] || '')} names what you ask for, so it comes first.`;
    return { explanations, relations, supported: true };
  }
  if (lower[0] === 'cuánto' && (lower[1] === 'cuesta' || lower[1] === 'cuestan')) {
    // ¿Cuánto cuesta el pan? cuesta for one thing, cuestan for more than one.
    explanations[0] = '“Cuánto” (how much) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} (costs) comes right after “Cuánto”.`;
    index = 2;
    const thing = nounPhrase();
    if (!thing || thing.plural !== (lower[1] === 'cuestan')) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: index, explanation: `Spanish asks ${quote(`Cuánto ${tokens[1]} ${thing.text}`)}: how much costs the thing.` });
    return doneHere();
  }
  if ((lower[0] === 'cuántos' || lower[0] === 'cuántas') && lower[2] === 'hay' && tokens.length === 3) {
    const kind = NOUN_KIND[lower[1] || ''] || '';
    if (!kind.endsWith('plural') || kind.startsWith('masculine') !== (lower[0] === 'cuántos')) return { explanations, relations, supported: false };
    explanations[0] = `${quote(tokens[0] || '')} (how many) starts the question and matches ${quote(tokens[1] || '')}: ${kind}.`;
    explanations[1] = `${quote(tokens[1] || '')} is plural and comes right after ${quote(tokens[0] || '')}.`;
    explanations[2] = '“hay” (are there) ends the question.';
    relations.push({ start: 0, end: 2, explanation: `${quote(`${tokens[0]} ${tokens[1]}`)}: how many matches the noun.` });
    return { explanations, relations, supported: true };
  }
  {
    // gustar: (No) me/te/le/les + gusta + one thing / gustan + more than one.
    const negated = lower[0] === 'no' && GUSTAR_WHO[lower[1] || ''] ? 1 : 0;
    const who = lower[negated] || '';
    const verb = lower[negated + 1] || '';
    if (GUSTAR_WHO[who] && (verb === 'gusta' || verb === 'gustan')) {
      if (negated) explanations[0] = `“No” comes first, before ${quote(tokens[1] || '')}: Spanish says “no me gusta” for “I do not like”.`;
      explanations[negated] = `${quote(tokens[negated] || '')} (to ${who === 'me' ? 'me' : who === 'te' ? 'you' : who === 'le' ? 'him or her' : 'them'}) comes before the verb: Spanish says the food pleases ${who === 'me' ? 'me' : 'them'}.`;
      index = negated + 2;
      const toWhom = who === 'me' ? 'me' : who === 'te' ? 'you' : who === 'le' ? 'him or her' : 'them';
      if (index === tokens.length && verb === 'gusta') {
        explanations[negated] = `${quote(tokens[negated] || '')} (to ${toWhom}) comes before the verb.`;
        explanations[negated + 1] = '“gusta” ends the answer: the activity is already known, so Spanish does not repeat it.';
        relations.push({ start: negated, end: index, explanation: `${quote(tokens.slice(0, index).join(' '))} answers with gustar and nothing after it.` });
        return doneHere();
      }
      if (ACTIVITIES[lower[index] || '']) {
        if (verb !== 'gusta' || !activity()) return { explanations, relations, supported: false };
        explanations[negated] = `${quote(tokens[negated] || '')} (to ${toWhom}) comes before the verb: Spanish says the activity pleases ${toWhom}.`;
        explanations[negated + 1] = '“gusta” goes with an activity in its -r form: one activity takes “gusta”.';
        relations.push({ start: negated, end: index, explanation: `${quote(`${tokens[negated]} ${tokens[negated + 1]}`)} + the -r form means “${GUSTAR_WHO[who]} to …”.` });
        return doneHere();
      }
      const first = nounPhrase();
      if (!first) return { explanations, relations, supported: false };
      let many = first.plural;
      let liked = first.text;
      if (key(tokens[index] || '') === 'y') {
        const andAt = index;
        index += 1;
        const second = nounPhrase();
        if (!second) return { explanations, relations, supported: false };
        explanations[andAt] = `“y” joins ${quote(first.text)} and ${quote(second.text)}.`;
        liked = `${first.text} y ${second.text}`;
        many = true;
      }
      if (many !== (verb === 'gustan')) return { explanations, relations, supported: false };
      explanations[negated + 1] = `${quote(tokens[negated + 1] || '')} matches what is liked: ${many ? '“gustan” for more than one thing' : '“gusta” for one thing'}.`;
      relations.push({ start: negated, end: index, explanation: `${quote(`${tokens[negated]} ${tokens[negated + 1]}`)} means “${GUSTAR_WHO[who]}”, and the verb matches ${quote(liked)}.` });
      return doneHere();
    }
  }
  {
    // me subo al autobús / nos bajamos del barco / se suben al autobús (+ en + place).
    const at = lower[0] === 'no' ? 1 : 0;
    const move = GET_ON_OFF[lower[at + 1] || ''];
    if (move && lower[at] === move[0]) {
      explanations[at] = `${quote(tokens[at] || '')} comes before ${quote(tokens[at + 1] || '')}: Spanish says “${move[0]} ${lower[at + 1]}” to ${move[1]}.`;
      explanations[at + 1] = `${quote(tokens[at + 1] || '')} comes right after ${quote(tokens[at] || '')}.`;
      index = at + 2;
      const link = key(tokens[index] || '');
      const wanted = move[2];
      if (link === wanted) {
        if (!contracted(tokens[index] || '', index)) return { explanations, relations, supported: false };
      } else if (link === (wanted === 'al' ? 'a' : 'de')) {
        explanations[index] = `${quote(tokens[index] || '')} comes before the vehicle.`;
        index += 1;
        if (!nounPhrase()) return { explanations, relations, supported: false };
      } else {
        return { explanations, relations, supported: false };
      }
      relations.push({ start: at, end: index, explanation: `${move[1] === 'get on' ? '“subirse a”' : '“bajarse de”'}: ${quote(tokens.slice(at, index).join(' '))}.` });
      if (index < tokens.length && !locationPhrase()) return { explanations, relations, supported: false };
      return doneHere();
    }
  }
  if (lower[0] === 'no' && NEGATIVE_COMMANDS[lower[1] || '']) {
    // No comas en el salón. No uses tu teléfono.
    const [english, plain] = NEGATIVE_COMMANDS[lower[1] || ''];
    explanations[0] = '“No” comes first: a “don’t” command starts with “no”.';
    explanations[1] = `${quote(tokens[1] || '')} (${english}) comes right after “No”: a “don’t” command uses this form, not “${plain}”.`;
    relations.push({ start: 0, end: 2, explanation: `${quote(`No ${tokens[1]}`)} is “Don’t ${english}”.` });
    index = 2;
    const start = index;
    if (index < tokens.length && !['en', 'con', 'sobre', 'debajo', 'al'].includes(lower[index] || '')) {
      if (!(possessivePhrase() || nounPhrase())) return { explanations, relations, supported: false };
      relations.push({ start, end: index, explanation: `What comes right after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
    }
    if (!adjuncts()) return { explanations, relations, supported: false };
    return doneHere();
  }
  if (COMMANDS[lower[0]] && !(lower[0] === 'sigue' && lower[1] === 'derecho' && tokens.length === 2)) {
    // Dobla a la derecha en la esquina. Cruza la calle. Para en el cine. Pasa el banco. Toma el autobús azul.
    explanations[0] = `${quote(tokens[0] || '')} (${COMMANDS[lower[0]]}) tells someone (tú) what to do, so it comes first.`;
    index = 1;
    if (lower[0] === 'dobla') {
      if (!locationPhrase()) return { explanations, relations, supported: false };
    } else if (lower[0] === 'para') {
      if (!locationPhrase()) return { explanations, relations, supported: false };
    } else if (!(possessivePhrase() || nounPhrase())) {
      return { explanations, relations, supported: false };
    }
    if (index < tokens.length && !locationPhrase()) return { explanations, relations, supported: false };
    return doneHere();
  }
  {
    // (No) puedes cruzar aquí. Pueden ir en autobús. Sí, puedo.
    const no = lower[0] === 'no' && PODER[lower[1] || ''] ? 1 : 0;
    const can = lower[no] || '';
    if (PODER[can]) {
      if (no) explanations[0] = `“No” comes before ${quote(tokens[1] || '')}: Spanish says “no ${can}” for “cannot”.`;
      explanations[no] = `${quote(tokens[no] || '')} (${PODER[can]}) ${no ? 'comes right after “No”' : 'starts the sentence'}; Spanish leaves out who.`;
      index = no + 1;
      const verb = lower[index] || '';
      if (INFINITIVES[verb]) {
        explanations[index] = `${quote(tokens[index] || '')} (${INFINITIVES[verb]}) comes right after ${quote(tokens[no] || '')}, in its -r form.`;
        relations.push({ start: no, end: index + 1, explanation: `${quote(`${tokens[no]} ${tokens[index]}`)}: poder + the -r form.` });
        index += 1;
        if (verb === 'cruzar' && key(tokens[index] || '') === 'la') nounPhrase();
        if (verb === 'ir' && key(tokens[index] || '') === 'en') {
          if (!locationPhrase()) return { explanations, relations, supported: false };
        }
        if (['aquí', 'ahí'].includes(key(tokens[index] || ''))) {
          explanations[index] = `${quote(tokens[index] || '')} (${key(tokens[index] || '') === 'aquí' ? 'here' : 'there'}) comes last.`;
          index += 1;
        }
      }
      return doneHere();
    }
  }
  if (lower[0] === 'adónde' && ['vas', 'va', 'van'].includes(lower[1] || '')) {
    // ¿Adónde vas? ¿Adónde va ella? ¿Adónde van ellos?
    explanations[0] = '“Adónde” (where to) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} (${lower[1] === 'vas' ? 'you go' : lower[1] === 'va' ? 'he or she goes' : 'they go'}) comes right after “Adónde”.`;
    index = 2;
    const who = lower[2] || '';
    if (who) {
      const fits = lower[1] === 'va' ? (who === 'él' || who === 'ella' || Boolean(NAME_KIND[who])) : lower[1] === 'van' ? (who === 'ellos' || who === 'ellas') : false;
      if (!fits) return { explanations, relations, supported: false };
      explanations[2] = `${quote(tokens[2] || '')} comes last in the question.`;
      index = 3;
    }
    relations.push({ start: 0, end: 2, explanation: `${quote(`Adónde ${tokens[1]}`)}: the question word, then ir.` });
    return doneHere();
  }
  if (lower[0] === 'pero' && DEMONSTRATIVE_KIND[lower[1] || ''] && lower[2] === 'no' && tokens.length === 3) {
    // …, pero esa no: “but that one isn’t”; Spanish does not repeat the verb.
    explanations[0] = '“pero” (but) starts the second part, after the comma.';
    explanations[1] = `${quote(tokens[1] || '')} (${lower[1].startsWith('est') ? 'this one' : 'that one'}) comes right after “pero”.`;
    explanations[2] = `“no” ends it: ${quote(`pero ${tokens[1]} no`)} is “but ${lower[1].startsWith('est') ? 'this one' : 'that one'} isn’t”, with no verb.`;
    relations.push({ start: 0, end: 3, explanation: `${quote(`pero ${tokens[1]} no`)}: Spanish leaves out the verb it already said.` });
    return { explanations, relations, supported: true };
  }
  if (lower[0] === 'cómo' && (lower[1] === 'vas' || lower[1] === 'va')) {
    // ¿Cómo vas a la alberca? ¿Cómo va Diego a la oficina? How, the verb, who, then where to.
    explanations[0] = '“Cómo” (how) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} (${lower[1] === 'vas' ? 'you go' : 'he or she goes'}) comes right after “Cómo”.`;
    index = 2;
    if (lower[1] === 'va') {
      const who = lower[2] || '';
      if (!(PRONOUNS.has(who) && !PLURAL_PRONOUNS.has(who)) && !NAME_KIND[who]) return { explanations, relations, supported: false };
      explanations[2] = `${quote(tokens[2] || '')} comes right after ${quote(tokens[1] || '')}: in the question the verb comes before who it is about.`;
      index = 3;
    }
    const start = index;
    if (!['a', 'al'].includes(lower[index] || '') || !objectPhrase()) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: start, explanation: `${quote(tokens.slice(0, start).join(' '))}: how, then the verb, then who.` });
    relations.push({ start, end: index, explanation: `Where to comes last: ${quote(tokens.slice(start, index).join(' '))}.` });
    return doneHere();
  }
  if (lower[0] === 'cómo' && lower[1] === 'llego') {
    // ¿Cómo llego al museo?
    explanations[0] = '“Cómo” (how) starts the question.';
    explanations[1] = '“llego” (I get there, I arrive) comes right after “Cómo”.';
    index = 2;
    if (!objectPhrase()) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: index, explanation: `Spanish asks ${quote(tokens.join(' '))}: how do I arrive at the place.` });
    return doneHere();
  }
  if (lower[0] === 'qué' && NOUN_KIND[lower[1] || ''] && lower[2] === 'va') {
    // ¿Qué autobús va al museo?
    explanations[0] = '“Qué” (which) starts the question.';
    explanations[1] = `${quote(tokens[1] || '')} comes right after “Qué”, with no article.`;
    explanations[2] = '“va” (goes) comes after the vehicle.';
    index = 3;
    if (!objectPhrase()) return { explanations, relations, supported: false };
    return doneHere();
  }
  if (lower[0] === 'a' && lower[1] === 'qué' && lower[2] === 'hora' && ['sale', 'llega'].includes(lower[3] || '')) {
    // ¿A qué hora sale el tren?
    explanations[0] = '“A” (at) starts the question: Spanish asks “at what hour”.';
    explanations[1] = '“qué” (what) comes after “A”.';
    explanations[2] = '“hora” (hour, time) comes after “qué”.';
    explanations[3] = `${quote(tokens[3] || '')} (${lower[3] === 'sale' ? 'leaves' : 'arrives'}) comes before the vehicle.`;
    index = 4;
    if (!nounPhrase()) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: 3, explanation: '“A qué hora” is “What time”.' });
    return doneHere();
  }
  if (lower[0] === 'me' && lower[1] === 'da') {
    // ¿Me da café, por favor? Me + da + what you ask for.
    explanations[0] = '“Me” (to me) comes before the verb.';
    explanations[1] = '“da” (you give, with usted) comes right after “Me”: “¿Me da…?” asks politely for something.';
    index = 2;
    if (!items()) return { explanations, relations, supported: false };
    relations.push({ start: 0, end: index, explanation: `${quote(tokens.slice(0, index).join(' '))}: “Me da” + what you want.` });
    return doneHere();
  }
  if (lower[0] === 'aquí' && (lower[1] === 'está' || lower[1] === 'están')) {
    // Aquí está su café. Aquí están su café y sus huevos.
    explanations[0] = '“Aquí” (here) comes first.';
    index = 2;
    const start = index;
    const first = quantity();
    if (!first) return { explanations, relations, supported: false };
    let many = spanishWords(first).some(word => NOUN_KIND[key(word)]?.endsWith('plural'));
    if (key(tokens[index] || '') === 'y') {
      const andAt = index;
      index += 1;
      const second = quantity();
      if (!second) return { explanations, relations, supported: false };
      explanations[andAt] = `“y” joins ${quote(first)} and ${quote(second)}.`;
      many = true;
    }
    if (many !== (lower[1] === 'están')) return { explanations, relations, supported: false };
    explanations[1] = `${quote(tokens[1] || '')} comes right after “Aquí”: ${many ? '“están” for more than one thing' : '“está” for one thing'}.`;
    relations.push({ start: 0, end: index, explanation: `${quote(`Aquí ${tokens[1]}`)} + ${quote(tokens.slice(start, index).join(' '))}.` });
    return doneHere();
  }
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
  let ownedSubject: { text: string; kind: string } | null = null;
  if (POSSESSIVE_KIND[lower[0]]) {
    // Tu nombre es Luis. Su nombre es Sofía.
    const owned = possessivePhrase();
    if (owned && key(tokens[index] || '') === 'es' && key(tokens[index + 1] || '') === 'en' && MONTHS.has(key(tokens[index + 2] || ''))) {
      explanations[index] = `“es” comes right after ${quote(owned.text)}.`;
      explanations[index + 1] = '“en” (in) comes before the month.';
      explanations[index + 2] = `${quote(tokens[index + 2] || '')} is the month; Spanish months have no capital letter.`;
      index += 3;
      return done();
    }
    if (owned && /\bcolor\b/i.test(owned.text) && key(tokens[index] || '') === 'es') {
      // Mi color favorito es el morado.
      explanations[index] = `“es” comes right after ${quote(owned.text)}.`;
      const at = index;
      index += 1;
      const color = colorName();
      if (!color) return { explanations, relations, supported: false };
      relations.push({ start: at, end: index, explanation: `After “es” comes the color, named with “el”: ${quote(color)}.` });
      return done();
    }
    const shaded = owned && SER.has(key(tokens[index] || '')) ? shadeOf(index + 1, owned.kind) : 0;
    if (shaded < 0) return { explanations, relations, supported: false };
    if (owned && SER.has(key(tokens[index] || '')) && (shaded || agrees(tokens[index + 1] || '', owned.kind))) {
      // Mi camisa es roja. Mis calcetines son blancos. Mi bolsa es azul claro.
      const verb = tokens[index] || '';
      const adjective = tokens[index + 1] || '';
      const many = owned.kind.endsWith('plural');
      if ((key(verb) === 'son') !== many) return { explanations, relations, supported: false };
      explanations[index] = `${quote(verb)} comes right after ${quote(owned.text)}: ${many ? 'more than one thing' : 'one thing'}.`;
      explanations[index + 1] = `${quote(adjective)} comes after ${quote(verb)}. ${shaded ? shadedNote(adjective) : agreementNote(adjective, owned.text, owned.kind)}`;
      relations.push({ start: index, end: index + 2 + shaded, explanation: `After ${quote(verb)} comes the color, matching ${quote(owned.text)}: ${quote(tokens.slice(index + 1, index + 2 + shaded).join(' '))}.` });
      index += 2 + shaded;
      return done();
    }
    if (owned && key(tokens[index] || '') === 'es' && NAMES.has(key(tokens[index + 1] || ''))) {
      explanations[index] = `“es” comes right after ${quote(owned.text)}.`;
      explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the name, so it comes last.`;
      index += 2;
      return done();
    }
    if (!owned || !PRESENT.has(key(tokens[index] || '')) && !FREQUENCY[key(tokens[index] || '')] && key(tokens[index] || '') !== 'no' && key(tokens[index] || '') !== 'a') {
      return { explanations, relations, supported: false };
    }
    ownedSubject = owned;
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
    if (tokens.length === 3 && agrees(tokens[2] || '', kind)) {
      // Esta es roja: with no noun, esta/esa stands for the thing (this one, that one).
      const color = tokens[2] || '';
      explanations[0] = `${quote(pointer)} (${lower[0].startsWith('est') ? 'this one' : 'that one'}) stands for a ${kind} thing, so it comes first.`;
      explanations[2] = `${quote(color)} comes after ${quote(verb)}. ${agreementNote(color, pointer, kind)}`;
      relations.push({ start: 0, end: 3, explanation: `${quote(pointer)} + ${quote(verb)} + the color that matches it: ${quote(tokens.join(' '))}.` });
      index = 3;
      return done();
    }
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
  if (NUMBER_WORDS.has(lower[0]) && !(SER.has(lower[2] || '') || ESTAR.has(lower[2] || '') || TENER.has(lower[2] || '') || PRESENT.has(lower[2] || ''))) {
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
  if (ownedSubject) {
    subject = ownedSubject.text;
    plural = ownedSubject.kind.endsWith('plural');
    person = plural ? '3p' : '3s';
    subjectKinds.push(ownedSubject.kind);
  } else if (NAME_KIND[key(tokens[index] || '')]) {
    subject = tokens[index] || '';
    person = '3s';
    subjectKinds.push(NAME_KIND[key(subject)]);
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
    if (key(tokens[index] || '') === 'y' && NAME_KIND[key(tokens[index + 1] || '')]) {
      explanations[index] = '“y” (and) joins the two names, so it goes between them.';
      explanations[index + 1] = `${quote(tokens[index + 1] || '')} is the second person; together they take the “ellos” verb.`;
      subjectKinds.push(NAME_KIND[key(tokens[index + 1] || '')]);
      subject = `${subject} y ${tokens[index + 1]}`;
      plural = true;
      person = '3p';
      index += 2;
    }
  } else if (PRONOUN_PERSON[key(tokens[index] || '')]) {
    subject = tokens[index] || '';
    person = PRONOUN_PERSON[key(subject)];
    plural = person.endsWith('p');
    subjectKinds.push(key(subject).startsWith('ella') ? 'feminine' : PRONOUNS.has(key(subject)) ? 'masculine' : 'any');
    explanations[index] = `${quote(subject)} is who the sentence is about, so it comes first.`;
    index += 1;
  } else if (NUMBER_WORDS.has(key(tokens[index] || '')) && NOUN_KIND[key(tokens[index + 1] || '')]?.endsWith('plural')) {
    // Tres relojes están en la mesa: the number, then the plural noun, is who the sentence is about.
    explanations[index] = `${quote(tokens[index] || '')} counts the things, so it comes first.`;
    explanations[index + 1] = `${quote(tokens[index + 1] || '')} is plural and comes right after the number.${pluralNote(tokens[index + 1] || '')}`;
    subject = tokens.slice(index, index + 2).join(' ');
    plural = true;
    person = '3p';
    subjectKinds.push(NOUN_KIND[key(tokens[index + 1] || '')]);
    index += 2;
  } else if (ARTICLE_KIND[key(tokens[index])]) {
    const first = nounPhrase();
    if (!first) return { explanations, relations, supported: false };
    subject = first.text;
    if (key(tokens[index] || '') === 'de' && (key(tokens[index + 1] || '') === 'él' || key(tokens[index + 1] || '') === 'ella')) {
      // El color favorito de él: whose comes after the thing, with “de”.
      const owner = tokens[index + 1] || '';
      explanations[index] = `“de” (of) comes right after ${quote(first.text)}: Spanish says whose it is after the thing.`;
      explanations[index + 1] = `${quote(owner)} after “de” means “${key(owner) === 'él' ? 'his' : 'her'}”: ${quote(`${first.text} de ${owner}`)}.`;
      subject = `${first.text} de ${owner}`;
      index += 2;
    }
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
    const freqText = frequency();
    // "no" goes right before the verb (Él no está), where English puts "not" after it.
    const negation = key(tokens[index] || '') === 'no' ? index : -1;
    if (negation >= 0) index += 1;
    const verb = tokens[index] || '';
    const verbKey = key(verb);
    if (freqText && !PRESENT.has(verbKey)) return { explanations, relations, supported: false };
    const after = freqText || subject;
    if (verbKey === 'trabaja' && subject && !plural && negation < 0 && !freqText && key(tokens[index + 1] || '') === 'en' && ARTICLE_KIND[key(tokens[index + 2] || '')]) {
      // El hombre trabaja en el hospital: works + en + the place.
      explanations[index] = `${quote(verb)} comes right after ${quote(subject)}; it says what the person does.`;
      relations.push({ start: subjectStart, end: index + 1, explanation: `The verb comes right after who it is about: ${quote(`${subject} ${verb}`)}.` });
      index += 1;
      return placePhrase() ? done() : { explanations, relations, supported: false };
    }
    if (!SER.has(verbKey) && !ESTAR.has(verbKey) && !TENER.has(verbKey) && !PRESENT.has(verbKey)) return { explanations, relations, supported: false };
    const verbPerson = VERB_PERSON[verbKey] || '';
    const verbPlural = verbPerson.endsWith('p');
    if (subject && verbPerson !== person) return { explanations, relations, supported: false };
    if (!subject) person = verbPerson;
    // Things (Unit 2) are described, people are identified.
    const thing = !subject || subject.split(' ').some(part => Boolean(UNIT2_NOUNS[key(part)]));
    const locating = ESTAR.has(verbKey) && ['en', 'sobre', 'debajo', 'al', 'a', 'cerca', 'lejos', 'enfrente', 'entre', 'cruzando'].includes(key(tokens[index + 1] || ''));
    const meaning = locating ? (thing ? 'where something is' : 'where someone is') : PRESENT.has(verbKey) ? 'what someone does' : TENER.has(verbKey) ? 'what someone has' : SER.has(verbKey) ? (thing ? 'what something is' : 'who someone is') : 'what someone is doing';
    const notEnglish = NOT_ENGLISH[verbKey] || (PRESENT.has(verbKey) ? (verbPerson === '3s' ? 'does not' : 'do not') : verbPlural ? 'are not' : 'is not');
    if (negation >= 0) {
      explanations[negation] = `“no” goes right before ${quote(verb)}: Spanish says ${quote(`no ${verb}`)} where English says “${notEnglish}”.`;
      relations.push({ start: negation, end: index + 1, explanation: `“no” comes before the verb: Spanish says ${quote(`no ${verb}`)}, English says “${notEnglish}”.` });
    }
    explanations[index] = !subject && !freqText && text.trim().startsWith('¿') && verbPerson === '3s' && PRESENT.has(verbKey)
      ? `${quote(verb)} starts the question: speaking politely (usted), Spanish uses the “él/ella” form and leaves out “usted”.`
      : !subject && VERB_ENGLISH[verbKey]
      ? `${quote(verb)} ${negation >= 0 ? 'comes right after “no”' : freqText ? `comes right after ${quote(freqText)}` : 'starts the sentence'}: Spanish leaves out ${DROPPED[verbPerson]}, and ${quote(verb)} already means “${VERB_ENGLISH[verbKey]}”.`
      : !subject && verbKey === 'es' && negation < 0 && ARTICLE_KIND[key(tokens[index + 1] || '')] && PEOPLE.has(key(tokens[index + 2] || ''))
        ? '“Es” starts the sentence: Spanish leaves out “él” or “ella”, and “Es” already means “he is” or “she is”.'
      : !subject && negation >= 0
        ? `${quote(verb)} comes right after “no”; it says ${meaning}.`
        : !subject
          ? `${quote(verb)} starts the sentence: Spanish leaves out ${verbPlural ? '“ellos”' : '“it”'}, and ${quote(verb)} already means ${verbPlural ? '“they are”' : '“it is”'}.`
      : negation >= 0
        ? `${quote(verb)} comes right after “no”; it says ${meaning}${verbPlural ? (thing ? ' for more than one thing' : ' for more than one person') : ''}.`
        : `${quote(verb)} comes right after ${quote(after)}; it says ${meaning}${verbPlural ? (thing ? ' for more than one thing' : ' for more than one person') : ''}.`;
    if (subject) relations.push({ start: subjectStart, end: index + 1, explanation: freqText
      ? `Who it is about, how often, then the verb: ${quote(`${subject} ${freqText} ${verb}`)}.`
      : `The verb comes right after who it is about: ${quote(`${subject} ${negation >= 0 ? 'no ' : ''}${verb}`)}.` });
    const verbIndex = index;
    index += 1;
    const word = tokens[index] || '';
    if (SER.has(verbKey)) {
      const aboutColor = /\bcolor\b/i.test(subject);
      const named = aboutColor ? null : nounPhrase();
      let complement = named?.text || (aboutColor ? colorName() : '') || undefined;
      let compared = false;
      if (!complement && (key(word) === 'más' || /^(mayor|menor)(es)?$/.test(key(word)))) {
        // Luis es más alto que Sofía. El abuelo es mayor que el niño.
        const at = index;
        const more = key(word) === 'más' ? 1 : 0;
        const adjective = tokens[at + more] || '';
        const own = /^(mayor|menor)(es)?$/.test(key(adjective));
        const oneKind = subjectKinds.length === 1 && subjectKinds[0].includes(' ') ? subjectKinds[0] : '';
        const fits = ADJECTIVE_KIND[key(adjective)] && (oneKind ? agrees(adjective, oneKind) : ADJECTIVE_KIND[key(adjective)].endsWith(verbPlural ? 'plural' : 'singular'));
        if (!fits || own === Boolean(more) || key(tokens[at + more + 1] || '') !== 'que') return { explanations, relations, supported: false };
        if (more) explanations[at] = `“más” (more) goes right before ${quote(adjective)} to compare.`;
        explanations[at + more] = own
          ? `${quote(adjective)} comes right after ${quote(verb)} with no “más”: it already means “${key(adjective).startsWith('mayor') ? 'older' : 'younger'}”.`
          : `${quote(adjective)} comes right after “más”.${oneKind ? ` ${agreementNote(adjective, subject, oneKind)}` : ''}`;
        explanations[at + more + 1] = `“que” (than) comes after ${quote(tokens.slice(at, at + more + 1).join(' '))}, before who you compare with.`;
        index = at + more + 2;
        if (NAME_KIND[key(tokens[index] || '')]) {
          explanations[index] = `${quote(tokens[index] || '')} comes last, right after “que”.`;
          index += 1;
        } else if (!(possessivePhrase() || nounPhrase())) {
          return { explanations, relations, supported: false };
        }
        complement = tokens.slice(at, index).join(' ');
        compared = true;
      }
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
        const shaded = shadeOf(index, subjectKind);
        if (shaded < 0) return { explanations, relations, supported: false };
        if (shaded || agrees(adjective, subjectKind)) {
          if (veryIndex >= 0) explanations[veryIndex] = `“muy” (very) goes right before ${quote(adjective)}.`;
          explanations[index] = `${quote(adjective)} comes after ${quote(verb)}. ${shaded ? shadedNote(adjective) : agreementNote(adjective, subject, subjectKind)}`;
          complement = adjective;
          index += 1 + shaded;
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
      if (!complement && !subject && SEASONS.has(key(word))) {
        explanations[index] = `${quote(word)} is the season: after “Es” it takes no article.`;
        complement = word;
        index += 1;
      }
      if (!complement && !subject && MASS.has(key(word))) {
        explanations[index] = `${quote(word)} is a food you do not count, so after “Es” it takes no article.`;
        complement = word;
        index += 1;
      }
      if (!complement && key(word) === 'de' && key(subject) === 'el precio') {
        // El precio es de cinco dólares: “de” before the amount.
        const at = index;
        index += 1;
        const amount = quantity();
        if (!amount || !/dólar/.test(amount)) return { explanations, relations, supported: false };
        explanations[at] = '“de” comes before the amount: “El precio es de …”.';
        complement = `de ${amount}`;
      }
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
        explanations[index] = `${quote(word)} is a plural, so after “son” it needs no article.${pluralNote(word)}`;
        index += 1;
      }
      if (!complement) return { explanations, relations, supported: false };
      relations.push({ start: verbIndex, end: index, explanation: compared
        ? `${quote(verb)} + the comparison: ${quote(complement)}.`
        : aboutColor
        ? `After ${quote(verb)} comes the color, named with “el”: ${quote(complement)}.`
        : ADJECTIVE_KIND[key(complement)]
        ? `After ${quote(verb)} comes the color or size, matching ${quote(subject)}: ${quote(complement)}.`
        : `After ${quote(verb)} comes ${thing ? 'what it is' : 'who they are'}: ${quote(complement)}.` });
    } else if (PRESENT.has(verbKey)) {
      // limpio la mesa, veo al gato sobre el sofá, vengo a casa, juego en el parque, trabajo.
      const start = index;
      if (verbKey === 'vamos' && key(tokens[index] || '') === 'a' && ACTIVITIES[key(tokens[index + 1] || '')]) {
        // Vamos a + the -r form: “Let's …”.
        explanations[verbIndex] = `${quote(verb)} (we go) starts “Vamos a …”, Spanish for “Let’s …”.`;
        explanations[index] = '“a” comes between “Vamos” and the activity.';
        index += 1;
        if (!activity()) return { explanations, relations, supported: false };
        dayPhrase();
        return done();
      }
      if (QUERER.has(verbKey) && ACTIVITIES[key(tokens[index] || '')]) {
        // ¿Quieres ver la tele? querer + the -r form.
        if (!activity()) return { explanations, relations, supported: false };
        dayPhrase();
        return done();
      }
      const adjunctNext = ['en', 'sobre', 'debajo', 'al', 'con'].includes(key(tokens[index] || '')) || (key(tokens[index] || '') === 'de' && key(tokens[index + 1] || '') === 'noche');
      if (index < tokens.length && !adjunctNext || key(tokens[index] || '') === 'al' && key(tokens[index + 1] || '') !== 'lado') {
        const object = timePhrase() || (['a', 'al'].includes(key(tokens[index] || '')) ? objectPhrase() : Boolean(items()));
        if (!object) return { explanations, relations, supported: false };
        relations.push({ start: verbIndex, end: index, explanation: `What comes right after the verb: ${quote(tokens.slice(start, index).join(' '))}.` });
      }
      if (!adjuncts()) return { explanations, relations, supported: false };
    } else if (ESTAR.has(verbKey) && ['en', 'sobre', 'debajo', 'al', 'a', 'cerca', 'lejos', 'enfrente', 'entre', 'cruzando'].includes(key(word))) {
      if (!locationPhrase()) return { explanations, relations, supported: false };
    } else if (TENER.has(verbKey)) {
      let had = '';
      if (AGES.has(key(word)) && key(tokens[index + 1] || '') === 'años') {
        explanations[index] = `${quote(word)} is the age, so it comes right after ${quote(verb)}.`;
        explanations[index + 1] = '“años” (years) comes after the number: Spanish says how many years someone has.';
        relations.push({ start: verbIndex, end: index + 2, explanation: `Age uses tener: ${quote(`${verb} ${word} años`)}, not ser.` });
        had = `${word} años`;
        index += 2;
      }
      if (!had && TENER_FEELINGS[key(word)]) {
        // Tengo hambre. Tengo hambre y sed. Ella tiene miedo.
        explanations[index] = `${quote(word)} comes right after ${quote(verb)} with no article: Spanish says ${quote(`${key(verb)} ${key(word)}`)} for “${TENER_FEELINGS[key(word)]}”.`;
        had = word;
        index += 1;
        if (key(tokens[index] || '') === 'y' && TENER_FEELINGS[key(tokens[index + 1] || '')]) {
          explanations[index] = `“y” joins ${quote(word)} and ${quote(tokens[index + 1] || '')}; both share ${quote(verb)}.`;
          explanations[index + 1] = `${quote(tokens[index + 1] || '')} (${TENER_FEELINGS[key(tokens[index + 1] || '')]}) also takes no article.`;
          had = `${word} y ${tokens[index + 1]}`;
          index += 2;
        }
      }
      if (!had && key(word) === 'barba') {
        explanations[index] = `“barba” (a beard) takes no article after ${quote(verb)}: Spanish says ${quote(`${key(verb)} barba`)}.`;
        had = word;
        index += 1;
      }
      if (!had) had = items();
      if (!had && NOUN_KIND[key(word)]?.endsWith('plural')) {
        explanations[index] = `${quote(word)} is a plural, so after ${quote(verb)} it needs no article.`;
        had = word;
        index += 1;
      }
      if (!had) return { explanations, relations, supported: false };
      if (!AGES.has(key(word))) relations.push({ start: verbIndex, end: index, explanation: `After ${quote(verb)} comes what someone has: ${quote(had)}.` });
    } else if (ESTAR.has(verbKey) && (FEELINGS[key(word)] || (key(word) === 'muy' && key(tokens[index + 1] || '') === 'bien'))) {
      // Estoy feliz. Ella está cansada. Estoy muy bien.
      const very = key(word) === 'muy' ? 1 : 0;
      const feeling = tokens[index + very] || '';
      const [english, kind] = FEELINGS[key(feeling)];
      const gender = subjectKinds.length === 1 && !subjectKinds[0].startsWith('any') ? subjectKinds[0].split(' ')[0] : '';
      if (kind !== 'any' && (verbPlural || (gender && !kind.startsWith(gender)))) return { explanations, relations, supported: false };
      if (very) explanations[index] = '“muy” (very) goes right before “bien”: “muy bien” is “great”.';
      explanations[index + very] = kind === 'any'
        ? `${quote(feeling)} (${very ? 'great' : english}) comes after ${quote(verb)}; it is the same for a man or a woman.`
        : `${quote(feeling)} (${english}) comes after ${quote(verb)}, and its ending matches ${gender ? quote(subject) : 'the speaker'} (${kind.split(' ')[0]}).`;
      relations.push({ start: verbIndex, end: index + very + 1, explanation: `How someone feels uses estar: ${quote(tokens.slice(verbIndex, index + very + 1).join(' '))}.` });
      index += very + 1;
    } else if (ACTIONS.has(key(word))) {
      explanations[index] = `${quote(word)} is the action, so it comes right after ${quote(verb)}.`;
      relations.push({ start: verbIndex, end: index + 1, explanation: `${quote(verb)} + the action: ${quote(`${verb} ${word}`)}.` });
      index += 1;
      if (index < tokens.length && key(tokens[index] || '') !== 'en') {
        const start = index;
        if (!items()) return { explanations, relations, supported: false };
        relations.push({ start: index - (index - start), end: index, explanation: `What comes after the action: ${quote(tokens.slice(start, index).join(' '))}.` });
      }
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
