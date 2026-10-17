from fastapi import UploadFile

from app.config import settings
from app.errors import AppError
from app.face.pipeline import Upload

MAX_FILES = 10


def read_uploads(files: list[UploadFile]) -> list[Upload]:
    if not files:
        raise AppError(422, "no_files", "Envie ao menos uma imagem")
    if len(files) > MAX_FILES:
        raise AppError(422, "too_many_files", f"Máximo de {MAX_FILES} imagens por envio")
    uploads = []
    for file in files:
        data = file.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            limit_mb = settings.max_upload_bytes // (1024 * 1024)
            raise AppError(413, "file_too_large", f"{file.filename} passa do limite de {limit_mb} MB")
        uploads.append(Upload(file_name=file.filename or "imagem", data=data))
    return uploads
