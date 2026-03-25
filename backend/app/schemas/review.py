from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

from app.models.review import ReviewStatus


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=10)
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not (1 <= v <= 10):
            raise ValueError("Rating 1 ile 10 arasinda olmalidir.")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=10)
    comment: Optional[str] = None


class AnimeReviewInfo(BaseModel):
    anime_id: int
    title: str
    cover_image_url: Optional[str] = None
    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    review_id: int
    user_id: Optional[int]
    anime_id: int
    rating: int
    comment: Optional[str]
    review_status: ReviewStatus
    created_at: datetime
    anime: Optional[AnimeReviewInfo] = None

    model_config = {"from_attributes": True}
