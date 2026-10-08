export const NEW_VOCABULARY_COLOR = '#d99b00';
export type VocabularyPart = { text: string; highlighted: boolean; start: number; end: number };
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Match the lesson's declared phrases as complete phrases, never their unrelated fragments. */
export function vocabularyParts(text: string, vocabulary: readonly string[]): VocabularyPart[] {
  const ranges: Array<[number, number]> = [];
  for (const entry of vocabulary) {
    const value = entry.trim();
    if (!value) continue;
    const pattern = escapePattern(value).replace(/\s+/g, '\\s+').replace(/[’']/g, "[’']");
    const expression = new RegExp(`(^|[^\\p{L}’'])(${pattern})(?=$|[^\\p{L}’'])`, 'giu');
    let match: RegExpExecArray | null;
    while ((match = expression.exec(text))) {
      const start = match.index + match[1].length;
      ranges.push([start, start + match[2].length]);
    }
  }
  const parts: VocabularyPart[] = [];
  const expression = /\p{L}+(?:[’']\p{L}+)*|[^\p{L}]+/gu;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text))) {
    const start = match.index, end = start + match[0].length;
    parts.push({ text: match[0], start, end, highlighted: /\p{L}/u.test(match[0])
      && ranges.some(([from, to]) => start >= from && end <= to) });
  }
  return parts;
}

/** Evaluate scaffolds and every candidate together without revealing the correct choice. */
export function constructionVocabulary(parts: Array<{ text?: string; slot?: number }>, card: {
  correct_option_ids?: string[] | null; options: Array<{ id: string; label?: string | null }>;
}, vocabulary: readonly string[]) {
  const labels = parts.map(part => part.text ?? card.options.find(option => option.id === card.correct_option_ids?.[part.slot!])?.label ?? '');
  const highlightedAt = (values: string[], index: number) => {
    const offset = values.slice(0, index).reduce((length, text) => length + text.length + 1, 0);
    return vocabularyParts(values.join(' '), vocabulary).some(part => part.highlighted
      && part.start >= offset && part.end <= offset + values[index].length);
  };
  const optionIds = new Set<string>(), scaffoldIndexes = new Set<number>();
  parts.forEach((part, index) => {
    if (part.text !== undefined) {
      if (highlightedAt(labels, index)) scaffoldIndexes.add(index);
      return;
    }
    for (const option of card.options) {
      const candidate = [...labels];
      candidate[index] = option.label || '';
      if (highlightedAt(candidate, index)) optionIds.add(option.id);
    }
  });
  return { optionIds, scaffoldIndexes };
}
