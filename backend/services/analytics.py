import pandas as pd
from sqlalchemy.orm import Session
from backend.db.models import StudySession, User
from backend.core.config import settings
from backend.services.ml import StudyPredictor
from datetime import datetime

def get_analysis(db: Session, user_id: int):
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id).all()
    user = db.query(User).filter(User.id == user_id).first()
    
    if not sessions:
        return {
            "productivity_score": 0, 
            "weak_subjects": [], 
            "best_time_of_day": "N/A",
            "level": user.level if user else 1, 
            "current_xp": user.xp if user else 0, 
            "next_level_xp_needed": (user.level if user else 1) * 1000,
            "prediction": {"predicted_daily_minutes": 0, "trend_label": "Initializing"},
            "streak_risk": "None"
        }

    # Use pandas for intelligence
    df = pd.DataFrame([{
        "subject": s.subject,
        "minutes": s.duration_minutes,
        "focus": s.focus_rating,
        "timestamp": s.timestamp
    } for s in sessions])

    # 1. Intelligence Proof: Weak Subject Detection with Explainable Logic
    subject_stats = df.groupby("subject").agg({
        "minutes": "sum", 
        "focus": "mean", 
        "subject": "count"
    })
    
    weak_subjects = []
    for sub, stats in subject_stats.iterrows():
        reasons = []
        if stats["minutes"] < 120: 
            reasons.append(f"Study duration ({stats['minutes']}m) below 2hr threshold")
        if stats["focus"] < 7: 
            reasons.append(f"Average focus ({round(stats['focus'], 1)}) below intensity baseline")
        if stats["subject"] < 2: 
            reasons.append("Insufficient session frequency for neural retention")
            
        if reasons:
            weak_subjects.append({
                "subject": sub,
                "reasoning": " | ".join(reasons),
                "severity": "Critical" if len(reasons) >= 2 else "Moderate"
            })

    # 2. Peak Window Detection
    df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
    peak_hour = df.groupby("hour")["focus"].mean().idxmax()
    
    # 3. Scientific Productivity Mapping
    avg_focus = df["focus"].mean()
    volume_multiplier = min(1.2, len(sessions) / 5)
    prod_score = min(100, int(avg_focus * 10 * volume_multiplier))

    # 4. ML Predictions
    session_data = df.to_dict('records')
    for s in session_data:
        if isinstance(s['timestamp'], datetime):
            s['timestamp'] = s['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            
    prediction = StudyPredictor.predict_future_hours(session_data)
    streak_risk = StudyPredictor.streak_risk_assessment(session_data)

    return {
        "productivity_score": prod_score,
        "weak_subjects": weak_subjects,
        "best_time_of_day": f"{peak_hour}:00",
        "level": user.level,
        "current_xp": user.xp,
        "next_level_xp_needed": user.level * 1000,
        "prediction": prediction,
        "streak_risk": streak_risk
    }
