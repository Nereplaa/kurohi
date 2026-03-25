from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class Season(Base):
    __tablename__ = "seasons"

    season_id = Column(Integer, primary_key=True, index=True)
    anime_id = Column(Integer, ForeignKey("anime.anime_id", ondelete="CASCADE"), nullable=False)
    season_number = Column(Integer, nullable=False)
    season_title = Column(String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("anime_id", "season_number", name="uq_season_anime_number"),
        CheckConstraint("season_number > 0", name="ck_season_number_positive"),
    )

    anime = relationship("Anime", back_populates="seasons")
    episodes = relationship("Episode", back_populates="season", cascade="all, delete-orphan")
