import sqlite3
from datetime import datetime, timedelta
import random
import bcrypt

def get_password_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

db_path = "neurostudy_v2.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing
cursor.execute("DELETE FROM badges")
cursor.execute("DELETE FROM study_sessions")
cursor.execute("DELETE FROM users")

# 1. Create Sample Users
users = [
    ("scholar_ansh", "anshkwid@gmail.com", "password123", 2450, 5), # Level 5
    ("researcher_maya", "maya@lab.com", "password123", 850, 2),  # Level 2
    ("coder_jatin", "jatin@dev.com", "password123", 5200, 11)   # Level 11
]

user_ids = []
for u in users:
    hp = get_password_hash(u[2])
    cursor.execute("INSERT INTO users (username, email, hashed_password, xp, level) VALUES (?, ?, ?, ?, ?)", (u[0], u[1], hp, u[3], u[4]))
    user_ids.append(cursor.lastrowid)

# 2. Subjects list
subjects = ["Quantum Mechanics", "Neural Networks", "Data Ethics", "Organic Chemistry", "Discrete Math"]

# 3. Create Study Sessions (Last 30 days)
for uid in user_ids:
    # Each user gets ~20 sessions
    for _ in range(20):
        sub = random.choice(subjects)
        dur = random.randint(30, 180)
        focus = random.randint(6, 10)
        days_ago = random.randint(0, 30)
        ts = (datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 23))).strftime("%y-%m-%d %H:%M:%S")
        notes = f"Analyzed complex patterns in {sub}. Achieved high focus state."
        cursor.execute("INSERT INTO study_sessions (user_id, subject, duration_minutes, focus_rating, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?)", 
                       (uid, sub, dur, focus, notes, ts))

# 4. Add Badges
cursor.execute("INSERT INTO badges (user_id, name, earned_at) VALUES (?, ?, ?)", (user_ids[0], "Academic Pioneer", datetime.utcnow().strftime("%y-%m-%d %H:%M:%S")))
cursor.execute("INSERT INTO badges (user_id, name, earned_at) VALUES (?, ?, ?)", (user_ids[2], "Focus Master", datetime.utcnow().strftime("%y-%m-%d %H:%M:%S")))

conn.commit()
conn.close()
print("Neural database seeded successfully with academic performance data.")
