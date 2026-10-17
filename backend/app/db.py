import logging
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor, register_uuid
from psycopg2.pool import ThreadedConnectionPool

from app.config import settings

logger = logging.getLogger(__name__)

SCHEMA_PATH = Path(__file__).with_name("schema.sql")

register_uuid()

_pool: ThreadedConnectionPool | None = None


def connect(retries: int = 30) -> None:
    global _pool
    for attempt in range(1, retries + 1):
        try:
            _pool = ThreadedConnectionPool(1, 10, settings.database_url)
            return
        except psycopg2.OperationalError:
            if attempt == retries:
                raise
            logger.info("Waiting for PostgreSQL (%s/%s)", attempt, retries)
            time.sleep(1)


def close() -> None:
    if _pool is not None:
        _pool.closeall()


@contextmanager
def transaction() -> Iterator[RealDictCursor]:
    assert _pool is not None, "db.connect() must run first"
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def fetch_all(query: str, params: tuple | dict = ()) -> list[dict[str, Any]]:
    with transaction() as cur:
        cur.execute(query, params)
        return list(cur.fetchall())


def fetch_one(query: str, params: tuple | dict = ()) -> dict[str, Any] | None:
    with transaction() as cur:
        cur.execute(query, params)
        return cur.fetchone()


def execute(query: str, params: tuple | dict = ()) -> int:
    with transaction() as cur:
        cur.execute(query, params)
        return cur.rowcount


def apply_schema() -> None:
    with transaction() as cur:
        cur.execute(SCHEMA_PATH.read_text())


def ping() -> bool:
    try:
        return fetch_one("SELECT 1 AS ok") is not None
    except Exception:
        return False
