"""End-to-end API flows against real PostgreSQL and Qdrant, with a deterministic fake face model.

The fake model treats a solid-color image as one face whose identity is its red
channel, so two images share an identity exactly when their red values match.
A black image has no face.
"""

import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import settings
from app.face.engine import DetectedFace, engine
from app.face.imaging import Box
from app.main import app
from app.vector_store import vector_store

pytestmark = pytest.mark.integration


def fake_detect(image: np.ndarray) -> list[DetectedFace]:
    red = int(image[0, 0, 2])
    if red == 0:
        return []
    embedding = np.zeros(settings.embedding_size)
    embedding[red] = 1.0
    height, width = image.shape[:2]
    return [DetectedFace(Box(0, 0, width, height), embedding.tolist(), quality=0.9)]


def face(red: int) -> tuple[str, bytes, str]:
    buffer = io.BytesIO()
    Image.new("RGB", (200, 200), (red, 90, 90)).save(buffer, format="PNG")
    return (f"face-{red}.png", buffer.getvalue(), "image/png")


@pytest.fixture(scope="module")
def client():
    engine.detect = fake_detect
    engine._ready.set()
    with TestClient(app) as test_client:
        vector_store.client.delete_collection(settings.qdrant_collection)
        vector_store.ensure_collection()
        token = test_client.post("/api/auth/login", json={"username": "admin", "password": "admin123"}).json()[
            "access_token"
        ]
        test_client.headers["Authorization"] = f"Bearer {token}"
        yield test_client


def create_person(client: TestClient, name: str) -> str:
    response = client.post("/api/persons", json={"name": name, "department": "Engenharia"})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_requests_without_token_are_rejected():
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/persons").status_code == 401


def test_wrong_password_is_rejected(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})

    assert response.status_code == 401
    assert response.json()["code"] == "unauthorized"


def test_enroll_then_identify(client):
    ana = create_person(client, "Ana Souza")

    enrolled = client.post(f"/api/persons/{ana}/samples", files=[("images", face(10)), ("images", face(0))]).json()
    assert len(enrolled["added"]) == 1
    assert enrolled["rejected"][0]["reason"] == "Nenhum rosto detectado"

    result = client.post("/api/recognition/identify", files={"image": face(10)}).json()
    assert result["faces"][0]["status"] == "identified"
    assert result["faces"][0]["person"]["name"] == "Ana Souza"

    unknown = client.post("/api/recognition/identify", files={"image": face(11)}).json()
    assert unknown["faces"][0]["status"] == "unknown"

    person = client.get(f"/api/persons/{ana}").json()
    assert person["sample_count"] == 1
    assert person["last_seen_at"] is not None


def test_same_face_cannot_be_enrolled_under_two_people(client):
    first = create_person(client, "Carlos Lima")
    second = create_person(client, "Impostor")
    client.post(f"/api/persons/{first}/samples", files={"images": face(20)})

    response = client.post(f"/api/persons/{second}/samples", files={"images": face(20)}).json()

    assert response["added"] == []
    assert "Carlos Lima" in response["rejected"][0]["reason"]


def test_deleting_a_person_removes_their_vectors(client):
    person = create_person(client, "Temporário")
    client.post(f"/api/persons/{person}/samples", files={"images": face(30)})

    assert client.delete(f"/api/persons/{person}").status_code == 204

    result = client.post("/api/recognition/identify", files={"image": face(30)}).json()
    assert result["faces"][0]["status"] == "unknown"
    assert client.get(f"/api/persons/{person}").status_code == 404


def test_preview_frames_are_not_recorded(client):
    before = client.get("/api/recognition/events").json()["total"]

    client.post("/api/recognition/identify", files={"image": face(10)}, data={"source": "camera", "record": "false"})

    assert client.get("/api/recognition/events").json()["total"] == before


def test_face_id_enrollment_and_login(client):
    enrolled = client.post("/api/auth/face-id", files={"images": face(40)}).json()
    assert len(enrolled["added"]) == 1
    assert client.get("/api/auth/me").json()["person_id"] is not None

    session = client.post("/api/auth/face-login", files={"image": face(40)})
    assert session.status_code == 200
    assert session.json()["user"]["username"] == "admin"

    stranger = client.post("/api/auth/face-login", files={"image": face(41)})
    assert stranger.status_code == 401


def test_recognized_person_without_linked_user_is_denied(client):
    person = create_person(client, "Visitante")
    client.post(f"/api/persons/{person}/samples", files={"images": face(50)})

    response = client.post("/api/auth/face-login", files={"image": face(50)})

    assert response.status_code == 403
    denied = client.get("/api/recognition/events", params={"status": "denied"}).json()
    assert denied["items"][0]["person_name"] == "Visitante"


def test_overview_counts_events_by_day(client):
    overview = client.get("/api/stats/overview", params={"days": 7, "tz": "America/Sao_Paulo"}).json()

    assert len(overview["daily"]) == 7
    assert overview["daily"][-1]["identified"] >= 1
    assert overview["events_today"] >= 3
    assert 0 < overview["identification_rate"] < 1
    assert sum(overview["hourly"]) == overview["events_total"]


def test_overview_rejects_unknown_timezone(client):
    assert client.get("/api/stats/overview", params={"tz": "Mars/Olympus"}).status_code == 422


def test_search_filters_people(client):
    names = [p["name"] for p in client.get("/api/persons", params={"search": "ana"}).json()["items"]]

    assert names == ["Ana Souza"]
