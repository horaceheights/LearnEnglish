const fs = await import("node:fs/promises");
const path = await import("node:path");
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const W = 1280;
const H = 720;

const OUT_DIR = "C:\\Users\\gorre\\Documents\\Code Projects\\LearnEnglish\\Lessons\\Lesson1\\deck\\outputs";
const IMAGE_DIR = "C:\\Users\\gorre\\Documents\\Code Projects\\LearnEnglish\\Lessons\\Lesson1\\images";
const SCRATCH_DIR = path.resolve("tmp", "slides", "lesson1-esl");
const PREVIEW_DIR = path.join(SCRATCH_DIR, "preview");

const COLORS = {
  bg: "#F7F3EA",
  panel: "#FFFDF8",
  ink: "#172026",
  muted: "#55626B",
  accent: "#2B8A5A",
  accentSoft: "#D8EFE3",
  warm: "#F3E3B1",
  line: "#D7D0C1",
  white: "#FFFFFF",
};

const FONTS = {
  title: "Poppins",
  body: "Lato",
  mono: "Aptos Mono",
};

const IMAGES = {
  boyRunning: "boy_is_running.png",
  girlRunning: "girl_is_running.png",
  manRunning: "man_is_running.png",
  boyWalking: "boy_is_walking.png",
  girlWalking: "girl_is_walking.png",
  manWalking: "man_is_walking.png",
  womanWalking: "Woman_is_walking.png",
  boySwimming: "boy_is_swimming.png",
  girlSwimming: "girl_is_swimming.png",
  manSwimming: "man_is_swimming.png",
  womanSwimming: "woman_is_swimming.png",
  boyEating: "boy_is_eating.png",
  girlEating: "girl_is_eating.png",
  manEating: "man_is_eating.png",
  womanEating: "woman_is_eating.png",
};

const inspectRecords = [];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(SCRATCH_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
}

function addShape(slide, geometry, left, top, width, height, fill, line = COLORS.line, lineWidth = 1, radius = null) {
  const config = {
    geometry,
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: lineWidth },
  };
  if (geometry === "roundRect" && radius !== null) {
    config.adjustmentList = [{ name: "adj", formula: `val ${radius}` }];
  }
  return slide.shapes.add(config);
}

function addText(slide, slideNo, text, left, top, width, height, options = {}) {
  const shape = addShape(
    slide,
    "rect",
    left,
    top,
    width,
    height,
    options.fill || "#00000000",
    options.line || "#00000000",
    options.lineWidth || 0,
  );
  shape.text = text;
  shape.text.fontSize = options.fontSize || 24;
  shape.text.color = options.color || COLORS.ink;
  shape.text.typeface = options.typeface || FONTS.body;
  shape.text.bold = Boolean(options.bold);
  shape.text.alignment = options.align || "left";
  shape.text.verticalAlignment = options.valign || "top";
  shape.text.insets = options.insets || { left: 0, right: 0, top: 0, bottom: 0 };

  inspectRecords.push({
    kind: "textbox",
    slide: slideNo,
    role: options.role || "text",
    text: String(text),
    textChars: String(text).length,
    textLines: String(text).split(/\n/).length,
    bbox: [left, top, width, height],
  });

  return shape;
}

async function addImage(slide, slideNo, fileName, left, top, width, height, role, fit = "cover") {
  const imagePath = path.join(IMAGE_DIR, fileName);
  if (!(await pathExists(imagePath))) {
    throw new Error(`Missing image: ${imagePath}`);
  }
  const image = slide.images.add({
    blob: await readImageBlob(imagePath),
    fit,
    alt: role,
    geometry: "roundRect",
  });
  image.position = { left, top, width, height };

  inspectRecords.push({
    kind: "image",
    slide: slideNo,
    role,
    path: imagePath,
    bbox: [left, top, width, height],
  });

  return image;
}

function addBackground(slide) {
  slide.background.fill = COLORS.bg;
  addShape(slide, "rect", 0, 0, W, 112, COLORS.accent, COLORS.accent, 0);
  addShape(slide, "ellipse", 1030, -120, 360, 360, "#FFFFFF12", "#FFFFFF12", 0);
  addShape(slide, "ellipse", -120, 530, 280, 280, "#FFFFFF18", "#FFFFFF18", 0);
}

function addTopBar(slide, slideNo, title, subtitle, step) {
  addText(slide, slideNo, step, 72, 26, 160, 24, {
    fontSize: 13,
    color: COLORS.white,
    bold: true,
    typeface: FONTS.mono,
    role: "step",
  });
  addText(slide, slideNo, title, 72, 44, 760, 36, {
    fontSize: 28,
    color: COLORS.white,
    bold: true,
    typeface: FONTS.title,
    role: "title",
  });
  if (subtitle) {
    addText(slide, slideNo, subtitle, 72, 80, 760, 24, {
      fontSize: 14,
      color: "#EAF7F0",
      typeface: FONTS.body,
      role: "subtitle",
    });
  }
}

