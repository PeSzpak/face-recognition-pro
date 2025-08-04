from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate
from app.core.database import get_db

router = APIRouter()

@router.post("/", response_model=Person)
def create_person(person: PersonCreate, db: Session = Depends(get_db)):
    db_person = Person(**person.dict())
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

@router.get("/", response_model=list[Person])
def read_persons(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    persons = db.query(Person).offset(skip).limit(limit).all()
    return persons

@router.get("/{person_id}", response_model=Person)
def read_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person

@router.put("/{person_id}", response_model=Person)
def update_person(person_id: int, person: PersonUpdate, db: Session = Depends(get_db)):
    db_person = db.query(Person).filter(Person.id == person_id).first()
    if db_person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    for key, value in person.dict(exclude_unset=True).items():
        setattr(db_person, key, value)
    db.commit()
    db.refresh(db_person)
    return db_person

@router.delete("/{person_id}", response_model=Person)
def delete_person(person_id: int, db: Session = Depends(get_db)):
    db_person = db.query(Person).filter(Person.id == person_id).first()
    if db_person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    db.delete(db_person)
    db.commit()
    return db_person