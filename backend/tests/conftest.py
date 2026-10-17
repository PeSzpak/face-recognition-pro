import os
import tempfile

import psycopg2
import pytest

BASE_URL = os.environ.get("DATABASE_URL", "postgresql://admin:admin123@localhost:5433/face_recognition")
TEST_DB = "face_recognition_test"


def _recreate_test_database() -> bool:
    try:
        conn = psycopg2.connect(BASE_URL, connect_timeout=2)
    except psycopg2.OperationalError:
        return False
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
        cur.execute(f"CREATE DATABASE {TEST_DB}")
    conn.close()
    return True


DB_AVAILABLE = _recreate_test_database()

os.environ.update(
    DATABASE_URL=BASE_URL.rsplit("/", 1)[0] + f"/{TEST_DB}",
    QDRANT_HOST=os.environ.get("QDRANT_HOST", "localhost"),
    QDRANT_COLLECTION="test_face_samples",
    WARMUP_MODELS="false",
    MEDIA_DIR=tempfile.mkdtemp(prefix="frp-media-"),
    ADMIN_USERNAME="admin",
    ADMIN_PASSWORD="admin123",
)


def pytest_collection_modifyitems(items):
    if DB_AVAILABLE:
        return
    skip = pytest.mark.skip(reason="PostgreSQL not reachable; run inside docker compose")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)
