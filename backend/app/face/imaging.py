import io
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.errors import AppError

MAX_SIDE = 1280


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    w: int
    h: int

    def padded(self, ratio: float, width: int, height: int) -> "Box":
        pad_x, pad_y = int(self.w * ratio), int(self.h * ratio)
        x1, y1 = max(0, self.x - pad_x), max(0, self.y - pad_y)
        x2, y2 = min(width, self.x + self.w + pad_x), min(height, self.y + self.h + pad_y)
        return Box(x1, y1, x2 - x1, y2 - y1)


def decode_image(data: bytes) -> np.ndarray:
    """Decode upload bytes into an upright BGR array no larger than MAX_SIDE."""
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise AppError(422, "invalid_image", "Arquivo não é uma imagem válida")
    image.thumbnail((MAX_SIDE, MAX_SIDE))
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


def crop(image: np.ndarray, box: Box) -> np.ndarray:
    return image[box.y : box.y + box.h, box.x : box.x + box.w]


def face_quality(image: np.ndarray, box: Box) -> float:
    """Score 0..1 from sharpness, exposure and face size. Used to reject poor enrollment photos."""
    face = crop(image, box)
    if face.size == 0:
        return 0.0
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, (160, 160))
    sharpness = min(cv2.Laplacian(gray, cv2.CV_64F).var() / 300.0, 1.0)
    exposure = 1.0 - min(abs(float(gray.mean()) - 125.0) / 125.0, 1.0)
    size = min(min(box.w, box.h) / 160.0, 1.0)
    return round(0.45 * sharpness + 0.30 * exposure + 0.25 * size, 3)


def encode_jpeg(image: np.ndarray, max_side: int = 480) -> bytes:
    height, width = image.shape[:2]
    scale = min(1.0, max_side / max(height, width))
    if scale < 1.0:
        image = cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
    ok, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not ok:
        raise AppError(500, "encode_failed", "Falha ao codificar imagem")
    return buffer.tobytes()
