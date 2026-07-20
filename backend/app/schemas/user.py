from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr
    avatar: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    avatar: Optional[str] = None
    is_public: Optional[bool] = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: int
    uuid: UUID
    username: str
    email: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    role: str
    is_verified: bool
    is_active: bool
    is_public: bool
    total_xp: int
    level: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class UserInDBBase(UserBase):
    id: int
    uuid: UUID
    role: str
    is_verified: bool
    is_active: bool
    total_xp: int
    level: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
