from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base


class Feedback(Base):
    """User-submitted feedback: bug reports, feature requests, general comments."""
    __tablename__ = "feedback"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    type        = Column(String(20), nullable=False)          # "bug" | "feature" | "general"
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status      = Column(String(20), default="open")          # "open" | "in_progress" | "closed"
    created_at  = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="feedbacks")
