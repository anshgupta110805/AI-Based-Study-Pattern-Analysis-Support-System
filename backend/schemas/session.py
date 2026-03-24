from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StudySessionBase(BaseModel):
    subject: str
    duration_minutes: int
    focus_rating: int = Field(..., ge=1, le=10)
    notes: Optional[str] = None

class StudySessionCreate(StudySessionBase):
    pass

class StudySessionResponse(StudySessionBase):
    id: int
    user_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class RoadmapSubject(BaseModel):
    subject: str
    difficulty: int = 1 # 1=Easy, 2=Medium, 3=Hard

class RoadmapRequest(BaseModel):
    subjects: List[str]
    start_hour: int
    end_hour: int
    difficulty_pref: Optional[str] = "balanced" # high-intensity, balanced, relaxed

class AnalyticsResponse(BaseModel):
    total_hours: float
    average_focus: float
    best_time_of_day: str
    weak_subjects: List[str]
    productivity_score: int
    suggestion: str
    next_level_xp_needed: int
    current_xp: int
    level: int
