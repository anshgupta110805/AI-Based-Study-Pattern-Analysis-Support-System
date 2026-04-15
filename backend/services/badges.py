from sqlalchemy.orm import Session
from backend.db.models import StudySession, User, Badge
from datetime import datetime, timedelta
import pandas as pd

def check_and_grant_badges(db: Session, user_id: int):
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id).all()
    if not sessions:
        return
    
    df = pd.DataFrame([{
        "id": s.id,
        "subject": s.subject,
        "minutes": s.duration_minutes,
        "focus": s.focus_rating,
        "timestamp": s.timestamp
    } for s in sessions])
    
    existing_badges = {b.name for b in db.query(Badge).filter(Badge.user_id == user_id).all()}
    new_badges = []
    
    def grant(name):
        if name not in existing_badges:
            badge = Badge(user_id=user_id, name=name)
            db.add(badge)
            new_badges.append(name)

    # 1. 7-Day Streak
    # Group by date and count unique dates
    df['date'] = pd.to_datetime(df['timestamp']).dt.date
    unique_dates = sorted(df['date'].unique())
    streak = 0
    current_streak = 0
    if unique_dates:
        current_streak = 1
        for i in range(1, len(unique_dates)):
            if (unique_dates[i] - unique_dates[i-1]).days == 1:
                current_streak += 1
            else:
                current_streak = 1
            streak = max(streak, current_streak)
    
    if streak >= 7: grant("7-Day Streak")
    if streak >= 14: grant("Consistency King")

    # 2. Focus Master (avg focus > 8)
    if df['focus'].mean() >= 8: grant("Focus Master")

    # 3. Night Owl (after 9pm / 21h)
    if any(pd.to_datetime(df['timestamp']).dt.hour >= 21): grant("Night Owl")

    # 4. Early Bird (before 7am)
    if any(pd.to_datetime(df['timestamp']).dt.hour < 7): grant("Early Bird")

    # 5. 100 Hours Club
    if df['minutes'].sum() >= 6000: grant("100 Hours Club")

    # 6. Subject Juggler (5+ subjects)
    if df['subject'].nunique() >= 5: grant("Subject Juggler")

    # 7. Marathon Scholar (5+ hours single session)
    if any(df['minutes'] >= 300): grant("Marathon Scholar")

    # 8. Perfect Focus (focus 10)
    if any(df['focus'] == 10): grant("Perfect Focus")

    # 9. Comeback Kid (3+ day gap then return)
    if len(unique_dates) >= 2:
        for i in range(1, len(unique_dates)):
            if (unique_dates[i] - unique_dates[i-1]).days >= 3:
                grant("Comeback Kid")
                break

    db.commit()
    return new_badges
