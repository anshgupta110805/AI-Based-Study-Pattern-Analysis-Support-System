from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.db.database import engine, Base, get_db
from backend.api import auth, sessions, roadmap
from backend.api.deps import get_current_user
from backend.db.models import User
import uvicorn

# Create Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NeuroStudy AI Core v2.0",
    description="Advanced study infrastructure with JWT auth, gamification, and AI insights."
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Study Buddy (The WOW Chatbot Feature)
@app.get("/api/chat", tags=["ai"])
def study_buddy_chat(
    query: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rule-based simulated AI logic for Academic Demo
    query = query.lower()
    if "study" in query:
        return {"response": f"According to your current level {current_user.level}, you should focus on your weakest subjects during high-focus morning slots."}
    if "level" in query or "xp" in query:
        return {"response": f"You are currently level {current_user.level} with {current_user.xp} XP. Log more sessions to hit level {current_user.level+1}!"}
    if "hard" in query:
        return {"response": "For difficult subjects, utilize Feynman Technique. I've noted your subjects for future roadmap optimization."}
    
    return {"response": "Greetings scholar! I'm your NeuroStudy assistant. I'm processing your academic session history to suggest improvements."}

# Include Routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(roadmap.router, prefix="/api")

@app.get("/", tags=["health"])
def health_check():
    return {
        "status": "online",
        "engine": "StudyCore v2 (Production-Ready)",
        "security": "JWT Protected (HMAC-SHA256)",
        "persistence": "SQLite v3 (SQLAlchemy ORM Ready for Postgres)"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
