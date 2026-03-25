from typing import Optional, List, TYPE_CHECKING
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.schemas.episode import EpisodeOut


class SeasonCreate(BaseModel):
    season_number: int = Field(..., gt=0)
    season_title: Optional[str] = Field(None, max_length=500)


class SeasonOut(BaseModel):
    season_id: int
    anime_id: int
    season_number: int
    season_title: Optional[str]
    episodes: List["EpisodeOut"] = []

    model_config = {"from_attributes": True}


from app.schemas.episode import EpisodeOut  # noqa: E402
SeasonOut.model_rebuild()
