"""Course-wide answer-bank checks and exact, reviewable authoring contracts.

This is deliberately not a claim to understand arbitrary English or approve an
image. Structural checks cannot be waived by a contract. Every bank also needs
an exact contract, so unfamiliar/new wording cannot silently escape a heuristic.
"""
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_PATH = ROOT / "docs/product/answer-choice-contracts.json"
TOKEN = re.compile(r"[a-z]+(?:'[a-z]+)?|\d+", re.I)
UTTERANCES = {"hello", "hi", "goodbye", "bye", "thanks", "yes", "no", "sorry",
              "please", "stop", "thank you", "no thank you", "yes thank you", "yes please",
              "sorry no", "excuse me", "here you are"}
VERBS = {
    "arrive": "arrives arrived", "leave": "leaves left", "play": "plays played",
    "study": "studies studied", "work": "works worked", "cook": "cooks cooked",
    "talk": "talks talked", "eat": "eats ate", "drink": "drinks drank",
    "read": "reads", "write": "writes wrote", "run": "runs ran",
    "sit": "sits sat", "sleep": "sleeps slept", "swim": "swims swam",
    "walk": "walks walked", "go": "goes went", "wake": "wakes woke",
    "get": "gets got", "wash": "washes washed", "watch": "watches watched",
    "have": "has had", "like": "likes liked", "want": "wants wanted",
    "need": "needs needed", "understand": "understands understood",
    "help": "helps helped", "cross": "crosses crossed", "turn": "turns turned",
    "repeat": "repeats repeated", "speak": "speaks spoke",
}
FINITE = {form: root for root, forms in VERBS.items() for form in [root, *forms.split()]}
PROGRESSIVE = dict(zip(
    "arriving leaving playing studying working cooking talking eating drinking reading writing running sitting sleeping swimming walking going waking getting washing watching crossing turning speaking helping".split(),
    "arrive leave play study work cook talk eat drink read write run sit sleep swim walk go wake get wash watch cross turn speak help".split(),
))
ACTION = {**FINITE, **PROGRESSIVE}
AUXILIARIES = "am is are was were be been being can cannot could would should must will shall may might do does did have has had".split()
SENTENCE = re.compile(
    r"\b(?:" + "|".join(AUXILIARIES) + r")\b"
    r"|^(?:i|you|he|she|it|we|they)\s+\w+"
    r"|\S\s+(?:" + "|".join(sorted(FINITE, key=len, reverse=True)) + r")\b", re.I)
IMPERATIVE = re.compile(r"^(?:please\s+)?(?:" + "|".join(VERBS) + r")\b", re.I)
ACTION_CLAUSE = re.compile(
    r"^(?P<subject>.+?)\s+(?:(?:am|is|are|was|were|can|cannot|could|will|do|does|did)\s+)?"
    r"(?:not\s+)?(?P<action>" + "|".join(sorted(ACTION, key=len, reverse=True)) + r")\b", re.I)
FORMS = {"words", "phrases", "sentences", "utterances", "lexical", "images"}
EXCEPTIONS = {"lexical-phrase", "conversational-response", "reading-load",
              "subject-variety", "action-variety"}


def value(item, key, default=None):
    return item.get(key, default) if isinstance(item, dict) else getattr(item, key, default)


def normalized(text):
    text = str(text or "").strip().lower().replace("’", "'").replace("‘", "'")
    text = re.sub(r"\b(can)'t\b", "cannot", text)
    text = re.sub(r"\b(won)'t\b", "will not", text)
    text = re.sub(r"n't\b", " not", text)
    for suffix, expansion in [("'re", " are"), ("'m", " am"), ("'ve", " have"),
                              ("'ll", " will"), ("'d", " would")]:
        text = text.replace(suffix, expansion)
    text = re.sub(r"\b(he|she|it|that|this|there|what|who)'s\b", r"\1 is", text)
    text = re.sub(r"'s(?=\s+\w+ing\b)", " is", text)
    return text


def segments(text):
    return [s.strip() for s in re.split(r"[.!?;]+", normalized(text)) if s.strip()]


def segment_form(text):
    words = TOKEN.findall(text)
    plain = " ".join(words)
    if plain in UTTERANCES or plain.endswith(" please") or IMPERATIVE.match(text):
        return "utterances"
    if len(words) == 1:
        return "words"
    if SENTENCE.search(text):
        return "sentences"
    return "phrases"


