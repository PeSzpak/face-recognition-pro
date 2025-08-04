from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.recognition_log import RecognitionLog
from app.models.person import Person
from app.schemas.recognition import RecognitionStats
from app.schemas.person import PersonStats

router = APIRouter()

@router.get("/stats", response_model=RecognitionStats)
def get_recognition_stats(db: Session = Depends(get_db)):
    total_recognitions = db.query(RecognitionLog).count()
    return RecognitionStats(total_recognitions=total_recognitions)

@router.get("/recent", response_model=list[PersonStats])
def get_recent_activities(db: Session = Depends(get_db)):
    recent_activities = db.query(Person).order_by(Person.created_at.desc()).limit(10).all()
    return [PersonStats.from_orm(person) for person in recent_activities]

@router.get("/analytics", response_model=dict)
def get_analytics(db: Session = Depends(get_db)):
    total_people = db.query(Person).count()
    total_recognitions = db.query(RecognitionLog).count()
    return {
        "total_people": total_people,
        "total_recognitions": total_recognitions,
    }