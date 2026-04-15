from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any

from backend.db.database import get_db
from backend.db.models import User, Roadmap, RoadmapSubject, SyllabusTopic, DailySession
from backend.api.deps import get_current_user

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

def generate_local_syllabus(subject, days, daily_hours, 
                             priority, style):
  # Priority multiplier
  multiplier = {"HIGH": 1.0, "MEDIUM": 0.6, "LOW": 0.4}
  total_hours = days * daily_hours * multiplier[priority]
  
  # Generate topics
  num_topics = min(20, max(4, int(total_hours / 1.5)))
  
  topic_templates = [
    f"Foundations & Core Concepts of {subject}",
    f"Fundamental Principles and Terminology",
    f"Key Methodologies and Frameworks",
    f"Advanced Concepts and Deep Dive",
    f"Practical Applications and Examples",
    f"Problem Solving Techniques",
    f"Common Patterns and Best Practices",
    f"Edge Cases and Special Scenarios",
    f"Integration with Related Topics",
    f"Critical Analysis and Evaluation",
    f"Real-world Case Studies",
    f"Performance and Optimization",
    f"Tools and Ecosystem Overview",
    f"Industry Standards and Conventions",
    f"Comparative Study and Alternatives",
    f"Advanced Problem Sets",
    f"Synthesis and Connections",
    f"Gap Filling and Weak Areas",
    f"Mock Tests and Self Assessment",
    f"Final Revision and Exam Strategy",
  ]
  
  topics = topic_templates[:num_topics]
  
  # Assign difficulty
  easy_count = int(num_topics * 0.3)
  hard_count = int(num_topics * 0.2)
  
  syllabus = []
  for i, topic in enumerate(topics):
    if i < easy_count:
      difficulty = "EASY"
      hrs = 1.0
    elif i >= num_topics - hard_count:
      difficulty = "HARD"  
      hrs = 2.0
    else:
      difficulty = "MEDIUM"
      hrs = 1.5
    syllabus.append({
      "topic_number": i + 1,
      "topic_name": topic,
      "estimated_hours": hrs,
      "difficulty": difficulty,
      "description": f"Master {topic.lower()} through structured study"
    })
  
  # Generate daily plan
  daily_plan = []
  topic_index = 0
  exam_date = datetime.now() + timedelta(days=days)
  
  for day in range(1, days + 1):
    current_date = datetime.now() + timedelta(days=day-1)
    is_revision = day >= days - 1
    
    if is_revision:
      daily_plan.append({
        "day": day,
        "date": current_date.strftime("%Y-%m-%d"),
        "topics": ["Full Revision", "Practice Questions"],
        "hours": daily_hours,
        "session_type": "REVISION",
        "goal": f"Revise all {subject} topics and attempt mock test"
      })
      continue
    
    day_topics = []
    hours_left = daily_hours
    sessions = 2 if style == "SPRINTER" else 1
    
    for _ in range(sessions):
      if topic_index < len(topics) and hours_left > 0:
        day_topics.append(topics[topic_index])
        hours_left -= (0.75 if style == "SPRINTER" else 1.5)
        topic_index += 1
    
    daily_plan.append({
      "day": day,
      "date": current_date.strftime("%Y-%m-%d"),
      "topics": day_topics if day_topics else ["Review Previous"],
      "hours": daily_hours - hours_left,
      "session_type": style,
      "goal": f"Complete: {', '.join(day_topics[:2])}"
    })
  
  # Exam strategy
  strategies = {
    ("HIGH", "short"): "Focus on core concepts only. Do past papers daily. Stop new topics 48hrs before exam.",
    ("HIGH", "medium"): "Split time 60% new content, 40% practice. Weekly mock tests essential.",
    ("HIGH", "long"): "Build strong foundations first. Daily consistency beats last-minute cramming.",
    ("MEDIUM", "any"): "Systematic coverage of all units. Focus on understanding over memorization.",
    ("LOW", "any"): "Target high-weightage topics only. Skip deep dives, focus on overview.",
  }
  
  days_cat = "short" if days < 7 else "medium" if days < 21 else "long"
  strategy_key = ("HIGH", days_cat) if priority == "HIGH" else (priority, "any")
  exam_strategy = strategies.get(strategy_key, 
    "Stay consistent, review regularly, and practice past questions.")
  
  return {
    "subject": subject,
    "total_topics": num_topics,
    "total_hours": round(total_hours, 1),
    "syllabus_overview": syllabus,
    "daily_plan": daily_plan,
    "exam_strategy": exam_strategy
  }

