from typing import Annotated, List, Iterator
from datetime import datetime, date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Episode, Season, Subscription, User, WatchHistory
from app.schemas import (
    EpisodeCreate, EpisodeUpdate, EpisodeOut,
    WatchHistoryUpsert, WatchHistoryOut,
)
from app.core.deps import get_active_user, require_role
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.user import AccountStatus

router = APIRouter(tags=["Episodes"])

_MIME = {".mp4": "video/mp4", ".mkv": "video/x-matroska", ".webm": "video/webm"}
_CHUNK = 1024 * 512  # 512 KB per chunk


def _file_iterator(path: Path, start: int, end: int) -> Iterator[bytes]:
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = f.read(min(_CHUNK, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk

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


@router.get("/episodes/{episode_id}/stream")
def stream_episode(
    episode_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    token: str = Query(default=None),
):
    """
    HTTP Range-aware video streaming (206 Partial Content).

    Auth: accepts JWT via Authorization header OR ?token= query param.
    The ?token= form is required because <video src="..."> cannot send
    custom headers — the browser fetches the URL directly.

    The Episode.video_url column stores only the filename (e.g. 'aot-s1-e1.mp4').
    The absolute directory is read from settings.VIDEO_DIR so no path is
    ever hardcoded in the source code.
    """
    # ── Auth: header takes priority, fall back to query param ─────────────
    raw_token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]
    elif token:
        raw_token = token

    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kimlik doğrulama gerekli.")

    payload = decode_access_token(raw_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz veya süresi dolmuş token.")

    user_id = payload.get("sub")
    current_user = db.get(User, int(user_id)) if user_id else None
    if not current_user or current_user.account_status != AccountStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz kullanıcı.")
    # ──────────────────────────────────────────────────────────────────────
    if not settings.VIDEO_DIR:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video dizini yapılandırılmamış (VIDEO_DIR boş).",
        )

    episode = db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bölüm bulunamadı.")

    if not episode.video_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu bölüme ait video dosyası henüz yüklenmemiş.",
        )

    # Premium gate — same logic as /watch
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
                detail="Bu premium içeriği izlemek için aktif abonelik gerekiyor.",
            )

    file_path = Path(settings.VIDEO_DIR) / episode.video_url
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video dosyası sunucuda bulunamadı: {episode.video_url}",
        )

    file_size = file_path.stat().st_size
    mime_type = _MIME.get(file_path.suffix.lower(), "video/mp4")

    range_header = request.headers.get("Range")
    if range_header:
        # Parse "bytes=start-end"
        try:
            unit, rng = range_header.split("=")
            raw_start, raw_end = rng.split("-")
            start = int(raw_start)
            end = int(raw_end) if raw_end else file_size - 1
        except (ValueError, AttributeError):
            raise HTTPException(status_code=416, detail="Geçersiz Range başlığı.")

        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(
                status_code=416,
                detail="Range isteği dosya boyutunun dışında.",
                headers={"Content-Range": f"bytes */{file_size}"},
            )

        return StreamingResponse(
            _file_iterator(file_path, start, end),
            status_code=206,
            media_type=mime_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
                "Cache-Control": "no-cache",
            },
        )

    # No Range header — stream the full file
    return StreamingResponse(
        _file_iterator(file_path, 0, file_size - 1),
        status_code=200,
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Cache-Control": "no-cache",
        },
    )


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
