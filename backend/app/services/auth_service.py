from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from fastapi import HTTPException, status

from app.config import settings

_ph = PasswordHasher()


# --- Password Hashing ---

def hash_password(plain: str) -> str:
    """Hash a plain-text password using Argon2."""
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against an Argon2 hash."""
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """Check if the hash needs to be rehashed (e.g. after parameter change)."""
    return _ph.check_needs_rehash(hashed)


# --- JWT Token Handling ---

_ALGORITHM = "HS256"
_ACCESS_TYPE = "access"
_REFRESH_TYPE = "refresh"


def create_access_token(user_id: int, email: str) -> str:
    """Create a short-lived JWT access token."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": _ACCESS_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def create_refresh_token(user_id: int, email: str) -> str:
    """Create a long-lived JWT refresh token."""
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": _REFRESH_TYPE,
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def verify_token(token: str, expected_type: str = _ACCESS_TYPE) -> dict:
    """
    Decode and validate a JWT token.
    Returns the decoded payload dict on success.
    Raises HTTPException 401 on failure.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected token type '{expected_type}'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def decode_refresh_token(token: str) -> dict:
    """Verify a refresh token specifically."""
    return verify_token(token, expected_type=_REFRESH_TYPE)
