from typing import Annotated, List
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Episode, Season, Subscription, User, WatchHistory
from app.schemas import (
    EpisodeCreate, EpisodeUpdate, EpisodeOut,
    WatchHistoryUpsert, WatchHistoryOut,
)
from app.core.deps import get_active_user, require_role

router = APIRouter(tags=["Episodes"])

ContentManagerOrAdmin = Depends(require_role("content_manager", "admin"))


@router.get("/seasons/{season_id}/episodes", response_model=List[EpisodeOut])
def list_episodes(season_id: int, db: Annotated[Session, Depends(get_db)]):
    season = db.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sezon bulunamadi.")
    return season.episodes


@router.post("/seasons/{season_id}/episodes", response_model=EpisodeOut, status_code=status.HTTP_201_CREATED)
def create_episode(
    season_id: int,
    payload: EpisodeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    season = db.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sezon bulunamadi.")

    existing = (
        db.query(Episode)
        .filter(Episode.season_id == season_id, Episode.episode_number == payload.episode_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Bu sezonda {payload.episode_number}. bolum zaten mevcut.",
        )

    episode = Episode(season_id=season_id, **payload.model_dump())
    db.add(episode)
    db.commit()
    db.refresh(episode)
    return episode


@router.put("/episodes/{episode_id}", response_model=EpisodeOut)
def update_episode(
    episode_id: int,
    payload: EpisodeUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    episode = db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bolum bulunamadi.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(episode, field, value)

    db.commit()
    db.refresh(episode)
    return episode


@router.delete("/episodes/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_episode(
    episode_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, ContentManagerOrAdmin],
):
    episode = db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bolum bulunamadi.")
    db.delete(episode)
    db.commit()


@router.get("/episodes/{episode_id}/watch", response_model=EpisodeOut)
def watch_episode(
    episode_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Is Kurali #1: Premium bolumlerde abonelik kontrolu."""
    episode = db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bolum bulunamadi.")

    if episode.is_premium:
        today = date.today()
        active_sub = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == current_user.user_id,
                Subscription.end_date > today,
            )
            .first()
        )
        if not active_sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu premium icerigi izlemek icin aktif abonelik gerekiyor.",
            )

    return episode


@router.post("/episodes/{episode_id}/progress", response_model=WatchHistoryOut)
def update_watch_progress(
    episode_id: int,
    payload: WatchHistoryUpsert,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_active_user)],
):
    """Is Kurali #3: Ayni kullanici + ayni bolum -> upsert."""
    episode = db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bolum bulunamadi.")

    history = (
        db.query(WatchHistory)
        .filter(
            WatchHistory.user_id == current_user.user_id,
            WatchHistory.episode_id == episode_id,
        )
        .first()
    )

    if history:
        history.watched_duration = payload.watched_duration
        history.completed_flag = payload.completed_flag
        history.last_watched_at = datetime.utcnow()
    else:
        history = WatchHistory(
            user_id=current_user.user_id,
            episode_id=episode_id,
            watched_duration=payload.watched_duration,
            completed_flag=payload.completed_flag,
        )
        db.add(history)

    db.commit()
    db.refresh(history)
    return history
