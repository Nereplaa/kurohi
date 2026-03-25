from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Anime, Season, User
from app.schemas import SeasonCreate, SeasonOut
from app.core.deps import require_role

router = APIRouter(tags=["Seasons"])

ContentManagerOrAdmin = Depends(require_role("content_manager", "admin"))


@router.get("/anime/{anime_id}/seasons", response_model=List[SeasonOut])
def list_seasons(anime_id: int, db: Annotated[Session, Depends(get_db)]):
    anime = db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")
    return anime.seasons


@router.post(
    "/anime/{anime_id}/seasons",
    response_model=SeasonOut,
    status_code=status.HTTP_201_CREATED,
)
def create_season(
    anime_id: int,
    payload: SeasonCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    anime = db.get(Anime, anime_id)
    if not anime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anime bulunamadi.")

    existing = (
        db.query(Season)
        .filter(Season.anime_id == anime_id, Season.season_number == payload.season_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bu anime icin {payload.season_number}. sezon zaten mevcut.",
        )

    season = Season(anime_id=anime_id, **payload.model_dump())
    db.add(season)
    db.commit()
    db.refresh(season)
    return season


@router.delete("/seasons/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_season(
    season_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    """Is Kurali #2: Sezonlar dogrudan silinemez; anime ile birlikte CASCADE silinir."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Sezonlar dogrudan silinemez. Anime'yi silerek sezonlari kaldirin.",
    )
