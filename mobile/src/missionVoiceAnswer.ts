export type MissionAnswerSegmentState = 'plain' | 'pending' | 'heard' | 'good' | 'weak';
export type MissionAnswerSegment = { text: string; state: MissionAnswerSegmentState };

// Tokens follow pronunciationEngine.speechTokens: letters with an optional
// apostrophe part, in order, one word index per token.
const TOKEN = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;

// Splits the written mission answer into spans that keep the learner-facing
// capitalization and punctuation. Live recognition colors the syllables of the
// sentence itself and the final grade colors each word, so a mission voice gate
// shows the same feedback as a lesson Speak card without a second text row.
export function missionAnswerSegments(
  answer: string,
  syllables: ReadonlyArray<{ key: string; label: string; wordIndex: number }>,
  recognizedKeys: ReadonlyArray<string>,
  wordFeedback: ReadonlyArray<{ good: boolean }> | null,
  live: boolean,
): MissionAnswerSegment[] {
  const recognized = new Set(recognizedKeys);
  const segments: MissionAnswerSegment[] = [];
  let cursor = 0;
  let wordIndex = 0;
  for (const match of answer.matchAll(TOKEN)) {
    const start = match.index ?? cursor;
    if (start > cursor) segments.push({ text: answer.slice(cursor, start), state: 'plain' });
    const word = match[0];
    const feedback = wordFeedback?.[wordIndex];
    const parts = syllables.filter((syllable) => syllable.wordIndex === wordIndex);
    if (feedback) {
      segments.push({ text: word, state: feedback.good ? 'good' : 'weak' });
    } else if (!live) {
      segments.push({ text: word, state: 'plain' });
    } else if (parts.length && parts.reduce((total, part) => total + part.label.length, 0) === word.length) {
      let offset = 0;
      for (const part of parts) {
        segments.push({
          text: word.slice(offset, offset + part.label.length),
          state: recognized.has(part.key) ? 'heard' : 'pending',
        });
        offset += part.label.length;
      }
    } else {
      const heard = parts.length > 0 && parts.every((part) => recognized.has(part.key));
      segments.push({ text: word, state: heard ? 'heard' : 'pending' });
    }
    cursor = start + word.length;
    wordIndex += 1;
  }
  if (cursor < answer.length) segments.push({ text: answer.slice(cursor), state: 'plain' });
  return segments;
}
