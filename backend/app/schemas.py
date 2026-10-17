from datetime import datetime
from typing import Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

T = TypeVar("T")

EventSource = Literal["upload", "camera", "face_login"]
EventStatus = Literal["identified", "unknown", "no_face", "denied"]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


class UserOut(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str | None
    person_id: UUID | None
    created_at: datetime


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class Session(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut
    confidence: float | None = None


class PersonFields(BaseModel):
    email: EmailStr | None = None
    department: str | None = Field(default=None, max_length=120)
    position: str | None = Field(default=None, max_length=120)
    external_id: str | None = Field(default=None, max_length=60)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("email", "department", "position", "external_id", "notes", mode="before")
    @classmethod
    def blank_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value.strip() if isinstance(value, str) else value


class PersonCreate(PersonFields):
    name: str = Field(min_length=2, max_length=255)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class PersonUpdate(PersonFields):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    active: bool | None = None


class PersonOut(BaseModel):
    id: UUID
    name: str
    email: str | None
    department: str | None
    position: str | None
    external_id: str | None
    notes: str | None
    active: bool
    sample_count: int
    cover_sample_id: UUID | None
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SampleOut(BaseModel):
    id: UUID
    quality: float
    width: int
    height: int
    created_at: datetime


class RejectedImage(BaseModel):
    file_name: str
    reason: str


class SampleUploadResult(BaseModel):
    added: list[SampleOut]
    rejected: list[RejectedImage]


class Box(BaseModel):
    x: int
    y: int
    w: int
    h: int


class Candidate(BaseModel):
    person_id: UUID
    name: str
    similarity: float


class FaceResult(BaseModel):
    box: Box
    quality: float
    status: Literal["identified", "unknown"]
    person: Candidate | None
    candidates: list[Candidate]


class IdentifyResponse(BaseModel):
    image_width: int
    image_height: int
    faces: list[FaceResult]
    processing_ms: int
    threshold: float


class EventOut(BaseModel):
    id: UUID
    source: EventSource
    status: EventStatus
    person_id: UUID | None
    person_name: str | None
    confidence: float | None
    faces_count: int
    processing_ms: int
    created_at: datetime


class DailyPoint(BaseModel):
    day: str
    identified: int
    unknown: int
    no_face: int


class TopPerson(BaseModel):
    person_id: UUID
    name: str
    count: int


class Overview(BaseModel):
    persons_total: int
    persons_active: int
    samples_total: int
    events_total: int
    events_today: int
    identification_rate: float
    avg_confidence: float
    avg_processing_ms: float
    daily: list[DailyPoint]
    hourly: list[int]
    top_persons: list[TopPerson]


class SystemInfo(BaseModel):
    model: str
    detector: str
    embedding_size: int
    match_threshold: float
    face_login_threshold: float
    models_ready: bool
    database: bool
    vector_store: bool
    vectors: int
