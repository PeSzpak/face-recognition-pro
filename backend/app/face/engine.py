import logging
import sys
import threading
from dataclasses import dataclass

import numpy as np

from app.config import settings
from app.errors import AppError
from app.face.imaging import Box, face_quality

logger = logging.getLogger(__name__)


def _import_deepface():
    # The aarch64 TensorFlow 2.15 wheel exposes tf.keras only as a lazy attribute, so
    # `from tensorflow.keras.layers import ...` inside DeepFace's detectors fails.
    import tensorflow as tf

    for name in ("", ".layers", ".models", ".preprocessing", ".preprocessing.image", ".backend"):
        module = tf.keras
        for part in filter(None, name.split(".")):
            module = getattr(module, part)
        sys.modules.setdefault(f"tensorflow.keras{name}", module)

    from deepface import DeepFace

    return DeepFace


@dataclass(frozen=True)
class DetectedFace:
    box: Box
    embedding: list[float]
    quality: float


class FaceEngine:
    """Single-pass detection + embedding on top of DeepFace.

    DeepFace and TensorFlow are imported lazily so the rest of the app (and the
    test suite) can load without them. Model calls are serialized: the Keras
    models are not safe to share across request threads.
    """

    def __init__(self, model: str, detector: str, min_face_px: int):
        self.model = model
        self.detector = detector
        self.min_face_px = min_face_px
        self._lock = threading.Lock()
        self._ready = threading.Event()
        self._deepface = None

    @property
    def ready(self) -> bool:
        return self._ready.is_set()

    def warmup(self) -> None:
        try:
            self._represent(np.full((240, 240, 3), 127, dtype=np.uint8), enforce=False)
            self._ready.set()
            logger.info("Face models ready (%s + %s)", self.model, self.detector)
        except Exception:
            logger.exception("Face model warmup failed")

    def detect(self, image: np.ndarray) -> list[DetectedFace]:
        if not self.ready:
            raise AppError(503, "models_loading", "Modelos de IA ainda carregando. Tente em alguns segundos.")
        try:
            representations = self._represent(image, enforce=True)
        except ValueError as exc:
            if "Face could not be detected" in str(exc):
                return []
            raise

        faces = []
        for rep in representations:
            area = rep["facial_area"]
            box = Box(int(area["x"]), int(area["y"]), int(area["w"]), int(area["h"]))
            if min(box.w, box.h) < self.min_face_px:
                continue
            faces.append(DetectedFace(box, rep["embedding"], face_quality(image, box)))
        faces.sort(key=lambda f: f.box.w * f.box.h, reverse=True)
        return faces

    def _represent(self, image: np.ndarray, enforce: bool) -> list[dict]:
        if self._deepface is None:
            self._deepface = _import_deepface()
        with self._lock:
            return self._deepface.represent(
                img_path=image,
                model_name=self.model,
                detector_backend=self.detector,
                enforce_detection=enforce,
                align=True,
            )


engine = FaceEngine(settings.face_model, settings.face_detector, settings.min_face_px)
