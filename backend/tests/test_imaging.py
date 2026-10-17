import io

import cv2
import numpy as np
import pytest
from PIL import Image

from app.errors import AppError
from app.face.imaging import MAX_SIDE, Box, decode_image, encode_jpeg, face_quality


def png_bytes(width: int, height: int, color=(200, 120, 40)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_decode_returns_bgr():
    image = decode_image(png_bytes(40, 30, color=(255, 0, 0)))

    assert image.shape == (30, 40, 3)
    assert tuple(image[0, 0]) == (0, 0, 255)


def test_decode_downscales_large_images():
    image = decode_image(png_bytes(MAX_SIDE * 2, MAX_SIDE))

    assert max(image.shape[:2]) == MAX_SIDE


def test_decode_rejects_non_images():
    with pytest.raises(AppError) as error:
        decode_image(b"definitely not an image")

    assert error.value.status == 422


def test_padded_box_stays_inside_image():
    box = Box(5, 5, 50, 50).padded(0.5, width=60, height=60)

    assert (box.x, box.y) == (0, 0)
    assert box.x + box.w <= 60 and box.y + box.h <= 60


def test_sharp_well_lit_face_scores_higher_than_blurred_dark_one():
    rng = np.random.default_rng(0)
    sharp = rng.integers(60, 200, size=(200, 200, 3), dtype=np.uint8)
    blurred_dark = (cv2.GaussianBlur(sharp, (31, 31), 0) * 0.15).astype(np.uint8)
    box = Box(0, 0, 200, 200)

    assert face_quality(sharp, box) > face_quality(blurred_dark, box) + 0.3


def test_quality_of_empty_crop_is_zero():
    assert face_quality(np.zeros((10, 10, 3), np.uint8), Box(50, 50, 10, 10)) == 0.0


def test_encode_jpeg_limits_size():
    jpeg = encode_jpeg(np.zeros((1000, 500, 3), np.uint8), max_side=200)

    assert Image.open(io.BytesIO(jpeg)).size == (100, 200)
