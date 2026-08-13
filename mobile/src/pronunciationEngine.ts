import type { PronunciationResult, WordScore } from './types';

const FILLERS = new Set(['ah', 'er', 'hmm', 'mhm', 'uh', 'um']);
// Green means the sound was actually clear enough, not merely that Azure's
// reference-biased recognizer predicted the expected spelling.
const LIVE_SYLLABLE_MINIMUM_SCORE = 55;

const COURSE_SYLLABLE_PARTS: Record<string, string[]> = {
  adult: ['ad', 'ult'],
  adults: ['ad', 'ults'],
  babies: ['ba', 'bies'],
  baby: ['ba', 'by'],
  brother: ['bro', 'ther'],
  brothers: ['bro', 'thers'],
  building: ['build', 'ing'],
  children: ['chil', 'dren'],
  cooking: ['cook', 'ing'],
  eating: ['eat', 'ing'],
  family: ['fam', 'i', 'ly'],
  father: ['fa', 'ther'],
  grandfather: ['grand', 'fa', 'ther'],
  grandmother: ['grand', 'mo', 'ther'],
  grandparents: ['grand', 'par', 'ents'],
  listen: ['lis', 'ten'],
  mother: ['mo', 'ther'],
  parents: ['par', 'ents'],
  playing: ['play', 'ing'],
  reading: ['read', 'ing'],
  running: ['run', 'ning'],
  sister: ['sis', 'ter'],
  sisters: ['sis', 'ters'],
  sitting: ['sit', 'ting'],
  sleeping: ['sleep', 'ing'],
  standing: ['stand', 'ing'],
  studying: ['stud', 'y', 'ing'],
  swimming: ['swim', 'ming'],
  talking: ['talk', 'ing'],
  walking: ['walk', 'ing'],
  woman: ['wo', 'man'],
  working: ['work', 'ing'],
  writing: ['writ', 'ing'],
};

export type ReferenceSyllable = {
  key: string;
  label: string;
  syllableIndex: number;
  word: string;
  wordIndex: number;
};

export type LiveSyllableEvidence = {
  heard: Array<ReferenceSyllable & { score?: number }>;
  recognizedKeys: string[];
};

export function speechTokens(text: string): string[] {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[’]/g, "'")
    .match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function readableSyllables(word: string): string[] {
  const normalized = speechTokens(word)[0] ?? word.toLocaleLowerCase('en-US');
  const curated = COURSE_SYLLABLE_PARTS[normalized];
  if (curated) return curated;

  if (normalized.endsWith('ing') && normalized.length > 5) {
    const stem = normalized.slice(0, -3);
    const final = stem.at(-1);
    const preceding = stem.at(-2);
    if (final && final === preceding) {
      return [stem.slice(0, -1), `${final}ing`];
    }
    return [stem, 'ing'];
  }
  return [normalized];
}

function matchingSyllableRange(slots: ReferenceSyllable[], observedToken: string): ReferenceSyllable[] {
  const normalized = speechTokens(observedToken)[0] ?? observedToken.toLocaleLowerCase('en-US');
  // Live green feedback is deliberately exact. A similar word such as
  // "talking" must never complete target "walking".
  for (let start = 0; start < slots.length; start += 1) {
    let combined = '';
    for (let end = start; end < slots.length; end += 1) {
      combined += slots[end].label;
      if (normalized === combined) return slots.slice(start, end + 1);
    }
  }
  return [];
}

function targetWordIndexForToken(
  expectedWords: string[],
  slots: ReferenceSyllable[],
  observedToken: string,
  cursor: number,
): number {
  const exactFromCursor = expectedWords.findIndex(
    (word, index) => index >= cursor && observedToken === word,
  );
  if (exactFromCursor >= 0) return exactFromCursor;

  const exactAnywhere = expectedWords.findIndex((word) => observedToken === word);
  if (exactAnywhere >= 0) return exactAnywhere;

  const candidateIndexes = expectedWords.map((_, index) => index);
  const orderedIndexes = [
    ...candidateIndexes.filter((index) => index >= cursor),
    ...candidateIndexes.filter((index) => index < cursor).reverse(),
  ];
  return orderedIndexes.find((wordIndex) => (
    matchingSyllableRange(slots.filter((slot) => slot.wordIndex === wordIndex), observedToken).length > 0
  )) ?? -1;
}

