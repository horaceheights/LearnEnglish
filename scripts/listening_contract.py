"""Admission rules for ordinary listening choices, independent of unit identity."""
import re


def words(text):
    return " ".join(re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text.lower().replace("’", "'")))


def ordinary_listening_errors(context, heard, options, correct_id):
    errors = []
    if context:
        errors.append("ordinary Listen must not depend on a Spanish scenario paragraph")
    correct = next((item for item in options if item["id"] == correct_id), {})
    answer = correct.get("text") or correct.get("label") or ""
    # A proposal or next question cannot be inferred under the shared ordinary
    # Listen instruction. Conversation decisions have their own mission contract.
    if answer.rstrip().endswith("?") or words(answer).startswith("let's "):
        spoken = " " + words(heard) + " "
        matches = [item["id"] for item in options
                   if words(item.get("text") or item.get("label") or "")
                   and " " + words(item.get("text") or item.get("label")) + " " in spoken]
        if matches != [correct_id]:
            errors.append("ordinary Listen questions/proposals need exactly one heard answer; hidden intentions are not evidence")
    return errors
