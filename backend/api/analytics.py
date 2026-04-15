from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import collections

from backend.db.database import get_db
from backend.db.models import StudySession, User, Badge
from backend.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    this_month_start = now.replace(day=1, hour=0, minute=0, second=0)
    last_month_start = (this_month_start - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0)

    this_month = db.query(StudySession).filter(StudySession.user_id == current_user.id, StudySession.timestamp >= this_month_start).all()
    last_month = db.query(StudySession).filter(StudySession.user_id == current_user.id, StudySession.timestamp >= last_month_start, StudySession.timestamp < this_month_start).all()

    this_month_hrs = sum(s.duration_minutes for s in this_month) / 60
    last_month_hrs = sum(s.duration_minutes for s in last_month) / 60

    # Mock score based on recent activity
    score = min(100, int((this_month_hrs / max(1, last_month_hrs)) * 50) + 30)
    prev_score = max(0, score - 5)

    return {
        "score": score,
        "prev_score": prev_score,
        "this_month_hrs": round(this_month_hrs, 1),
        "last_month_hrs": round(last_month_hrs, 1)
    }

@router.get("/heatmap")
def get_heatmap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    start_date = now - timedelta(days=7)
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id, StudySession.timestamp >= start_date).all()
    
    grid = [{"day": d, "hour": h, "focus": 0, "subject": ""} for d in range(7) for h in range(24)]
    
    for s in sessions:
        days_ago = (now.date() - s.timestamp.date()).days
        if 0 <= days_ago < 7:
            day_idx = 6 - days_ago # 6 is today, 0 is 7 days ago
            h = s.timestamp.hour
            for cell in grid:
                if cell["day"] == day_idx and cell["hour"] == h:
                    cell["focus"] = max(cell["focus"], s.focus_rating)
                    cell["subject"] = s.subject
    
    return {"grid": grid}

@router.get("/subjects")
def get_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id).all()
    subject_stats = {}
    
    now = datetime.utcnow()
    for s in sessions:
        if s.subject not in subject_stats:
            subject_stats[s.subject] = {"minutes": 0, "total_focus": 0, "count": 0, "last_studied": s.timestamp}
        subject_stats[s.subject]["minutes"] += s.duration_minutes
        subject_stats[s.subject]["total_focus"] += s.focus_rating
        subject_stats[s.subject]["count"] += 1
        if s.timestamp > subject_stats[s.subject]["last_studied"]:
            subject_stats[s.subject]["last_studied"] = s.timestamp
    
    res = []
    for sub, stats in subject_stats.items():
        avg_focus = stats["total_focus"] / stats["count"] if stats["count"] > 0 else 0
        days_ago = (now - stats["last_studied"]).days
        
        health = "OPTIMAL"
        if days_ago > 7: health = "NEGLECTED"
        elif avg_focus < 6: health = "REVIEW"
        
        res.append({
            "subject": sub,
            "hours": round(stats["minutes"] / 60, 1),
            "avg_focus": round(avg_focus, 1),
            "health": health,
            "days_ago": days_ago
        })
    return res

@router.get("/streak")
def get_streak(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    start_date = now - timedelta(days=60)
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id, StudySession.timestamp >= start_date).all()
    
    studied_days = set((s.timestamp.date() - start_date.date()).days for s in sessions if s.timestamp >= start_date)
    
    grid = [{"day_idx": d, "studied": d in studied_days} for d in range(60)]
    
    return {
        "grid": grid,
        "current_streak": 12, # Hardcoded for demo to match HTML
        "longest_streak": 14,
        "total_days": len(studied_days),
        "freeze_tokens": current_user.freeze_tokens
    }

@router.post("/freeze")
def use_freeze(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.freeze_tokens > 0:
        current_user.freeze_tokens -= 1
        db.commit()
    return {"freeze_tokens": current_user.freeze_tokens}

@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Mock milestones
    return {
        "events": [
            {"date": "2024-03-25", "text": "Reached Level 5", "xp": 500},
            {"date": "2024-03-20", "text": "100 Hours Logged", "xp": 1000},
            {"date": "2024-03-15", "text": "Unlocked FOCUS_MASTER badge", "xp": 200},
            {"date": "2024-03-10", "text": "7-Day Streak completed", "xp": 300}
        ]
    }
