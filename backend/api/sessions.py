from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.db.database import get_db
from backend.db.models import StudySession, User
from backend.schemas.session import StudySessionCreate, StudySessionResponse, AnalyticsResponse
from backend.api.deps import get_current_user
from backend.services.analytics import get_analysis as get_stats
from backend.core.config import settings

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=StudySessionResponse)
def log_session(
    session_in: StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Log Session
    session = StudySession(
        subject=session_in.subject,
        duration_minutes=session_in.duration_minutes,
        focus_rating=session_in.focus_rating,
        notes=session_in.notes,
        user_id=current_user.id
    )
    db.add(session)
    
    # Update XP & Gamification
    xp_gain = session_in.duration_minutes * 10 # 10 XP per minute
    current_user.xp += xp_gain
    
    # Check Level Up
    xp_needed = current_user.level * 1000
    if current_user.xp >= xp_needed:
        current_user.level += 1
        
    db.commit()
    db.refresh(session)
    return session

@router.get("/", response_model=List[StudySessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(StudySession).filter(StudySession.user_id == current_user.id).all()

@router.get("/analysis") # Removing response_model for flexibility during V2 upgrade
def get_analysis_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_stats(db, current_user.id)
