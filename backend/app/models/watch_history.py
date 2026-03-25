from datetime import datetime

from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship

from app.models.base import Base


class WatchHistory(Base):
    __tablename__ = "watch_history"

    history_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    episode_id = Column(Integer, ForeignKey("episodes.episode_id", ondelete="CASCADE"), nullable=False)
    watched_duration = Column(Integer, nullable=False, default=0)
    completed_flag = Column(Boolean, nullable=False, default=False)
    last_watched_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "episode_id", name="uq_watch_history_user_episode"),
        CheckConstraint("watched_duration >= 0", name="ck_watched_duration_non_negative"),
    )

    user = relationship("User", back_populates="watch_history")
    episode = relationship("Episode", back_populates="watch_history")
