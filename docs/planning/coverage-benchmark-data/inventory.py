"""Inventory of what the A1 and A1+ lessons teach. Usage: python inventory.py <repo> <outdir>"""
import csv, json, re, sys, collections
from pathlib import Path

repo, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

# English-bearing card fields (Spanish help, notes, ids and media are excluded).
EN_KEYS = {"prompt", "audio_text", "answer_audio_text", "label", "sentence", "answer",
           "text", "expected_text", "target_text", "correct_answer", "words", "tiles",
           "model_text", "line", "question", "response", "answer_text", "cue_audio_text"}
SKIP_KEYS = {"spanish_translation", "pedagogy_note", "image_url", "prompt_image_url", "id",
             "slide_id", "interaction_type", "stage", "correct_option_id", "video_url",
             "audio_url", "hint_es", "instruction_es", "title_es"}

keyfreq = collections.Counter()

def walk(node, key, acc):
    if isinstance(node, dict):
        for k, v in node.items():
            walk(v, k, acc)
    elif isinstance(node, list):
        for v in node:
            walk(v, key, acc)
    elif isinstance(node, str):
        keyfreq[key] += 1
        if key in EN_KEYS:
            acc.append(node)

def order(sub):
    m = re.match(r"(\d+)\.(\d+)", str(sub))
    return (int(m.group(1)), int(m.group(2))) if m else (99, 99)

lessons = []
for p in sorted((repo / "backend" / "lessons").rglob("*.yaml")):
    raw = p.read_text(encoding="utf-8-sig")
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        import yaml
        d = yaml.safe_load(raw)
    level = "A1+" if "a1_plus" in p.parts else "A1"
    texts = []
    walk(d.get("cards", []), None, texts)
    lessons.append({
        "level": level, "sub": str(d.get("sub_lesson_id", "")), "title": d.get("title", ""),
        "file": p.relative_to(repo).as_posix(), "vocabulary": d.get("vocabulary", []) or [],
        "grammar": d.get("grammar_function", "") or "", "goal": d.get("goal", "") or "",
        "texts": texts, "cards": len(d.get("cards", [])),
    })
lessons.sort(key=lambda l: (l["level"], order(l["sub"])))

with open(out / "our-lessons.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["level", "lesson", "title", "cards", "new_vocabulary_count", "new_vocabulary", "grammar_function"])
    for l in lessons:
        w.writerow([l["level"], l["sub"], l["title"], l["cards"], len(l["vocabulary"]),
                    "; ".join(l["vocabulary"]), l["grammar"]])

# Every English word a learner meets, with the first lesson it appears in.
first = {}
count = collections.Counter()
for l in lessons:
    seen_here = set()
    for t in l["texts"] + l["vocabulary"]:
        for w_ in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", t):
            w_ = w_.lower()
            count[w_] += 1
            if w_ not in first:
                first[w_] = (l["level"], l["sub"])
with open(out / "our-words.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["word", "first_level", "first_lesson", "occurrences"])
    for word in sorted(first):
        w.writerow([word, first[word][0], first[word][1], count[word]])

print("lessons", len(lessons), {lv: sum(1 for l in lessons if l["level"] == lv) for lv in ("A1", "A1+")})
print("declared vocab entries", {lv: sum(len(l["vocabulary"]) for l in lessons if l["level"] == lv) for lv in ("A1", "A1+")})
print("distinct word forms", len(first), {lv: sum(1 for v in first.values() if v[0] == lv) for lv in ("A1", "A1+")})
print("string keys:", keyfreq.most_common(60))
