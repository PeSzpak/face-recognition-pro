from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """An error whose message is safe to show to the API client."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def not_found(entity: str) -> AppError:
    return AppError(404, "not_found", f"{entity} não encontrado(a)")


def unauthorized(message: str = "Sessão inválida ou expirada") -> AppError:
    return AppError(401, "unauthorized", message)


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status == 401 else None
        return JSONResponse(
            status_code=exc.status,
            content={"code": exc.code, "detail": exc.message},
            headers=headers,
        )
