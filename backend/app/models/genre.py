from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class Genre(Base):
    __tablename__ = "genres"

    genre_id = Column(Integer, primary_key=True, index=True)
    genre_name = Column(String(100), unique=True, nullable=False)

    animes = relationship("Anime", secondary="anime_genres", back_populates="genres")
