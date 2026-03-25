from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.user import AccountStatus
from app.schemas.role import RoleOut


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    surname: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    surname: Optional[str] = Field(None, min_length=1, max_length=100)


class UserOut(BaseModel):
    user_id: int
    name: str
    surname: str
    email: str
    account_status: AccountStatus
    role: RoleOut
    created_at: datetime

    model_config = {"from_attributes": True}
