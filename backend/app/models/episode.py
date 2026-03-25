from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class Episode(Base):
    __tablename__ = "episodes"

    episode_id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.season_id", ondelete="CASCADE"), nullable=False)
    episode_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=True)
    video_url = Column(Text, nullable=True)
    is_premium = Column(Boolean, nullable=False, default=False)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("season_id", "episode_number", name="uq_episode_season_number"),
        CheckConstraint("episode_number > 0", name="ck_episode_number_positive"),
    )

    season = relationship("Season", back_populates="episodes")
    watch_history = relationship("WatchHistory", back_populates="episode", cascade="all, delete-orphan")
