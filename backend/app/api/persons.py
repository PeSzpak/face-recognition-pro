import os
import uuid
import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
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
    person_data: PersonCreateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Create a new person without photos (photos added separately)."""
    try:
        # Create person record
        person_dict = {
            "name": person_data.name,
            "description": person_data.description,
            "active": True,
            "created_by": current_user["sub"]
        }
        
        result = db.table("persons").insert(person_dict).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create person"
            )
        
        created_person = result.data[0]
        
        logger.info(f"Person created: {created_person['id']} - {person_data.name}")
        
        return PersonResponse(**created_person, photo_count=0)
        
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
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Add photos to an existing person and extract embeddings."""
    try:
        # Verify person exists
        person_result = db.table("persons").select("*").eq("id", person_id).execute()
        if not person_result.data:
            raise PersonNotFoundException(person_id)
        
        person = person_result.data[0]
        
        # Process each image
        embeddings = []
        processed_images = []
        
        for i, image_base64 in enumerate(images):
            try:
                # Process image for face recognition
                cv2_image, embeddings_data = face_service.process_image_for_recognition(image_base64)
                
                if not embeddings_data:
                    logger.warning(f"No faces detected in image {i} for person {person_id}")
                    continue
                
                # Take the best quality embedding
                best_embedding = max(embeddings_data, key=lambda x: x['quality_score'])
                embeddings.append(best_embedding['embedding'])
                
                # Save image info (you might want to save actual images to storage)
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
        
        # Store embeddings in vector database
        metadata = {
            "person_name": person["name"],
            "person_id": person_id
        }
        
        vector_db.upsert_person_embeddings(person_id, embeddings, metadata)
        
        # Update person photo count
        photo_count = len(embeddings)
        db.table("persons").update({"photo_count": photo_count}).eq("id", person_id).execute()
        
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
    db=Depends(get_database)
):
    """List persons with pagination and search."""
    try:
        # Build query
        query = db.table("persons").select("*")
        
        if active_only:
            query = query.eq("active", True)
        
        if search:
            query = query.ilike("name", f"%{search}%")
        
        # Get total count
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Apply pagination
        offset = (page - 1) * size
        result = query.order("created_at", desc=True).range(offset, offset + size - 1).execute()
        
        persons = []
        if result.data:
            for person_data in result.data:
                persons.append(PersonResponse(**person_data))
        
        has_next = offset + size < total
        
        return PersonListResponse(
            persons=persons,
            total=total,
            page=page,
            size=size,
            has_next=has_next
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
    db=Depends(get_database)
):
    """Get person by ID."""
    try:
        result = db.table("persons").select("*").eq("id", person_id).execute()
        
        if not result.data:
            raise PersonNotFoundException(person_id)
        
        person = result.data[0]
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
    db=Depends(get_database)
):
    """Update person information."""
    try:
        # Verify person exists
        person_result = db.table("persons").select("*").eq("id", person_id).execute()
        if not person_result.data:
            raise PersonNotFoundException(person_id)
        
        # Build update data
        update_data = {}
        if person_data.name is not None:
            update_data["name"] = person_data.name
        if person_data.description is not None:
            update_data["description"] = person_data.description
        if person_data.active is not None:
            update_data["active"] = person_data.active
        
        if not update_data:
            # No changes
            return PersonResponse(**person_result.data[0])
        
        # Update person
        result = db.table("persons").update(update_data).eq("id", person_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update person"
            )
        
        updated_person = result.data[0]
        
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
    db=Depends(get_database),
    vector_db=Depends(get_vector_database_service)
):
    """Delete person and all associated data."""
    try:
        # Verify person exists
        person_result = db.table("persons").select("*").eq("id", person_id).execute()
        if not person_result.data:
            raise PersonNotFoundException(person_id)
        
        # Delete embeddings from vector database
        vector_db.delete_person_embeddings(person_id)
        
        # Delete person from database
        db.table("persons").delete().eq("id", person_id).execute()
        
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