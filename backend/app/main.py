import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.api import auth, persons, recognition, stats
from app.config import settings
from app.errors import install_handlers
from app.face.engine import engine
from app.security import ensure_admin
from app.vector_store import vector_store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.connect()
    db.apply_schema()
    ensure_admin()
    vector_store.ensure_collection()
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    if settings.warmup_models:
        # Model weights download on first boot; the API serves auth and CRUD meanwhile.
        threading.Thread(target=engine.warmup, name="model-warmup", daemon=True).start()
    yield
    db.close()


app = FastAPI(title="Face Recognition Pro", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
install_handlers(app)

for module in (auth, persons, recognition, stats):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "models_ready": engine.ready}
