import os
import time
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np
from deepface import DeepFace
import cv2
from app.config import settings
from app.utils.image_utils import (
    base64_to_cv2, enhance_image_quality, calculate_image_quality_score,
    resize_image, crop_face_region
)
from app.core.exceptions import (
    NoFaceDetectedException, MultipleFacesException, 
    InvalidImageException, FaceRecognitionException
)

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    def __init__(self):
        self.model_name = settings.face_recognition_model
        self.detector_backend = settings.face_detection_backend
        self.similarity_threshold = settings.similarity_threshold
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize and warm up DeepFace models."""
        try:
            logger.info(f"Initializing DeepFace with model: {self.model_name}")
            
            # Create a dummy image to warm up the models
            dummy_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
            
            # Warm up face detection
            try:
                DeepFace.extract_faces(
                    img_path=dummy_img,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                logger.info("Face detection model warmed up successfully")
            except Exception as e:
                logger.warning(f"Face detection warmup failed: {e}")
            
            # Warm up face recognition
            try:
                DeepFace.represent(
                    img_path=dummy_img,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                logger.info("Face recognition model warmed up successfully")
            except Exception as e:
                logger.warning(f"Face recognition warmup failed: {e}")
                
        except Exception as e:
            logger.error(f"Failed to initialize models: {e}")
            raise FaceRecognitionException(f"Model initialization failed: {str(e)}")
    
    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """Detect faces in image and return face regions."""
        try:
            # Extract faces using DeepFace
            faces = DeepFace.extract_faces(
                img_path=image,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True
            )
            
            if not faces:
                raise NoFaceDetectedException()
            
            # Get face regions for cropping
            face_objs = DeepFace.analyze(
                img_path=image,
                actions=['age'],  # Minimal action to get face regions
                detector_backend=self.detector_backend,
                enforce_detection=False
            )
            
            detected_faces = []
            for i, face_obj in enumerate(face_objs):
                face_region = face_obj.get('region', {})
                if face_region:
                    detected_faces.append({
                        'index': i,
                        'region': face_region,
                        'face_image': faces[i] if i < len(faces) else None
                    })
            
            return detected_faces
            
        except NoFaceDetectedException:
            raise
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            raise FaceRecognitionException(f"Face detection failed: {str(e)}")
    
    def extract_embedding(self, image: np.ndarray, face_region: Optional[Dict] = None) -> np.ndarray:
        """Extract face embedding from image."""
        try:
            start_time = time.time()
            
            # Enhance image quality
            enhanced_image = enhance_image_quality(image)
            
            # Crop face region if provided
            if face_region:
                enhanced_image = crop_face_region(enhanced_image, face_region)
            
            # Resize image for optimal processing
            enhanced_image = resize_image(enhanced_image, (400, 400))
            
            # Extract embedding using DeepFace
            embedding_result = DeepFace.represent(
                img_path=enhanced_image,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False
            )
            
            if not embedding_result:
                raise FaceRecognitionException("Failed to extract face embedding")
            
            # Get the first embedding
            embedding = np.array(embedding_result[0]['embedding'], dtype=np.float32)
            
            processing_time = time.time() - start_time
            logger.info(f"Embedding extracted in {processing_time:.3f}s")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise FaceRecognitionException(f"Embedding extraction failed: {str(e)}")
    
    def extract_multiple_embeddings(self, image: np.ndarray) -> List[Dict]:
        """Extract embeddings for all faces in image."""
        try:
            # Detect all faces
            detected_faces = self.detect_faces(image)
            
            if len(detected_faces) == 0:
                raise NoFaceDetectedException()
            
            embeddings = []
            for face_data in detected_faces:
                try:
                    embedding = self.extract_embedding(image, face_data['region'])
                    quality_score = calculate_image_quality_score(image)
                    
                    embeddings.append({
                        'embedding': embedding,
                        'region': face_data['region'],
                        'quality_score': quality_score
                    })
                except Exception as e:
                    logger.warning(f"Failed to extract embedding for face: {e}")
                    continue
            
            if not embeddings:
                raise FaceRecognitionException("No valid embeddings extracted")
            
            return embeddings
            
        except (NoFaceDetectedException, FaceRecognitionException):
            raise
        except Exception as e:
            logger.error(f"Multiple embedding extraction failed: {e}")
            raise FaceRecognitionException(f"Multiple embedding extraction failed: {str(e)}")
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings."""
        try:
            # Normalize embeddings
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            # Calculate cosine similarity
            similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
            
            # Convert to distance and then to similarity score (0-1)
            distance = 1 - similarity
            confidence = max(0, 1 - distance)
            
            return float(confidence)
            
        except Exception as e:
            logger.error(f"Similarity calculation failed: {e}")
            return 0.0
    
    def verify_faces(self, image1: np.ndarray, image2: np.ndarray) -> Dict:
        """Verify if two images contain the same person."""
        try:
            start_time = time.time()
            
            # Extract embeddings
            embedding1 = self.extract_embedding(image1)
            embedding2 = self.extract_embedding(image2)
            
            # Calculate similarity
            similarity = self.calculate_similarity(embedding1, embedding2)
            
            # Determine if it's a match
            is_match = similarity >= self.similarity_threshold
            
            processing_time = time.time() - start_time
            
            return {
                'verified': is_match,
                'confidence': similarity,
                'threshold': self.similarity_threshold,
                'processing_time': processing_time
            }
            
        except Exception as e:
            logger.error(f"Face verification failed: {e}")
            raise FaceRecognitionException(f"Face verification failed: {str(e)}")
    
    def process_image_for_recognition(self, base64_image: str) -> Tuple[np.ndarray, List[Dict]]:
        """Process base64 image for face recognition."""
        try:
            # Convert base64 to OpenCV image
            cv2_image = base64_to_cv2(base64_image)
            
            # Validate image quality
            quality_score = calculate_image_quality_score(cv2_image)
            if quality_score < 0.3:
                logger.warning(f"Low image quality detected: {quality_score}")
            
            # Extract embeddings for all faces
            embeddings_data = self.extract_multiple_embeddings(cv2_image)
            
            return cv2_image, embeddings_data
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise
    
    def get_model_info(self) -> Dict:
        """Get information about current model configuration."""
        return {
            'model_name': self.model_name,
            'detector_backend': self.detector_backend,
            'similarity_threshold': self.similarity_threshold,
            'embedding_size': self._get_embedding_size()
        }
    
    def _get_embedding_size(self) -> int:
        """Get embedding size for current model."""
        embedding_sizes = {
            'VGG-Face': 2622,
            'Facenet': 128,
            'Facenet512': 512,
            'OpenFace': 128,
            'DeepFace': 4096,
            'DeepID': 160,
            'ArcFace': 512,
            'Dlib': 128,
            'SFace': 128
        }
        return embedding_sizes.get(self.model_name, 512)


# Global face recognition service instance
face_recognition_service = FaceRecognitionService()


def get_face_recognition_service() -> FaceRecognitionService:
    """Dependency to get face recognition service."""
    return face_recognition_service