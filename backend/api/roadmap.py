from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.schemas.session import RoadmapRequest
from backend.api.deps import get_current_user
from backend.db.models import User

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

TIPS = {
    "morning": "Morning neural pathways are optimal for complex problem-solving.",
    "afternoon": "Afternoon slots improve retention through spaced repetition.",
    "evening": "Evening review consolidates today's learning into long-term memory."
}

def format_time(decimal_hour: float) -> str:
    h = int(decimal_hour)
    m = int((decimal_hour - h) * 60)
    return f"{h:02d}:{m:02d}"

@router.post("/generate")
def generate_ai_roadmap(
    data: RoadmapRequest,
    current_user: User = Depends(get_current_user)
):
    start = data.start_hour
    end = data.end_hour
    
    if end <= start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    subjects = [s.strip() for s in data.subjects if s.strip()]
    if not subjects:
        raise HTTPException(status_code=400, detail="Provide at least one subject")

    roadmap = []
    current_time = float(start)
    subject_index = 0
    slot_num = 0

    while current_time < end and subject_index < len(subjects):
        subject = subjects[subject_index]
        study_end = current_time + 0.75     # 45 min study
        rest_end = current_time + 1.0       # 15 min rest

        if study_end > end: break

        # Determine time context for tip
        hour = int(current_time)
        if hour < 12:
            context = "morning"
        elif hour < 17:
            context = "afternoon"
        else:
            context = "evening"

        slot_num += 1
        roadmap.append({
            "slot": f"Slot {slot_num}",
            "subject": subject,
            "start_time": current_time,
            "end_time": study_end,
            "time_range": f"{format_time(current_time)} – {format_time(study_end)}",
            "duration": "45 min",
            "type": "Study",
            "focus_level": "High Focus" if hour < 12 else "Optimal Focus",
            "tip": f"{TIPS[context]} Use active recall on {subject}."
        })

        # Rest slot
        if rest_end <= end:
            roadmap.append({
                "slot": "",
                "subject": "🌿 Neural Reset",
                "start_time": study_end,
                "end_time": rest_end,
                "time_range": f"{format_time(study_end)} – {format_time(rest_end)}",
                "duration": "15 min",
                "type": "Rest",
                "focus_level": "Recovery",
                "tip": "Step away from screens. Hydrate. Breathe deeply."
            })

        current_time = rest_end
        subject_index += 1

    return {
        "roadmap": roadmap,
        "total_slots": slot_num,
        "subjects_covered": subjects,
        "viva_point": "Timetable uses Pomodoro-style intervals (45 min study + 15 min rest) — a scientifically validated method for improving memory consolidation and reducing cognitive fatigue."
    }
