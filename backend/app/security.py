from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app import db
from app.config import settings
from app.errors import unauthorized
from app.schemas import UserOut

ALGORITHM = "HS256"

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

USER_COLUMNS = "id, email, username, full_name, person_id, created_at"


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return _pwd.verify(password, hashed)


def issue_token(user_id: UUID, auth_method: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_ttl_minutes)
    claims = {"sub": str(user_id), "amr": auth_method, "exp": expires}
    return jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM)


def load_user(user_id: UUID | str) -> UserOut | None:
    row = db.fetch_one(
        f"SELECT {USER_COLUMNS} FROM users WHERE id = %s AND is_active",
        (str(user_id),),
    )
    return UserOut(**row) if row else None


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> UserOut:
    if credentials is None:
        raise unauthorized("Autenticação necessária")
    try:
        claims = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise unauthorized()
    user = load_user(claims["sub"])
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[UserOut, Depends(current_user)]


def ensure_admin() -> None:
    """Create the bootstrap admin on first start. Existing passwords are never overwritten."""
    db.execute(
        """
        INSERT INTO users (email, username, full_name, hashed_password)
        VALUES (%s, %s, 'Administrador', %s)
        ON CONFLICT DO NOTHING
        """,
        (settings.admin_email, settings.admin_username, hash_password(settings.admin_password)),
    )
