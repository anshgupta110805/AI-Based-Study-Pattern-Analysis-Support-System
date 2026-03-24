import sqlite3
from datetime import datetime, timedelta
import random
import bcrypt

def get_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

db_path = "neurostudy_v2.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Profile Data
student_profiles = [
    ("Aman_Gupta", "aman@study.edu", "pass123", 4500, 15),
    ("Harsh_Kumar", "harsh@study.edu", "pass123", 850, 4),
    ("Jatin_Dev", "jatin@study.edu", "pass123", 2200, 8),
    ("Jyoti_Learn", "jyoti@study.edu", "pass123", 150, 1)
]

subjects = ["Quantum Physics", "Neural Networks", "Calculus III", "Ethics in AI", "Linear Algebra", "Data Structures"]

# 2. Add Users
user_ids = []
for s in student_profiles:
    hp = get_hash(s[2])
    cursor.execute("INSERT OR REPLACE INTO users (username, email, hashed_password, xp, level) VALUES (?, ?, ?, ?, ?)", 
                   (s[0], s[1], hp, s[3], s[4]))
    user_ids.append(cursor.lastrowid)

# 3. Add Sessions for Aman (The High Achiever - 60 days of consistency)
for i in range(60):
    ts = (datetime.utcnow() - timedelta(days=i, hours=random.randint(8, 20))).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO study_sessions (user_id, subject, duration_minutes, focus_rating, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?)", 
                   (user_ids[0], random.choice(subjects), random.randint(90, 180), random.randint(8, 10), "Deep focus session. Concept mastery achieved.", ts))

# 4. Add Sessions for Harsh (The Struggler - Gaps and low focus)
# Only 15 sessions in 60 days, low focus on Calculus
for i in range(15):
    ts = (datetime.utcnow() - timedelta(days=random.randint(0, 60))).strftime("%Y-%m-%d %H:%M:%S")
    sub = "Calculus III" if i < 10 else random.choice(subjects)
    focus = random.randint(3, 6) if sub == "Calculus III" else random.randint(7, 9)
    cursor.execute("INSERT INTO study_sessions (user_id, subject, duration_minutes, focus_rating, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?)", 
                   (user_ids[1], sub, random.randint(30, 60), focus, "Struggling with integration. Need more review.", ts))

# 5. Add Sessions for Jatin (The Specialist)
for i in range(30):
    ts = (datetime.utcnow() - timedelta(days=i*2)).strftime("%Y-%m-%d %H:%M:%S") # Every 2 days
    cursor.execute("INSERT INTO study_sessions (user_id, subject, duration_minutes, focus_rating, notes, timestamp) VALUES (?, ?, ?, ?, ?, ?)", 
                   (user_ids[2], "Neural Networks", random.randint(60, 120), random.randint(8, 10), "Training MLP models. Loss decreasing.", ts))

conn.commit()
conn.close()
print("High-fidelity student profiles and multi-scenario study logs seeded.")
