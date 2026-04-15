import pandas as pd
from sqlalchemy.orm import Session
from backend.db.models import StudySession, User
from backend.core.config import settings
from backend.services.ml import StudyPredictor
from datetime import datetime

def calculate_burnout_risk(df: pd.DataFrame):
    if df.empty:
        return 0, "Consistent patterns required for diagnosis."
    
    # 1. Temporal Analysis (Last 7 Days)
    now = datetime.utcnow()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    last_7_days = df[df['timestamp'] >= (now - pd.Timedelta(days=7))]
    
    if last_7_days.empty:
        return 0, "Recent activity required for burnout detection."
    
    # 2. Key Metrics for Burnout
    # - Inconsistent Sleep/Study: Standard Deviation in hours
    vol_std = last_7_days.groupby(last_7_days['timestamp'].dt.date)['minutes'].sum().std()
    
    # - Focus Fatigue: 3-day focus trend vs 7-day average
    avg_focus_7d = last_7_days['focus'].mean()
    last_3_days = last_7_days[last_7_days['timestamp'] >= (now - pd.Timedelta(days=3))]
    avg_focus_3d = last_3_days['focus'].mean() if not last_3_days.empty else avg_focus_7d
    
    # - Volume Intensity: Total hours in 7 days
    total_hours = last_7_days['minutes'].sum() / 60
    
    risk_score = 0
    suggestions = []
    
    # Logic: High volume + dropping focus = Burnout Risk
    if total_hours > 35: # > 5 hours/day
        risk_score += 30
        suggestions.append("Neural load exceeds threshold. Immediate rest recommended.")
        
    if avg_focus_3d < (avg_focus_7d * 0.9): # 10% drop in focus
        risk_score += 40
        suggestions.append("Cognitive fatigue detected. Switch to light reading or practicals.")
        
    if vol_std > 60: # High variance in study hours
        risk_score += 20
        suggestions.append("Inconsistent circadian rhythm. Establish a fixed study window.")
        
    if risk_score == 0:
        suggestions.append("Neural stability confirmed. Maintain current trajectory.")
        
    return min(risk_score, 100), " | ".join(suggestions)

def get_student_profile(df: pd.DataFrame):
    if df.empty:
        return "Analyzing...", "Unknown", "Unknown"
    
    # Analyze session lengths
    avg_duration = df['minutes'].mean()
    if avg_duration > 90:
        personality = "Marathon Scholar"
    elif avg_duration < 45:
        personality = "Sprint Specialist"
    else:
        personality = "Balanced Academic"
        
    # Analyze consistency
    now = datetime.utcnow()
    df['date'] = pd.to_datetime(df['timestamp']).dt.date
    days_studied = df[df['timestamp'] >= (now - pd.Timedelta(days=30))]['date'].nunique()
    if days_studied < 10:
        personality = "Inconsistent Rhythm"
        
    # Peak Focus Window
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    peak_hour = df.groupby('hour')['focus'].mean().idxmax()
    
    # Strongest/Weakest Subject
    sub_stats = df.groupby('subject')['focus'].mean()
    strongest = sub_stats.idxmax()
    weakest = sub_stats.idxmin()
    
    return personality, strongest, weakest, f"{peak_hour}:00 - {(peak_hour+2)%24}:00"

