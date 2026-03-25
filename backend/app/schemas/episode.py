from typing import Optional
from pydantic import BaseModel, Field


class EpisodeCreate(BaseModel):
    episode_number: int = Field(..., gt=0)
    title: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = None
    is_premium: bool = False
    duration_seconds: Optional[int] = Field(None, ge=0)


class EpisodeUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = None
    is_premium: Optional[bool] = None
    duration_seconds: Optional[int] = Field(None, ge=0)


class EpisodeOut(BaseModel):
    episode_id: int
    season_id: int
    episode_number: int
    title: Optional[str]
    video_url: Optional[str]
    is_premium: bool
    duration_seconds: Optional[int]

    model_config = {"from_attributes": True}
