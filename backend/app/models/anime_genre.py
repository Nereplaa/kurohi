from sqlalchemy import Column, Integer, ForeignKey

from app.models.base import Base


class AnimeGenre(Base):
    __tablename__ = "anime_genres"

    anime_id = Column(Integer, ForeignKey("anime.anime_id", ondelete="CASCADE"), primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.genre_id", ondelete="CASCADE"), primary_key=True)
