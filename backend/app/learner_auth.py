"""Clerk is an identity provider; learner data and IDs remain application-owned."""
import os
from dataclasses import dataclass

import httpx
from fastapi import HTTPException, Request


@dataclass(frozen=True)
class Identity:
    issuer: str
    subject: str


def authenticate(request: Request) -> Identity:
    # Import lazily so legacy clients can continue during the Preview rollout.
    from clerk_backend_api import Clerk
    from clerk_backend_api.security.types import AuthenticateRequestOptions

    secret = os.getenv("CLERK_SECRET_KEY", "").strip()
    issuer = os.getenv("CLERK_ISSUER", "").strip().rstrip("/")
    parties = [item.strip() for item in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if item.strip()]
    if not secret or not issuer or not parties:
        raise HTTPException(503, "El acceso a cuentas todavía no está disponible.")
    if not request.headers.get("authorization", "").startswith("Bearer "):
        raise HTTPException(401, "Inicia sesión para continuar.")
    try:
        with Clerk(bearer_auth=secret) as clerk:
            state = clerk.authenticate_request(
                httpx.Request(request.method, str(request.url), headers={"Authorization": request.headers["authorization"]}),
                # Native session tokens omit azp. Validate signed browser azp
                # below; the SDK's parties option rejects native tokens entirely.
                AuthenticateRequestOptions(accepts_token=['session_token'], jwt_key=os.getenv("CLERK_JWT_KEY") or None),
            )
        payload = state.payload or {}
        if (not state.is_signed_in or payload.get("iss", "").rstrip("/") != issuer
                or not payload.get("sub") or not payload.get("sid")
                or any(type(payload.get(field)) not in (int, float) for field in ('exp', 'iat', 'nbf'))
                or (payload.get("azp") is not None and payload["azp"] not in parties)):
            raise HTTPException(401, "Tu sesión venció. Inicia sesión de nuevo.")
        return Identity(issuer, payload["sub"])
    except HTTPException:
        raise
    except Exception as error:
        # Do not log bearer tokens or provider exceptions containing request data.
        raise HTTPException(401, "No pudimos verificar tu sesión.") from error


def delete_identity(identity: Identity) -> None:
    from clerk_backend_api import Clerk
    from clerk_backend_api.models import SDKError
    try:
        with Clerk(bearer_auth=os.environ["CLERK_SECRET_KEY"]) as clerk:
            clerk.users.delete(user_id=identity.subject)
    except SDKError as error:
        if error.status_code != 404:
            raise HTTPException(503, "No pudimos eliminar tu cuenta. Inténtalo otra vez.") from error
