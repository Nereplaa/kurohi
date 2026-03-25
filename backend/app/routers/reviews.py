from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Anime, Review, ReviewStatus, User
from app.schemas import ReviewCreate, ReviewOut, ReviewUpdate
from app.core.deps import get_active_user, require_role

router = APIRouter(prefix="/reviews", tags=["Reviews"])

ContentManagerOrAdmin = Depends(require_role("content_manager", "admin"))


@router.post("/", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    anime_id: int = Query(..., description="Yorum yapilacak anime ID"),
    payload: ReviewCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user),
):
    """
    Yorum ekle.
    - Ayni kullanici ayni animeye sadece 1 yorum yapabilir.
    - Rating 1-10 arasi olmalidir (Pydantic + DB constraint).
    """
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


@router.get("/{anime_id}", response_model=List[ReviewOut])
def get_anime_reviews(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Bir anime'nin yorumlarini listele.
    Normal kullanicilar sadece approved yorumlari gorur.
    """
    if not db.get(Anime, anime_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")

    return (
        db.query(Review)
        .filter(
            Review.anime_id == anime_id,
            Review.review_status == ReviewStatus.approved,
        )
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.put("/{review_id}", response_model=ReviewOut)
def update_review(
    review_id: int,
    payload: ReviewUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Kullanici sadece kendi yorumunu guncelleyebilir."""
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadi.")
    if review.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu yorum size ait degil.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(review, field, value)

    review.review_status = ReviewStatus.pending

    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """
    Yorum sil.
    - Kullanici kendi yorumunu silebilir.
    - Content Manager veya Admin herhangi bir yorumu silebilir.
    """
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yorum bulunamadi.")

    db.refresh(current_user, ["role"])
    is_owner = review.user_id == current_user.user_id
    is_manager = current_user.role.role_name in ("content_manager", "admin")

    if not is_owner and not is_manager:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu yorumu silme yetkiniz yok.")

    db.delete(review)
    db.commit()


@router.get("/me/all", response_model=List[ReviewOut])
def get_my_reviews(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Kullanicinin kendi tum yorumlarini listeler (tum statusler)."""
    return (
        db.query(Review)
        .filter(Review.user_id == current_user.user_id)
        .order_by(Review.created_at.desc())
        .all()
    )
