from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AnimeFavInfo(BaseModel):
    anime_id: int
    title: str
    cover_image_url: Optional[str] = None

    model_config = {"from_attributes": True}


class FavoriteOut(BaseModel):
    favorite_id: int
    user_id: int
    anime_id: int
    created_at: datetime
    anime: Optional[AnimeFavInfo] = None

    model_config = {"from_attributes": True}
