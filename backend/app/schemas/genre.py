from pydantic import BaseModel, Field


class GenreCreate(BaseModel):
    genre_name: str = Field(..., min_length=1, max_length=100)


class GenreOut(BaseModel):
    genre_id: int
    genre_name: str

    model_config = {"from_attributes": True}
