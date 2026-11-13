"""Compare our taught words with outside word lists.
Usage: python compare.py <data_dir> <oxford_csv> <ket_txt> <yle_txt>"""
import csv, re, sys, collections
from pathlib import Path

data, oxford_csv, ket_txt, yle_txt = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])

NOT_ENGLISH = set("""alta ayuda cambio comprueba continuar cuatro de despu diego el elige en escucha esta
frase horarios la las llegar lugar noche organizar permiten practica preguntas prepara propuestas que
respuestas salida sus una visita voz y ana luis sofia m p s""".split())

ours = {}
for r in csv.DictReader(open(data / "our-words.csv", encoding="utf-8")):
    if r["word"] not in NOT_ENGLISH:
        ours[r["word"]] = (r["first_level"], r["first_lesson"])

IRREG = {"be": ["am", "is", "are"], "have": ["has"], "do": ["does"], "go": ["goes", "going"],
         "child": ["children"], "man": ["men"], "woman": ["women"], "foot": ["feet"], "tooth": ["teeth"],
         "baby": ["babies"], "i": ["i"], "not": ["not", "cannot", "doesn't"], "can": ["cannot"],
         "old": ["older"], "young": ["younger"], "us": ["let's"], "pm": ["p"], "am": ["am"],
         "grandparent": ["grandparents"], "parent": ["parents"], "grandchild": ["grandchildren"]}

def forms(w):
    w = w.lower()
    f = {w, w + "s", w + "es", w + "ing", w + "ed"}
    if w.endswith("y"):
        f |= {w[:-1] + "ies", w[:-1] + "ied"}
    if w.endswith("e"):
        f |= {w[:-1] + "ing", w + "d"}
    if len(w) > 2 and w[-1] not in "aeiouwy" and w[-2] in "aeiou":
        f.add(w + w[-1] + "ing")
    f |= set(IRREG.get(w, []))
    return f

def taught(w):
    """Return (level, lesson) of the first matching form we teach, or None."""
    parts = re.findall(r"[a-z']+", w.lower())
    if not parts:
        return None
    hits = []
    for part in parts:  # multi-word entries count only if every part is taught
        h = [ours[f] for f in forms(part) if f in ours]
        if not h:
            return None
        hits.append(min(h))
    return max(hits)

# --- Oxford 3000 by level
order = {"a1": 1, "a2": 2, "b1": 3, "b2": 4, "c1": 5}
ox = {}
for r in csv.DictReader(open(oxford_csv, encoding="utf-8", errors="replace")):
    w, lv = r["word"].strip().lower(), r["cefr"].strip().lower()
    if lv in order and (w not in ox or order[lv] < order[ox[w][0]]):
        ox[w] = (lv, r["type"].strip())

# --- Cambridge A2 Key: alphabetical headwords and topic lists
ket = open(ket_txt, encoding="utf-8").read()
alpha, appendix = ket[:ket.rfind("Appendix 1")], ket[ket.rfind("Topic Lists") + 11:]
ket_heads = set()
for line in alpha.splitlines():
    m = re.match(r"^([A-Za-z][A-Za-z' /().-]*?)\s*\((?:n|v|adj|adv|prep|pron|det|conj|mv|av|exclam|int|abbrev|phr v|pl n|sing)[^)]*\)\s*$", line.strip())
    if m:
        for part in re.split(r"\s*/\s*", m.group(1)):
            ket_heads.add(re.sub(r"\(.*?\)", "", part).strip().lower())
ket_heads.discard("")

TOPICS = ["Appliances", "Clothes and Accessories", "Colours", "Communication and Technology",
          "Documents and Texts", "Education", "Entertainment and Media", "Family and Friends",
          "Food and Drink", "Health, Medicine and Exercise", "Hobbies and Leisure", "House and Home",
          "Measurements", "Personal Feelings, Opinions and Experiences (adjectives)", "Places: Buildings",
          "Places: Countryside", "Places: Town and City", "Services", "Shopping", "Sport",
          "The Natural World", "Time", "Travel and Transport", "Weather", "Work and Jobs"]
NOISE = set("n v adj a2 key and for schools vocabulary list page of ucles the".split())
topics, cur = collections.OrderedDict(), None
for line in appendix.splitlines():
    s = line.strip()
    if s in TOPICS:
        cur = s
        topics[cur] = set()
    elif cur and s and "UCLES" not in s and "Vocabulary List" not in s and s not in ("Schools", "=== PAGE"):
        if s.startswith("=== PAGE"):
            continue
        for tok in re.findall(r"[A-Za-z][A-Za-z'-]+", re.sub(r"\(.*?\)", "", s)):
            if tok.lower() not in NOISE and not tok.isdigit():
                topics[cur].add(tok.lower())

# --- Cambridge Starters/Movers/Flyers thematic list (animals only; the Key list has no animal topic)
yle = open(yle_txt, encoding="utf-8").read()
block = yle.split("Animals animal", 1)[1].split("The body", 1)[0]
animals = {"animal"} | {re.split(r"[/ ]", l.strip())[0].lower() for l in block.splitlines() if l.strip()}
topics["Animals (Cambridge Starters/Movers/Flyers)"] = animals

def topic_of(w):
    return next((t for t, ws in topics.items() if w in ws), "")

# --- Outputs
rows = []
for lv in ("a1", "a2"):
    words = sorted(w for w, v in ox.items() if v[0] == lv)
    hit = {w: taught(w) for w in words}
    n = sum(1 for w in words if hit[w])
    a1 = sum(1 for w in words if hit[w] and hit[w][0] == "A1")
    print(f"Oxford 3000 {lv.upper()}: {len(words)} words; taught {n} ({n/len(words):.0%}); in A1 alone {a1} ({a1/len(words):.0%})")
    for w in words:
        if not hit[w]:
            rows.append([w, "Oxford 3000 " + lv.upper(), ox[w][1], topic_of(w)])
kh = sorted(ket_heads)
kn = sum(1 for w in kh if taught(w))
print(f"Cambridge A2 Key list: {len(kh)} headwords parsed; taught {kn} ({kn/len(kh):.0%})")

with open(data / "missing-oxford-a1-a2.csv", "w", newline="", encoding="utf-8") as f:
    w_ = csv.writer(f)
    w_.writerow(["word", "list", "part_of_speech", "topic"])
    w_.writerows(rows)

with open(data / "topic-coverage.csv", "w", newline="", encoding="utf-8") as f:
    w_ = csv.writer(f)
    w_.writerow(["topic", "words_in_list", "we_teach", "percent", "examples_missing"])
    print("\nTopic coverage (Cambridge topic lists):")
    for t, ws in topics.items():
        got = sorted(w for w in ws if taught(w))
        miss = sorted(w for w in ws if not taught(w))
        pct = round(100 * len(got) / len(ws))
        w_.writerow([t, len(ws), len(got), pct, " ".join(miss)])
        print(f"  {pct:3d}%  {len(got):3d}/{len(ws):3d}  {t}")

# Missing Oxford A1 words grouped
by = collections.defaultdict(list)
for w, lst, pos, t in rows:
    if lst.endswith("A1"):
        by[t or ("(no topic) " + pos.split(",")[0])].append(w)
print("\nMissing Oxford A1 words by group:")
for k in sorted(by, key=lambda k: -len(by[k])):
    print(f"  [{len(by[k])}] {k}: {' '.join(by[k])}")
print("\nour English word forms:", len(ours), {lv: sum(1 for v in ours.values() if v[0] == lv) for lv in ("A1", "A1+")})
