
from datetime import datetime, timedelta, timezone
import os

import jwt
from pwdlib import PasswordHash

SECRET_KEY = os.getenv("STOCKFLOW_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "Set the STOCKFLOW_SECRET_KEY environment variable first."
    )

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int, organization_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "org": organization_id,
        "exp": expires,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
