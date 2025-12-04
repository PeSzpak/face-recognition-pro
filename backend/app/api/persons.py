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


@router.post("", response_model=PersonResponse)
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
        # Create person record using PostgreSQL with new fields
        query = """
            INSERT INTO persons (
                name, description, active, created_by, photo_count,
                role, department, position, employee_id, email, phone, can_use_face_auth
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, description, active, photo_count, created_at, updated_at,
                      role, department, position, employee_id, email, phone, can_use_face_auth
        """
        
        result = db.execute_query(
            query,
            (
                person_data.name, 
                person_data.description, 
                True, 
                current_user["sub"], 
                0,
                person_data.role or 'user',
                person_data.department,
                person_data.position,
                person_data.employee_id,
                person_data.email,
                person_data.phone,
                person_data.can_use_face_auth or False
            )
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create person"
            )
        
        created_person = result[0]
        
        logger.info(f"Person created: {created_person['id']} - {person_data.name}")
        
        return PersonResponse(**created_person)
        
    except Exception as e:
        logger.error(f"Failed to create person: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create person: {str(e)}"
        )


@router.post("/{person_id}/photos")
async def add_person_photos(
    person_id: str,
    photos: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_database),
    face_service=Depends(get_face_recognition_service),
    vector_db=Depends(get_vector_database_service)
):
    """Add photos to an existing person and extract embeddings."""
    try:
        # Verify person exists
        person_result = db.execute_query(
            "SELECT * FROM persons WHERE id = %s",
            (person_id,)
        )
        
        if not person_result:
            raise PersonNotFoundException(person_id)
        
        person = person_result[0]
        
        # Process each image
        embeddings = []
        processed_count = 0
        
        for i, photo in enumerate(photos):
            try:
                # Read file content
                contents = await photo.read()
                
                # Convert to base64
                image_base64 = base64.b64encode(contents).decode('utf-8')
                image_base64 = f"data:image/jpeg;base64,{image_base64}"
                
                # Extract embedding using face service
                embedding = face_service.extract_embedding_from_base64(image_base64)
                
                if embedding is not None:
                    embeddings.append(embedding)
                    processed_count += 1
                else:
                    logger.warning(f"No face detected in image {i} for person {person_id}")
                
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
        current_count = person.get("photo_count", 0)
        new_count = current_count + len(embeddings)
        
        db.execute_query(
            "UPDATE persons SET photo_count = %s WHERE id = %s",
            (new_count, person_id),
            fetch=False
        )
        
        logger.info(f"Added {len(embeddings)} photos to person {person_id}")
        
        return JSONResponse(
            content={
                "message": f"Successfully added {len(embeddings)} photos",
                "person_id": person_id,
                "photos_processed": processed_count,
                "embeddings_created": len(embeddings),
                "total_photos": new_count
            }
        )
        
    except (PersonNotFoundException, InvalidImageException):
        raise
    except Exception as e:
        logger.error(f"Failed to add photos to person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process photos: {str(e)}"
        )


@router.get("", response_model=PersonListResponse)
@router.get("/", response_model=PersonListResponse)
async def list_persons(
    page: int = 1,
    per_page: int = 20,
    size: Optional[int] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """List persons with pagination and search."""
    try:
        # Use size if provided, otherwise per_page
        page_size = size if size is not None else per_page
        
        # Build query
        conditions = []
        params = []
        
        if active_only:
            conditions.append("active = %s")
            params.append(True)
        
        if search:
            conditions.append("name ILIKE %s")
            params.append(f"%{search}%")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM persons WHERE {where_clause}"
        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0]['total'] if count_result else 0
        
        # Get paginated results
        offset = (page - 1) * page_size
        query = f"""
            SELECT id, name, description, active, photo_count, created_at, updated_at
            FROM persons
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        
        result = db.execute_query(query, tuple(params + [page_size, offset]))
        
        persons = []
        if result:
            for person_data in result:
                persons.append(PersonResponse(**person_data))
        
        has_next = offset + page_size < total
        
        return PersonListResponse(
            persons=persons,
            total=total,
            page=page,
            size=page_size,
            has_next=has_next
        )
        
    except Exception as e:
        logger.error(f"Failed to list persons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve persons: {str(e)}"
        )


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_database)
):
    """Get person by ID."""
    try:
        query = "SELECT * FROM persons WHERE id = %s"
        result = db.execute_query(query, (person_id,))
        
        if not result:
            raise PersonNotFoundException(person_id)
        
        person = result[0]
        return PersonResponse(**person)
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to get person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve person: {str(e)}"
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
        person_result = db.execute_query(
            "SELECT * FROM persons WHERE id = %s",
            (person_id,)
        )
        
        if not person_result:
            raise PersonNotFoundException(person_id)
        
        # Build update data
        updates = []
        params = []
        
        if person_data.name is not None:
            updates.append("name = %s")
            params.append(person_data.name)
        
        if person_data.description is not None:
            updates.append("description = %s")
            params.append(person_data.description)
        
        if person_data.active is not None:
            updates.append("active = %s")
            params.append(person_data.active)
        
        if not updates:
            # No changes
            return PersonResponse(**person_result[0])
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(person_id)
        
        # Update person
        query = f"""
            UPDATE persons
            SET {', '.join(updates)}
            WHERE id = %s
            RETURNING id, name, description, active, photo_count, created_at, updated_at
        """
        
        result = db.execute_query(query, tuple(params))
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update person"
            )
        
        updated_person = result[0]
        
        logger.info(f"Person updated: {person_id}")
        
        return PersonResponse(**updated_person)
        
    except PersonNotFoundException:
        raise
    except Exception as e:
        logger.error(f"Failed to update person {person_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update person: {str(e)}"
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
        person_result = db.execute_query(
            "SELECT * FROM persons WHERE id = %s",
            (person_id,)
        )
        
        if not person_result:
            raise PersonNotFoundException(person_id)
        
        # Delete embeddings from vector database
        vector_db.delete_person_embeddings(person_id)
        
        # Delete person from database
        db.execute_query(
            "DELETE FROM persons WHERE id = %s",
            (person_id,),
            fetch=False
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
            detail=f"Failed to delete person: {str(e)}"
        )