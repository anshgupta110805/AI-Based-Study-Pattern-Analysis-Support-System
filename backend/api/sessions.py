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

from backend.services.badges import check_and_grant_badges

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
    
    # Check Achievements
    check_and_grant_badges(db, current_user.id)
        
    db.commit()
    db.refresh(session)
    return session

@router.get("/", response_model=List[StudySessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(StudySession).filter(StudySession.user_id == current_user.id).all()

import pandas as pd
from datetime import datetime, timedelta

@router.get("/analysis") # Removing response_model for flexibility during V2 upgrade
def get_analysis_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_stats(db, current_user.id)

@router.get("/report")
def get_weekly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id).all()
    analysis = get_stats(db, current_user.id)
    
    if not sessions:
        return {"has_data": False}
        
    df = pd.DataFrame([{
        "subject": s.subject,
        "minutes": s.duration_minutes,
        "focus": s.focus_rating,
        "timestamp": s.timestamp
    } for s in sessions])
    
    # Filter last 7 days
    now = datetime.utcnow()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    last_7_days = df[df['timestamp'] >= (now - timedelta(days=7))]
    
    if last_7_days.empty:
        return {"has_data": False, "analysis": analysis}

    # Subject distribution
    subject_dist = last_7_days.groupby("subject")["minutes"].sum().to_dict()
    
    # Peak hour
    last_7_days["hour"] = last_7_days["timestamp"].dt.hour
    peak_hour = last_7_days.groupby("hour")["focus"].mean().idxmax()
    
    # Productivity score (from analysis)
    unique_dates = len(last_7_days["timestamp"].dt.date.unique())
    
    # Best subject
    best_subject = last_7_days.groupby("subject")["minutes"].sum().idxmax()

    # Badges earned (just count or list)
    badges = db.query(Badge).filter(Badge.user_id == current_user.id).all()
    badge_list = [b.name for b in badges]

    return {
        "has_data": True,
        "burnout_score": analysis["burnout_score"],
        "burnout_suggestions": analysis["burnout_suggestions"],
        "subject_distribution": subject_dist,
        "peak_hour": f"{peak_hour}:00",
        "productivity_score": analysis["productivity_score"],
        "study_streak": unique_dates,
        "best_subject": best_subject,
        "badges": badge_list
    }

@router.get("/suggestions")
def get_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    two_weeks_ago = now - timedelta(days=14)
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id, StudySession.timestamp >= two_weeks_ago).all()
    
    suggestions = []
    
    if not sessions:
        return [
            {"title": "NO_DATA", "insight": "No recent sessions found.", "action": "Log your first session.", "impact": "+100% Tracking"}
        ]
        
    avg_focus = sum(s.focus_rating for s in sessions) / len(sessions)
    if avg_focus < 6:
        suggestions.append({
            "title": "LOW_FOCUS_ALERT",
            "insight": f"Your average focus is low ({round(avg_focus, 1)}).",
            "action": "Try shorter sessions with the SPRINTER protocol.",
            "impact": "+15% FOCUS"
        })
        
    last_session = max((s.timestamp for s in sessions), default=None)
    if last_session and (now - last_session).days >= 2:
        suggestions.append({
            "title": "CONSISTENCY_WARNING",
            "insight": "You haven't studied in over 48 hours.",
            "action": "Complete a 30-min quick review now.",
            "impact": "+STREAK RECOVERY"
        })
        
    subjects = {}
    for s in sessions:
        subjects[s.subject] = subjects.get(s.subject, 0) + s.duration_minutes
        
    if len(subjects) > 1:
        max_sub = max(subjects, key=subjects.get)
        min_sub = min(subjects, key=subjects.get)
        if subjects[max_sub] > 3 * subjects[min_sub] and subjects[min_sub] > 0:
            suggestions.append({
                "title": "BALANCE_NOTICE",
                "insight": f"You spend 3x more time on {max_sub} than {min_sub}.",
                "action": f"Allocate next session to {min_sub}.",
                "impact": "OPTIMAL BALANCE"
            })
            
    late_sessions = sum(1 for s in sessions if s.timestamp.hour >= 20)
    if late_sessions > len(sessions) / 2:
        suggestions.append({
            "title": "TIMING_ANALYSIS",
            "insight": "Most of your sessions are late at night.",
            "action": "Shift high-priority subjects to morning slots.",
            "impact": "+20% RETENTION"
        })
        
    avg_len = sum(s.duration_minutes for s in sessions) / len(sessions)
    if avg_len > 180:
        suggestions.append({
            "title": "BREAK_RECOMMENDATION",
            "insight": f"Average session is very long ({round(avg_len)} mins).",
            "action": "Use Pomodoro technique to prevent burnout.",
            "impact": "-BURNOUT RISK"
        })
        
    # Ensure exactly 3 suggestions for UI
    if len(suggestions) < 3:
        suggestions.append({
            "title": "NEURAL_SYNC_OPTIMAL",
            "insight": "Study patterns are within optimal parameters.",
            "action": "Maintain current trajectory.",
            "impact": "STEADY PROGRESS"
        })
    if len(suggestions) < 3:
        suggestions.append({
            "title": "REVIEW_CYCLE",
            "insight": "Good time for a comprehensive review.",
            "action": "Review oldest material today.",
            "impact": "+RECALL STRENGTH"
        })
        
    return suggestions[:3]