@router.post("/generate")
def generate_roadmap(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam_date_str = data.get("exam_date")
    daily_hours = data.get("daily_hours", 2)
    subjects_req = data.get("subjects", [])
    
    if not exam_date_str or not subjects_req:
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d")
    days_until_exam = max(1, (exam_date - datetime.utcnow()).days)
    
    # Delete old active roadmaps
    db.query(Roadmap).filter(Roadmap.user_id == current_user.id).delete()
    db.commit()

    roadmap = Roadmap(user_id=current_user.id, exam_date=exam_date, daily_hours=daily_hours)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    start_date = datetime.utcnow()

    # Call AI per subject (Now using Local Logic)
    for sub in subjects_req:
        ai_data = generate_local_syllabus(
            subject=sub["name"],
            days=int(days_until_exam),
            daily_hours=float(daily_hours),
            priority=sub.get("priority", "MEDIUM"),
            style=sub.get("style", "MARATHON")
        )
        
        r_subject = RoadmapSubject(
            roadmap_id=roadmap.id,
            subject_name=ai_data["subject"],
            priority=sub.get("priority", "MEDIUM"),
            style=sub.get("style", "MARATHON"),
            total_topics=ai_data.get("total_topics", 0),
            total_hours=sum(t.get("estimated_hours",0) for t in ai_data.get("syllabus_overview", [])),
            exam_strategy=ai_data.get("exam_strategy", "")
        )
        db.add(r_subject)
        db.commit()
        db.refresh(r_subject)
        
        for top in ai_data.get("syllabus_overview", []):
            st = SyllabusTopic(
                subject_id=r_subject.id,
                topic_number=top.get("topic_number", 1),
                topic_name=top.get("topic_name", "Topic"),
                estimated_hours=top.get("estimated_hours", 1),
                difficulty=top.get("difficulty", "MEDIUM"),
                description=top.get("description", "")
            )
            db.add(st)
            
        for d in ai_data.get("daily_plan", []):
            target_date = start_date + timedelta(days=d.get("day", 1)-1)
            ds = DailySession(
                roadmap_id=roadmap.id,
                subject_id=r_subject.id,
                day_number=d.get("day", 1),
                date=target_date,
                topics=json.dumps(d.get("topics", [])),
                hours=d.get("hours", daily_hours),
                session_type=d.get("session_type", r_subject.style),
                goal=d.get("goal", ""),
                status="PENDING"
            )
            db.add(ds)
        db.commit()

    return {"message": "Success"}

@router.get("/current")
def get_current_roadmap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roadmap = db.query(Roadmap).filter(Roadmap.user_id == current_user.id).first()
    if not roadmap:
        return {"roadmap": None}
        
    res = {
        "id": roadmap.id,
        "exam_date": roadmap.exam_date.strftime("%Y-%m-%d") if roadmap.exam_date else None,
        "daily_hours": roadmap.daily_hours,
        "subjects": [],
        "sessions": []
    }
    
    for sub in Db_get_subjects(db, roadmap.id):
        topics = Db_get_topics(db, sub.id)
        res["subjects"].append({
            "id": sub.id, "name": sub.subject_name, "priority": sub.priority, "style": sub.style,
            "total_topics": sub.total_topics, "total_hours": sub.total_hours, "strategy": sub.exam_strategy,
            "topics": [{"id": t.id, "number": t.topic_number, "name": t.topic_name, "hours": t.estimated_hours, "diff": t.difficulty, "desc": t.description} for t in topics]
        })
        
    for sess in db.query(DailySession).filter(DailySession.roadmap_id == roadmap.id).order_by(DailySession.day_number).all():
        res["sessions"].append({
            "id": sess.id, "subject_id": sess.subject_id, "day": sess.day_number, "date": sess.date.strftime("%Y-%m-%d"),
            "topics": json.loads(sess.topics), "hours": sess.hours, "type": sess.session_type, "goal": sess.goal, "status": sess.status
        })
        
    return res

def Db_get_subjects(db, roadmap_id):
    return db.query(RoadmapSubject).filter(RoadmapSubject.roadmap_id == roadmap_id).all()

def Db_get_topics(db, subject_id):
    return db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == subject_id).order_by(SyllabusTopic.topic_number).all()

@router.patch("/session/{session_id}")
def update_session(session_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    status = payload.get("status")
    if status not in ["PENDING", "COMPLETE", "SKIP"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    sess = db.query(DailySession).filter(DailySession.id == session_id).first()
    if not sess: raise HTTPException(status_code=404, detail="Not found")
    
    sess.status = status
    
    if status == "SKIP":
        # push hours to next available pending
        next_sess = db.query(DailySession).filter(
            DailySession.subject_id == sess.subject_id, 
            DailySession.day_number > sess.day_number,
            DailySession.status == "PENDING"
        ).order_by(DailySession.day_number).first()
        if next_sess:
            next_sess.hours += sess.hours
            
    db.commit()
    return {"message": "Success"}

@router.get("/health")
def get_health(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roadmap = db.query(Roadmap).filter(Roadmap.user_id == current_user.id).first()
    if not roadmap: return {"exists": False}
    
    total = db.query(DailySession).filter(DailySession.roadmap_id == roadmap.id).count()
    completed = db.query(DailySession).filter(DailySession.roadmap_id == roadmap.id, DailySession.status == "COMPLETE").count()
    skipped = db.query(DailySession).filter(DailySession.roadmap_id == roadmap.id, DailySession.status == "SKIP").count()
    
    percent = int((completed / total * 100)) if total > 0 else 0
    state = "ON_TRACK" if percent > 75 else "SLIGHTLY_BEHIND" if percent > 40 else "AT_RISK"
    
    return {
        "exists": True,
        "total": total,
        "completed": completed,
        "skipped": skipped,
        "percent": percent,
        "state": state,
        "exam_date": roadmap.exam_date.isoformat() if roadmap.exam_date else None
    }

@router.post("/reset")
def reset_roadmap(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Roadmap).filter(Roadmap.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Reset complete"}
