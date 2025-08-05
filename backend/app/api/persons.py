import os
import uuid
import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_database
from app.core.security import get_current_user
from app.services.face_recognition import get_face_recognition_service
from app.services.vector_database import get_vector_database_service
from app.schemas.person import (
    PersonResponse, PersonCreateRequest, PersonUpdateRequest, 
    PersonListResponse
)
from app.models.person import PersonCreate, PersonUpdate
from app.utils.image_utils import validate_image_format, base64_to_cv2
from app.core.exceptions import PersonNotFoundException, InvalidImageException
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=PersonResponse)
async def create_person(
    name: str = Form(...),
    email: str = Form(None),
    department: str = Form(None),
    position: str = Form(None),
    phone: str = Form(None),
    notes: str = Form(None),
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Cadastrar nova pessoa com múltiplas fotos"""
    try:
        face_service = get_face_recognition_service()
        vector_service = get_vector_database_service()
        
        # Validar imagens
        if len(images) < 1:
            raise HTTPException(400, "Pelo menos uma imagem é necessária")
        
        if len(images) > 10:
            raise HTTPException(400, "Máximo 10 imagens por pessoa")
        
        # Processar cada imagem
        embeddings = []
        processed_images = []
        
        for image in images:
            # Validar formato
            if not image.content_type.startswith('image/'):
                raise HTTPException(400, f"Arquivo {image.filename} não é uma imagem")
            
            # Validar tamanho (5MB)
            if image.size > 5 * 1024 * 1024:
                raise HTTPException(400, f"Arquivo {image.filename} muito grande (máx 5MB)")
            
            # Extrair embedding
            image_data = await image.read()
            embedding = await face_service.extract_embedding(image_data)
            
            if embedding is None:
                raise HTTPException(400, f"Nenhum rosto detectado em {image.filename}")
            
            embeddings.append(embedding)
            processed_images.append({
                'filename': image.filename,
                'data': image_data,
                'size': len(image_data)
            })
        
        # Gerar ID único
        person_id = str(uuid.uuid4())
        
        # Salvar embeddings no Pinecone
        vector_ids = []
        for i, embedding in enumerate(embeddings):
            vector_id = f"{person_id}_{i}"
            vector_service.upsert_vector(
                vector_id=vector_id,
                embedding=embedding.tolist(),
                metadata={
                    'person_id': person_id,
                    'person_name': name,
                    'image_index': i,
                    'department': department,
                    'position': position
                }
            )
            vector_ids.append(vector_id)
        
        # Dados da pessoa para retorno
        person_data = {
            'id': person_id,
            'name': name,
            'email': email,
            'department': department,
            'position': position,
            'phone': phone,
            'notes': notes,
            'photos': [f"/uploads/{person_id}_{i}.jpg" for i in range(len(images))],
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'recognition_count': 0,
            'photo_count': len(images)
        }
        
        # TODO: Salvar no banco de dados relacional
        
        return PersonResponse(**person_data)
        
    except Exception as e:
        raise HTTPException(500, f"Erro ao cadastrar pessoa: {str(e)}")

@router.get("/", response_model=List[PersonResponse])
async def list_persons(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    department: str = None,
    status: str = None,
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Listar pessoas cadastradas com filtros"""
    # Mock data para desenvolvimento
    mock_persons = [
        {
            'id': '1',
            'name': 'João Silva Santos',
            'email': 'joao@empresa.com',
            'department': 'Desenvolvimento',
            'position': 'Desenvolvedor Sênior',
            'phone': '(11) 99999-9999',
            'photos': ['/api/placeholder/400/400', '/api/placeholder/400/401'],
            'status': 'active',
            'created_at': '2024-01-15T10:00:00Z',
            'last_recognition': '2024-08-05T14:30:00Z',
            'recognition_count': 45,
            'notes': 'Funcionário experiente'
        },
        {
            'id': '2',
            'name': 'Maria Santos Costa',
            'email': 'maria@empresa.com',
            'department': 'Marketing',
            'position': 'Gerente de Marketing',
            'phone': '(11) 88888-8888',
            'photos': ['/api/placeholder/400/402'],
            'status': 'active',
            'created_at': '2024-02-20T09:15:00Z',
            'last_recognition': '2024-08-05T11:20:00Z',
            'recognition_count': 32,
            'notes': ''
        }
    ]
    
    # Aplicar filtros
    filtered_persons = mock_persons
    
    if search:
        filtered_persons = [p for p in filtered_persons 
                          if search.lower() in p['name'].lower() 
                          or search.lower() in (p['email'] or '').lower()]
    
    if department:
        filtered_persons = [p for p in filtered_persons 
                          if p['department'] == department]
    
    if status:
        filtered_persons = [p for p in filtered_persons 
                          if p['status'] == status]
    
    # Paginação
    start = skip
    end = skip + limit
    return filtered_persons[start:end]

@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: str,
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Obter detalhes de uma pessoa"""
    # Mock data
    if person_id == "1":
        return {
            'id': '1',
            'name': 'João Silva Santos',
            'email': 'joao@empresa.com',
            'department': 'Desenvolvimento',
            'position': 'Desenvolvedor Sênior',
            'phone': '(11) 99999-9999',
            'photos': ['/api/placeholder/400/400', '/api/placeholder/400/401'],
            'status': 'active',
            'created_at': '2024-01-15T10:00:00Z',
            'last_recognition': '2024-08-05T14:30:00Z',
            'recognition_count': 45,
            'notes': 'Funcionário experiente'
        }
    
    raise HTTPException(404, "Pessoa não encontrada")

@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: str,
    name: str = Form(None),
    email: str = Form(None),
    department: str = Form(None),
    position: str = Form(None),
    phone: str = Form(None),
    notes: str = Form(None),
    status: str = Form(None),
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Atualizar dados de uma pessoa"""
    # TODO: Implementar atualização no banco
    pass

@router.delete("/{person_id}")
async def delete_person(
    person_id: str,
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Remover pessoa e seus embeddings"""
    try:
        vector_service = get_vector_database_service()
        
        # Remover do Pinecone
        vector_service.delete_person_vectors(person_id)
        
        # TODO: Remover do banco de dados
        
        return {"message": "Pessoa removida com sucesso"}
        
    except Exception as e:
        raise HTTPException(500, f"Erro ao remover pessoa: {str(e)}")

@router.get("/{person_id}/history")
async def get_person_history(
    person_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """Obter histórico de reconhecimentos de uma pessoa"""
    # Mock data
    mock_history = [
        {
            'id': '1',
            'timestamp': '2024-08-05T14:30:00Z',
            'confidence': 0.95,
            'location': 'Entrada Principal',
            'camera_id': 'CAM-001',
            'image_url': '/api/placeholder/300/300',
            'processing_time': 1.2,
            'status': 'success'
        }
    ]
    
    return mock_history[skip:skip+limit]