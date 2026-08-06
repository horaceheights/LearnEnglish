import type { PronunciationResult, WordScore } from './types';

const FILLERS = new Set(['ah', 'er', 'hmm', 'mhm', 'uh', 'um']);

export function speechTokens(text: string): string[] {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[’]/g, "'")
    .match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
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
  let expectedIndex = 0;

  for (const token of observed) {
    if (expectedIndex >= expected.length) break;
    if (FILLERS.has(token)) continue;
    if (expectedIndex > 0 && tokenMatches(token, expected[expectedIndex - 1])) continue;
    if (tokenMatches(token, expected[expectedIndex])) expectedIndex += 1;
  }

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
    }));
    const phones = ((word.Phonemes as Record<string, unknown>[] | undefined) ?? []).map((phone) => ({
      phone: String(phone.Phoneme ?? ''),
      quality_score: numeric(assessment(phone)?.AccuracyScore),
    }));
    return {
      word: String(word.Word ?? ''),
      quality_score: numeric(wordAssessment?.AccuracyScore),
      error_type: typeof wordAssessment?.ErrorType === 'string' ? wordAssessment.ErrorType : undefined,
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
