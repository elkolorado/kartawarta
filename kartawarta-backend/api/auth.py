import os
from fastapi import APIRouter, HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
from datetime import datetime, timedelta

from .schemas import GoogleLoginRequest, RefreshTokenRequest, TokenResponse
from db import get_connection

router = APIRouter()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

def verify_google_token(token: str):
    try:
        # Verify the token against Google's public keys
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)
        
        # ID token is valid. Get the user's Google ID and email
        return idinfo
    except ValueError:
        # Invalid token
        return None


def create_token(subject: str, token_type: str, expires_delta: timedelta):
    expiration = datetime.utcnow() + expires_delta
    payload = {"sub": subject, "type": token_type, "exp": expiration}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login/google", response_model=TokenResponse)
async def login_google(request: GoogleLoginRequest):
    # 1. Verify Google Token
    user_data = verify_google_token(request.credential)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = user_data.get("email")
    
    # 2. Check/Create User in MSSQL
    # Since we trust Google, we just check if the email exists in our DB
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM [User] WHERE email = %s", (email,))
        row = cursor.fetchone()
        
        if not row:
            # Optional: Auto-register the user if they don't exist
            cursor.execute("INSERT INTO [User] (username, email, provider, provider_id) VALUES (%s, %s, 'google', %s)", (email, email, user_data.get("sub")))
            conn.commit()
            pass

    # 3. Issue access and refresh tokens for the app
    access_token = create_token(
        subject=email,
        token_type="access",
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_token(
        subject=email,
        token_type="refresh",
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )

    return {"token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    payload = decode_token(request.refresh_token, "refresh")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_token(
        subject=email,
        token_type="access",
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {"token": access_token, "refresh_token": request.refresh_token, "token_type": "bearer"}