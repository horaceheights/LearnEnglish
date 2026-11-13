"""Check the gap-lesson draft and project coverage. Usage: python project.py <data_dir> <tmp_dir>"""
import csv, re, sys, shutil
from pathlib import Path

data, tmp = Path(sys.argv[1]), Path(sys.argv[2])
words = list(csv.DictReader(open(data / "our-words.csv", encoding="utf-8")))
ours = {r["word"]: r for r in words}
draft = list(csv.DictReader(open(data / "a1-gap-lessons-draft.csv", encoding="utf-8")))

def unit_of(r):
    return int(r["first_lesson"].split(".")[0]) if r["first_level"] == "A1" else 99

tok = lambda s: [w.lower() for w in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", s)]
total = 0
for d in draft:
    u = int(d["unit"])
    new = set(tok(d["new_words"]))
    items = [x.strip() for x in d["new_words"].split(";")]
    total += len(items)
    already = sorted(w for w in new if w in ours and unit_of(ours[w]) <= u)
    later = sorted(w for w in new if w in ours and unit_of(ours[w]) > u)
    untaught = sorted(w for w in tok(d["example_pattern"]) if w not in new and (w not in ours or unit_of(ours[w]) > u) and len(w) > 1)
    print(f"U{u} {d['title']}: {len(items)} items | already taught by unit: {already} | taught later/A1+: {later} | example uses untaught: {untaught}")
print("lessons", len(draft), "items", total)

for label, keep in (("P1", {"1"}), ("P1+P2", {"1", "2"}), ("all", {"1", "2", "3"})):
    t = tmp / label
    t.mkdir(parents=True, exist_ok=True)
    rows = [dict(r) for r in words]
    have = set(ours)
    n = 0
    for d in draft:
        if d["priority"] in keep:
            n += 1
            for w in tok(d["new_words"]):
                if w not in have:
                    have.add(w)
                    rows.append({"word": w, "first_level": "A1", "first_lesson": d["unit"] + ".99", "occurrences": "0"})
    with open(t / "our-words.csv", "w", newline="", encoding="utf-8") as f:
        w_ = csv.DictWriter(f, fieldnames=["word", "first_level", "first_lesson", "occurrences"])
        w_.writeheader(); w_.writerows(rows)
    print(label, "lessons", n, "word forms", len(rows) - 37)
