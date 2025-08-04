from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class RecognitionLog(Base):
    __tablename__ = 'recognition_logs'

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey('persons.id'))
    recognized_at = Column(DateTime, default=datetime.utcnow)
    confidence = Column(String)
    image_path = Column(String)

    person = relationship("Person", back_populates="recognition_logs")