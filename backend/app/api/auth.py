from fastapi import APIRouter, File, UploadFile

from app import db
from app.errors import AppError, unauthorized
from app.face import pipeline
from app.security import CurrentUser, hash_password, issue_token, load_user, verify_password
from app.schemas import LoginRequest, PasswordChange, SampleUploadResult, Session, UserOut
from app.uploads import read_uploads

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Session)
def login(body: LoginRequest) -> Session:
    row = db.fetch_one(
        "SELECT id, hashed_password FROM users WHERE (username = %s OR email = %s) AND is_active",
        (body.username, body.username),
    )
    if row is None or not verify_password(body.password, row["hashed_password"]):
        raise unauthorized("Usuário ou senha incorretos")
    return Session(access_token=issue_token(row["id"], "pwd"), user=load_user(row["id"]))


@router.post("/face-login", response_model=Session)
def face_login(image: UploadFile = File(...)) -> Session:
    data = read_uploads([image])[0].data
    found, faces_count, elapsed_ms = pipeline.match_single_face(data)

    if found is None:
        pipeline.record_event("face_login", "no_face", elapsed_ms, 0)
        raise AppError(422, "no_face", "Nenhum rosto detectado. Centralize o rosto e tente de novo.")
    if found.match is None:
        top = found.ranked[0].similarity if found.ranked else None
        pipeline.record_event("face_login", "unknown", elapsed_ms, faces_count, confidence=top)
        raise unauthorized("Rosto não reconhecido")

    person_id, similarity = found.match.person_id, found.match.similarity
    row = db.fetch_one("SELECT id FROM users WHERE person_id = %s AND is_active", (person_id,))
    if row is None:
        pipeline.record_event("face_login", "denied", elapsed_ms, faces_count, person_id, similarity)
        raise AppError(403, "face_id_not_linked", "Rosto reconhecido, mas sem Face ID vinculado a um usuário")

    pipeline.record_event("face_login", "identified", elapsed_ms, faces_count, person_id, similarity)
    return Session(access_token=issue_token(row["id"], "face"), user=load_user(row["id"]), confidence=similarity)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return user


@router.post("/password", status_code=204)
def change_password(body: PasswordChange, user: CurrentUser) -> None:
    row = db.fetch_one("SELECT hashed_password FROM users WHERE id = %s", (user.id,))
    if not verify_password(body.current_password, row["hashed_password"]):
        raise AppError(400, "wrong_password", "Senha atual incorreta")
    db.execute("UPDATE users SET hashed_password = %s WHERE id = %s", (hash_password(body.new_password), user.id))


@router.post("/face-id", response_model=SampleUploadResult)
def enroll_face_id(user: CurrentUser, images: list[UploadFile] = File(...)) -> SampleUploadResult:
    """Enroll the signed-in user's face. Creates their person record on first use."""
    person_id = user.person_id
    if person_id is None:
        person = db.fetch_one(
            "INSERT INTO persons (name, email) VALUES (%s, %s) RETURNING id",
            (user.full_name or user.username, user.email),
        )
        person_id = person["id"]
    result = pipeline.enroll(person_id, read_uploads(images))
    if result.added and user.person_id is None:
        db.execute("UPDATE users SET person_id = %s WHERE id = %s", (person_id, user.id))
    elif not result.added and user.person_id is None:
        db.execute("DELETE FROM persons WHERE id = %s", (person_id,))
    return result


@router.delete("/face-id", status_code=204)
def unlink_face_id(user: CurrentUser) -> None:
    db.execute("UPDATE users SET person_id = NULL WHERE id = %s", (user.id,))

