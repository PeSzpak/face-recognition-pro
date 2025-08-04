from PIL import Image
import numpy as np
import cv2

def load_image(image_path: str) -> np.ndarray:
    """Load an image from a file path."""
    image = Image.open(image_path)
    return np.array(image)

def resize_image(image: np.ndarray, size: tuple) -> np.ndarray:
    """Resize an image to the specified size."""
    return cv2.resize(image, size)

def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize the image to have pixel values between 0 and 1."""
    return image / 255.0

def convert_to_rgb(image: np.ndarray) -> np.ndarray:
    """Convert an image from BGR to RGB format."""
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

def detect_faces(image: np.ndarray, face_cascade_path: str) -> list:
    """Detect faces in an image using a Haar cascade classifier."""
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray_image, scaleFactor=1.1, minNeighbors=5)
    return faces

def draw_faces(image: np.ndarray, faces: list) -> np.ndarray:
    """Draw rectangles around detected faces."""
    for (x, y, w, h) in faces:
        cv2.rectangle(image, (x, y), (x + w, y + h), (255, 0, 0), 2)
    return image