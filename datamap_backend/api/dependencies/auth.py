from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request

from config.settings import config


@dataclass(frozen=True)
class CurrentUser:
    user_key: str
    user_email: str | None


def _strip_identity_prefix(value: str | None) -> str | None:
    if not value:
        return value
    if ":" in value:
        return value.split(":", 1)[1]
    return value


def _resolve_from_launchpad_token(headers) -> CurrentUser:
    """Validate the AI Launchpad SSO JWT (HS256, shared SECRET_KEY) and use its
    `sub` (email) claim as the user identity. Mirrors the Launchpad's own
    get_current_user so DataMap trusts the same single sign-on — no separate
    DataMap login or user store."""
    auth_header = headers.get("authorization") or headers.get("Authorization") or ""
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")

    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(
            token,
            config.LAUNCHPAD_JWT_SECRET,
            algorithms=[config.LAUNCHPAD_JWT_ALGORITHM],
            # Signature + expiry are still enforced. We do NOT validate `iat`:
            # the Launchpad issues tokens with a future `iat` (its own jose-based
            # validator ignores iat), so enforcing it here would 401 valid users.
            # `leeway` covers minor clock skew on the `exp` check.
            leeway=30,
            options={"verify_iat": False},
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    email = (payload.get("sub") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Token missing subject.")
    return CurrentUser(user_key=email, user_email=email)


def resolve_current_user(request: Request) -> CurrentUser:
    mode = config.APP_SESSION_AUTH_MODE
    headers = request.headers

    if mode == "launchpad_sso":
        return _resolve_from_launchpad_token(headers)

    if mode == "iap":
        user_key = headers.get("x-goog-authenticated-user-id")
        user_email = headers.get("x-goog-authenticated-user-email")
        if not user_key:
            raise HTTPException(status_code=401, detail="Authenticated user headers are missing.")
        return CurrentUser(user_key=user_key, user_email=_strip_identity_prefix(user_email))

    if mode == "dev":
        header_user_key = headers.get(config.APP_SESSION_DEV_HEADER_USER_ID)
        header_user_email = headers.get(config.APP_SESSION_DEV_HEADER_USER_EMAIL)
        return CurrentUser(
            user_key=header_user_key or config.APP_SESSION_DEV_USER_ID,
            user_email=header_user_email or config.APP_SESSION_DEV_USER_EMAIL,
        )

    raise HTTPException(status_code=500, detail=f"Unsupported APP_SESSION_AUTH_MODE '{mode}'.")
