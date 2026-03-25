from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccountStatus, Review, ReviewStatus, Role, User
from app.schemas import ReviewOut, UserOut
from app.core.deps import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

AdminOnly = Depends(require_role("admin"))
ModOrAdmin = Depends(require_role("content_manager", "admin"))


# ---------------------------------------------------------------------------
# Yorum Moderasyon
# ---------------------------------------------------------------------------

class ReviewStatusUpdate(BaseModel):
    review_status: str = Field(..., description="Yeni durum: pending, approved, rejected")


@router.get("/reviews", response_model=List[ReviewOut])
def list_all_reviews(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ModOrAdmin],
    review_status: Optional[str] = Query(None, description="Filtre: pending, approved, rejected"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Tum yorumlari listele. Opsiyonel status filtresi."""
    q = db.query(Review)
    if review_status:
        try:
            status_enum = ReviewStatus(review_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gecersiz durum. Secenekler: {[s.value for s in ReviewStatus]}",
            )
        q = q.filter(Review.review_status == status_enum)

    return q.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/reviews/{review_id}", response_model=ReviewOut)
def moderate_review(
    review_id: int,
    payload: ReviewStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ModOrAdmin],
):
    """Yorum durumunu guncelle: pending / approved / rejected."""
    try:
        new_status = ReviewStatus(payload.review_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gecersiz durum. Secenekler: {[s.value for s in ReviewStatus]}",
        )

    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadi.")

    review.review_status = new_status
    db.commit()
    db.refresh(review)
    return review


# ---------------------------------------------------------------------------
# Kullanici Yonetimi
# ---------------------------------------------------------------------------

class UserRoleUpdate(BaseModel):
    role_name: str = Field(..., description="Yeni rol: member, content_manager, admin")


class UserStatusUpdate(BaseModel):
    account_status: str = Field(..., description="Yeni durum: active, banned, inactive")


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
    account_status: Optional[str] = Query(None, description="Filtre: active, banned, inactive"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Tum kullanicilari listele. Opsiyonel status filtresi."""
    q = db.query(User)
    if account_status:
        try:
            status_enum = AccountStatus(account_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gecersiz durum. Secenekler: {[s.value for s in AccountStatus]}",
            )
        q = q.filter(User.account_status == status_enum)

    return q.offset(skip).limit(limit).all()


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Belirli bir kullaniciyi getir."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


@router.put("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Kullanici hesap durumunu guncelle (active / banned / inactive)."""
    try:
        new_status = AccountStatus(payload.account_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gecersiz durum. Secenekler: {[s.value for s in AccountStatus]}",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kendi hesabinizin durumunu degistiremezsiniz.",
        )

    user.account_status = new_status
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Kullanici rolunu guncelle."""
    role = db.query(Role).filter(Role.role_name == payload.role_name).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gecersiz rol. Secenekler: member, content_manager, admin",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kendi rolunuzu degistiremezsiniz.",
        )

    user.role_id = role.role_id
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Kullaniciyi sil. Admin kendini silemez."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kendi hesabinizi silemezsiniz.",
        )

    db.delete(user)
    db.commit()
