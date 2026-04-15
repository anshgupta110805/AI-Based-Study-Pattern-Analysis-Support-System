from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Gamification Stats
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    freeze_tokens = Column(Integer, default=2)
    study_personality = Column(String, default="Analyzing...")
    exam_date = Column(DateTime, nullable=True)
    
    sessions = relationship("StudySession", back_populates="user")
    badges = relationship("Badge", back_populates="user")
    roadmaps = relationship("Roadmap", back_populates="user")

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject = Column(String, index=True)
    duration_minutes = Column(Integer)
    focus_rating = Column(Integer)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")

class Roadmap(Base):
    __tablename__ = "roadmaps"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exam_date = Column(DateTime)
    daily_hours = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Active") # ON_TRACK, AT_RISK, etc.
    
    user = relationship("User", back_populates="roadmaps")
    subjects = relationship("RoadmapSubject", back_populates="roadmap", cascade="all, delete-orphan")
    sessions = relationship("DailySession", back_populates="roadmap", cascade="all, delete-orphan")

class RoadmapSubject(Base):
    __tablename__ = "roadmap_subjects"
    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id"))
    subject_name = Column(String)
    priority = Column(String)
    style = Column(String)
    total_topics = Column(Integer)
    total_hours = Column(Integer)
    exam_strategy = Column(Text, nullable=True)

    roadmap = relationship("Roadmap", back_populates="subjects")
    topics = relationship("SyllabusTopic", back_populates="subject", cascade="all, delete-orphan")
    daily_sessions = relationship("DailySession", back_populates="subject", cascade="all, delete-orphan")

class SyllabusTopic(Base):
    __tablename__ = "syllabus_topics"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("roadmap_subjects.id"))
    topic_number = Column(Integer)
    topic_name = Column(String)
    estimated_hours = Column(Integer)
    difficulty = Column(String)
    description = Column(Text)

    subject = relationship("RoadmapSubject", back_populates="topics")

class DailySession(Base):
    __tablename__ = "daily_sessions"
    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id"))
    subject_id = Column(Integer, ForeignKey("roadmap_subjects.id"))
    day_number = Column(Integer)
    date = Column(DateTime)
    topics = Column(Text) # JSON string array
    hours = Column(Integer)
    session_type = Column(String)
    goal = Column(Text)
    status = Column(String, default="PENDING") # PENDING, COMPLETE, SKIP

    roadmap = relationship("Roadmap", back_populates="sessions")
    subject = relationship("RoadmapSubject", back_populates="daily_sessions")

class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")
