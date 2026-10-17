from uuid import UUID

from fastapi import APIRouter, File, Form, Query, UploadFile

from app import db
from app.face import pipeline
from app.schemas import EventOut, EventSource, EventStatus, IdentifyResponse, Page
from app.security import CurrentUser
from app.uploads import read_uploads

router = APIRouter(prefix="/api/recognition", tags=["recognition"])


@router.post("/identify", response_model=IdentifyResponse)
def identify(
    _: CurrentUser,
    image: UploadFile = File(...),
    source: EventSource = Form("upload"),
    record: bool = Form(True),
) -> IdentifyResponse:
    """Identify every face in the image. Live camera previews pass record=false to keep the audit log meaningful."""
    return pipeline.identify(read_uploads([image])[0].data, source, record)


@router.get("/events", response_model=Page[EventOut])
def list_events(
    _: CurrentUser,
    status: EventStatus | None = None,
    source: EventSource | None = None,
    person_id: UUID | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
) -> Page[EventOut]:
    clauses, params = [], []
    for column, value in (("e.status", status), ("e.source", source), ("e.person_id", person_id)):
        if value is not None:
            clauses.append(f"{column} = %s")
            params.append(value)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    total = db.fetch_one(f"SELECT count(*)::int AS n FROM recognition_events e {where}", tuple(params))["n"]
    rows = db.fetch_all(
        f"""
        SELECT e.*, p.name AS person_name
        FROM recognition_events e
        LEFT JOIN persons p ON p.id = e.person_id
        {where}
        ORDER BY e.created_at DESC
        LIMIT %s OFFSET %s
        """,
        (*params, size, (page - 1) * size),
    )
    return Page(items=[EventOut(**r) for r in rows], total=total, page=page, size=size)
