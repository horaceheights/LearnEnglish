import type { LessonCard } from './types';

// These are teaching patterns, not guesses based on a word appearing in a card.
// Every word of a generated construction must belong to a supported pattern.
// The course-wide hint gate rejects new patterns until their explanation is added.
const words = (value: string) => value.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
const set = (value: string) => new Set(value.split(' '));
const DETERMINERS = set('a an the my your his her');
const NUMBERS = set('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty');
const COLORS = set('red blue green yellow black white');
const NOUNS = set('boy girl man woman baby babies child children adult adults brother brothers sister sisters father mother parents grandfather grandmother grandparents grandchildren family park restaurant hospital store house street bridge bus car cars bike book books pen pens chair chairs table phone phones bag bags kitchen bedroom room bed lamp door computer sofa apple apples banana grapes strawberry strawberries orange oranges egg eggs rice milk bread fish juice water chicken food breakfast lunch dinner tea coffee dollar dollars station pharmacy bank library train taxi head eyes mouth hands legs feet jacket shoes shirt dress socks boots umbrella hat name job face teeth help bathroom music school work night morning afternoon evening day mexico canada ana luis sofia english tv monday tuesday wednesday thursday friday saturday sunday');
for (const noun of words('teacher doctor nurse driver cook farmer left right')) NOUNS.add(noun);
const STATES = set('red blue green yellow black white happy sad tired hungry thirsty sunny rainy cold hot windy mexican spanish');
const PRONOUNS = set('i you he she it we they this that there');
const VERBS = set('am is are have has like want wants need needs do work works study wake get eat wash brush come go goes sleep drink walk can cannot leaves arrives');
const ACTIONS = set('eating drinking reading writing running walking swimming sitting sleeping playing studying working cooking talking watching listening');
const BE = set('am is are');

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
    let head = start;
    if (DETERMINERS.has(keys[head]) || NUMBERS.has(keys[head]) || keys[head] === 'some') head++;
    if (COLORS.has(keys[head])) head++;
    if (['living', 'dining'].includes(keys[head]) && keys[head + 1] === 'room') head++;
    if (head !== end - 1 || !NOUNS.has(keys[head])) return false;
    if (head > start) {
      const first = keys[start];
      const why = COLORS.has(first) || COLORS.has(keys[start + 1])
        ? `En ${quote(phrase(start, end))}, ${NUMBERS.has(first) ? 'la cantidad va primero, después el color y al final el nombre' : 'el color va antes del nombre que describe'}.`
        : NUMBERS.has(first) || first === 'some'
          ? `En ${quote(phrase(start, end))}, la cantidad va antes del nombre: primero cuánto hay y después qué es.`
          : ['my', 'your', 'his', 'her'].includes(first)
            ? `En ${quote(phrase(start, end))}, ${quote(tokens[start])} indica de quién es y va antes del nombre ${quote(phrase(start + 1, end))}.`
            : DETERMINERS.has(first)
              ? `En ${quote(phrase(start, end))}, ${quote(tokens[start])} acompaña al nombre ${quote(phrase(start + 1, end))} y va delante de él.`
              : `Para nombrar esta habitación usamos ${quote(phrase(start, end))}: ${quote(tokens[start])} indica qué tipo de ${quote(tokens[head])} es y va antes.`;
      teach(start, end, why);
    }
    return true;
  };
  const subject = (start: number, end: number) => {
    if (end === start + 1 && PRONOUNS.has(keys[start])) return true;
    const and = keys.indexOf('and', start);
    if (and > start && and < end) {
      if (!nominal(start, and) || !nominal(and + 1, end)) return false;
      teach(and, and + 1, `En ${quote(phrase(start, end))}, “and” une las dos personas o cosas y va entre ellas.`);
      return true;
    }
    return nominal(start, end);
  };
  const complement = (start: number, end: number, anchor: string): boolean => {
    if (start === end) return true;
    const tail = keys.slice(start, end).join(' ');
    const original = phrase(start, end);
    const anchorStart = start - words(anchor).length;
    if (anchorStart >= 0 && phrase(anchorStart, start).toLowerCase() === anchor.toLowerCase()) {
      const progressive = /^(am|is|are)( not)?$/i.exec(anchor);
      const isProgressive = progressive && ACTIONS.has(keys[start]);
      const describes = BE.has(anchor.toLowerCase());
      const object = ({ like: 'lo que nos gusta', want: 'lo que queremos', wants: 'lo que quiere', need: 'lo que necesitamos', needs: 'lo que necesita', have: 'lo que tenemos', has: 'lo que tiene', eating: 'lo que come', drinking: 'lo que bebe', eat: 'lo que comemos', drink: 'lo que bebemos', study: 'lo que estudiamos', watching: 'lo que mira' } as Record<string, string>)[anchor.toLowerCase()];
      relations.push({ start: anchorStart, end: isProgressive ? start + 1 : end, explanation: isProgressive
        ? `${quote(tokens[anchorStart])} es el auxiliar y ${quote(tokens[start])} el verbo principal en -ing. ${progressive[2]
          ? `“Not” va entre ambos: ${quote(phrase(anchorStart, start + 1))}.`
          : `Primero ${quote(tokens[anchorStart])} y después ${quote(tokens[start])}: ${quote(phrase(anchorStart, start + 1))}.`}`
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
    if (/^(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty) years old$/.test(tail)) {
      teach(start, end, `Para decir la edad, después de ${quote(anchor)} va el número y luego “years old”: ${quote(original)}.`);
      return true;
    }
    if (end - start === 2 && NUMBERS.has(keys[start]) && keys[start + 1] === "o'clock") {
      teach(start, end, `Para decir la hora, el número va antes de “o'clock”: ${quote(original)}.`);
      return true;
    }
    const prep = /^(next to|far from|in|on|under|near|from|by|at|for|to) (.+)$/.exec(tail);
    if (prep) {
      const length = words(prep[1]).length;
      const nounStart = start + length;
      const nextPrep = keys.findIndex((key, index) => index > nounStart && index < end && ['at', 'in', 'on', 'every'].includes(key));
      const nounEnd = nextPrep < 0 ? end : nextPrep;
      const location = phrase(nounStart, nounEnd);
      const relation = prep[1] === 'by' ? 'el medio de transporte'
        : prep[1] === 'for' ? 'la comida del día'
          : prep[1] === 'from' ? 'el lugar de origen'
            : prep[1] === 'to' && /listen/i.test(anchor) ? 'lo que escuchamos'
              : NUMBERS.has(keys[nounStart]) || /night|morning|afternoon|evening|day$/.test(keys[nounEnd - 1]) ? 'cuándo ocurre'
                : 'el lugar o la dirección';
      teach(start, nounEnd, `${quote(phrase(start, nounStart))} va antes de ${quote(location)}: introduce ${relation}. Juntos completan ${quote(anchor)}.`);
      const valid = (nounEnd === nounStart + 1 && (NUMBERS.has(keys[nounStart]) || ['left', 'right', 'there'].includes(keys[nounStart]))) || nominal(nounStart, nounEnd);
      return valid && (nextPrep < 0 || complement(nextPrep, end, phrase(start, nounEnd)));
    }
    if (tail === 'every day') {
      teach(start, end, '“Every day” significa todos los días: “every” va antes de “day”, y el grupo indica cuándo ocurre la acción.');
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
    if (ACTIONS.has(keys[start])) {
      teach(start, start + 1, `${quote(tokens[start])} expresa la acción; aquí va después de ${quote(anchor)}.`);
      if (keys[start] === 'listening' && keys[start + 1] === 'to') {
        teach(start, start + 2, 'En “listening to music”, “to” une “listening” con lo que escuchamos y va entre ambos.');
      }
      return complement(start + 1, end, tokens[start]);
    }
    // A noun group may be followed by where/when it occurs or a contrast.
    const boundary = keys.findIndex((key, index) => index > start && index < end && ['in', 'on', 'under', 'next', 'near', 'by', 'at', 'for', 'every', 'not'].includes(key));
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
  const fixed: Record<string, string> = {
    'thank you': '“Thank you” significa gracias: “thank” va antes de “you”, la persona a quien agradecemos.',
    'excuse me': '“Excuse me” significa disculpe: primero “excuse” y después “me”, quien pide permiso o atención.',
    'here you are': 'Para entregar algo decimos “Here you are”: primero “here”, después “you” y al final “are”. Es una expresión fija.',
    'sorry no': 'Para rechazar con cortesía, primero “Sorry” (lo siento) y después “no”: “Sorry, no”.',
    'no thank you': 'Para rechazar con cortesía, primero “No” y después agradecemos con “thank you”: “No, thank you”.',
    'yes thank you': 'Para aceptar con cortesía, primero “Yes” y después agradecemos con “thank you”: “Yes, thank you”.',
    // Lesson 3.3 teaches this current-action question as a fixed chunk; it does
    // not introduce generative do/does.
    'what are you doing': 'Para preguntar qué está haciendo alguien ahora decimos “What are you doing?”: primero “What”, luego “are”, después “you” y al final “doing”. Es una pregunta fija.',
  };
  if (fixed[joined]) {
    teach(0, keys.length, fixed[joined]);
    return { explanations, relations, supported: true };
  }
  if (/^(yes|water|juice|coffee) please$/.test(joined)) {
    teach(0, keys.length, `Primero ${quote(tokens[0])} indica lo que aceptamos o pedimos; después “please” añade cortesía: ${quote(tokens.join(' '))}.`);
    return { explanations, relations, supported: true };
  }
  if (/^please (repeat|speak slowly)$/.test(joined)) {
    teach(0, keys.length, `En esta petición, “Please” va antes de la acción ${quote(tokens[1])}${keys[2] ? '; “slowly” va después para indicar cómo hablar' : ' para pedirla con cortesía'}.`);
    return { explanations, relations, supported: true };
  }
  if (/^(go straight|turn (left|right)|stop at .+|cross .+)$/.test(joined)) {
    teach(0, keys.length, `Para dar esta indicación, primero va la acción ${quote(tokens[0])} y después ${quote(phrase(1, keys.length))}, que dice hacia dónde o dónde realizarla.`);
    const supported = ['go', 'turn'].includes(keys[0]) || complement(1, keys.length, tokens[0]);
    return { explanations, relations, supported };
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
  const question = /^(who|what|where|how old|how much) (am|is|are) (.+)$/.exec(joined);
  if (question && text.trim().endsWith('?')) {
    const verbIndex = words(question[1]).length;
    const subjectEnd = keys[keys.length - 1] === 'from' ? keys.length - 1 : keys.length;
    teach(0, keys.length, `En esta pregunta, primero ${quote(phrase(0, verbIndex))}, luego ${quote(tokens[verbIndex])} y después ${quote(phrase(verbIndex + 1, subjectEnd))}. El verbo va antes de quien preguntamos.`);
    if (verbIndex === 2) teach(0, 2, `“How ${tokens[1]}” pregunta ${keys[1] === 'old' ? 'la edad' : 'el precio'}: “How” va antes de ${quote(tokens[1])} y las dos palabras abren la pregunta.`);
    const supported = subject(verbIndex + 1, subjectEnd);
    if (subjectEnd < keys.length) teach(subjectEnd, keys.length, 'En “Where are you from?”, “Where” pregunta el lugar y “from” cierra la pregunta para indicar el origen.');
    return { explanations, relations, supported };
  }
  let start = 0;
  if (['first', 'then'].includes(keys[0])) {
    teach(0, 1, `${quote(tokens[0])} indica ${keys[0] === 'first' ? 'qué ocurre primero' : 'qué ocurre después'} y abre esta frase, antes de quien realiza la acción.`);
    start = 1;
  }
  const verbIndex = keys.findIndex((key, index) => index > start && VERBS.has(key));
  if (verbIndex < 0) {
    const supported = subject(start, keys.length);
    return { explanations, relations, supported: supported && explanations.every(Boolean) };
  }
  const verb = keys[verbIndex];
  const actionIndex = verbIndex + (keys[verbIndex + 1] === 'not' ? 2 : 1);
  const progressive = BE.has(verb) && ACTIONS.has(keys[actionIndex]);
  teach(start, keys.length, progressive
    ? `En esta afirmación, primero el sujeto ${quote(phrase(start, verbIndex))}, después el auxiliar ${quote(tokens[verbIndex])}${actionIndex > verbIndex + 1 ? ' y “not”' : ''}, y luego el verbo principal en -ing ${quote(tokens[actionIndex])}.`
    : `En esta afirmación, primero ${quote(phrase(start, verbIndex))}, luego ${quote(tokens[verbIndex])}${verbIndex + 1 < keys.length ? ` y después ${quote(phrase(verbIndex + 1, keys.length))}` : ''}: de quién hablamos va antes de lo que decimos de esa persona o cosa.`);
  teach(start, verbIndex + 1, progressive
    ? `En esta afirmación, el sujeto ${quote(phrase(start, verbIndex))} va antes de ${quote(tokens[verbIndex])}, el auxiliar del verbo ${quote(tokens[actionIndex])}.`
    : BE.has(verb)
    ? `En esta afirmación, primero ${quote(phrase(start, verbIndex))}, de quién hablamos, y después ${quote(tokens[verbIndex])}, que lo une con su descripción.`
    : `En esta afirmación, ${quote(phrase(start, verbIndex))} indica quién realiza la acción y va antes de ${quote(tokens[verbIndex])}.`);
  if (keys[start] === 'there') teach(start, verbIndex + 1, `Para decir que hay algo usamos ${quote(phrase(start, verbIndex + 1))}: “There” va primero, después ${quote(tokens[verbIndex])} y luego lo que hay.`);
  if (!subject(start, verbIndex)) return { explanations, relations, supported: false };
  let rest = verbIndex + 1;
  if (keys[rest] === 'not') {
    teach(rest, rest + 1, `“Not” niega lo que sigue; aquí va después de ${quote(tokens[verbIndex])} y antes de ${quote(tokens[rest + 1] || '')}.`);
    relations.push({ start: verbIndex, end: rest + 2, explanation: explanations[rest] });
    rest++;
  }
  if (['do', 'can', 'cannot'].includes(verb)) {
    if (!['like', 'understand', 'walk', 'turn', 'go', 'cross'].includes(keys[rest])) return { explanations, relations, supported: false };
    teach(rest, rest + 1, `${quote(tokens[rest])} es la acción y va después de ${quote(phrase(verbIndex, rest))}.`);
    const action = keys[rest++];
    if (rest === keys.length) return { explanations, relations, supported: true };
    if ((action === 'turn' && ['left', 'right'].includes(keys[rest])) || (action === 'walk' && keys[rest] === 'there')) {
      teach(rest, keys.length, `${quote(tokens[rest])} indica hacia dónde; va después de la acción ${quote(tokens[rest - 1])}.`);
      return { explanations, relations, supported: rest === keys.length - 1 };
    }
  }
  const pair = `${verb} ${keys[rest]}`;
  if (['wake up', 'get dressed', 'come home'].includes(pair)) {
    teach(verbIndex, rest + 1, `${quote(phrase(verbIndex, rest + 1))} expresa ${verb === 'wake' ? 'despertarse' : verb === 'get' ? 'vestirse' : 'volver a casa'}; ${quote(tokens[rest])} completa la acción y va después de ${quote(tokens[verbIndex])}.`);
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
  // A comma can join two complete statements, but does not split “No, thank
  // you”, a noun contrast, or the introductory “First,” / “Then,”.
  const clauses = target.replace(/,\s*(?=(?:he|she|it|they|we|you|i)\s+(?:am|is|are)\b)/gi, '. ').match(/[^.!?]+[.!?]?/g) || [];
  const plans = clauses.map(teachClause);
  const explanations = plans.flatMap(plan => plan.explanations);
  let offset = 0;
  const relations = plans.flatMap(plan => {
    const result = plan.relations.map(relation => ({ ...relation, start: relation.start + offset, end: relation.end + offset }));
    offset += plan.explanations.length;
    return result;
  });
  return {
    target,
    labels,
    tokenSlots,
    relations,
    explanations: tokenSlots.map(index => explanations[index] || ''),
    supported: slot === ids.length && labels.every(Boolean) && plans.length > 0 && plans.every(plan => plan.supported)
      && (!card.answer_audio_text || words(target).join(' ') === words(card.answer_audio_text).join(' ')),
  };
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
  return `Pusiste ${quote(actual[index])} donde va ${quote(plan.labels[index])}. ${why}`;
}
