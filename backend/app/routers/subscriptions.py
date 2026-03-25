from typing import Annotated, List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Subscription, User
from app.schemas import SubscriptionCreate, SubscriptionOut
from app.core.deps import get_active_user, require_role

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

AdminOnly = Depends(require_role("admin"))


@router.post("/", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """
    Uye kullanici kendi aboneligini olusturur.
    - start_date < end_date kontrolu Pydantic'te yapilir.
    - Cakisan abonelik kontrolu: ayni tarih araliginda baska abonelik varsa 409 doner.
    """
    overlapping = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.user_id,
            Subscription.start_date < payload.end_date,
            Subscription.end_date > payload.start_date,
        )
        .first()
    )
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Bu tarih araliginda zaten bir aboneliginiz var: "
                f"{overlapping.plan_name} ({overlapping.start_date} - {overlapping.end_date})."
            ),
        )

    sub = Subscription(
        user_id=current_user.user_id,
        **payload.model_dump(),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/me", response_model=SubscriptionOut)
def get_active_subscription(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Kullanicinin su an aktif olan aboneligini getirir."""
    today = date.today()
    active_sub = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.user_id,
            Subscription.start_date <= today,
            Subscription.end_date > today,
        )
        .order_by(Subscription.end_date.desc())
        .first()
    )
    if not active_sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aktif bir aboneliginiz bulunmuyor.",
        )
    return active_sub


@router.get("/me/all", response_model=List[SubscriptionOut])
def get_all_subscriptions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Kullanicinin tum abonelik gecmisini listeler."""
    return (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.user_id)
        .order_by(Subscription.start_date.desc())
        .all()
    )


@router.post("/{target_user_id}", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def admin_create_subscription(
    target_user_id: int,
    payload: SubscriptionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Admin, herhangi bir kullaniciya abonelik atayabilir. Cakisma kontrolu yapilir."""
    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")

    overlapping = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == target_user_id,
            Subscription.start_date < payload.end_date,
            Subscription.end_date > payload.start_date,
        )
        .first()
    )
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Bu kullanicinin belirtilen tarih araliginda aboneligi var: "
                f"{overlapping.plan_name} ({overlapping.start_date} - {overlapping.end_date})."
            ),
        )

    sub = Subscription(user_id=target_user_id, **payload.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub
