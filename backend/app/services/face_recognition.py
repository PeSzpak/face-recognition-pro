import os
import time
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np
from deepface import DeepFace
import cv2
import asyncio
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
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
        self.similarity_threshold = settings.confidence_threshold
        self.is_initialized = False
        self.thread_pool = ThreadPoolExecutor(max_workers=settings.max_concurrent_recognitions)
        
        # Cache para modelos carregados (evita recarregar a cada operação)
        self._model_cache = {}
        
        # Inicializa os modelos de forma assíncrona
        asyncio.create_task(self._initialize_models())
    
    async def _initialize_models(self):
        """
        Inicializa e 'esquenta' os modelos DeepFace de forma assíncrona.
        Isso evita latência na primeira operação.
        """
        try:
            logger.info(f"🚀 Inicializando DeepFace com modelo: {self.model_name}")
            
            # Roda a inicialização em thread separada para não bloquear
            await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, self._warm_up_models
            )
            
            self.is_initialized = True
            logger.info("✅ Modelos de reconhecimento facial inicializados com sucesso")
            
        except Exception as e:
            logger.error(f"❌ Falha na inicialização dos modelos: {e}")
            raise FaceRecognitionException(f"Inicialização dos modelos falhou: {str(e)}")
    
    def _warm_up_models(self):
        """
        Aquece os modelos com uma imagem dummy.
        Isso garante que estejam carregados na memória.
        """
        try:
            # Cria imagem dummy para aquecer os modelos
            dummy_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
            
            # Aquece detecção facial
            try:
                DeepFace.extract_faces(
                    img_path=dummy_img,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                logger.info("✅ Detector facial aquecido")
            except Exception as e:
                logger.warning(f"⚠️ Problema ao aquecer detector: {e}")
            
            # Aquece reconhecimento facial
            try:
                embedding = DeepFace.represent(
                    img_path=dummy_img,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                if embedding:
                    logger.info("✅ Modelo de reconhecimento aquecido")
            except Exception as e:
                logger.warning(f"⚠️ Problema ao aquecer modelo: {e}")
                
        except Exception as e:
            logger.error(f"❌ Erro no aquecimento dos modelos: {e}")
            raise
    
    async def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """
        Detecta faces na imagem de forma assíncrona.
        Retorna lista com regiões das faces encontradas.
        """
        if not self.is_initialized:
            await self._initialize_models()
        
        try:
            # Executa detecção em thread separada
            faces_data = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, self._detect_faces_sync, image
            )
            
            return faces_data
            
        except NoFaceDetectedException:
            raise
        except Exception as e:
            logger.error(f"❌ Falha na detecção facial: {e}")
            raise FaceRecognitionException(f"Detecção facial falhou: {str(e)}")
    
    def _detect_faces_sync(self, image: np.ndarray) -> List[Dict]:
        """Versão síncrona da detecção facial."""
        try:
            # Melhora qualidade da imagem antes da detecção
            enhanced_image = enhance_image_quality(image)
            
            # Extrai faces usando DeepFace
            faces = DeepFace.extract_faces(
                img_path=enhanced_image,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                align=True  # Alinha as faces automaticamente
            )
            
            if not faces or len(faces) == 0:
                raise NoFaceDetectedException()
            
            # Pega regiões das faces para cropping
            try:
                face_objs = DeepFace.analyze(
                    img_path=enhanced_image,
                    actions=['age'],  # Ação mínima só para pegar região
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
            except:
                # Se análise falhar, cria regiões dummy
                face_objs = [{"region": {"x": 0, "y": 0, "w": image.shape[1], "h": image.shape[0]}}] * len(faces)
            
            detected_faces = []
            for i, face_img in enumerate(faces):
                face_region = face_objs[i].get('region', {}) if i < len(face_objs) else {}
                
                # Calcula score de qualidade da face
                face_uint8 = (face_img * 255).astype(np.uint8) if face_img.dtype == np.float32 else face_img
                quality_score = calculate_image_quality_score(face_uint8)
                
                detected_faces.append({
                    'index': i,
                    'region': face_region,
                    'face_image': face_img,
                    'quality_score': quality_score
                })
            
            logger.info(f"🔍 {len(detected_faces)} face(s) detectada(s)")
            return detected_faces
            
        except NoFaceDetectedException:
            raise
        except Exception as e:
            logger.error(f"❌ Erro na detecção síncrona: {e}")
            raise FaceRecognitionException(f"Detecção síncrona falhou: {str(e)}")
    
    async def extract_embedding(self, image: np.ndarray, face_region: Optional[Dict] = None) -> np.ndarray:
        """
        Extrai embedding facial de forma assíncrona.
        """
        if not self.is_initialized:
            await self._initialize_models()
        
        try:
            start_time = time.time()
            
            # Executa extração em thread separada
            embedding = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, self._extract_embedding_sync, image, face_region
            )
            
            processing_time = time.time() - start_time
            logger.info(f"🧠 Embedding extraído em {processing_time:.3f}s")
            
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Falha na extração de embedding: {e}")
            raise FaceRecognitionException(f"Extração de embedding falhou: {str(e)}")
    
    def _extract_embedding_sync(self, image: np.ndarray, face_region: Optional[Dict] = None) -> np.ndarray:
        """Versão síncrona da extração de embedding."""
        try:
            # Melhora qualidade da imagem
            enhanced_image = enhance_image_quality(image)
            
            # Croppa região facial se especificada
            if face_region and all(k in face_region for k in ['x', 'y', 'w', 'h']):
                enhanced_image = crop_face_region(enhanced_image, face_region, padding=0.2)
            
            # Redimensiona para tamanho ótimo
            enhanced_image = resize_image(enhanced_image, (400, 400))
            
            # Extrai embedding usando DeepFace
            embedding_result = DeepFace.represent(
                img_path=enhanced_image,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
                normalization='base'  # Normalização consistente
            )
            
            if not embedding_result or len(embedding_result) == 0:
                raise FaceRecognitionException("Nenhum embedding foi extraído")
            
            # Pega primeiro (e geralmente único) embedding
            embedding = np.array(embedding_result[0]['embedding'], dtype=np.float32)
            
            # Normaliza o embedding para melhor performance
            embedding = embedding / np.linalg.norm(embedding)
            
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Erro na extração síncrona: {e}")
            raise FaceRecognitionException(f"Extração síncrona falhou: {str(e)}")
    
    async def extract_multiple_embeddings(self, image: np.ndarray) -> List[Dict]:
        """
        Extrai embeddings para todas as faces encontradas na imagem.
        """
        try:
            # Detecta faces primeiro
            detected_faces = await self.detect_faces(image)
            
            if len(detected_faces) == 0:
                raise NoFaceDetectedException()
            
            embeddings_data = []
            
            # Processa cada face encontrada
            for face_data in detected_faces:
                try:
                    embedding = await self.extract_embedding(image, face_data['region'])
                    
                    embeddings_data.append({
                        'embedding': embedding,
                        'region': face_data['region'],
                        'quality_score': face_data['quality_score']
                    })
                    
                except Exception as e:
                    logger.warning(f"⚠️ Falha ao processar face {face_data['index']}: {e}")
                    continue
            
            if not embeddings_data:
                raise FaceRecognitionException("Nenhum embedding válido foi extraído")
            
            logger.info(f"🎯 {len(embeddings_data)} embedding(s) extraído(s) com sucesso")
            return embeddings_data
            
        except (NoFaceDetectedException, FaceRecognitionException):
            raise
        except Exception as e:
            logger.error(f"❌ Falha na extração múltipla: {e}")
            raise FaceRecognitionException(f"Extração múltipla falhou: {str(e)}")
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calcula similaridade coseno entre dois embeddings.
        Retorna valor entre 0 e 1 (1 = idêntico).
        """
        try:
            # Normaliza embeddings se necessário
            if np.linalg.norm(embedding1) == 0 or np.linalg.norm(embedding2) == 0:
                return 0.0
            
            norm1 = embedding1 / np.linalg.norm(embedding1)
            norm2 = embedding2 / np.linalg.norm(embedding2)
            
            # Calcula similaridade coseno
            similarity = np.dot(norm1, norm2)
            
            # Converte para escala 0-1
            confidence = (similarity + 1) / 2
            
            return float(np.clip(confidence, 0.0, 1.0))
            
        except Exception as e:
            logger.error(f"❌ Erro no cálculo de similaridade: {e}")
            return 0.0
    
    async def verify_faces(self, image1: np.ndarray, image2: np.ndarray) -> Dict:
        """
        Verifica se duas imagens contêm a mesma pessoa.
        """
        try:
            start_time = time.time()
            
            # Extrai embeddings de ambas as imagens
            embedding1 = await self.extract_embedding(image1)
            embedding2 = await self.extract_embedding(image2)
            
            # Calcula similaridade
            similarity = self.calculate_similarity(embedding1, embedding2)
            
            # Determina se é a mesma pessoa
            is_match = similarity >= self.similarity_threshold
            
            processing_time = time.time() - start_time
            
            result = {
                'verified': is_match,
                'confidence': similarity,
                'threshold': self.similarity_threshold,
                'processing_time': processing_time,
                'message': f'{"✅ Mesma pessoa" if is_match else "❌ Pessoas diferentes"} (confiança: {similarity:.1%})'
            }
            
            logger.info(f"🔍 Verificação: {result['message']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Falha na verificação facial: {e}")
            raise FaceRecognitionException(f"Verificação facial falhou: {str(e)}")
    
    async def process_image_for_recognition(self, base64_image: str) -> Tuple[np.ndarray, List[Dict]]:
        """
        Processa imagem base64 para reconhecimento facial.
        É o ponto de entrada principal da API.
        """
        try:
            # Converte base64 para OpenCV
            cv2_image = base64_to_cv2(base64_image)
            
            # Valida qualidade da imagem
            quality_score = calculate_image_quality_score(cv2_image)
            if quality_score < 0.2:
                logger.warning(f"⚠️ Qualidade baixa detectada: {quality_score:.2f}")
            
            # Extrai embeddings para todas as faces
            embeddings_data = await self.extract_multiple_embeddings(cv2_image)
            
            logger.info(f"📸 Imagem processada: {len(embeddings_data)} face(s), qualidade: {quality_score:.2f}")
            return cv2_image, embeddings_data
            
        except Exception as e:
            logger.error(f"❌ Falha no processamento da imagem: {e}")
            raise
    
    @lru_cache(maxsize=128)
    def get_model_info(self) -> Dict:
        """
        Retorna informações sobre a configuração atual dos modelos.
        Cache para evitar recálculos desnecessários.
        """
        return {
            'model_name': self.model_name,
            'detector_backend': self.detector_backend,
            'similarity_threshold': self.similarity_threshold,
            'embedding_size': self._get_embedding_size(),
            'is_initialized': self.is_initialized,
            'max_concurrent': settings.max_concurrent_recognitions
        }
    
    def _get_embedding_size(self) -> int:
        """
        Retorna tamanho do embedding para o modelo atual.
        Essencial para configurar corretamente o Pinecone.
        """
        embedding_sizes = {
            'VGG-Face': 2622,
            'Facenet': 128,
            'Facenet512': 512,  # Este é o que estamos usando
            'OpenFace': 128,
            'DeepFace': 4096,
            'DeepID': 160,
            'ArcFace': 512,
            'Dlib': 128,
            'SFace': 128
        }
        return embedding_sizes.get(self.model_name, 512)
    
    async def batch_process_images(self, base64_images: List[str]) -> List[Dict]:
        """
        Processa múltiplas imagens em batch de forma eficiente.
        Útil para cadastrar várias fotos de uma pessoa.
        """
        results = []
        
        for i, base64_image in enumerate(base64_images):
            try:
                cv2_image, embeddings_data = await self.process_image_for_recognition(base64_image)
                
                results.append({
                    'index': i,
                    'success': True,
                    'embeddings_count': len(embeddings_data),
                    'embeddings_data': embeddings_data,
                    'image_shape': cv2_image.shape
                })
                
            except Exception as e:
                logger.warning(f"⚠️ Falha ao processar imagem {i}: {e}")
                results.append({
                    'index': i,
                    'success': False,
                    'error': str(e)
                })
        
        successful_count = sum(1 for r in results if r['success'])
        logger.info(f"📊 Batch processado: {successful_count}/{len(base64_images)} imagens com sucesso")
        
        return results
    
    def health_check(self) -> Dict:
        """
        Verifica se o serviço está funcionando corretamente.
        """
        try:
            status = {
                'service': 'FaceRecognitionService',
                'status': 'healthy' if self.is_initialized else 'initializing',
                'model': self.model_name,
                'detector': self.detector_backend,
                'threshold': self.similarity_threshold,
                'initialized': self.is_initialized
            }
            
            # Testa com imagem dummy se inicializado
            if self.is_initialized:
                try:
                    dummy_img = np.ones((100, 100, 3), dtype=np.uint8) * 128
                    test_result = DeepFace.extract_faces(
                        img_path=dummy_img,
                        detector_backend=self.detector_backend,
                        enforce_detection=False
                    )
                    status['test_detection'] = 'ok'
                except:
                    status['test_detection'] = 'failed'
                    status['status'] = 'degraded'
            
            return status
            
        except Exception as e:
            logger.error(f"❌ Health check falhou: {e}")
            return {
                'service': 'FaceRecognitionService',
                'status': 'unhealthy',
                'error': str(e)
            }
    
    def cleanup(self):
        """
        Limpa recursos e fecha thread pool.
        Chame isso ao encerrar a aplicação.
        """
        try:
            self.thread_pool.shutdown(wait=True)
            logger.info("🧹 Recursos do FaceRecognitionService limpos")
        except Exception as e:
            logger.error(f"❌ Erro na limpeza: {e}")


# ================================
# SINGLETON GLOBAL
# ================================

# Instância global do serviço (inicializa uma única vez)
_face_recognition_service: Optional[FaceRecognitionService] = None

def get_face_recognition_service() -> FaceRecognitionService:
    """
    Dependency injection para FastAPI.
    Garante que sempre usemos a mesma instância.
    """
    global _face_recognition_service
    
    if _face_recognition_service is None:
        _face_recognition_service = FaceRecognitionService()
        logger.info("🚀 FaceRecognitionService criado")
    
    return _face_recognition_service


# ================================
# CLEANUP HANDLER
# ================================

import atexit

def cleanup_on_exit():
    """Limpa recursos ao encerrar a aplicação."""
    global _face_recognition_service
    if _face_recognition_service:
        _face_recognition_service.cleanup()

# Registra limpeza automática
atexit.register(cleanup_on_exit)