function addFooter(slide, slideNo, text) {
  addText(slide, slideNo, text, 72, 680, 1130, 18, {
    fontSize: 10,
    color: COLORS.muted,
    typeface: FONTS.body,
    role: "footer",
  });
}

function addImageCardFrame(slide, left, top, width, height) {
  addShape(slide, "roundRect", left - 8, top - 8, width + 16, height + 16, COLORS.panel, COLORS.line, 1.2, 14000);
}

async function addLabeledCard(slide, slideNo, imageName, label, sentence, left, top, width, height) {
  addImageCardFrame(slide, left, top, width, height);
  await addImage(slide, slideNo, imageName, left, top, width, height, label);
  if (sentence) {
    addText(slide, slideNo, sentence, left, top + height + 18, width, 48, {
      fontSize: 19,
      color: COLORS.accent,
      bold: true,
      align: "center",
      typeface: FONTS.body,
      role: "sentence",
    });
  }
}

async function slide1Cover(presentation) {
  const slideNo = 1;
  const slide = presentation.slides.add();
  addBackground(slide);

  addShape(slide, "roundRect", 64, 148, 560, 452, COLORS.panel, COLORS.line, 1.2, 16000);
  addText(slide, slideNo, "Lesson 1", 96, 182, 180, 30, {
    fontSize: 16,
    color: COLORS.accent,
    bold: true,
    typeface: FONTS.mono,
    role: "kicker",
  });
  addText(slide, slideNo, "People and Actions", 96, 220, 440, 70, {
    fontSize: 38,
    bold: true,
    typeface: FONTS.title,
    role: "title",
  });
  addText(slide, slideNo, "See the picture. Notice the pattern. Repeat the sentence.", 96, 304, 390, 70, {
    fontSize: 22,
    color: COLORS.muted,
    typeface: FONTS.body,
    role: "body",
  });
  addShape(slide, "roundRect", 96, 414, 460, 114, COLORS.accentSoft, COLORS.accentSoft, 0, 16000);
  addText(slide, slideNo, "The boy is running.\nThe girl is walking.", 126, 445, 396, 52, {
    fontSize: 24,
    bold: true,
    color: COLORS.accent,
    typeface: FONTS.body,
    role: "pattern",
  });

  addImageCardFrame(slide, 706, 166, 212, 182);
  await addImage(slide, slideNo, IMAGES.boyRunning, 706, 166, 212, 182, "boy running");
  addImageCardFrame(slide, 954, 166, 212, 182);
  await addImage(slide, slideNo, IMAGES.girlWalking, 954, 166, 212, 182, "girl walking");
  addImageCardFrame(slide, 706, 386, 212, 182);
  await addImage(slide, slideNo, IMAGES.manSwimming, 706, 386, 212, 182, "man swimming");
  addImageCardFrame(slide, 954, 386, 212, 182);
  await addImage(slide, slideNo, IMAGES.womanEating, 954, 386, 212, 182, "woman eating");

  addFooter(slide, slideNo, "Focus on four people: boy, girl, man, woman. Focus on four actions: running, walking, swimming, eating.");
}

async function slide2People(presentation) {
  const slideNo = 2;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "The boy", "", "STEP 1");

  await addLabeledCard(slide, slideNo, IMAGES.boyRunning, "boy", null, 160, 180, 360, 270);
  await addLabeledCard(slide, slideNo, IMAGES.girlRunning, "girl", null, 760, 180, 360, 270);

}

async function slide3Actions(presentation) {
  const slideNo = 3;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "The man", "", "STEP 2");

  await addLabeledCard(slide, slideNo, IMAGES.manWalking, "man", null, 160, 180, 360, 270);
  await addLabeledCard(slide, slideNo, IMAGES.womanWalking, "woman", null, 760, 180, 360, 270);
}

async function slide4Running(presentation) {
  const slideNo = 4;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "Running", "", "STEP 3");

  await addLabeledCard(slide, slideNo, IMAGES.boyRunning, "running", null, 160, 180, 360, 270);
  await addLabeledCard(slide, slideNo, IMAGES.boyWalking, "walking", null, 760, 180, 360, 270);
}

async function slide5Walking(presentation) {
  const slideNo = 5;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "Swimming", "", "STEP 4");

  await addLabeledCard(slide, slideNo, IMAGES.manSwimming, "swimming", null, 160, 180, 360, 270);
  await addLabeledCard(slide, slideNo, IMAGES.manEating, "eating", null, 760, 180, 360, 270);
}

