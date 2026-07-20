from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from pydantic import BaseModel
from jose import jwt as jose_jwt, JWTError
import httpx
import base64
import json

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema

router = APIRouter()

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_CLIENT_ID = "261006764457-ototpkga99f1aqvup7jme0dvrtmp4ue1.apps.googleusercontent.com"


class GoogleAuthRequest(BaseModel):
    credential: str

@router.post("/login")
async def login_access_token(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
async def register_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    result_username = await db.execute(select(User).where(User.username == user_in.username))
    if result_username.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=security.get_password_hash(user_in.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.post("/google", response_model=dict)
async def google_auth(
    *,
    db: AsyncSession = Depends(deps.get_db),
    body: GoogleAuthRequest,
) -> Any:
    """
    Authenticate with Google. Accepts a Google ID token (JWT),
    verifies it, creates the user if needed, and returns our own JWT.
    """
    credential = body.credential

    # Extract header to get the kid
    try:
        # JWT format: header.payload.signature
        parts = credential.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid Google token format")
        
        # Decode the header (first part)
        header_b64 = parts[0]
        # Add padding if needed
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header_data = base64.urlsafe_b64decode(header_b64)
        header = json.loads(header_data)
        kid = header.get("kid")
        
        if not kid:
            raise HTTPException(status_code=400, detail="Invalid Google token: missing kid")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Google token format")

    # Fetch Google's public keys
    async with httpx.AsyncClient() as client:
        jwks_response = await client.get(GOOGLE_JWKS_URL)
        jwks = jwks_response.json()

    # Find the matching public key
    public_key = None
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            public_key = key
            break

    if not public_key:
        raise HTTPException(status_code=400, detail="Unable to find matching Google key")

    # Verify and decode the token using python-jose
    try:
        claims = jose_jwt.decode(
            credential,
            public_key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            issuer="https://accounts.google.com",
        )
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Invalid or expired Google token: {str(e)}")

    # Extract user info from the token
    google_id = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name", "")
    picture = claims.get("picture", "")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Invalid Google token: missing required fields")

    # Check if user exists by google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Check if user exists by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Link existing account to Google
            user.google_id = google_id
            user.auth_provider = "google"
            user.is_verified = True
            if not user.avatar and picture:
                user.avatar = picture
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Create new user
            username = email.split("@")[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while True:
                result = await db.execute(select(User).where(User.username == username))
                if not result.scalar_one_or_none():
                    break
                username = f"{base_username}{counter}"
                counter += 1

            user = User(
                email=email,
                username=username,
                google_id=google_id,
                auth_provider="google",
                is_verified=True,
                avatar=picture if picture else None,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    # Generate our own JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
