import sqlite3

conn = sqlite3.connect('neurostudy_v2.db')
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS roadmap_slots")
cursor.execute("DROP TABLE IF EXISTS roadmaps")
conn.commit()
conn.close()

from backend.db.database import engine, Base
from backend.db.models import Roadmap, RoadmapSubject, SyllabusTopic, DailySession
Base.metadata.create_all(bind=engine)
print("Tables recreated successfully")