export function referenceSyllables(text: string): ReferenceSyllable[] {
  return speechTokens(text).flatMap((word, wordIndex) =>
    readableSyllables(word).map((label, syllableIndex) => ({
      key: `${wordIndex}:${syllableIndex}`,
      label,
      syllableIndex,
      word,
      wordIndex,
    })),
  );
}

/**
 * Converts one finalized Azure segment into child-readable syllable evidence.
 * The segment transcript is intentionally not deduplicated, so repetitions
 * remain visible while recognizedKeys identifies the target slots completed.
 */
export function liveSyllableEvidence(
  referenceText: string,
  assessmentJson: string,
  segmentText = '',
): LiveSyllableEvidence {
  const expectedWords = speechTokens(referenceText);
  const slots = referenceSyllables(referenceText);
  const observedTokens = speechTokens(segmentText);

  // Interim transcripts have no pronunciation evidence. They are useful for
  // explicit fragments ("walk", "ing"), but a finalized Azure payload must
  // be evaluated from its scored syllables instead of its reference-biased
  // transcript.
  if (observedTokens.length && !assessmentJson) {
    const heard: LiveSyllableEvidence['heard'] = [];
    const recognizedKeys: string[] = [];
    let expectedCursor = 0;
    for (const [observedIndex, observedToken] of observedTokens.entries()) {
      const wordIndex = targetWordIndexForToken(expectedWords, slots, observedToken, expectedCursor);
      const wordSlots = slots.filter((slot) => slot.wordIndex === wordIndex);
      const matchedSlots = wordIndex >= 0 && tokenMatches(observedToken, expectedWords[wordIndex])
        ? wordSlots
        : matchingSyllableRange(wordSlots, observedToken);
      if (matchedSlots.length) {
        heard.push(...matchedSlots);
        recognizedKeys.push(...matchedSlots.map((slot) => slot.key));
        if (matchedSlots.at(-1)?.syllableIndex === wordSlots.at(-1)?.syllableIndex) {
          expectedCursor = Math.max(expectedCursor, wordIndex + 1);
        } else {
          expectedCursor = wordIndex;
        }
      } else {
        heard.push({
          key: `extra:${observedIndex}:${observedToken}`,
          label: observedToken,
          syllableIndex: 0,
          word: observedToken,
          wordIndex: -1,
        });
      }
    }
    return { heard, recognizedKeys: [...new Set(recognizedKeys)] };
  }

  if (!assessmentJson) return { heard: [], recognizedKeys: [] };

  let assessmentResult: PronunciationResult;
  try {
    assessmentResult = normalizeNativeAssessment(assessmentJson);
  } catch {
    return { heard: [], recognizedKeys: [] };
  }

  const heard: LiveSyllableEvidence['heard'] = [];
  const recognizedKeys: string[] = [];
  let expectedCursor = 0;
  for (const assessedWord of (assessmentResult.text_score?.word_score_list ?? [])) {
    const errorType = assessedWord.error_type?.toLocaleLowerCase('en-US');
    if (errorType === 'omission' || errorType === 'insertion') continue;
    const assessedToken = speechTokens(assessedWord.word ?? '')[0];
    const wordIndex = assessedToken
      ? targetWordIndexForToken(expectedWords, slots, assessedToken, expectedCursor)
      : -1;
    // Never map an unrelated recognized word to the expected word merely
    // because it occupies the same sentence position (reading != walking).
    if (wordIndex < 0) continue;

    const wordSlots = slots.filter((slot) => slot.wordIndex === wordIndex);
    const assessedSyllables = assessedWord.syllable_score_list ?? [];
    if (!assessedSyllables.length && wordSlots.length === 1 && (assessedWord.quality_score ?? 0) >= LIVE_SYLLABLE_MINIMUM_SCORE) {
      const slot = wordSlots[0];
      heard.push({ ...slot, score: assessedWord.quality_score });
      recognizedKeys.push(slot.key);
      expectedCursor = Math.max(expectedCursor, wordIndex + 1);
      continue;
    }

    let nextSyllableIndex = 0;
    for (const [syllableIndex, syllable] of assessedSyllables.entries()) {
      const score = syllable.quality_score;
      if (typeof score !== 'number' || score < LIVE_SYLLABLE_MINIMUM_SCORE) continue;
      const matchingSlots = syllable.letters
        ? matchingSyllableRange(wordSlots.slice(nextSyllableIndex), syllable.letters)
        : [];
      const selectedSlots = matchingSlots.length
        ? matchingSlots
        : (wordSlots[syllableIndex] ? [wordSlots[syllableIndex]] : []);
      if (selectedSlots.length) {
        heard.push(...selectedSlots.map((slot) => ({ ...slot, score })));
        recognizedKeys.push(...selectedSlots.map((slot) => slot.key));
        nextSyllableIndex = (selectedSlots.at(-1)?.syllableIndex ?? nextSyllableIndex) + 1;
      } else if (syllable.letters) {
        // Preserve an extra/repeated Azure syllable without claiming that it
        // completed an expected slot.
        heard.push({
          key: `extra:${wordIndex}:${syllableIndex}:${syllable.letters}`,
          label: syllable.letters,
          score,
          syllableIndex,
          word: expectedWords[wordIndex],
          wordIndex,
        });
      }
    }
    if (nextSyllableIndex >= wordSlots.length) expectedCursor = Math.max(expectedCursor, wordIndex + 1);
  }
  return { heard, recognizedKeys: [...new Set(recognizedKeys)] };
}

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function tokenMatches(observed: string, expected: string): boolean {
  if (observed === expected) return true;
  if (expected.length <= 3) return false;
  return editDistance(observed, expected) <= 1;
}

