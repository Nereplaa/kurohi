import enum
from datetime import datetime

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.models.base import Base


class ReviewStatus(str, enum.Enum):
    approved = "approved"
    pending = "pending"
    rejected = "rejected"


class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    anime_id = Column(Integer, ForeignKey("anime.anime_id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    review_status = Column(
        SAEnum(ReviewStatus),
        nullable=False,
        default=ReviewStatus.pending,
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 10", name="ck_review_rating_range"),
        UniqueConstraint("user_id", "anime_id", name="uq_review_user_anime"),
    )

    user = relationship("User", back_populates="reviews")
    anime = relationship("Anime", back_populates="reviews")
