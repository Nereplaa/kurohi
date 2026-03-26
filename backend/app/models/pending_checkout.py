from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class PendingCheckout(Base):
    """Temporary store for in-progress Iyzico checkout sessions.

    Created when /payments/initiate is called; deleted once the callback
    confirms (success or failure) or expires.
    """

    __tablename__ = "pending_checkouts"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    plan_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User")