export type PhraseProgress = {
  completed: boolean;
  matchedCount: number;
  tokens: string[];
};

function matchObservedTokens(observed: string[], expected: string[]): number {
  let observedIndex = 0;
  let expectedIndex = 0;
  while (observedIndex < observed.length && expectedIndex < expected.length) {
    const token = observed[observedIndex];
    if (FILLERS.has(token)) {
      observedIndex += 1;
      continue;
    }
    if (expectedIndex > 0 && tokenMatches(token, expected[expectedIndex - 1])) {
      observedIndex += 1;
      continue;
    }
    if (tokenMatches(token, expected[expectedIndex])) {
      expectedIndex += 1;
      observedIndex += 1;
      continue;
    }

    // Final recognition can split a deliberately segmented word into multiple
    // tokens ("stop ping" or "stud ying"). Rejoin up to three finalized
    // fragments before deciding that the expected word was absent.
    let matchedFragments = 0;
    let combined = '';
    for (let fragmentCount = 1; fragmentCount <= 3 && observedIndex + fragmentCount <= observed.length; fragmentCount += 1) {
      combined += observed[observedIndex + fragmentCount - 1];
      if (tokenMatches(combined, expected[expectedIndex])) {
        matchedFragments = fragmentCount;
        break;
      }
    }
    if (matchedFragments) {
      expectedIndex += 1;
      observedIndex += matchedFragments;
      continue;
    }
    observedIndex += 1;
  }
  return expectedIndex;
}

function containsSegmentedMatch(observed: string[], expected: string): boolean {
  for (let start = 0; start < observed.length; start += 1) {
    let combined = observed[start];
    for (let count = 2; count <= 3 && start + count <= observed.length; count += 1) {
      combined += observed[start + count - 1];
      if (tokenMatches(combined, expected)) return true;
    }
  }
  return false;
}

const LIVE_WORD_MINIMUM_SCORE = 15;
const LIVE_FINAL_SOUND_MINIMUM_SCORE = 20;

