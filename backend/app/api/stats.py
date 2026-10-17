from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Query

from app import db
from app.config import settings
from app.errors import AppError
from app.face.engine import engine
from app.face.pipeline import COVER_SAMPLE
from app.schemas import DailyPoint, Overview, SystemInfo, TopPerson
from app.security import CurrentUser
from app.vector_store import vector_store

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _zone(tz: str) -> str:
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise AppError(422, "invalid_timezone", f"Fuso horário inválido: {tz}")
    return tz


@router.get("/overview", response_model=Overview)
def overview(_: CurrentUser, days: int = Query(14, ge=1, le=90), tz: str = "UTC") -> Overview:
    tz = _zone(tz)
    totals = db.fetch_one(
        """
        SELECT
          (SELECT count(*) FROM persons)::int AS persons_total,
          (SELECT count(*) FROM persons WHERE active)::int AS persons_active,
          (SELECT count(*) FROM face_samples)::int AS samples_total,
          count(*)::int AS events_total,
          count(*) FILTER (WHERE (created_at AT TIME ZONE %(tz)s)::date = (now() AT TIME ZONE %(tz)s)::date)::int AS events_today,
          coalesce(avg((status = 'identified')::int) FILTER (WHERE status IN ('identified', 'unknown')), 0)::float AS identification_rate,
          coalesce(avg(confidence) FILTER (WHERE status = 'identified'), 0)::float AS avg_confidence,
          coalesce(avg(processing_ms), 0)::float AS avg_processing_ms
        FROM recognition_events
        """,
        {"tz": tz},
    )
    daily = db.fetch_all(
        """
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
               count(e.id) FILTER (WHERE e.status = 'identified')::int AS identified,
               count(e.id) FILTER (WHERE e.status IN ('unknown', 'denied'))::int AS unknown,
               count(e.id) FILTER (WHERE e.status = 'no_face')::int AS no_face
        FROM generate_series(
               (now() AT TIME ZONE %(tz)s)::date - (%(days)s - 1),
               (now() AT TIME ZONE %(tz)s)::date,
               interval '1 day') AS d(day)
        LEFT JOIN recognition_events e ON (e.created_at AT TIME ZONE %(tz)s)::date = d.day
        GROUP BY d.day
        ORDER BY d.day
        """,
        {"tz": tz, "days": days},
    )
    hourly_rows = db.fetch_all(
        """
        SELECT extract(hour FROM created_at AT TIME ZONE %(tz)s)::int AS hour, count(*)::int AS n
        FROM recognition_events
        WHERE created_at > now() - make_interval(days => %(days)s)
        GROUP BY 1
        """,
        {"tz": tz, "days": days},
    )
    hourly = [0] * 24
    for row in hourly_rows:
        hourly[row["hour"]] = row["n"]
    top = db.fetch_all(
        f"""
        SELECT p.id AS person_id, p.name, {COVER_SAMPLE} AS cover_sample_id, count(*)::int AS count
        FROM recognition_events e JOIN persons p ON p.id = e.person_id
        WHERE e.status = 'identified' AND e.created_at > now() - make_interval(days => %(days)s)
        GROUP BY p.id, p.name
        ORDER BY count DESC
        LIMIT 5
        """,
        {"days": days},
    )
    return Overview(
        **totals,
        daily=[DailyPoint(**d) for d in daily],
        hourly=hourly,
        top_persons=[TopPerson(**t) for t in top],
    )


@router.get("/system", response_model=SystemInfo)
def system(_: CurrentUser) -> SystemInfo:
    store_ok = vector_store.healthy()
    return SystemInfo(
        model=settings.face_model,
        detector=settings.face_detector,
        embedding_size=settings.embedding_size,
        match_threshold=settings.match_threshold,
        face_login_threshold=settings.face_login_threshold,
        models_ready=engine.ready,
        database=db.ping(),
        vector_store=store_ok,
        vectors=vector_store.count() if store_ok else 0,
    )
