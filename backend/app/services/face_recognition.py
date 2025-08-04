from deepface import DeepFace
import cv2
import numpy as np
from typing import List, Dict, Any

class FaceRecognitionService:
    def __init__(self):
        self.models = ['VGG-Face', 'Facenet', 'OpenFace', 'DeepFace', 'ArcFace']

    def recognize_face(self, image_path: str) -> Dict[str, Any]:
        try:
            # Load the image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Image not found or unable to load.")

            # Perform face recognition
            result = DeepFace.find(img_path=image_path, model_name=self.models[0], enforce_detection=False)
            return result
        except Exception as e:
            return {"error": str(e)}

    def extract_embeddings(self, image_path: str) -> List[float]:
        try:
            # Extract embeddings using DeepFace
            embeddings = DeepFace.represent(img_path=image_path, model_name=self.models[0])
            return embeddings[0]['embedding']
        except Exception as e:
            return {"error": str(e)}

    def validate_image(self, image: np.ndarray) -> bool:
        # Validate image quality (e.g., check for blurriness)
        if image is None or image.size == 0:
            return False
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        return variance > 100  # Threshold for blurriness

    def process_image(self, image_path: str) -> np.ndarray:
        # Load and preprocess the image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Image not found or unable to load.")
        img = cv2.resize(img, (224, 224))  # Resize to model input size
        return img
