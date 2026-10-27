import type { LessonCard, ChoiceOption } from './types';

// Shared language relationships. These describe words and task evidence, never
// lesson IDs, image filenames, or private per-card retry copy.
const clean = (value: string) => value.toLowerCase().replace(/’/g, "'").replace(/[.,!?]/g, '').trim();
const NUMBER: Record<string, string> = {one: 'una', two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis', seven: 'siete', eight: 'ocho', nine: 'nueve', ten: 'diez', eleven: 'once', twelve: 'doce'};
const FREQUENCY: Record<string, string> = {always: 'siempre', usually: 'habitualmente', sometimes: 'a veces', never: 'nunca', 'every day': 'todos los días'};
const PLACES: Record<string, string> = {home: 'casa', library: 'biblioteca', school: 'escuela', bedroom: 'dormitorio', kitchen: 'cocina'};
const ACTIONS = [
  {pattern: /\b(?:wake|wakes) up\b/, word: 'wake up', meaning: 'despertarse'},
  {pattern: /\b(?:get|gets) up\b/, word: 'get up', meaning: 'levantarse de la cama'},
  {pattern: /\b(?:go|goes) to bed\b/, word: 'go to bed', meaning: 'acostarse'},
  {pattern: /\b(?:take|takes) a shower\b/, word: 'take a shower', meaning: 'ducharse'},
  {pattern: /\b(?:put|puts) on\b/, word: 'put on', meaning: 'ponerse'},
  {pattern: /\b(?:take|takes) off\b/, word: 'take off', meaning: 'quitarse'},
  {pattern: /\b(?:leave|leaves) home\b/, word: 'leave home', meaning: 'salir de casa'},
  {pattern: /\b(?:arrive|arrives) home\b/, word: 'arrive home', meaning: 'llegar a casa'},
  {pattern: /\b(?:start|starts)(?: work)?\b/, word: 'start work', meaning: 'empezar a trabajar'},
  {pattern: /\b(?:finish|finishes)(?: work)?\b/, word: 'finish work', meaning: 'terminar de trabajar'},
  {pattern: /\bworks?\b/, word: 'work', meaning: 'trabajar'},
];
function action(text: string) { return ACTIONS.find(item => item.pattern.test(clean(text))); }
function actionPhrase(text: string): string {
  const found = action(text);
  if (found) return found.meaning + (/\bshoes\b/i.test(text) ? ' los zapatos' : /\bjacket\b/i.test(text) ? ' la chaqueta' : '');
  if (/\b(?:eat|eats|have|has) dinner\b/i.test(text) || clean(text) === 'dinner') return 'cenar';
  if (clean(text) === 'home') return 'llegar a casa';
  return '';
}
function questionKind(text: string): string {
  const value = clean(text);
  if (value.startsWith('how often')) return 'frecuencia';
  if (value.startsWith('what time')) return 'hora';
  if (value.startsWith('where')) return 'lugar';
  if (value.startsWith('when')) return 'momento';
  if (value.startsWith('why')) return 'motivo';
  return '';
}
function location(text: string): string {
  return /\bat (?:the )?(home|library|school|bedroom|kitchen)\b/.exec(clean(text))?.[1] || '';
}
function frequency(text: string): string {
  return /\b(always|usually|sometimes|never|every day)\b/.exec(clean(text))?.[1] || '';
}
function time(text: string): string {
  return /\b(?:at|to) (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.exec(clean(text))?.[1] || '';
}
function firstDifference(correct: string, wrong: string): [string, string] {
  const right = correct.split(/(?<=[.!?])\s+|,? but /i), selected = wrong.split(/(?<=[.!?])\s+|,? but /i);
  const index = right.findIndex((part, i) => clean(part) !== clean(selected[i] || ''));
  return index < 0 ? [correct, wrong] : [right[index], selected[index] || wrong];
}
function sequence(text: string): string[] {
  const parts = /^First,? (.+?)\. Then,? (.+?)[.!]?$/i.exec(text.trim());
  if (parts) return [parts[1], parts[2]].map(actionPhrase);
  const short = /^(.+?), then (.+?)[.!]?$/i.exec(text.trim());
  return short ? [short[1], short[2]].map(actionPhrase) : [];
}
function bounded(text: string): string { return text.length <= 140 ? text : ''; }

function imageMeaning(id: string): string {
  const text = clean(id.replace(/-/g, ' '));
  const name = /\b(ana|luis|sofia|diego)\b/.exec(text)?.[1];
  const person = name ? name[0].toUpperCase() + name.slice(1) + ': ' : '';
  const clock = /\b(?:at|clock) (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.exec(text)?.[1];
  const clockNumber = /\bat (\d+) 0$/.exec(text)?.[1];
  const clockWord = clock || (clockNumber ? Object.keys(NUMBER)[Number(clockNumber) - 1] : '');
  const freq = frequency(text), place = /\b(home|library)\b/.exec(text)?.[1];
  if (/\brecord\b/.test(text)) {
    if (/\bevery day\b/.test(text)) return 'estudiar todos los días';
    if (/\bsome days\b/.test(text)) return 'estudiar solo algunos días';
    if (freq && place) return `estudiar ${FREQUENCY[freq]} en ${PLACES[place]}`;
    if (/\bhome before dinner\b/.test(text)) return 'llegar a casa antes de cenar';
    if (/\bdinner before home\b/.test(text)) return 'cenar antes de llegar a casa';
    return '';
  }
  const act = action(text);
  if (/\bsetting only\b/.test(text)) return ''; // A bathroom alone cannot show a shower action.
  if (act) return person + actionPhrase(text) + (clockWord ? ` a las ${NUMBER[clockWord]}` : '');
  if (/\bhas dinner\b/.test(text)) return person + 'cenar';
  if (/\bawake in bed\b/.test(text)) return person + 'estar despierto en la cama';
  if (/\bsleeping\b/.test(text)) return person + 'dormir';
  if (/\bshoes fully on\b|\bshoes on\b/.test(text)) return person + 'los zapatos ya puestos';
  if (/\bwearing jacket\b|\bjacket fully on\b/.test(text)) return person + 'la chaqueta puesta';
  if (/\bjacket off\b|\bjacket removed\b/.test(text)) return person + 'la chaqueta quitada';
  if (/\bshoes before\b|\bbefore shoes\b/.test(text)) return person + 'antes de ponerse los zapatos';
  if (/\bstud(?:y|ies|ying)\b/.test(text) && place) return person + `estudiar en ${PLACES[place]}`;
  if (/\bmeeting agreed\b|\baccepts at\b/.test(text) && place) return `un encuentro acordado en ${PLACES[place]}`;
  return '';
}

export function relationalChoiceHint(card: LessonCard, correctOption: ChoiceOption, wrongOption: ChoiceOption): string {
  const correct = correctOption.label || '', wrong = wrongOption.label || '';
  if (!correct && !wrong && correctOption.image_url && wrongOption.image_url) {
    const concepts = `${correctOption.id} ${wrongOption.id}`.replace(/-/g, ' ');
    if (!/\b(?:record|before|after|usual|today|awake|works at school)\b/.test(concepts)
        && !ACTIONS.slice(0, -1).some(item => item.pattern.test(concepts))) return '';
    const expected = imageMeaning(correctOption.id), chosen = imageMeaning(wrongOption.id);
    if (expected && chosen && expected !== chosen) return bounded(`Elegiste ${chosen}; corresponde ${expected}.`);
    // A setting-only option can supply a semantic label, but cannot establish
    // that the pictured person performs it. Explain only the written phrase.
    if (card.stage === 'Recognize' && /\bsetting only\b/.test(concepts)) {
      const wantedAction = action(correctOption.id.replace(/-/g, ' '));
      const chosenAction = action(wrongOption.id.replace(/-/g, ' '));
      if (wantedAction && chosenAction && action(card.prompt)?.word === wantedAction.word) {
        return bounded(`“${chosenAction.word}” es ${chosenAction.meaning}; el texto pide “${wantedAction.word}” (${wantedAction.meaning}).`);
      }
    }
  }
  if (!correct || !wrong) return '';
  const right = clean(correct), selected = clean(wrong), heard = clean(card.audio_text || '');
  const [rightPart, wrongPart] = firstDifference(correct, wrong);
  const rightAction = action(rightPart), wrongAction = action(wrongPart);
  const rightNegative = /\b(?:doesn't|does not)\b/.test(rightPart), wrongNegative = /\b(?:doesn't|does not)\b/.test(wrongPart);
  if (rightNegative !== wrongNegative) {
    return rightNegative
      ? '“Does not” o “doesn’t” niega la acción. Tu opción la afirma; conserva qué acción o dato se niega.'
      : 'Tu opción niega la acción con “does not” o “doesn’t”; aquí la respuesta la confirma.';
  }
  if (rightNegative && wrongNegative) {
    const rightTime = time(rightPart), wrongTime = time(wrongPart);
    if (rightTime && wrongTime && rightTime !== wrongTime) return `La negación descarta las ${NUMBER[rightTime]}; tu opción descarta las ${NUMBER[wrongTime]}. No confundas la hora negada con la hora real.`;
  }
  const rightQuestion = questionKind(correct), wrongQuestion = questionKind(wrong);
  if (rightQuestion && wrongQuestion) {
    if (heard.includes(right)) {
      if (rightQuestion !== wrongQuestion) return `Escuchaste una pregunta por ${rightQuestion}; tu opción pregunta por ${wrongQuestion}.`;
      if (rightAction && wrongAction && rightAction.word !== wrongAction.word) {
        return bounded(`La pregunta que escuchaste trata de ${rightAction.meaning}; tu opción pregunta por ${wrongAction.meaning}.`);
      }
    }
    if (rightQuestion !== wrongQuestion) return `Tu pregunta pide ${wrongQuestion}; falta ${rightQuestion}. “${correct.split(/\b(?:do|does|is|are)\b/i)[0].trim()}” pregunta por ${rightQuestion}.`;
    if (/\btoday\b/.test(right) && /\busually\b/.test(selected)) return '“Usually” pregunta por la rutina; falta saber dónde está hoy. “Today” pregunta por la situación de hoy.';
    if (rightAction && wrongAction && rightAction.word !== wrongAction.word && ['hora', 'momento'].includes(rightQuestion)) {
      return bounded(`Falta saber cuándo ${rightAction.meaning}; tu pregunta pide cuándo ${wrongAction.meaning}. Son datos distintos.`);
    }
  }
  const rightSequence = sequence(correct), wrongSequence = sequence(wrong);
  if (rightSequence.length === 2 && wrongSequence.length === 2 && rightSequence.every(Boolean)
      && rightSequence[0] === wrongSequence[1] && rightSequence[1] === wrongSequence[0]) {
    return bounded(`Tu opción invierte el orden: primero ${rightSequence[0]}, después ${rightSequence[1]}.`);
  }
  const rightOrder = /\b(before|after)\b/.exec(right)?.[1], wrongOrder = /\b(before|after)\b/.exec(selected)?.[1];
  if (rightOrder && wrongOrder && rightOrder !== wrongOrder) {
    return `“${wrongOrder}” significa ${wrongOrder === 'before' ? 'antes' : 'después'}; aquí la relación es “${rightOrder}” (${rightOrder === 'before' ? 'antes' : 'después'}).`;
  }
  if (right.startsWith("let's meet") && !heard.includes(right)) {
    const rightTime = time(correct), wrongTime = time(wrong);
    const rightPlace = location(correct), wrongPlace = location(wrong);
    if (rightPlace && wrongPlace && rightPlace !== wrongPlace && /\btoday\b/.test(heard)) {
      return `La visita debe usar el lugar de hoy: ${PLACES[rightPlace]}. Tu opción mantiene ${PLACES[wrongPlace]}, que no coincide con la actualización.`;
    }
    if (rightTime && wrongTime && rightTime !== wrongTime) {
      const beforeDinner = /\b(?:eat|have) dinner at\b/.test(heard) && /\bantes\b/i.test(card.context_es || '');
      if (beforeDinner) return `Cenar es a las ${NUMBER[wrongTime]}; para reunirse antes, propone las ${NUMBER[rightTime]}. Tu opción coincide con la cena.`;
      const numbers = Object.keys(NUMBER);
      const arrival = [...heard.matchAll(/\barriv(?:e|es) home at (\w+)\b/g)].map(match => match[1])
        .find(value => numbers.indexOf(value) > numbers.indexOf(wrongTime) && numbers.indexOf(value) <= numbers.indexOf(rightTime));
      if (arrival) return `La llegada es a las ${NUMBER[arrival]}; las ${NUMBER[wrongTime]} es demasiado pronto. Las ${NUMBER[rightTime]} respeta la llegada.`;
      const finish = [...heard.matchAll(/\bfinish(?:es)?(?: work)? at (\w+)\b/g)].map(match => match[1])
        .find(value => numbers.indexOf(value) > numbers.indexOf(wrongTime) && numbers.indexOf(value) <= numbers.indexOf(rightTime));
      if (finish) return `El trabajo termina a las ${NUMBER[finish]}; las ${NUMBER[wrongTime]} es demasiado pronto. Las ${NUMBER[rightTime]} respeta ese límite.`;
      const end = /\bwork from \w+ to (\w+)\b/.exec(heard)?.[1];
      if (end && NUMBER[end]) return `El trabajo termina a las ${NUMBER[end]}. A las ${NUMBER[wrongTime]} sigue trabajando; las ${NUMBER[rightTime]} queda después del trabajo.`;
      return ''; // A proposed time needs actual availability evidence, not a guessed rule.
    }
    const rightDay = /\bon (saturday|sunday)\b/.exec(right)?.[1], wrongDay = /\bon (saturday|sunday)\b/.exec(selected)?.[1];
    if (rightDay && wrongDay && rightDay !== wrongDay) return `La propuesta debe respetar el día disponible: ${rightDay === 'sunday' ? 'domingo' : 'sábado'}, no ${wrongDay === 'sunday' ? 'domingo' : 'sábado'}.`;
  }
  // Compare the stated habit, its place and its scope, rather than reducing
  // “every day” to day versus night or “usually” to a location word.
  const rightFrequency = frequency(rightPart), wrongFrequency = frequency(wrongPart);
  if ((rightFrequency === 'every day' && /\bat night\b/.test(selected) && !/\bat night\b/.test(right))
      || (wrongFrequency === 'every day' && /\bat (?:home|night)\b/.test(right) && !/\bat (?:home|night)\b/.test(selected))) {
    return rightFrequency === 'every day'
      ? '“Every day” indica todos los días. Tu opción habla de la noche; no responde con qué frecuencia ocurre.'
      : '“Every day” indica todos los días. Aquí importa dónde estudia siempre, no si estudia todos los días.';
  }
  if (rightFrequency && wrongFrequency && rightFrequency !== wrongFrequency) {
    return `“${wrongFrequency}” significa ${FREQUENCY[wrongFrequency]}; aquí se indica “${rightFrequency}” (${FREQUENCY[rightFrequency]}).`;
  }
  if (rightFrequency && wrongFrequency === rightFrequency) {
    const rp = location(rightPart), wp = location(wrongPart);
    if (rp && wp && rp !== wp) return `El lugar donde estudia ${FREQUENCY[rightFrequency]} es ${PLACES[rp]}; tu opción intercambia ese lugar con ${PLACES[wp]}.`;
  }
  if (/\b(?:usually|today)\b/.test(heard) && /\b(?:usually|today)\b/.test(right + selected)) {
    const rp = location(rightPart), wp = location(wrongPart);
    if (rp && wp && rp !== wp && /\btoday\b/.test(rightPart)) return `“Today” indica hoy: está en ${PLACES[rp]}. Tu opción usa ${PLACES[wp]}; no confundas el lugar habitual con el de hoy.`;
  }
  if (/\btoday\b/.test(heard) && /^no\b/.test(right) && /^yes\b/.test(selected)) {
    const rp = location(right), wp = location(selected);
    if (rp && wp && rp !== wp) return `La pregunta es por hoy: está en ${PLACES[rp]}, no en ${PLACES[wp]}. La rutina habitual no prueba dónde está hoy.`;
  }
  if ((rightFrequency === 'every day' && /\bat night\b/.test(selected))
      || (wrongFrequency === 'every day' && /\bat (?:home|night)\b/.test(right))) {
    return rightFrequency === 'every day'
      ? '“Every day” indica todos los días. Tu opción habla de la noche; no responde con qué frecuencia ocurre.'
      : '“Every day” indica todos los días. Aquí se pregunta por el lugar o la noche, no por cuántos días ocurre.';
  }
  if (rightNegative && wrongNegative && location(rightPart) && location(wrongPart)
      && location(rightPart) !== location(wrongPart)) {
    return `La negación descarta ${PLACES[location(rightPart)]}; tu opción descarta ${PLACES[location(wrongPart)]}. Conserva qué lugar se niega.`;
  }
  if (rightAction && wrongAction && rightAction.word !== wrongAction.word) {
    return bounded(`“${wrongAction.word}” es ${wrongAction.meaning}; “${rightAction.word}” es ${rightAction.meaning}. Son acciones distintas.`);
  }
  const rightTime = time(rightPart), wrongTime = time(wrongPart);
  const rightInterval = /^from (\w+) to (\w+)$/.exec(right), wrongInterval = /^from (\w+) to (\w+)$/.exec(selected);
  if (rightInterval && wrongInterval) {
    const index = rightInterval[1] === wrongInterval[1] ? 2 : 1;
    const expected = NUMBER[rightInterval[index]], chosen = NUMBER[wrongInterval[index]];
    if (expected && chosen) return `“${index === 1 ? 'From' : 'To'}” marca ${index === 1 ? 'el inicio' : 'el final'}: las ${expected}, no las ${chosen}. Conserva ambos extremos del horario.`;
  }
  if (rightTime && wrongTime && rightTime !== wrongTime && (rightAction || /\bfrom\b/.test(heard))) {
    const subject = /^(Ana|Luis|Sofia|Diego|She|He)\b/.exec(rightPart)?.[1];
    if (subject && card.audio_turns && card.audio_turns.length > 1) {
      const person = subject === 'She' ? 'Ella' : subject === 'He' ? 'Él' : subject;
      return `${person} tiene esa acción a las ${NUMBER[rightTime]}; tu opción le asigna las ${NUMBER[wrongTime]}. Conserva quién dice cada horario.`;
    }
    if (/\bfrom\b/.test(heard) && rightAction?.word === 'finish work') return `En “from … to …”, “to” marca el final: las ${NUMBER[rightTime]}. Tu opción usa las ${NUMBER[wrongTime]} para terminar.`;
    if (rightAction) return `La hora de ${rightAction.meaning} es las ${NUMBER[rightTime]}, no las ${NUMBER[wrongTime]}. No la cambies por la de otra acción.`;
  }
  if (/\b(?:ok|no thank you)\b/.test(right) && /\b(?:ok|no thank you)\b/.test(selected)
      && right.includes('ok') !== selected.includes('ok')) {
    return right.includes('ok') ? '“OK” acepta la propuesta; “No, thank you” la rechaza. Aquí se acepta.' : '“No, thank you” rechaza la propuesta; “OK” la acepta. Aquí se rechaza.';
  }
  if (right === 'why not' && wrongQuestion === 'hora') return '“Why not?” pide el motivo del rechazo. “What time?” pide una hora, pero aún falta entender por qué dice que no.';
  return '';
}
