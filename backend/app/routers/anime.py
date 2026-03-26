from typing import Annotated, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Anime, Episode, Genre, Review, ReviewStatus, Season, User
from app.schemas import AnimeCreate, AnimeUpdate, AnimeOut, EpisodeOut, ReviewOut
from app.core.deps import get_active_user, require_role

router = APIRouter(prefix="/anime", tags=["Anime"])

ContentManagerOrAdmin = Depends(require_role("content_manager", "admin"))


@router.get("/featured", response_model=List[AnimeOut])
def get_featured_anime(db: Annotated[Session, Depends(get_db)]):
    """En çok incelenen ve en yüksek puanlı 7 animeyi döndürür."""
    results = (
        db.query(Anime)
        .join(Review, Review.anime_id == Anime.anime_id)
        .filter(Review.review_status == ReviewStatus.approved)
        .group_by(Anime.anime_id)
        .order_by(
            func.count(Review.review_id).desc(),
            func.avg(Review.rating).desc(),
        )
        .limit(7)
        .all()
    )
    # Yeterli yorum yoksa en yeni animelerle tamamla
    if len(results) < 7:
        existing_ids = [a.anime_id for a in results]
        extra = (
            db.query(Anime)
            .filter(Anime.anime_id.notin_(existing_ids))
            .order_by(Anime.created_at.desc())
            .limit(7 - len(results))
            .all()
        )
        results = results + extra
    return results


@router.get("/", response_model=List[AnimeOut])
def list_anime(
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    genre_ids: Optional[List[int]] = Query(None),
    release_year: Optional[int] = Query(None),
    search: Optional[str] = Query(None, min_length=1),
):
    q = db.query(Anime)
    if search:
        q = q.filter(Anime.title.ilike(f"%{search}%"))
    if release_year:
        q = q.filter(Anime.release_year == release_year)
    if genre_ids:
        q = q.filter(Anime.genres.any(Genre.genre_id.in_(genre_ids)))
    return q.offset(skip).limit(limit).all()


@router.get("/{anime_id}", response_model=AnimeOut)
def get_anime(anime_id: int, db: Annotated[Session, Depends(get_db)]):
    anime = db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")
    return anime


@router.post("/", response_model=AnimeOut, status_code=status.HTTP_201_CREATED)
def create_anime(
    payload: AnimeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    genres = db.query(Genre).filter(Genre.genre_id.in_(payload.genre_ids)).all()
    if len(genres) != len(payload.genre_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bazi turler bulunamadi.")

    anime = Anime(
        title=payload.title,
        description=payload.description,
        release_year=payload.release_year,
        age_rating=payload.age_rating,
        cover_image_url=payload.cover_image_url,
        created_by=current_user.user_id,
        genres=genres,
    )
    db.add(anime)
    db.commit()
    db.refresh(anime)
    return anime


@router.put("/{anime_id}", response_model=AnimeOut)
def update_anime(
    anime_id: int,
    payload: AnimeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    anime = db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")

    update_data = payload.model_dump(exclude_unset=True)
    genre_ids = update_data.pop("genre_ids", None)

    for field, value in update_data.items():
        setattr(anime, field, value)

    if genre_ids is not None:
        genres = db.query(Genre).filter(Genre.genre_id.in_(genre_ids)).all()
        if len(genres) != len(genre_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bazi turler bulunamadi.")
        anime.genres = genres

    db.commit()
    db.refresh(anime)
    return anime


@router.delete("/{anime_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_anime(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    anime = db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")
    db.delete(anime)
    db.commit()


@router.get("/{anime_id}/episodes", response_model=List[EpisodeOut])
def get_all_anime_episodes(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    if not db.get(Anime, anime_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")
    return (
        db.query(Episode)
        .join(Season, Episode.season_id == Season.season_id)
        .filter(Season.anime_id == anime_id)
        .order_by(Season.season_number, Episode.episode_number)
        .all()
    )


@router.get("/{anime_id}/reviews", response_model=List[ReviewOut])
def get_anime_reviews(
    anime_id: int,
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
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