function hasArticulationEvidence(word: WordScore): boolean {
  if (word.error_type?.toLocaleLowerCase('en-US') === 'omission') return false;

  const syllableScores = (word.syllable_score_list ?? [])
    .map((syllable) => syllable.quality_score)
    .filter((score): score is number => typeof score === 'number');
  if (syllableScores.length) {
    // A word is not complete when Azure heard its opening but scored a later
    // syllable as missing (for example "talk" instead of "talk-ing").
    if (syllableScores.some((score) => score < LIVE_WORD_MINIMUM_SCORE)) return false;
    if (syllableScores[syllableScores.length - 1] < LIVE_FINAL_SOUND_MINIMUM_SCORE) return false;
  }

  const phoneScores = (word.phone_score_list ?? [])
    .map((phone) => phone.quality_score)
    .filter((score): score is number => typeof score === 'number');
  if (phoneScores.length) {
    const supportedPhones = phoneScores.filter((score) => score >= LIVE_WORD_MINIMUM_SCORE).length;
    if (supportedPhones / phoneScores.length < 0.65) return false;
    if (phoneScores[phoneScores.length - 1] < LIVE_FINAL_SOUND_MINIMUM_SCORE) return false;
  }

  const wordScore = word.quality_score;
  return typeof wordScore === 'number' && wordScore >= LIVE_WORD_MINIMUM_SCORE;
}

/**
 * Aligns recognition hypotheses to the known sentence. Fillers, false starts,
 * repeated words, and self-corrections do not advance or penalize progress.
 */
export function alignExpectedPhrase(referenceText: string, recognizedText: string): PhraseProgress {
  const expected = speechTokens(referenceText);
  const observed = speechTokens(recognizedText);
  const expectedIndex = matchObservedTokens(observed, expected);

  return {
    completed: expected.length > 0 && expectedIndex === expected.length,
    matchedCount: expectedIndex,
    tokens: expected,
  };
}

/**
 * Confirms live progress using pronunciation-assessment evidence. A speech
 * transcript is a prediction and can expand "talk" into "talking"; syllable
 * and phoneme scores tell us whether the learner actually produced the rest.
 */
export function assessedPhraseProgress(
  referenceText: string,
  recognizedText: string,
  assessmentJson: string,
  previouslyConfirmedCount = 0,
): PhraseProgress {
  const transcriptProgress = alignExpectedPhrase(referenceText, recognizedText);
  const confirmedStart = Math.min(
    Math.max(0, previouslyConfirmedCount),
    transcriptProgress.tokens.length,
  );
  if (!assessmentJson) {
    return { ...transcriptProgress, completed: false, matchedCount: confirmedStart };
  }

  let assessmentResult: PronunciationResult;
  try {
    assessmentResult = normalizeNativeAssessment(assessmentJson, recognizedText);
  } catch {
    return { ...transcriptProgress, completed: false, matchedCount: confirmedStart };
  }

  const expected = transcriptProgress.tokens;
  const assessedWords = assessmentResult.text_score?.word_score_list ?? [];
  let expectedIndex = confirmedStart;

  for (const assessedWord of assessedWords) {
    if (expectedIndex >= expected.length || expectedIndex >= transcriptProgress.matchedCount) break;
    const observed = speechTokens(assessedWord.word ?? '')[0];
    if (!observed) continue;
    if (FILLERS.has(observed)) continue;
    if (expectedIndex > 0 && tokenMatches(observed, expected[expectedIndex - 1])) continue;
    if (!tokenMatches(observed, expected[expectedIndex])) continue;
    if (!hasArticulationEvidence(assessedWord)) break;
    expectedIndex += 1;
  }

  if (
    expectedIndex < transcriptProgress.matchedCount
    && expectedIndex < expected.length
    && containsSegmentedMatch(speechTokens(recognizedText), expected[expectedIndex])
    && assessedWords.some(hasArticulationEvidence)
  ) {
    // A finalized Azure chunk can contain only the latter half of a slowly
    // segmented word. The cumulative finalized transcript supplies the joined
    // spelling; segment evidence from the chunk prevents interim predictions
    // from turning the word green prematurely.
    expectedIndex += 1;
  }

  return {
    completed: expected.length > 0 && expectedIndex === expected.length,
    matchedCount: expectedIndex,
    tokens: expected,
  };
}

