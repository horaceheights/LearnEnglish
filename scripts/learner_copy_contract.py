"""Shared admission rule for per-card scenario prose in newly composed content."""


def card_context_errors(context):
    if context:
        return ["per-card Spanish scenario text is not part of the shared activity; remove context_es in every stage, including missions"]
    return []
