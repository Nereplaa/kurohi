from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class Anime(Base):
    __tablename__ = "anime"

    anime_id = Column(Integer, primary_key=True, index=True)
    mal_id = Column(Integer, nullable=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    release_year = Column(Integer, nullable=True)
    age_rating = Column(String(20), nullable=True)
    cover_image_url = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("release_year >= 1917 AND release_year <= 2100", name="ck_anime_release_year"),
    )

    created_by_user = relationship("User", back_populates="animes_created")
    genres = relationship("Genre", secondary="anime_genres", back_populates="animes")
    seasons = relationship("Season", back_populates="anime", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="anime", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="anime", cascade="all, delete-orphan")
