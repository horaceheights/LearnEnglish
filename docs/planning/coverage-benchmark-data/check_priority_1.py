"""Check the Priority 1 plan: every word in a model sentence must be taught in A1 by that unit,
new in this lesson, or new in an earlier Priority 1 lesson. Also reports photo load of existing lessons.
Usage: python check_priority_1.py <repo>"""
import csv, json, re, sys, statistics
from pathlib import Path

repo = Path(sys.argv[1])
data = repo / "docs" / "planning" / "coverage-benchmark-data"
ours = {r["word"]: r for r in csv.DictReader(open(data / "our-words.csv", encoding="utf-8"))}
plan = list(csv.DictReader(open(data / "a1-priority-1-plan.csv", encoding="utf-8")))
tok = lambda s: [w.lower() for w in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", s)]

def taught_by(word, unit):
    r = ours.get(word)
    return bool(r) and r["first_level"] == "A1" and int(r["first_lesson"].split(".")[0]) <= unit

earlier, problems = set(), 0
for p in plan:
    unit = int(p["number"].split(".")[0])
    new = set(tok(p["new_items"]))
    repeats = sorted(w for w in new if len(w) > 1 and taught_by(w, unit))
    bad = sorted({w for w in tok(p["model_sentences"]) if len(w) > 1 and w not in new and w not in earlier and not taught_by(w, unit)})
    problems += len(bad)
    items = [x for x in p["new_items"].split(";") if x.strip()]
    print(f"{p['number']} {p['title']}: {len(items)} items | untaught in sentences: {bad} | item words already taught: {repeats}")
    earlier |= new
print("untaught words found:", problems)

counts = []
for f in sorted((repo / "backend" / "lessons").glob("unit_*/*.yaml")):
    raw = f.read_text(encoding="utf-8-sig")
    try:
        d = json.loads(raw)
    except json.JSONDecodeError:
        import yaml
        d = yaml.safe_load(raw)
    if d.get("vocabulary"):
        imgs = set(re.findall(r'"(?:image_url|prompt_image_url)":\s*"([^"]+)"', json.dumps(d)))
        counts.append((len(imgs), len(d.get("cards", []))))
print("teaching lessons:", len(counts), "| median distinct images:", statistics.median(c[0] for c in counts),
      "| range:", min(c[0] for c in counts), "-", max(c[0] for c in counts), "| median cards:", statistics.median(c[1] for c in counts))