def text_form(text):
    forms = {segment_form(s) for s in segments(text)}
    if not forms:
        return "empty"
    if forms <= {"sentences", "utterances"}:
        return "utterances" if "utterances" in forms else "sentences"
    return next(iter(forms)) if len(forms) == 1 else "mixed"


def is_answer_bank(card):
    interaction = str(value(card, "interaction_type", "") or "").lower()
    return (value(card, "stage") in {"Recognize", "Listen", "Use"}
            and len(value(card, "options", [])) >= 2
            and not interaction.startswith("complete")
            and interaction not in {"word-order", "word-parts", "sentence-builder",
                                    "mission-word-parts", "mission-word-order", "mission-sentence-build"}
            and value(card, "mission_game") is None)


def bank_key(lesson, card):
    return f"{value(lesson, 'id')}|{value(card, 'stage')}|{value(card, 'slide_id')}"


def bank_fingerprint(card):
    # Binding images, prompt and answer prevents reusing a grammatical exception
    # on another teaching task. Order is intentionally part of the contract.
    fields = ("slide_id", "stage", "interaction_type", "prompt", "audio_text",
              "answer_audio_text", "prompt_image_url", "correct_option_id")
    contract = {k: value(card, k, "" if k == "prompt_image_url" else None) for k in fields}
    contract["options"] = [{k: value(o, k, "" if k == "image_url" else None) for k in ("id", "label", "image_url")}
                           for o in value(card, "options", [])]
    payload = json.dumps(contract, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def analyze_bank(card):
    """Return inferred form, unwaivable defects, and reviewable teaching conflicts."""
    options = value(card, "options", [])
    labels = [str(value(o, "label", "") or "").strip() for o in options]
    hard, conflicts = [], {}
    if not any(labels) and all(value(o, "image_url") for o in options):
        # No reading-load measurement exists for a caption-free image. Its exact
        # bank is still bound below; existing image semantic gates remain required.
        return "images", hard, conflicts
    if not all(labels):
        return "invalid", ["missing option text or partially labeled image bank"], conflicts
    forms = {text_form(label) for label in labels}
    if "mixed" in forms or (forms & {"words", "phrases"} and forms & {"sentences", "utterances"}):
        hard.append("mixes vocabulary/fragment choices with complete sentences or responses")
    if len({tuple(TOKEN.findall(normalized(label))) for label in labels}) != len(labels):
        hard.append("duplicates an answer choice")
    if forms == {"words", "phrases"}:
        form = "lexical"
        conflicts["lexical-phrase"] = "mixes single words and natural multiword vocabulary"
    elif forms <= {"sentences", "utterances"} and "utterances" in forms:
        form = "utterances"
        conflicts["conversational-response"] = "uses complete conversational responses or instructions"
    else:
        form = next(iter(forms)) if len(forms) == 1 else "invalid"
    counts = [len(TOKEN.findall(normalized(label))) for label in labels]
    if max(counts) - min(counts) > max(2, min(counts) // 2):
        conflicts["reading-load"] = f"unequal reading load ({counts} words)"
    if len({len(segments(label)) for label in labels}) != 1:
        hard.append("mixes different numbers of sentences/utterances")
    actions = []
    for label in labels:
        clauses, identities = [], {}
        for segment in segments(label):
            # Questions, instructions, possession, preferences and needs assess
            # other functions; diversity applies to descriptive activity banks.
            if segment_form(segment) == "utterances" or re.match(r"^(?:who|what|where|how|do|does|can)\b", segment):
                continue
            match = ACTION_CLAUSE.match(re.sub(r"^(?:first|then),?\s+", "", segment))
            if match and ACTION[match['action']] not in {'have', 'like', 'want', 'need', 'understand'}:
                subject = match['subject'].strip()
                subject = identities.get(subject, subject)
                verbs = [ACTION[match['action']]]
                verbs.extend(PROGRESSIVE[m] for m in re.findall(r"\band\s+(\w+ing)\b", segment) if m in PROGRESSIVE)
                clauses.append((subject, tuple(verbs)))
            elif identity := re.fullmatch(r"(he|she|they) (?:is|are) ((?:a|the) .+)", segment):
                identities[identity[1]] = identity[2]
        actions.append(clauses)
    if all(actions):
        subjects = [re.sub(r"^(?:a|an|the)\s+", "", group[0][0]) for group in actions]
        verbs = [tuple(v for _, values in group for v in values) for group in actions]
        if len(set(subjects)) < len(subjects):
            conflicts["subject-variety"] = "repeats subjects in an action bank"
        if len(set(verbs)) < len(verbs):
            conflicts["action-variety"] = "repeats actions in an action bank"
    return form, hard, conflicts


def validate_banks(lessons, contracts=None, *, require_contracts=True):
    errors = []
    if contracts is None and require_contracts:
        try:
            contracts = json.loads(CONTRACTS_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            return [f"Answer-choice contracts are missing or invalid: {exc}"]
    if require_contracts and (not isinstance(contracts, dict) or contracts.get("schema_version") != 1
                              or not isinstance(contracts.get("banks"), dict)):
        return ["Answer-choice contracts must use schema_version 1 and a banks object."]
    records = contracts["banks"] if require_contracts else {}
    seen = set()
    for lesson in lessons:
        for card in value(lesson, "cards", []):
            if not is_answer_bank(card):
                continue
            key = bank_key(lesson, card)
            if key in seen:
                errors.append(f"{key}: duplicate answer-bank identity")
            seen.add(key)
            form, hard, conflicts = analyze_bank(card)
            errors.extend(f"{key}: {message}" for message in hard)
            record = records.get(key)
            if require_contracts:
                if not isinstance(record, dict):
                    errors.append(f"{key}: missing answer-choice contract; review the complete bank")
                    record = {}
                elif record.get("sha256") != bank_fingerprint(card):
                    errors.append(f"{key}: stale answer-choice contract; review changed wording, answer and media")
                if record.get("form") not in FORMS or record.get("form") != form:
                    errors.append(f"{key}: answer-choice form must be {form!r}")
            exceptions = (record or {}).get("exceptions", {})
            if not isinstance(exceptions, dict):
                errors.append(f"{key}: exceptions must name individual checks and teaching reasons")
                exceptions = {}
            for check, reason in exceptions.items():
                if check not in EXCEPTIONS or check not in conflicts:
                    errors.append(f"{key}: unknown or unnecessary exception {check!r}")
                if not isinstance(reason, str) or len(reason.strip()) < 30:
                    errors.append(f"{key}: {check} needs a concrete teaching reason")
            for check, message in conflicts.items():
                if check not in exceptions:
                    errors.append(f"{key}: {message}; review and record a narrowly scoped teaching exception only when justified")
    if require_contracts:
        errors.extend(f"{key}: orphan answer-choice contract" for key in records.keys() - seen)
    return errors


def main():
    """Read-only audit/inspection; intentionally no accept or refresh command."""
    import argparse
    from backend.app.data import LESSONS

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", help="Inspect one lesson id; use with --slide.")
    parser.add_argument("--slide", help="Inspect one exact answer bank, without writing a contract.")
    args = parser.parse_args()
    if bool(args.lesson) != bool(args.slide):
        parser.error("--lesson and --slide must be supplied together")
    if args.lesson:
        lesson = LESSONS.get(args.lesson)
        cards = [c for c in lesson.cards if c.slide_id == args.slide and is_answer_bank(c)] if lesson else []
        if len(cards) != 1:
            parser.error("The requested lesson/slide must identify one ordinary answer bank")
        card = cards[0]
        form, hard, conflicts = analyze_bank(card)
        print(json.dumps({"key": bank_key(lesson, card), "sha256": bank_fingerprint(card),
                          "form": form, "prompt": card.prompt, "audio_text": card.audio_text,
                          "correct_option_id": card.correct_option_id,
                          "options": [o.model_dump() for o in card.options],
                          "blocking_defects": hard, "teaching_conflicts": conflicts},
                         ensure_ascii=False, indent=2))
        return 1 if hard else 0
    errors = validate_banks(LESSONS.values())
    for error in errors:
        print(error)
    if not errors:
        count = sum(is_answer_bank(c) for lesson in LESSONS.values() for c in lesson.cards)
        print(f"Answer-choice guardrail passed: {count} exact banks across {len(LESSONS)} lessons.")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
