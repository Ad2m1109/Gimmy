from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(1000), nullable=True)
    thumbnail = Column(String(255), nullable=True)
    cover_image = Column(String(255), nullable=True)
    iframe_url = Column(String(255), nullable=True)
    difficulty = Column(String(20), default="medium")
    
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    plays = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    
    is_featured = Column(Boolean, default=False)
    is_trending = Column(Boolean, default=False)
    is_new = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="games")
