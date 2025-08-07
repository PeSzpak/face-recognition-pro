import cv2
import numpy as np
from deepface import DeepFace
import logging
import io
from PIL import Image
import base64
from typing import Optional, List, Dict, Tuple, Union
import asyncio
from concurrent.futures import ThreadPoolExecutor
import uuid
import tempfile
import os

# Busca o Usuario requisitado
logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.model_name = "Facenet512" 
        self.detector_backend = "opencv"  
        self.confidence_threshold = 0.6
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Configurações do DeepFace
        self.deepface_models = {
            "Facenet512": 512,  
            "ArcFace": 512,
            "Facenet": 128,
            "VGG-Face": 2622
        }
        
        logger.info(f"🤖 FaceRecognitionService inicializado com modelo {self.model_name}")
        
    async def extract_embedding(self, image_data: bytes) -> Optional[np.ndarray]:
        """Extrair embedding de uma imagem usando DeepFace"""
        try:
            # Usar executor para não bloquear event loop
            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                self.executor,
                self._extract_embedding_sync,
                image_data
            )
            
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Erro ao extrair embedding: {e}")
            return None
    
    def _extract_embedding_sync(self, image_data: bytes) -> Optional[np.ndarray]:
        """Extrair embedding de forma síncrona usando DeepFace"""
        temp_file = None
        try:
            # Converter bytes para imagem e salvar temporariamente
            image = Image.open(io.BytesIO(image_data))
            
            # Converter para RGB se necessário
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Salvar temporariamente (DeepFace precisa de arquivo)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                image.save(temp_file.name, 'JPEG')
                temp_file_path = temp_file.name
            
            # Extrair embedding com DeepFace
            try:
                embedding_result = DeepFace.represent(
                    img_path=temp_file_path,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    enforce_detection=True,  # Garantir que há uma face
                    align=True  # Alinhar face para melhor precisão
                )
                
                if embedding_result and len(embedding_result) > 0:
                    embedding = embedding_result[0]["embedding"]
                    embedding_array = np.array(embedding)
                    
                    logger.info(f"✅ Embedding extraído com sucesso - dimensão: {len(embedding)}")
                    return embedding_array
                else:
                    logger.warning("⚠️ Nenhum embedding retornado pelo DeepFace")
                    return None
                    
            except ValueError as e:
                if "Face could not be detected" in str(e):
                    logger.warning("⚠️ Nenhuma face detectada na imagem")
                    return None
                else:
                    raise e
                    
        except Exception as e:
            logger.error(f"❌ Erro na extração síncrona: {e}")
            return None
            
        finally:
            # Limpar arquivo temporário
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    async def detect_faces(self, image_data: bytes) -> Dict:
        """Detectar faces na imagem usando DeepFace"""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                self.executor,
                self._detect_faces_sync,
                image_data
            )
            return result
            
        except Exception as e:
            logger.error(f"❌ Erro na detecção de faces: {e}")
            return {
                "faces_detected": 0,
                "faces": [],
                "error": str(e)
            }
    
    def _detect_faces_sync(self, image_data: bytes) -> Dict:
        """Detectar faces de forma síncrona"""
        temp_file = None
        try:
            # Salvar imagem temporariamente
            image = Image.open(io.BytesIO(image_data))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                image.save(temp_file.name, 'JPEG')
                temp_file_path = temp_file.name
            
            # Usar DeepFace para detectar faces
            try:
                faces = DeepFace.extract_faces(
                    img_path=temp_file_path,
                    detector_backend=self.detector_backend,
                    enforce_detection=False,  # Não dar erro se não encontrar
                    align=True
                )
                
                face_info = []
                for i, face in enumerate(faces):
                    # face é um numpy array da face extraída
                    height, width = face.shape[:2]
                    area = height * width
                    
                    face_info.append({
                        "face_id": i,
                        "width": width,
                        "height": height,
                        "area": area,
                        "quality": "good" if area > 5000 else "low"
                    })
                
                return {
                    "faces_detected": len(faces),
                    "faces": face_info,
                    "message": f"{len(faces)} face(s) detectada(s)"
                }
                
            except Exception as e:
                if "Face could not be detected" in str(e):
                    return {
                        "faces_detected": 0,
                        "faces": [],
                        "message": "Nenhuma face detectada"
                    }
                else:
                    raise e
                    
        except Exception as e:
            logger.error(f"❌ Erro na detecção síncrona: {e}")
            return {
                "faces_detected": 0,
                "faces": [],
                "error": str(e)
            }
        finally:
            # Limpar arquivo temporário
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    async def recognize_face_with_pinecone(self, image_data: bytes, vector_db, db_client) -> Dict:
        """Reconhecer face usando Pinecone e DeepFace"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Extrair embedding da imagem
            logger.info("🔍 Extraindo embedding da imagem...")
            embedding = await self.extract_embedding(image_data)
            
            if embedding is None:
                return {
                    "status": "no_face",
                    "message": "Nenhuma face detectada na imagem",
                    "confidence": 0.0,
                    "person_id": None,
                    "person_name": None,
                    "processing_time": round(asyncio.get_event_loop().time() - start_time, 3)
                }
            
            # Buscar no Pinecone
            logger.info("🔍 Buscando faces similares no Pinecone...")
            matches = vector_db.search_similar_faces(
                embedding.tolist(),
                top_k=5,
                threshold=self.confidence_threshold
            )
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            if not matches:
                logger.info("❌ Nenhuma correspondência encontrada")
                return {
                    "status": "no_match",
                    "message": "Pessoa não reconhecida no sistema",
                    "confidence": 0.0,
                    "person_id": None,
                    "person_name": None,
                    "processing_time": round(processing_time, 3),
                    "threshold_used": self.confidence_threshold
                }
            
            # Pegar melhor match
            best_match = matches[0]
            person_id = best_match["person_id"]
            confidence = best_match["similarity"]
            
            logger.info(f"✅ Melhor match: {person_id} com confiança {confidence:.3f}")
            
            # Buscar dados da pessoa no Supabase
            try:
                logger.info(f"🔍 Buscando dados da pessoa {person_id} no banco...")
                person_result = db_client.table("persons").select("*").eq("id", person_id).execute()
                
                if person_result.data:
                    person = person_result.data[0]
                    
                    # Atualizar contador de reconhecimento
                    try:
                        new_count = person.get("recognition_count", 0) + 1
                        db_client.table("persons").update({
                            "recognition_count": new_count,
                            "last_recognition": "now()"
                        }).eq("id", person_id).execute()
                        logger.info(f"✅ Contador atualizado para {new_count}")
                    except Exception as e:
                        logger.warning(f"⚠️ Erro ao atualizar contador: {e}")
                    
                    return {
                        "status": "success",
                        "message": f"Pessoa reconhecida: {person['name']}",
                        "confidence": round(confidence, 3),
                        "person_id": person_id,
                        "person_name": person["name"],
                        "person_data": {
                            "name": person["name"],
                            "department": person.get("department"),
                            "position": person.get("position"),
                            "email": person.get("email"),
                            "recognition_count": person.get("recognition_count", 0) + 1
                        },
                        "processing_time": round(processing_time, 3),
                        "matches_found": len(matches),
                        "all_matches": matches[:3]  # Top 3 matches para debug
                    }
                else:
                    logger.warning(f"⚠️ Pessoa {person_id} encontrada no Pinecone mas não no banco")
                    
            except Exception as e:
                logger.error(f"❌ Erro ao buscar pessoa no banco: {e}")
            
            # Fallback se não encontrar no banco
            return {
                "status": "partial_success", 
                "message": f"Pessoa reconhecida (ID: {person_id}) mas dados não encontrados",
                "confidence": round(confidence, 3),
                "person_id": person_id,
                "person_name": f"Pessoa {person_id[:8]}",
                "processing_time": round(processing_time, 3),
                "matches_found": len(matches)
            }
            
        except Exception as e:
            logger.error(f"❌ Erro no reconhecimento: {e}")
            processing_time = asyncio.get_event_loop().time() - start_time if 'start_time' in locals() else 0
            return {
                "status": "error",
                "message": f"Erro interno: {str(e)}",
                "confidence": 0.0,
                "person_id": None,
                "person_name": None,
                "processing_time": round(processing_time, 3),
                "error_details": str(e)
            }
    
    async def validate_face_image(self, image_data: bytes) -> Dict:
        """Validar se imagem contém face de qualidade para cadastro"""
        try:
            logger.info("🔍 Validando imagem para cadastro...")
            
            # Detectar faces
            face_detection = await self.detect_faces(image_data)
            
            faces_count = face_detection.get("faces_detected", 0)
            
            if faces_count == 0:
                return {
                    "valid": False,
                    "message": "Nenhuma face detectada na imagem. Certifique-se de que há uma pessoa visível.",
                    "face_count": 0,
                    "recommendation": "Tire uma foto com boa iluminação mostrando claramente o rosto."
                }
            
            if faces_count > 1:
                return {
                    "valid": False,
                    "message": f"Múltiplas faces detectadas ({faces_count}). Use uma imagem com apenas uma pessoa.",
                    "face_count": faces_count,
                    "recommendation": "Tire uma nova foto com apenas uma pessoa na imagem."
                }
            
            # Avaliar qualidade da face
            face_info = face_detection.get("faces", [{}])[0]
            face_area = face_info.get("area", 0)
            face_quality = face_info.get("quality", "unknown")
            
            if face_quality == "low" or face_area < 5000:
                return {
                    "valid": False,
                    "message": "Qualidade da face muito baixa para cadastro confiável.",
                    "face_count": 1,
                    "face_quality": face_quality,
                    "face_area": face_area,
                    "recommendation": "Aproxime-se mais da câmera ou melhore a iluminação."
                }
            
            # Tentar extrair embedding para garantir que funciona
            embedding = await self.extract_embedding(image_data)
            
            if embedding is None:
                return {
                    "valid": False,
                    "message": "Não foi possível processar a face detectada.",
                    "face_count": 1,
                    "recommendation": "Tente uma imagem com melhor qualidade ou iluminação."
                }
            
            return {
                "valid": True,
                "message": "Imagem válida para cadastro! Face de boa qualidade detectada.",
                "face_count": 1,
                "face_quality": face_quality,
                "face_area": face_area,
                "embedding_dimension": len(embedding),
                "recommendation": "Imagem aprovada para cadastro."
            }
            
        except Exception as e:
            logger.error(f"❌ Erro na validação: {e}")
            return {
                "valid": False,
                "message": f"Erro ao processar imagem: {str(e)}",
                "face_count": 0,
                "error": str(e)
            }
    
    def get_model_info(self) -> Dict:
        """Obter informações do modelo atual"""
        return {
            "model_name": self.model_name,
            "detector_backend": self.detector_backend,
            "embedding_dimension": self.deepface_models.get(self.model_name, 512),
            "confidence_threshold": self.confidence_threshold,
            "available_models": list(self.deepface_models.keys())
        }
    
    def __del__(self):
        """Cleanup do executor"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)

# Instância global
face_recognition_service = FaceRecognitionService()

def get_face_recognition_service() -> FaceRecognitionService:
    return face_recognition_service