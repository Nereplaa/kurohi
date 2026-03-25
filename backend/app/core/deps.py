from typing import Annotated
from datetime import date

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, AccountStatus
from app.models.subscription import Subscription

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Gecersiz veya suresi dolmus token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


def get_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.account_status != AccountStatus.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabiniz aktif degil veya banli.",
        )
    return current_user


def require_role(*role_names: str):
    """Belirtilen rollerden birine sahip aktif kullanici gerektirir."""
    def dependency(
        current_user: Annotated[User, Depends(get_active_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> User:
        db.refresh(current_user, ["role"])
        if current_user.role.role_name not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu islem icin yetkiniz yok.",
            )
        return current_user
    return dependency


def require_active_subscription(
    current_user: Annotated[User, Depends(get_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Premium icerik icin aktif abonelik kontrolu (Is Kurali #1)."""
    today = date.today()
    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.user_id,
            Subscription.end_date > today,
        )
        .first()
    )
    if active_sub is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu icerigi izlemek icin aktif bir abonelik gerekiyor.",
        )
    return current_user
