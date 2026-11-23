import os

import sentry_sdk

from .deploy_source import deployed_identity


def _sample_rate(value: str | None, fallback: float = 0.2) -> float:
    try:
        return min(max(float(value or fallback), 0.0), 1.0)
    except (TypeError, ValueError):
        return fallback


def initialize_diagnostics() -> bool:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    options: dict[str, object] = {
        "dsn": dsn,
        "environment": os.getenv("SENTRY_ENVIRONMENT", "production"),
        "max_request_body_size": "never",
        "send_default_pii": False,
        "traces_sample_rate": _sample_rate(os.getenv("SENTRY_TRACES_SAMPLE_RATE")),
    }
    # Tag errors with the main commit, not the render-deploy copy's commit.
    release = deployed_identity()["git_commit"]
    if release:
        options["release"] = release

    sentry_sdk.init(**options)
    return True
