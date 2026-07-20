from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base


class UserGameSession(Base):
    """Records every time a user plays a game."""
    __tablename__ = "user_game_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    played_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="sessions")
    game = relationship("Game", backref="sessions")
