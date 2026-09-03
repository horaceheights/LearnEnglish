import hmac


OPEN_API_PATHS = {"/api/health", "/api/release/status"}


def _key_matches(expected: str, provided: str | None) -> bool:
    return bool(expected and provided and hmac.compare_digest(expected, provided))


def api_request_is_authorized(
    path: str,
    *,
    configured_app_key: str,
    configured_admin_key: str,
    provided_app_key: str | None,
    provided_admin_key: str | None,
) -> bool:
    """Authorize API requests while supporting a staged app-key rollout."""
    if not path.startswith("/api/") or path in OPEN_API_PATHS:
        return True

    admin_authorized = _key_matches(configured_admin_key, provided_admin_key)
    if path.startswith("/api/admin"):
        return admin_authorized

    if not configured_app_key:
        return True

    return _key_matches(configured_app_key, provided_app_key) or admin_authorized
