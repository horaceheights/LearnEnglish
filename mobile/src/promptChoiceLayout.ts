type PromptChoiceLayoutInput = {
  availableHeight: number;
  feedbackHeight: number;
  labels: Array<string | null | undefined>;
  textWidth: number;
  fontSize: number;
  fontScale: number;
  minimumFontSize: number;
  preferredRowHeight: number;
};

// Conservative word wrapping for reserving space, not a replacement for native
// Text auto-fit. Short sentences can occupy one line despite allowing two.
export function promptChoiceLineCount(text: string, width: number, fontSize: number) {
  let lines = 1;
  let used = 0;
  for (const word of text.trim().split(/\s+/)) {
    const wordWidth = [...word].reduce((sum, letter) =>
      sum + (/[MW@]/.test(letter) ? 1 : /[ilI.,!':;]/.test(letter) ? 0.35 : 0.65), 0) * fontSize;
    const nextWidth = wordWidth + (used ? fontSize * 0.35 : 0);
    if (used && used + nextWidth > width) { lines += 1; used = wordWidth; }
    else used += nextWidth;
  }
  return lines;
}

export function promptChoiceRowHeight(input: PromptChoiceLayoutInput) {
  const { availableHeight, feedbackHeight, labels, textWidth, fontSize,
    fontScale, minimumFontSize, preferredRowHeight } = input;
  const count = labels.length;
  if (!count) return preferredRowHeight;
  const heightAt = (size: number) => Math.max(48, ...labels.map(label =>
    Math.ceil(promptChoiceLineCount(label || '', textWidth, size * fontScale)
      * size * fontScale * 1.25 + 18)));
  const preferred = Math.min(preferredRowHeight, heightAt(fontSize));
  // Reserve twice the former 70dp thumbnail before allocating equal rows.
  // The 30dp allowance covers card padding and prompt/bank margins; reserve
  // gaps conservatively at 10dp although portrait phrase rows use 7dp.
  const budget = (availableHeight - feedbackHeight - 30 - 140 - (count - 1) * 10) / count;
  return Math.max(heightAt(minimumFontSize), Math.min(preferred, budget));
}
