import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from uuid import UUID

import numpy as np

from app import db
from app.config import settings
from app.errors import AppError
from app.face.engine import DetectedFace, engine
from app.face.imaging import crop, decode_image, encode_jpeg
from app.face.matching import Ranked, best_match, rank_people
from app.schemas import (
    Box,
    Candidate,
    EventSource,
    EventStatus,
    FaceResult,
    IdentifyResponse,
    RejectedImage,
    SampleOut,
    SampleUploadResult,
)
from app.vector_store import vector_store


def sample_path(sample_id: UUID) -> Path:
    return settings.media_dir / "samples" / f"{sample_id}.jpg"


@dataclass(frozen=True)
class Upload:
    file_name: str
    data: bytes


@dataclass(frozen=True)
class FaceMatch:
    face: DetectedFace
    ranked: list[Ranked]
    match: Ranked | None


def _match_faces(faces: list[DetectedFace], threshold: float) -> list[FaceMatch]:
    matches = []
    for face in faces:
        ranked = rank_people(vector_store.search(face.embedding), floor=settings.candidate_floor)
        matches.append(FaceMatch(face, ranked, best_match(ranked, threshold)))
    return matches


def _person_names(person_ids: set[str]) -> dict[str, str]:
    if not person_ids:
        return {}
    rows = db.fetch_all("SELECT id::text, name FROM persons WHERE id::text = ANY(%s)", (list(person_ids),))
    return {row["id"]: row["name"] for row in rows}


def _rejection(image: np.ndarray | None, faces: list[DetectedFace], person_id: UUID) -> str | None:
    if image is None:
        return "Arquivo não é uma imagem válida"
    if not faces:
        return "Nenhum rosto detectado"
    if len(faces) > 1:
        return f"{len(faces)} rostos na imagem. Use fotos com uma pessoa só"
    face = faces[0]
    if face.quality < settings.min_sample_quality:
        return f"Qualidade baixa ({face.quality:.0%}). Tente uma foto mais nítida e iluminada"
    owner = best_match(rank_people(vector_store.search(face.embedding, limit=5), settings.match_threshold), settings.match_threshold)
    if owner and owner.person_id != str(person_id):
        name = _person_names({owner.person_id}).get(owner.person_id, "outra pessoa")
        return f"Este rosto já está cadastrado como {name}"
    return None


def enroll(person_id: UUID, uploads: list[Upload]) -> SampleUploadResult:
    added: list[SampleOut] = []
    rejected: list[RejectedImage] = []
    for upload in uploads:
        try:
            image = decode_image(upload.data)
        except AppError:
            image = None
        faces = engine.detect(image) if image is not None else []
        reason = _rejection(image, faces, person_id)
        if reason:
            rejected.append(RejectedImage(file_name=upload.file_name, reason=reason))
            continue

        face = faces[0]
        sample_id = uuid.uuid4()
        height, width = image.shape[:2]
        thumb = crop(image, face.box.padded(0.45, width, height))
        path = sample_path(sample_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encode_jpeg(thumb))
        try:
            row = db.fetch_one(
                """
                INSERT INTO face_samples (id, person_id, file_name, quality, width, height)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, quality, width, height, created_at
                """,
                (sample_id, person_id, upload.file_name, face.quality, face.box.w, face.box.h),
            )
            vector_store.add(sample_id, person_id, face.embedding)
        except Exception:
            db.execute("DELETE FROM face_samples WHERE id = %s", (sample_id,))
            path.unlink(missing_ok=True)
            raise
        added.append(SampleOut(**row))
    return SampleUploadResult(added=added, rejected=rejected)


def record_event(
    source: EventSource,
    status: EventStatus,
    processing_ms: int,
    faces_count: int,
    person_id: str | None = None,
    confidence: float | None = None,
) -> None:
    db.execute(
        """
        INSERT INTO recognition_events (source, status, person_id, confidence, faces_count, processing_ms)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (source, status, person_id, confidence, faces_count, processing_ms),
    )


def identify(data: bytes, source: EventSource, record: bool) -> IdentifyResponse:
    started = time.perf_counter()
    image = decode_image(data)
    faces = engine.detect(image)
    matches = _match_faces(faces, settings.match_threshold)
    names = _person_names({r.person_id for m in matches for r in m.ranked})
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    def candidate(ranked: Ranked) -> Candidate:
        return Candidate(person_id=ranked.person_id, name=names.get(ranked.person_id, "?"), similarity=ranked.similarity)

    results = [
        FaceResult(
            box=Box(**asdict(m.face.box)),
            quality=m.face.quality,
            status="identified" if m.match else "unknown",
            person=candidate(m.match) if m.match else None,
            candidates=[candidate(r) for r in m.ranked],
        )
        for m in matches
    ]

    if record:
        if not results:
            record_event(source, "no_face", elapsed_ms, 0)
        for result in results:
            record_event(
                source,
                result.status,
                elapsed_ms,
                len(results),
                str(result.person.person_id) if result.person else None,
                result.person.similarity if result.person else (result.candidates[0].similarity if result.candidates else None),
            )

    height, width = image.shape[:2]
    return IdentifyResponse(
        image_width=width,
        image_height=height,
        faces=results,
        processing_ms=elapsed_ms,
        threshold=settings.match_threshold,
    )


def match_single_face(data: bytes) -> tuple[FaceMatch | None, int, int]:
    """Best face in the frame matched at the stricter login threshold. Returns (match, faces_count, ms)."""
    started = time.perf_counter()
    faces = engine.detect(decode_image(data))
    matches = _match_faces(faces[:1], settings.face_login_threshold)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return (matches[0] if matches else None), len(faces), elapsed_ms
