import re
import secrets
import unicodedata
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, File, Query, UploadFile
from fastapi.responses import FileResponse

from app import db
from app.errors import AppError, not_found
from app.face import pipeline
from app.schemas import Page, PersonCreate, PersonOut, PersonUpdate, SampleOut, SampleUploadResult
from app.security import CurrentUser, hash_password
from app.uploads import read_uploads
from app.vector_store import vector_store

router = APIRouter(prefix="/api/persons", tags=["persons"])

PERSON_SELECT = f"""
    SELECT p.*,
           (SELECT count(*) FROM face_samples s WHERE s.person_id = p.id)::int AS sample_count,
           {pipeline.COVER_SAMPLE} AS cover_sample_id,
           EXISTS (SELECT 1 FROM users u WHERE u.person_id = p.id AND u.is_active) AS face_access,
           (SELECT max(e.created_at) FROM recognition_events e
             WHERE e.person_id = p.id AND e.status = 'identified') AS last_seen_at
    FROM persons p
"""


def get_person(person_id: UUID) -> PersonOut:
    row = db.fetch_one(f"{PERSON_SELECT} WHERE p.id = %s", (person_id,))
    if row is None:
        raise not_found("Pessoa")
    return PersonOut(**row)


@router.get("", response_model=Page[PersonOut])
def list_persons(
    _: CurrentUser,
    search: str = "",
    status: Literal["all", "active", "inactive"] = "all",
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=100),
) -> Page[PersonOut]:
    clauses, params = [], []
    if search.strip():
        clauses.append("(p.name ILIKE %s OR p.email ILIKE %s OR p.department ILIKE %s OR p.external_id ILIKE %s)")
        params += [f"%{search.strip()}%"] * 4
    if status != "all":
        clauses.append("p.active = %s")
        params.append(status == "active")
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    total = db.fetch_one(f"SELECT count(*)::int AS n FROM persons p {where}", tuple(params))["n"]
    rows = db.fetch_all(
        f"{PERSON_SELECT} {where} ORDER BY lower(p.name) LIMIT %s OFFSET %s",
        (*params, size, (page - 1) * size),
    )
    return Page(items=[PersonOut(**r) for r in rows], total=total, page=page, size=size)


@router.post("", response_model=PersonOut, status_code=201)
def create_person(body: PersonCreate, _: CurrentUser) -> PersonOut:
    row = db.fetch_one(
        """
        INSERT INTO persons (name, email, department, position, external_id, notes)
        VALUES (%(name)s, %(email)s, %(department)s, %(position)s, %(external_id)s, %(notes)s)
        RETURNING id
        """,
        body.model_dump(),
    )
    return get_person(row["id"])


@router.get("/{person_id}", response_model=PersonOut)
def read_person(person_id: UUID, _: CurrentUser) -> PersonOut:
    return get_person(person_id)


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: UUID, body: PersonUpdate, _: CurrentUser) -> PersonOut:
    changes = body.model_dump(exclude_unset=True)
    if changes:
        assignments = ", ".join(f"{column} = %({column})s" for column in changes)
        updated = db.execute(f"UPDATE persons SET {assignments} WHERE id = %(id)s", {**changes, "id": person_id})
        if not updated:
            raise not_found("Pessoa")
    return get_person(person_id)


@router.delete("/{person_id}", status_code=204)
def delete_person(person_id: UUID, _: CurrentUser) -> None:
    samples = db.fetch_all("SELECT id FROM face_samples WHERE person_id = %s", (person_id,))
    db.execute("DELETE FROM users WHERE person_id = %s AND NOT password_login", (person_id,))
    if not db.execute("DELETE FROM persons WHERE id = %s", (person_id,)):
        raise not_found("Pessoa")
    vector_store.delete_person(person_id)
    for sample in samples:
        pipeline.sample_path(sample["id"]).unlink(missing_ok=True)


@router.get("/{person_id}/samples", response_model=list[SampleOut])
def list_samples(person_id: UUID, _: CurrentUser) -> list[SampleOut]:
    get_person(person_id)
    rows = db.fetch_all(
        "SELECT id, quality, width, height, created_at FROM face_samples WHERE person_id = %s ORDER BY created_at",
        (person_id,),
    )
    return [SampleOut(**r) for r in rows]


@router.post("/{person_id}/samples", response_model=SampleUploadResult)
def add_samples(person_id: UUID, _: CurrentUser, images: list[UploadFile] = File(...)) -> SampleUploadResult:
    get_person(person_id)
    return pipeline.enroll(person_id, read_uploads(images))


@router.delete("/{person_id}/samples/{sample_id}", status_code=204)
def delete_sample(person_id: UUID, sample_id: UUID, _: CurrentUser) -> None:
    if not db.execute("DELETE FROM face_samples WHERE id = %s AND person_id = %s", (sample_id, person_id)):
        raise not_found("Foto")
    vector_store.delete_samples([sample_id])
    pipeline.sample_path(sample_id).unlink(missing_ok=True)


@router.get("/{person_id}/samples/{sample_id}/image")
def sample_image(person_id: UUID, sample_id: UUID, _: CurrentUser) -> FileResponse:
    path = pipeline.sample_path(sample_id)
    owned = db.fetch_one("SELECT 1 FROM face_samples WHERE id = %s AND person_id = %s", (sample_id, person_id))
    if owned is None or not path.exists():
        raise not_found("Foto")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


def _username(name: str, person_id: UUID) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", ".", ascii_name.lower()).strip(".")[:40] or "pessoa"
    return f"{slug}.{str(person_id)[:6]}"


@router.put("/{person_id}/face-access", response_model=PersonOut)
def grant_face_access(person_id: UUID, _: CurrentUser) -> PersonOut:
    """Let this person unlock the app with their face. Creates a face-only account on first grant."""
    person = get_person(person_id)
    if person.face_access:
        return person
    if person.sample_count == 0:
        raise AppError(422, "no_samples", "Adicione ao menos uma foto antes de liberar o Face ID")
    email_taken = person.email and db.fetch_one("SELECT 1 FROM users WHERE lower(email) = lower(%s)", (person.email,))
    db.execute(
        """
        INSERT INTO users (email, username, full_name, hashed_password, password_login, person_id)
        VALUES (%s, %s, %s, %s, false, %s)
        """,
        (
            None if email_taken else person.email,
            _username(person.name, person_id),
            person.name,
            hash_password(secrets.token_urlsafe(32)),
            person_id,
        ),
    )
    return get_person(person_id)


@router.delete("/{person_id}/face-access", response_model=PersonOut)
def revoke_face_access(person_id: UUID, _: CurrentUser) -> PersonOut:
    """Face-only accounts are deleted, which ends their sessions. Password accounts just lose the link."""
    get_person(person_id)
    db.execute("DELETE FROM users WHERE person_id = %s AND NOT password_login", (person_id,))
    db.execute("UPDATE users SET person_id = NULL WHERE person_id = %s", (person_id,))
    return get_person(person_id)