async function slide6Swimming(presentation) {
  const slideNo = 6;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "Sentence Pattern", "Now combine person and action.", "STEP 5");

  await addLabeledCard(slide, slideNo, IMAGES.boyRunning, "boy", "The boy is running.", 72, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.girlWalking, "girl", "The girl is walking.", 370, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.manSwimming, "man", "The man is swimming.", 668, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.womanEating, "woman", "The woman is eating.", 966, 154, 250, 230);

  addShape(slide, "roundRect", 72, 516, 1134, 108, COLORS.panel, COLORS.line, 1.2, 16000);
  addText(slide, slideNo, "The + person + is + action", 106, 540, 1068, 28, {
    fontSize: 28,
    color: COLORS.accent,
    bold: true,
    align: "center",
    typeface: FONTS.title,
    role: "pattern line",
  });
  addText(slide, slideNo, "This is the first full pattern the learner should start repeating.", 106, 576, 1068, 22, {
    fontSize: 17,
    color: COLORS.muted,
    align: "center",
    typeface: FONTS.body,
    role: "instruction",
  });
}

async function slide7Eating(presentation) {
  const slideNo = 7;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "Practice", "Read the full sentence and connect it to the picture.", "STEP 6");

  await addLabeledCard(slide, slideNo, IMAGES.boyEating, "boy", "The boy is eating.", 72, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.girlEating, "girl", "The girl is eating.", 370, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.manEating, "man", "The man is eating.", 668, 154, 250, 230);
  await addLabeledCard(slide, slideNo, IMAGES.womanEating, "woman", "The woman is eating.", 966, 154, 250, 230);

  addShape(slide, "roundRect", 72, 516, 1134, 108, COLORS.warm, COLORS.warm, 0, 16000);
  addText(slide, slideNo, "Now the learner can read and repeat complete sentences without typing anything.", 106, 552, 1068, 24, {
    fontSize: 20,
    color: COLORS.ink,
    bold: true,
    align: "center",
    typeface: FONTS.body,
    role: "lesson note",
  });
}

async function slide8Review(presentation) {
  const slideNo = 8;
  const slide = presentation.slides.add();
  addBackground(slide);
  addTopBar(slide, slideNo, "Review", "Point, say, and choose the right sentence.", "STEP 7");

  await addLabeledCard(slide, slideNo, IMAGES.boyRunning, "A", "The boy is running.", 72, 164, 240, 180);
  await addLabeledCard(slide, slideNo, IMAGES.womanWalking, "B", "The woman is walking.", 356, 164, 240, 180);
  await addLabeledCard(slide, slideNo, IMAGES.manSwimming, "C", "The man is swimming.", 640, 164, 240, 180);
  await addLabeledCard(slide, slideNo, IMAGES.girlEating, "D", "The girl is eating.", 924, 164, 240, 180);

  addShape(slide, "roundRect", 72, 418, 1134, 204, COLORS.panel, COLORS.line, 1.2, 16000);
  addText(slide, slideNo, "1. The girl is eating.\n2. The man is swimming.\n3. The woman is walking.\n4. The boy is running.", 116, 460, 420, 120, {
    fontSize: 22,
    color: COLORS.ink,
    bold: true,
    typeface: FONTS.body,
    role: "review list",
  });
  addText(slide, slideNo, "Match 1-4 with A-D. Say each sentence aloud before you choose.", 632, 474, 510, 78, {
    fontSize: 20,
    color: COLORS.muted,
    typeface: FONTS.body,
    role: "review instruction",
  });
}

async function createDeck() {
  await ensureDirs();
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  await slide1Cover(presentation);
  await slide2People(presentation);
  await slide3Actions(presentation);
  await slide4Running(presentation);
  await slide5Walking(presentation);
  await slide6Swimming(presentation);
  await slide7Eating(presentation);
  await slide8Review(presentation);

  return presentation;
}

async function saveBlobToFile(blob, filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function writeInspectArtifact(presentation) {
  const lines = [
    JSON.stringify({
      kind: "deck",
      slideCount: presentation.slides.count,
      slideSize: { width: W, height: H },
    }),
    ...inspectRecords.map((record) => JSON.stringify(record)),
  ];
  await fs.writeFile(path.join(SCRATCH_DIR, "inspect.ndjson"), lines.join("\n") + "\n", "utf8");
}

async function exportDeck(presentation) {
  await writeInspectArtifact(presentation);

  for (let idx = 0; idx < presentation.slides.items.length; idx += 1) {
    const preview = await presentation.export({
      slide: presentation.slides.items[idx],
      format: "png",
      scale: 1,
    });
    await saveBlobToFile(preview, path.join(PREVIEW_DIR, `slide-${String(idx + 1).padStart(2, "0")}.png`));
  }

  const pptx = await PresentationFile.exportPptx(presentation);
  const outputPath = path.join(OUT_DIR, "output-selection-flow.pptx");
  await pptx.save(outputPath);
  return outputPath;
}

const presentation = await createDeck();
const outputPath = await exportDeck(presentation);
console.log(outputPath);
