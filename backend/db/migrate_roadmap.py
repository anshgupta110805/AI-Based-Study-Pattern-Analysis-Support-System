from database import engine, Base
from models import Roadmap, RoadmapSlot, RoadmapSubject, SyllabusTopic, DailySession
roadmap_table = Roadmap.__table__
roadmap_slot_table = RoadmapSlot.__table__
try:
    roadmap_slot_table.drop(engine)
except:
    pass
try:
    roadmap_table.drop(engine)
except:
    pass

Base.metadata.create_all(bind=engine)
print("Migration complete")
