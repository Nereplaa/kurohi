from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WatchHistoryUpsert(BaseModel):
    watched_duration: int = Field(..., ge=0)
    completed_flag: bool = False


class _AnimeInfo(BaseModel):
    anime_id: int
    title: str
    cover_image_url: Optional[str] = None
    model_config = {"from_attributes": True}


class _SeasonInfo(BaseModel):
    season_id: int
    anime: _AnimeInfo
    model_config = {"from_attributes": True}


class EpisodeHistoryInfo(BaseModel):
    episode_id: int
    episode_number: int
    title: Optional[str] = None
    season: _SeasonInfo
    model_config = {"from_attributes": True}


class WatchHistoryOut(BaseModel):
    history_id: int
    user_id: int
    episode_id: int
    watched_duration: int
    completed_flag: bool
    last_watched_at: datetime
    episode: Optional[EpisodeHistoryInfo] = None

    model_config = {"from_attributes": True}