def generate_suggestions(df: pd.DataFrame, subject_stats: pd.DataFrame):
    suggestions = []
    
    # Rule 1: Subject Focus vs Time
    low_focus_subs = subject_stats[subject_stats['focus'] < 6.5].index.tolist()
    if low_focus_subs:
        suggestions.append({
            "title": "Low Focus Detected",
            "explanation": f"Your focus in {low_focus_subs[0]} is below baseline.",
            "action": "Try studying this subject in your peak window.",
            "impact": "+15% Focus"
        })
        
    # Rule 2: Session Length
    avg_len = df['minutes'].mean()
    if avg_len > 120:
        suggestions.append({
            "title": "Cognitive Overload",
            "explanation": "Your average session is over 2 hours.",
            "action": "Use 50/10 Pomodoro splits to sustain clarity.",
            "impact": "+10% Retention"
        })
        
    # Rule 3: Neglected Subjects
    now = datetime.utcnow().date()
    df['date'] = pd.to_datetime(df['timestamp']).dt.date
    last_studied = df.groupby('subject')['date'].max()
    neglected = last_studied[last_studied < (now - pd.Timedelta(days=3))].index.tolist()
    if neglected:
        suggestions.append({
            "title": "Subject Atrophy",
            "explanation": f"You haven't touched {neglected[0]} in 3+ days.",
            "action": "Schedule a 30-min active recall block today.",
            "impact": "+20% Stability"
        })
        
    # Ensure 3 cards
    while len(suggestions) < 3:
        suggestions.append({
            "title": "Neural Maintenance",
            "explanation": "Consistency is the primary driver of neural growth.",
            "action": "Maintain your 15-minute daily minimum.",
            "impact": "+5% Score"
        })
        
    return suggestions[:3]

def get_analysis(db: Session, user_id: int):
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id).all()
    user = db.query(User).filter(User.id == user_id).first()
    
    if not sessions:
        return {
            "productivity_score": 0, "breakdown": {"consistency":0, "focus":0, "hours":0},
            "personality": "Analyzing...", "strongest_subject": "N/A", "weakest_subject": "N/A", "peak_window": "N/A",
            "suggestions": [], "subject_health": [], "streak_calendar": []
        }

    df = pd.DataFrame([{
        "subject": s.subject, "minutes": s.duration_minutes, "focus": s.focus_rating, "timestamp": s.timestamp
    } for s in sessions])

    # 1. Student Profile
    personality, strongest, weakest, peak_window = get_student_profile(df)
    user.study_personality = personality
    db.commit()

    # 2. Subject Health
    now = datetime.utcnow().date()
    df['date'] = pd.to_datetime(df['timestamp']).dt.date
    sub_stats = df.groupby("subject").agg({"minutes": "sum", "focus": "mean", "date": "max"})
    
    subject_health = []
    for sub, stats in sub_stats.iterrows():
        days_diff = (now - stats['date']).days
        status = "green"
        if days_diff > 3 or stats['focus'] < 6: status = "amber"
        if days_diff > 7 or stats['focus'] < 4: status = "red"
        
        subject_health.append({
            "subject": sub, "focus": round(stats['focus'], 1), "hours": round(stats['minutes']/60, 1),
            "status": status, "last_studied": days_diff
        })

    # 3. Productivity Breakdown (Consistency, Focus, Hours)
    days_in_30 = df[df['timestamp'] >= (datetime.utcnow() - pd.Timedelta(days=30))]['date'].nunique()
    consistency_score = min(100, int((days_in_30 / 30) * 100))
    focus_score = int(df['focus'].mean() * 10)
    hours_score = min(100, int((df['minutes'].sum() / 300) * 10)) # Target 300 min total for full score
    
    overall_score = int((consistency_score * 0.3) + (focus_score * 0.4) + (hours_score * 0.3))

    # 4. Streak Calendar (Last 60 Days)
    streak_calendar = []
    for i in range(59, -1, -1):
        target_date = (datetime.utcnow() - pd.Timedelta(days=i)).date()
        studied = target_date in df['date'].values
        streak_calendar.append({"date": target_date.isoformat(), "studied": studied})

    # 5. Suggestions
    suggestions = generate_suggestions(df, sub_stats)

    return {
        "productivity_score": overall_score,
        "breakdown": {"consistency": consistency_score, "focus": focus_score, "hours": hours_score},
        "personality": personality,
        "strongest_subject": strongest,
        "weakest_subject": weakest,
        "peak_window": peak_window,
        "suggestions": suggestions,
        "subject_health": subject_health,
        "streak_calendar": streak_calendar,
        "level": user.level,
        "current_xp": user.xp,
        "next_level_xp_needed": user.level * 1000,
        "freeze_tokens": user.freeze_tokens
    }
