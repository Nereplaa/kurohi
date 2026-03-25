from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role, AccountStatus
from app.schemas import UserCreate, UserOut, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_active_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Annotated[Session, Depends(get_db)]):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu e-posta adresi zaten kullaniliyor.",
        )

    member_role = db.query(Role).filter(Role.role_name == "member").first()
    if not member_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanici rolleri henuz tanimlanmamis.",
        )

    user = User(
        name=payload.name,
        surname=payload.surname,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role_id=member_role.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya sifre hatali.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != AccountStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabiniz aktif degil.",
        )

    token = create_access_token({"sub": str(user.user_id)})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: Annotated[User, Depends(get_active_user)]):
    return current_user
