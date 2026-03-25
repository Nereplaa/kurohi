from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.genre import GenreOut
from app.schemas.season import SeasonOut


class AnimeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    release_year: Optional[int] = Field(None, ge=1917, le=2100)
    age_rating: Optional[str] = Field(None, max_length=20)
    cover_image_url: Optional[str] = None
    genre_ids: List[int] = []


class AnimeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    release_year: Optional[int] = Field(None, ge=1917, le=2100)
    age_rating: Optional[str] = Field(None, max_length=20)
    cover_image_url: Optional[str] = None
    genre_ids: Optional[List[int]] = None


class AnimeOut(BaseModel):
    anime_id: int
    mal_id: Optional[int] = None
    title: str
    description: Optional[str]
    release_year: Optional[int]
    age_rating: Optional[str]
    cover_image_url: Optional[str]
    genres: List[GenreOut] = []
    seasons: List[SeasonOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}
