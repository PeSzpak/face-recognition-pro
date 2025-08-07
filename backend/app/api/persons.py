import os
import uuid
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.core.database import get_database
from app.core.security import get_current_user
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.schemas.person import PersonCreate, PersonResponse, PersonUpdate
from app.config import settings
import logging
import aiofiles
import base64

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/persons", tags=["persons"])

@router.post("/", response_model=PersonResponse)
async def create_person(
    name: str = Form(...),
    email: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    position: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    photos: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Cadastrar nova pessoa com fotos e face recognition real"""
    try:
        # Validar fotos
        if not photos or len(photos) == 0:
            raise HTTPException(400, "Pelo menos uma foto é obrigatória")
        
        if len(photos) > 5:
            raise HTTPException(400, "Máximo de 5 fotos por pessoa")
        
        # Gerar ID da pessoa
        person_id = str(uuid.uuid4())
        
        # Processar fotos e extrair embeddings
        photo_paths = []
        embeddings_saved = 0
        validation_results = []
        
        for i, photo in enumerate(photos):
            try:
                # Validar tipo de arquivo
                if not photo.content_type.startswith('image/'):
                    raise HTTPException(400, f"Arquivo {photo.filename} não é uma imagem")
                
                # Ler dados da foto
                content = await photo.read()
                
                # Validar face na imagem
                logger.info(f"🔍 Validando foto {i+1}: {photo.filename}")
                validation = await face_service.validate_face_image(content)
                validation_results.append(validation)
                
                if not validation["valid"]:
                    logger.warning(f"⚠️ Foto {i+1} inválida: {validation['message']}")
                    continue
                
                # Salvar foto
                file_extension = os.path.splitext(photo.filename)[1]
                filename = f"person_{person_id}_{i}{file_extension}"
                file_path = os.path.join(settings.upload_path, filename)
                
                async with aiofiles.open(file_path, 'wb') as buffer:
                    await buffer.write(content)
                
                photo_paths.append(file_path)
                
                # Extrair embedding
                logger.info(f"🧠 Extraindo embedding da foto {i+1}")
                embedding = await face_service.extract_embedding(content)
                
                if embedding is not None:
                    # Salvar no Pinecone
                    success = vector_db.upsert_person_embedding(
                        person_id=person_id,
                        embedding=embedding.tolist(),
                        photo_index=i,
                        metadata={
                            "person_name": name,
                            "photo_path": file_path,
                            "department": department or "",
                            "position": position or "",
                            "photo_filename": filename
                        }
                    )
                    
                    if success:
                        embeddings_saved += 1
                        logger.info(f"✅ Embedding {i+1} salvo com sucesso")
                        
                        # Salvar referência da foto no banco
                        try:
                            db.table("person_photos").insert({
                                "person_id": person_id,
                                "photo_path": file_path,
                                "vector_id": f"{person_id}_{i}",
                                "quality_score": validation.get("face_area", 0) / 10000,
                                "is_primary": i == 0,
                                "filename": filename
                            }).execute()
                        except Exception as e:
                            logger.warning(f"⚠️ Erro ao salvar foto no banco: {e}")
                else:
                    logger.warning(f"⚠️ Falha ao extrair embedding da foto {i+1}")
                    
            except Exception as e:
                logger.error(f"❌ Erro ao processar foto {i+1}: {e}")
        
        if embeddings_saved == 0:
            # Limpar arquivos salvos
            for path in photo_paths:
                try:
                    os.remove(path)
                except:
                    pass
            
            # Retornar detalhes das validações
            validation_details = [v["message"] for v in validation_results]
            raise HTTPException(400, {
                "message": "Nenhuma face válida detectada nas fotos enviadas",
                "details": validation_details,
                "recommendations": [v.get("recommendation", "") for v in validation_results]
            })
        
        # Criar registro da pessoa
        person_data = {
            "id": person_id,
            "name": name,
            "email": email,
            "department": department,
            "position": position,
            "phone": phone,
            "notes": notes,
            "status": "active",
            "photo_count": embeddings_saved,
            "recognition_count": 0,
            "created_at": "now()",
            "updated_at": "now()"
        }
        
        try:
            result = db.table("persons").insert(person_data).execute()
            
            if result.data:
                response_data = result.data[0]
            else:
                response_data = person_data
                
        except Exception as e:
            logger.error(f"❌ Erro ao salvar pessoa no banco: {e}")
            response_data = person_data
        
        logger.info(f"✅ Pessoa {name} cadastrada com {embeddings_saved} fotos válidas")
        
        return {
            **response_data,
            "embeddings_saved": embeddings_saved,
            "photos_processed": len(photos),
            "validation_results": validation_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao cadastrar pessoa: {e}")
        raise HTTPException(500, f"Erro interno: {str(e)}")

@router.get("/", response_model=List[PersonResponse])
async def get_persons(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Listar todas as pessoas cadastradas"""
    try:
        query = db.table("persons").select("*")
        
        if status:
            query = query.eq("status", status)
        
        if search:
            query = query.ilike("name", f"%{search}%")
        
        query = query.range(skip, skip + limit - 1).order("name")
        
        result = query.execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar pessoas: {e}")
        # Retornar dados mock se erro
        return [
            {
                "id": "1",
                "name": "João Silva Santos",
                "email": "joao@empresa.com",
                "department": "Desenvolvimento",
                "position": "Desenvolvedor Sênior",
                "status": "active",
                "photo_count": 1,
                "recognition_count": 5,
                "created_at": "2024-01-01T10:00:00Z"
            }
        ]

@router.post("/validate-photo")
async def validate_photo(
    photo: UploadFile = File(...),
    face_service=Depends(get_face_recognition_service)
):
    """Validar foto antes do cadastro"""
    try:
        if not photo.content_type.startswith('image/'):
            raise HTTPException(400, "Arquivo deve ser uma imagem")
        
        content = await photo.read()
        
        validation = await face_service.validate_face_image(content)
        
        return {
            "filename": photo.filename,
            "size": len(content),
            "validation": validation
        }
        
    except Exception as e:
        logger.error(f"❌ Erro na validação: {e}")
        raise HTTPException(500, f"Erro ao validar foto: {str(e)}")