function assessment(value: Record<string, unknown> | undefined) {
  const nested = value?.PronunciationAssessment;
  return (nested && typeof nested === 'object' ? nested : value) as Record<string, unknown> | undefined;
}

function numeric(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function normalizeNativeAssessment(json: string, recognizedText = ''): PronunciationResult {
  const payload = JSON.parse(json) as Record<string, unknown>;
  const best = ((payload.NBest as Record<string, unknown>[] | undefined) ?? [{}])[0];
  const overall = assessment(best);
  const words = ((best.Words as Record<string, unknown>[] | undefined) ?? []).map<WordScore>((word) => {
    const wordAssessment = assessment(word);
    const syllables = ((word.Syllables as Record<string, unknown>[] | undefined) ?? []).map((syllable) => ({
      letters: String(syllable.Grapheme ?? syllable.Syllable ?? ''),
      quality_score: numeric(assessment(syllable)?.AccuracyScore),
      offset_ms: typeof numeric(syllable.Offset) === 'number' ? Math.round(numeric(syllable.Offset)! / 10_000) : undefined,
      duration_ms: typeof numeric(syllable.Duration) === 'number' ? Math.round(numeric(syllable.Duration)! / 10_000) : undefined,
    }));
    const phones = ((word.Phonemes as Record<string, unknown>[] | undefined) ?? []).map((phone) => ({
      phone: String(phone.Phoneme ?? ''),
      quality_score: numeric(assessment(phone)?.AccuracyScore),
      offset_ms: typeof numeric(phone.Offset) === 'number' ? Math.round(numeric(phone.Offset)! / 10_000) : undefined,
      duration_ms: typeof numeric(phone.Duration) === 'number' ? Math.round(numeric(phone.Duration)! / 10_000) : undefined,
    }));
    return {
      word: String(word.Word ?? ''),
      quality_score: numeric(wordAssessment?.AccuracyScore),
      error_type: typeof wordAssessment?.ErrorType === 'string' ? wordAssessment.ErrorType : undefined,
      offset_ms: typeof numeric(word.Offset) === 'number' ? Math.round(numeric(word.Offset)! / 10_000) : undefined,
      duration_ms: typeof numeric(word.Duration) === 'number' ? Math.round(numeric(word.Duration)! / 10_000) : undefined,
      syllable_score_list: syllables,
      phone_score_list: phones,
    };
  });

  return {
    recognized_text: recognizedText || String(payload.DisplayText ?? best.Display ?? ''),
    text_score: {
      quality_score: numeric(overall?.PronScore) ?? numeric(overall?.AccuracyScore),
      word_score_list: words,
      azure_scores: {
        accuracy: numeric(overall?.AccuracyScore),
        fluency: numeric(overall?.FluencyScore),
        completeness: numeric(overall?.CompletenessScore),
        prosody: numeric(overall?.ProsodyScore),
        pronunciation: numeric(overall?.PronScore),
      },
    },
  };
}

export function paceIndependentAccuracy(result: PronunciationResult): number | undefined {
  const syllableScores = result.text_score?.word_score_list
    ?.flatMap((word) => word.syllable_score_list ?? [])
    .map((syllable) => syllable.quality_score)
    .filter((score): score is number => typeof score === 'number');
  if (syllableScores?.length) {
    return syllableScores.reduce((total, score) => total + score, 0) / syllableScores.length;
  }

  const wordScores = result.text_score?.word_score_list
    ?.map((word) => word.quality_score)
    .filter((score): score is number => typeof score === 'number');
  if (wordScores?.length) {
    return wordScores.reduce((total, score) => total + score, 0) / wordScores.length;
  }
  return result.text_score?.azure_scores?.accuracy ?? result.text_score?.quality_score;
}
