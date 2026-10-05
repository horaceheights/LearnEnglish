import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const player = fs.readFileSync(new URL("../components/LessonPlayer.js", import.meta.url), "utf8");
const helper = player.match(/function writtenRecognitionMediaHeight\([^]*?\n\}/)?.[0];
assert(helper, "The web renderer measures the remaining portrait space.");
const fitMedia = new Function(`${helper}; return writtenRecognitionMediaHeight;`)();

test("actual chrome and feedback measurements fit the complete pictures on narrow phones", () => {
  for (const viewport of [780, 844, 932]) {
    for (const images of [1, 2]) {
      const imageHeights = Array(images).fill(228);
      const measuredChrome = images === 1 ? 580 : 460;
      const contentHeight = measuredChrome + images * 228;
      const height = fitMedia(viewport, contentHeight, 28, imageHeights, Array(images).fill(344));
      assert(height >= 100, "keep a useful complete image rather than clipping its content");
      assert(measuredChrome + 28 + images * height <= viewport, "feedback and all pictures fit together");
    }
  }
});

test("wrapped text consumes space before pictures, without oscillating on resize", () => {
  const initial = fitMedia(844, 844, 28, [228], [344]);
  const enlarged = fitMedia(844, 894, 28, [228], [344]);
  assert(enlarged < initial);
  const nonMediaHeight = 894 - 228;
  assert.equal(fitMedia(844, nonMediaHeight + enlarged, 28, [enlarged], [344]), enlarged);
  assert.equal(fitMedia(844, 480, 28, [], []), null);
});

test("the budget applies only to authored silent written portrait cards and preserves full media", () => {
  assert.match(player, /fitWrittenRecognition = isMobile && viewportHeight >= viewportWidth\s*&& isSilentWrittenRecognize\(currentCard\)/);
  assert.match(player, /ResizeObserver\(measure\)/);
  assert.match(player, /ref=\{writtenRecognitionPageRef\}/);
  assert.match(player, /height: writtenMediaHeight, aspectRatio: "auto", objectFit: "contain"/);
  assert.match(player, /compactWrittenRecognitionChoices = fitWrittenRecognition\s*&& currentCard.options.every\(option => !option.image_url\)/);
  assert.match(player, /minHeight: fitWrittenRecognition \? 88 : undefined/);
});
