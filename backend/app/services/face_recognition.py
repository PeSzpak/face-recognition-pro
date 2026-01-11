import os
import time
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np
from app.utils.tf_keras_compat import patch_tensorflow_keras
patch_tensorflow_keras()

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
        self.DeepFace = None
        self._initialize_models()
    
    def _lazy_import_deepface(self):
        if self.DeepFace is None:
            try:
                os.environ['DEEPFACE_DETECTOR_BACKEND'] = self.detector_backend
                from deepface import DeepFace
                self.DeepFace = DeepFace
                logger.info(f"DeepFace imported successfully with detector: {self.detector_backend}")
            except Exception as e:
                logger.error(f"Failed to import DeepFace: {e}")
                raise FaceRecognitionException(f"DeepFace import failed: {str(e)}")
        return self.DeepFace
    
    def _initialize_models(self):
        try:
            logger.info(f"Initializing DeepFace with model: {self.model_name}")
            
            DeepFace = self._lazy_import_deepface()
            dummy_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
            
            try:
                DeepFace.extract_faces(
                    img_path=dummy_img,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                logger.info("Face detection model warmed up successfully")
            except Exception as e:
                logger.warning(f"Face detection warmup failed: {e}")
            
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
        try:
            DeepFace = self._lazy_import_deepface()
            
            faces = DeepFace.extract_faces(
                img_path=image,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True
            )
            
            if not faces:
                raise NoFaceDetectedException()
            
            face_objs = DeepFace.analyze(
                img_path=image,
                actions=['age'],
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
        try:
            DeepFace = self._lazy_import_deepface()
            start_time = time.time()
            
            enhanced_image = enhance_image_quality(image)
            
            if face_region:
                enhanced_image = crop_face_region(enhanced_image, face_region)
            
            enhanced_image = resize_image(enhanced_image, (400, 400))
            
            embedding_result = DeepFace.represent(
                img_path=enhanced_image,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False
            )
            
            if not embedding_result:
                raise FaceRecognitionException("Failed to extract face embedding")
            
            embedding = np.array(embedding_result[0]['embedding'], dtype=np.float32)
            
            processing_time = time.time() - start_time
            logger.info(f"Embedding extracted in {processing_time:.3f}s")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Embedding extraction failed: {e}")
            raise FaceRecognitionException(f"Embedding extraction failed: {str(e)}")
    
    def extract_embedding_from_base64(self, image_base64: str) -> Optional[np.ndarray]:
        try:
            image = base64_to_cv2(image_base64)
            embedding = self.extract_embedding(image)
            return embedding
        except NoFaceDetectedException:
            logger.warning("No face detected in image")
            return None
        except Exception as e:
            logger.error(f"Failed to extract embedding from base64: {e}")
            return None
    
    def extract_multiple_embeddings(self, image: np.ndarray) -> List[Dict]:
        try:
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
        try:
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
            distance = 1 - similarity
            confidence = max(0, 1 - distance)
            
            return float(confidence)
            
        except Exception as e:
            logger.error(f"Similarity calculation failed: {e}")
            return 0.0
    
    def verify_faces(self, image1: np.ndarray, image2: np.ndarray) -> Dict:
        try:
            start_time = time.time()
            
            embedding1 = self.extract_embedding(image1)
            embedding2 = self.extract_embedding(image2)
            
            similarity = self.calculate_similarity(embedding1, embedding2)
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
        try:
            cv2_image = base64_to_cv2(base64_image)
            
            quality_score = calculate_image_quality_score(cv2_image)
            if quality_score < 0.3:
                logger.warning(f"Low image quality detected: {quality_score}")
            
            embeddings_data = self.extract_multiple_embeddings(cv2_image)
            
            return cv2_image, embeddings_data
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise
    
    def get_model_info(self) -> Dict:
        return {
            'model_name': self.model_name,
            'detector_backend': self.detector_backend,
            'similarity_threshold': self.similarity_threshold,
            'embedding_size': self._get_embedding_size()
        }
    
    def _get_embedding_size(self) -> int:
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


face_recognition_service = FaceRecognitionService()


def get_face_recognition_service() -> FaceRecognitionService:
    return face_recognition_service
