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
    priority: int = 1 # 1=Low, 2=Medium, 3=High

class RoadmapRequest(BaseModel):
    subjects: List[RoadmapSubject]
    days: int = 7
    start_hour: int = 9
    end_hour: int = 21
    exam_date: Optional[datetime] = None

class SlotResponse(BaseModel):
    id: int
    day_index: int
    time_block: str
    subject: str
    duration_minutes: int
    protocol: str
    is_completed: bool

class RoadmapResponse(BaseModel):
    id: int
    start_date: datetime
    end_date: datetime
    status: str
    slots: List[SlotResponse]

class AnalyticsResponse(BaseModel):
    productivity_score: int
    breakdown: dict
    personality: str
    strongest_subject: str
    weakest_subject: str
    peak_window: str
    suggestions: List[dict]
    subject_health: List[dict]
    streak_calendar: List[dict]
    level: int
    current_xp: int
    next_level_xp_needed: int
    freeze_tokens: int
