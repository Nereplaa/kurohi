from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AccountStatus, Anime, Favorite, Review, ReviewStatus,
    Subscription, User, WatchHistory,
)
from app.schemas import (
    ChangePasswordRequest, FavoriteOut, ReviewCreate, ReviewOut, ReviewUpdate,
    SubscriptionCreate, SubscriptionOut,
    UserOut, UserUpdate, WatchHistoryOut,
)
from app.core.deps import get_active_user, require_role
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["Users"])

AdminOnly = Depends(require_role("admin"))


# --- Profil ---

@router.post("/me/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut sifre yanlis.",
        )
    if payload.new_password != payload.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yeni sifreler eslesmedi.",
        )
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Sifre basariyla guncellendi."}


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# --- Izleme Gecmisi ---

@router.get("/me/history", response_model=List[WatchHistoryOut])
def get_watch_history(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    return (
        db.query(WatchHistory)
        .filter(WatchHistory.user_id == current_user.user_id)
        .order_by(WatchHistory.last_watched_at.desc())
        .all()
    )


# --- Favoriler ---

@router.get("/me/favorites", response_model=List[FavoriteOut])
def get_favorites(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    return db.query(Favorite).filter(Favorite.user_id == current_user.user_id).all()


@router.post("/me/favorites/{anime_id}", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def add_favorite(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    if not db.get(Anime, anime_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.user_id, Favorite.anime_id == anime_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Anime zaten favorilerde.")

    fav = Favorite(user_id=current_user.user_id, anime_id=anime_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/me/favorites/{anime_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.user_id, Favorite.anime_id == anime_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Favori bulunamadi.")
    db.delete(fav)
    db.commit()


# --- Yorumlar ---

@router.get("/me/reviews", response_model=List[ReviewOut])
def get_my_reviews(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    return db.query(Review).filter(Review.user_id == current_user.user_id).all()


@router.post("/me/reviews/{anime_id}", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    anime_id: int,
    payload: ReviewCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    if not db.get(Anime, anime_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")

    existing = (
        db.query(Review)
        .filter(Review.user_id == current_user.user_id, Review.anime_id == anime_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu anime icin zaten bir yorumunuz var.",
        )

    review = Review(
        user_id=current_user.user_id,
        anime_id=anime_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.put("/me/reviews/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: int,
    payload: ReviewUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadi.")
    if review.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu yorum size ait degil.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(review, field, value)

    db.commit()
    db.refresh(review)
    return review


@router.delete("/me/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadi.")
    if review.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu yorum size ait degil.")
    db.delete(review)
    db.commit()


# --- Abonelikler ---

@router.get("/me/subscriptions", response_model=List[SubscriptionOut])
def get_subscriptions(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    return db.query(Subscription).filter(Subscription.user_id == current_user.user_id).all()


@router.post("/{target_user_id}/subscriptions", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def create_subscription_for_user(
    target_user_id: int,
    payload: SubscriptionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    """Admin, herhangi bir kullaniciya abonelik atayabilir."""
    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    sub = Subscription(user_id=target_user_id, **payload.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


# --- Moderator / Admin: Yorum Yonetimi ---

ModOrAdmin = Depends(require_role("content_manager", "admin"))


@router.put("/reviews/{review_id}/status", response_model=ReviewOut)
def moderate_review(
    review_id: int,
    review_status: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ModOrAdmin],
):
    try:
        new_status = ReviewStatus(review_status)
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


# --- Admin: Kullanici Yonetimi ---

@router.get("/", response_model=List[UserOut])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
    skip: int = 0,
    limit: int = 50,
):
    return db.query(User).offset(skip).limit(limit).all()


@router.post("/{user_id}/ban", response_model=UserOut)
def ban_user(
    user_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, AdminOnly],
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    user.account_status = AccountStatus.banned
    db.commit()
    db.refresh(user)
    return user
