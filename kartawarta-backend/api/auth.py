import os
from fastapi import APIRouter, HTTPException
import bcrypt
import jwt
from datetime import datetime, timedelta

from .schemas import LoginRequest, TokenResponse
from db import get_connection
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

# Secret key for signing JWTs
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_default_secret_key")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def authenticate_user(username: str, password: str) -> bool:
    """Authenticate against the MSSQL database using `get_connection()`.

    Tries a common `users` table first, then falls back to `[User]`.
    Assumes stored passwords are bcrypt hashes.
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash FROM [User] WHERE username = %s", (username,))
            row = cursor.fetchone()
            if not row:
                return False
            stored_password = row[0]
            if stored_password is None:
                return False
            return bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
    except Exception:
        return False


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    username = request.username
    password = request.password
    if not authenticate_user(username, password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    expiration = datetime.utcnow() + timedelta(hours=1)
    payload = {"sub": username, "exp": expiration}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {"token": token, "token_type": "bearer"}
