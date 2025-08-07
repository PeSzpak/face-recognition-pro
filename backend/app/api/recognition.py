import cv2
import numpy as np
from deepface import DeepFace
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import tempfile
import os
from typing import Dict, List, Optional
import logging
from functools import lru_cache
import pickle
import hashlib

logger = logging.getLogger(__name__)

class OptimizedFaceRecognitionService:
    def __init__(self):
        self.model_name = "Facenet512"
        self.detector_backend = "opencv"
        self.confidence_threshold = 0.6
        
        # Pool otimizado para I/O e CPU
        self.io_executor = ThreadPoolExecutor(max_workers=8)
        self.cpu_executor = ProcessPoolExecutor(max_workers=4)
        
        # Cache para embeddings frequentes
        self.embedding_cache = {}
        self.max_cache_size = 1000
        
        # Pré-carregar modelo (importante!)
        self._preload_model()
        
    def _preload_model(self):
        """Pré-carregar modelo DeepFace na inicialização"""
        try:
            # Criar imagem dummy para forçar load do modelo
            dummy_image = np.zeros((224, 224, 3), dtype=np.uint8)
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                cv2.imwrite(tmp.name, dummy_image)
                
                # Forçar load do modelo
                DeepFace.represent(
                    img_path=tmp.name,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=False
                )
                os.unlink(tmp.name)
                
            logger.info("✅ Modelo DeepFace pré-carregado com sucesso")
            
        except Exception as e:
            logger.warning(f"⚠️ Erro ao pré-carregar modelo: {e}")
    
    async def recognize_face_optimized(self, image_data: bytes, vector_db, db_client, 
                                     batch_size: int = 100) -> Dict:
        """Reconhecimento ULTRA-OTIMIZADO para produção"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # 1. Cache check por hash da imagem
            image_hash = hashlib.md5(image_data).hexdigest()
            if image_hash in self.embedding_cache:
                logger.info("⚡ Cache hit - usando embedding cacheado")
                embedding = self.embedding_cache[image_hash]
            else:
                # 2. Extração otimizada de embedding
                embedding = await self._extract_embedding_optimized(image_data)
                
                if embedding is None:
                    return {
                        "status": "no_face",
                        "message": "Nenhuma face detectada",
                        "confidence": 0.0,
                        "optimization": "fast_detection"
                    }
                
                # 3. Cache do embedding (LRU)
                self._cache_embedding(image_hash, embedding)
            
            # 4. Busca vetorial otimizada
            matches = await self._search_optimized(embedding, vector_db, batch_size)
            
            if not matches:
                return {
                    "status": "no_match",
                    "message": "Pessoa não reconhecida",
                    "confidence": 0.0,
                    "search_time": round(asyncio.get_event_loop().time() - start_time, 3)
                }
            
            # 5. Busca em lote no banco (mais eficiente)
            best_match = matches[0]
            person_data = await self._get_person_batch(best_match["person_id"], db_client)
            
            return {
                "status": "success",
                "message": f"Reconhecido: {person_data.get('name', 'Desconhecido')}",
                "confidence": round(best_match["similarity"], 3),
                "person_id": best_match["person_id"],
                "person_name": person_data.get("name"),
                "person_data": person_data,
                "processing_time": round(asyncio.get_event_loop().time() - start_time, 3),
                "optimization": "production_optimized",
                "cache_used": image_hash in self.embedding_cache
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no reconhecimento otimizado: {e}")
            return {
                "status": "error",
                "message": str(e),
                "processing_time": round(asyncio.get_event_loop().time() - start_time, 3)
            }
    
    async def _extract_embedding_optimized(self, image_data: bytes) -> Optional[np.ndarray]:
        """Extração de embedding OTIMIZADA"""
        try:
            # Usar processamento paralelo
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                self.cpu_executor,
                self._extract_embedding_parallel,
                image_data
            )
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Erro na extração otimizada: {e}")
            return None
    
    def _extract_embedding_parallel(self, image_data: bytes) -> Optional[np.ndarray]:
        """Extração paralela com otimizações"""
        temp_file = None
        try:
            # 1. Otimizar imagem antes do processamento
            optimized_image = self._optimize_image(image_data)
            
            if optimized_image is None:
                return None
            
            # 2. Salvar temporariamente
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                cv2.imwrite(temp_file.name, optimized_image)
                temp_file_path = temp_file.name
            
            # 3. DeepFace otimizado
            embedding_result = DeepFace.represent(
                img_path=temp_file_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
                align=True,
                normalization='Facenet2018'  # Normalização otimizada
            )
            
            if embedding_result and len(embedding_result) > 0:
                embedding = np.array(embedding_result[0]["embedding"])
                
                # Normalização adicional para melhor performance
                embedding = embedding / np.linalg.norm(embedding)
                
                return embedding
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Erro na extração paralela: {e}")
            return None
            
        finally:
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    def _optimize_image(self, image_data: bytes) -> Optional[np.ndarray]:
        """Otimizar imagem para melhor performance"""
        try:
            # Decodificar imagem
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            # Redimensionar se muito grande (otimização importante!)
            height, width = image.shape[:2]
            max_size = 1024  # Máximo para boa performance
            
            if max(height, width) > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(height * max_size / width)
                else:
                    new_height = max_size
                    new_width = int(width * max_size / height)
                
                image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
                logger.info(f"🔧 Imagem redimensionada de {width}x{height} para {new_width}x{new_height}")
            
            # Melhorar qualidade
            image = cv2.bilateralFilter(image, 9, 75, 75)
            
            return image
            
        except Exception as e:
            logger.error(f"❌ Erro na otimização da imagem: {e}")
            return None
    
    async def _search_optimized(self, embedding: np.ndarray, vector_db, batch_size: int) -> List[Dict]:
        """Busca vetorial otimizada"""
        try:
            loop = asyncio.get_event_loop()
            matches = await loop.run_in_executor(
                self.io_executor,
                vector_db.search_similar_faces_batch,
                embedding.tolist(),
                batch_size,
                self.confidence_threshold
            )
            return matches
            
        except Exception as e:
            logger.error(f"❌ Erro na busca otimizada: {e}")
            return []
    
    def _cache_embedding(self, image_hash: str, embedding: np.ndarray):
        """Cache LRU para embeddings"""
        try:
            if len(self.embedding_cache) >= self.max_cache_size:
                # Remove mais antigo (FIFO simples)
                oldest_key = next(iter(self.embedding_cache))
                del self.embedding_cache[oldest_key]
            
            self.embedding_cache[image_hash] = embedding
            
        except Exception as e:
            logger.warning(f"⚠️ Erro no cache: {e}")
    
    async def _get_person_batch(self, person_id: str, db_client) -> Dict:
        """Busca em lote otimizada no banco"""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.io_executor,
                lambda: db_client.table("persons").select("*").eq("id", person_id).execute()
            )
            
            if result.data:
                return result.data[0]
            
            return {}
            
        except Exception as e:
            logger.error(f"❌ Erro na busca do banco: {e}")
            return {}
    
    def __del__(self):
        """Cleanup otimizado"""
        if hasattr(self, 'io_executor'):
            self.io_executor.shutdown(wait=False)
        if hasattr(self, 'cpu_executor'):
            self.cpu_executor.shutdown(wait=False)

# Instância global otimizada
optimized_face_service = OptimizedFaceRecognitionService()

def get_face_recognition_service():
    return optimized_face_service