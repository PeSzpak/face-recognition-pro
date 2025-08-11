import os
import uuid
import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.core.database import get_database_service, DatabaseService
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
    person_data: PersonCreateRequest,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Create a new person without photos (photos added separately)."""
    try:
        # Create person record using Supabase
        person_payload = {
            "id": str(uuid.uuid4()),
            "name": person_data.name,
            "description": person_data.description,
            "active": True,
            "photo_count": 0,
            "created_by": current_user["sub"],
            "created_at": "now()",
            "updated_at": "now()"
        }
        
        created_person = await db_service.create_person(person_payload)
        
        logger.info(f"Person created: {created_person['id']} - {person_data.name}")
        
        return PersonResponse(**created_person)
        
    except Exception as e:
        logger.error(f"Failed to create person: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create person"
        )


@router.post("/{person_id}/photos")
async def add_person_photos(
    person_id: str,
    images: List[str] = Form(..., description="Base64 encoded images"),
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Add photos to an existing person and extract embeddings for Pinecone."""
    try:
        # Verify person exists using Supabase
        person = await db_service.get_person_by_id(person_id)
        if not person:
            raise PersonNotFoundException(person_id)
        
        # Process each image
        embeddings = []
        processed_images = []
        
        for i, image_base64 in enumerate(images):
            try:
                # Process image for face recognition
                cv2_image, embeddings_data = await face_service.process_image_for_recognition(image_base64)
                
                if not embeddings_data:
                    logger.warning(f"No faces detected in image {i} for person {person_id}")
                    continue
                
                # Take the best quality embedding
                best_embedding = max(embeddings_data, key=lambda x: x['quality_score'])
                embeddings.append(best_embedding['embedding'])
                
                # Save image info
                processed_images.append({
                    "image_index": i,
                    "quality_score": best_embedding['quality_score'],
                    "face_region": best_embedding['region']
                })
                
            except Exception as e:
                logger.warning(f"Failed to process image {i} for person {person_id}: {e}")
                continue
        
        if not embeddings:
            raise InvalidImageException("No valid faces found in any of the provided images")
        
        # Store embeddings in Pinecone
        metadata = {
            "person_name": person["name"],
            "person_id": person_id,
            "created_by": current_user["sub"],
            "created_at": str(person["created_at"])
        }
        
        # Use Pinecone to store embeddings
        success = await vector_db.upsert_person_embeddings(person_id, embeddings, metadata)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to store embeddings in vector database"
            )
        
        # Update person photo count using Supabase
        photo_count = len(embeddings)
        update_data = {
            "photo_count": photo_count,
            "updated_at": "now()"
        }
        
        await db_service.update_person(person_id, update_data)
        
        logger.info(f"Added {photo_count} photos to person {person_id}")
        
        return JSONResponse(
            content={
                "message": f"Successfully added {photo_count} photos",
                "person_id": person_id,
                "photos_processed": len(processed_images),
                "embeddings_created": len(embeddings)
            }
        )
        
    except (PersonNotFoundException, InvalidImageException):
        raise
    except Exception as e:
        logger.error(f"Failed to add photos to person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process photos"
        )


@router.get("/", response_model=PersonListResponse)
async def list_persons(
    page: int = 1,
    size: int = 20,
    search: Optional[str] = None,
    active_only: bool = True,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service)
):
    """List persons with pagination and search using Supabase."""
    try:
        # Use the database service with built-in pagination and search
        result = await db_service.get_persons(
            page=page, 
            size=size, 
            search=search, 
            active_only=active_only
        )
        
        persons = [PersonResponse(**person_data) for person_data in result["persons"]]
        
        return PersonListResponse(
            persons=persons,
            total=result["total"],
            page=result["page"],
            size=result["size"],
            has_next=result["has_next"]
        )
        
    except Exception as e:
        logger.error(f"Failed to list persons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve persons"
        )


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: str,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service)
):
    """Get person by ID from Supabase."""
    try:
        person = await db_service.get_person_by_id(person_id)
        
        if not person:
            raise PersonNotFoundException(person_id)
        
        return PersonResponse(**person)
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to get person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve person"
        )


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: str,
    person_data: PersonUpdateRequest,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Update person information in Supabase."""
    try:
        # Verify person exists
        existing_person = await db_service.get_person_by_id(person_id)
        if not existing_person:
            raise PersonNotFoundException(person_id)
        
        # Build update data
        update_data = {"updated_at": "now()"}
        
        if person_data.name is not None:
            update_data["name"] = person_data.name
            
            # Update metadata in Pinecone if name changed
            if existing_person["name"] != person_data.name:
                await vector_db.update_person_metadata(person_id, {"person_name": person_data.name})
                
        if person_data.description is not None:
            update_data["description"] = person_data.description
            
        if person_data.active is not None:
            update_data["active"] = person_data.active
        
        # If no changes besides updated_at
        if len(update_data) == 1:
            return PersonResponse(**existing_person)
        
        # Update person using Supabase
        updated_person = await db_service.update_person(person_id, update_data)
        
        if not updated_person:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update person"
            )
        
        logger.info(f"Person updated: {person_id}")
        
        return PersonResponse(**updated_person)
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to update person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update person"
        )


@router.delete("/{person_id}")
async def delete_person(
    person_id: str,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Delete person and all associated data from both Supabase and Pinecone."""
    try:
        # Verify person exists
        person = await db_service.get_person_by_id(person_id)
        if not person:
            raise PersonNotFoundException(person_id)
        
        # Delete embeddings from Pinecone
        await vector_db.delete_person_embeddings(person_id)
        logger.info(f"Deleted embeddings from Pinecone for person {person_id}")
        
        # Delete person from Supabase
        success = await db_service.delete_person(person_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete person"
            )
        
        logger.info(f"Person deleted: {person_id}")
        
        return JSONResponse(
            content={"message": f"Person {person_id} deleted successfully"}
        )
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete person"
        )


@router.get("/{person_id}/embeddings")
async def get_person_embeddings(
    person_id: str,
    current_user=Depends(get_current_user),
    db_service: DatabaseService = Depends(get_database_service),
    vector_db=Depends(get_vector_database_service)
):
    """Get embeddings information for a person from Pinecone."""
    try:
        # Verify person exists
        person = await db_service.get_person_by_id(person_id)
        if not person:
            raise PersonNotFoundException(person_id)
        
        # Get embeddings stats from Pinecone
        stats = await vector_db.get_person_embeddings_stats(person_id)
        
        return {
            "person_id": person_id,
            "person_name": person["name"],
            "embeddings_count": stats.get("count", 0),
            "last_updated": stats.get("last_updated"),
            "vector_stats": stats
        }
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to get embeddings for person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve embeddings information"
        )