@router.patch("/{session_id}", response_model=StudySessionResponse)
def edit_session(
    session_id: int,
    session_in: StudySessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == current_user.id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    session.subject = session_in.subject
    session.duration_minutes = session_in.duration_minutes
    session.focus_rating = session_in.focus_rating
    session.notes = session_in.notes
    db.commit()
    db.refresh(session)
    return session

@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == current_user.id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}

from pydantic import BaseModel

class VoiceParseRequest(BaseModel):
    text: str

@router.post("/voice-parse")
def voice_parse(req: VoiceParseRequest):
    text = req.text.lower()
    subject = "Generic"
    duration = 30
    focus = 7
    
    subjects = ["physics", "math", "history", "biology", "computer science", "chemistry", "english", "literature", "economics"]
    for s in subjects:
        if s in text:
            subject = s.capitalize()
            break
            
    words = text.split()
    for i, w in enumerate(words):
        if w.isdigit():
            val = int(w)
            if i + 1 < len(words):
                if "hour" in words[i+1]:
                    duration = val * 60
                elif "min" in words[i+1]:
                    duration = val
                elif "focus" in " ".join(words[max(0, i-2):min(len(words), i+3)]):
                    focus = min(10, max(1, val))

    return {
        "subject": subject,
        "duration_minutes": duration,
        "focus_rating": focus,
        "notes": "Voice logged session."
    }

from backend.db.models import Badge

@router.get("/badges")
def get_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    badges = db.query(Badge).filter(Badge.user_id == current_user.id).all()
    all_badges = [
        {"id": "7_DAY_STREAK", "icon": "🔥", "name": "7_DAY_STREAK", "desc": "Study 7 days in a row"},
        {"id": "FOCUS_MASTER", "icon": "🎯", "name": "FOCUS_MASTER", "desc": "Avg focus above 8.0"},
        {"id": "NIGHT_OWL", "icon": "🌙", "name": "NIGHT_OWL", "desc": "Study session after 9PM"},
        {"id": "EARLY_BIRD", "icon": "🌅", "name": "EARLY_BIRD", "desc": "Study session before 7AM"},
        {"id": "100_HOURS_CLUB", "icon": "💯", "name": "100_HOURS_CLUB", "desc": "Log 100+ total hours"},
        {"id": "SUBJECT_JUGGLER", "icon": "📚", "name": "SUBJECT_JUGGLER", "desc": "Log 5+ different subjects"},
        {"id": "CONSISTENCY_KING", "icon": "👑", "name": "CONSISTENCY_KING", "desc": "Study 14 days in a row"},
        {"id": "MARATHON_SCHOLAR", "icon": "⚡", "name": "MARATHON_SCHOLAR", "desc": "Single session 5+ hours"},
        {"id": "PERFECT_FOCUS", "icon": "✨", "name": "PERFECT_FOCUS", "desc": "Focus level 10 in a session"},
        {"id": "COMEBACK_KID", "icon": "🔄", "name": "COMEBACK_KID", "desc": "Return after 3-day gap"}
    ]
    
    earned = {b.name: b.earned_at for b in badges}
    for b in all_badges:
        if b["id"] in earned:    
            b["unlocked"] = True
            b["date"] = earned[b["id"]].isoformat()
        else:
            b["unlocked"] = False
            b["date"] = None
    return all_badges
