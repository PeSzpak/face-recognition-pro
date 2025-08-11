import logging
from typing import List, Dict, Optional
from datetime import datetime
from app.core.database import get_database
from app.models.person import PersonCreate, PersonUpdate
from app.services.vector_database import get_vector_database_service
from app.services.image_processor import get_image_processor
from app.services.face_recognition import get_face_recognition_service
from app.core.exceptions import PersonNotFoundException, FaceRecognitionException
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class PersonService:
    def __init__(self):
        self.db = get_database()
        self.vector_db = get_vector_database_service()
        self.image_processor = get_image_processor()
        self.face_recognition = get_face_recognition_service()
    
    async def create_person(self, person_data: PersonCreate, user_id: str) -> Dict:
        """Create a new person."""
        try:
            # Create person in database
            person_dict = {
                "name": person_data.name,
                "description": person_data.description,
                "active": person_data.active,
                "photo_count": 0,
                "created_by": user_id
            }
            
            result = self.db.table("persons").insert(person_dict).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create person"
                )
            
            created_person = result.data[0]
            logger.info(f"Person created successfully: {created_person['name']}")
            
            return created_person
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Person creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Person creation failed"
            )
    
    async def get_person(self, person_id: str) -> Optional[Dict]:
        """Get person by ID."""
        try:
            result = self.db.table("persons").select("*").eq("id", person_id).execute()
            
            if not result.data:
                raise PersonNotFoundException(person_id)
            
            return result.data[0]
            
        except PersonNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get person {person_id}: {e}")
            return None
    
    async def list_persons(self, page: int = 1, size: int = 20, search: str = None) -> Dict:
        """List persons with pagination and search."""
        try:
            # Calculate offset
            offset = (page - 1) * size
            
            # Build query
            query = self.db.table("persons").select("*")
            
            # Add search filter
            if search:
                query = query.ilike("name", f"%{search}%")
            
            # Execute query with pagination
            result = query.order("created_at", desc=True).range(offset, offset + size - 1).execute()
            
            # Get total count for pagination
            count_query = self.db.table("persons").select("id", count="exact")
            if search:
                count_query = count_query.ilike("name", f"%{search}%")
            count_result = count_query.execute()
            
            total = count_result.count
            has_next = (offset + size) < total
            
            return {
                "persons": result.data,
                "total": total,
                "page": page,
                "size": size,
                "has_next": has_next
            }
            
        except Exception as e:
            logger.error(f"Failed to list persons: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve persons"
            )
    
    async def update_person(self, person_id: str, update_data: PersonUpdate) -> Optional[Dict]:
        """Update person information."""
        try:
            # Check if person exists
            existing_person = await self.get_person(person_id)
            if not existing_person:
                raise PersonNotFoundException(person_id)
            
            # Prepare update data
            update_dict = {}
            if update_data.name is not None:
                update_dict["name"] = update_data.name
            if update_data.description is not None:
                update_dict["description"] = update_data.description
            if update_data.active is not None:
                update_dict["active"] = update_data.active
            
            update_dict["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.db.table("persons").update(update_dict).eq("id", person_id).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update person"
                )
            
            updated_person = result.data[0]
            logger.info(f"Person updated successfully: {person_id}")
            
            return updated_person
            
        except (PersonNotFoundException, HTTPException):
            raise
        except Exception as e:
            logger.error(f"Failed to update person {person_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Person update failed"
            )
    
    async def delete_person(self, person_id: str) -> bool:
        """Delete person and associated data."""
        try:
            # Check if person exists
            existing_person = await self.get_person(person_id)
            if not existing_person:
                raise PersonNotFoundException(person_id)
            
            # Delete from vector database
            try:
                self.vector_db.delete_person_embeddings(person_id)
            except Exception as e:
                logger.warning(f"Failed to delete embeddings for person {person_id}: {e}")
            
            # Delete person photos
            photos_result = self.db.table("person_photos").select("filepath").eq("person_id", person_id).execute()
            for photo in photos_result.data:
                self.image_processor.delete_image(photo["filepath"])
            
            # Delete photos records
            self.db.table("person_photos").delete().eq("person_id", person_id).execute()
            
            # Delete person
            result = self.db.table("persons").delete().eq("id", person_id).execute()
            
            logger.info(f"Person deleted successfully: {person_id}")
            return True
            
        except PersonNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete person {person_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Person deletion failed"
            )
    
    async def add_photos_to_person(self, person_id: str, base64_images: List[str]) -> Dict:
        """Add photos to person and extract embeddings."""
        try:
            # Check if person exists
            existing_person = await self.get_person(person_id)
            if not existing_person:
                raise PersonNotFoundException(person_id)
            
            # Process images
            processed_images = self.image_processor.batch_process_images(base64_images, person_id)
            
            # Extract embeddings and store
            embeddings = []
            photo_records = []
            successful_count = 0
            
            for processed_img in processed_images:
                if processed_img["success"]:
                    try:
                        img_data = processed_img["data"]
                        
                        # Read processed image for embedding extraction
                        import cv2
                        cv2_image = cv2.imread(img_data["filepath"])
                        
                        # Extract embeddings
                        embeddings_data = self.face_recognition.extract_multiple_embeddings(cv2_image)
                        
                        for emb_data in embeddings_data:
                            embeddings.append(emb_data["embedding"])
                        
                        # Create photo record
                        photo_record = {
                            "person_id": person_id,
                            "filename": img_data["filename"],
                            "filepath": img_data["filepath"],
                            "width": img_data["width"],
                            "height": img_data["height"],
                            "file_size": img_data["file_size"],
                            "quality_score": img_data["quality_score"]
                        }
                        photo_records.append(photo_record)
                        successful_count += 1
                        
                    except Exception as e:
                        logger.warning(f"Failed to process image {processed_img['index']}: {e}")
            
            if embeddings:
                # Store embeddings in vector database
                self.vector_db.upsert_person_embeddings(
                    person_id, 
                    embeddings, 
                    {"person_name": existing_person["name"]}
                )
                
                # Store photo records
                if photo_records:
                    self.db.table("person_photos").insert(photo_records).execute()
                
                # Update photo count
                new_photo_count = existing_person.get("photo_count", 0) + successful_count
                self.db.table("persons").update({"photo_count": new_photo_count}).eq("id", person_id).execute()
            
            return {
                "processed_images": len(base64_images),
                "successful_images": successful_count,
                "total_embeddings": len(embeddings),
                "photos_added": len(photo_records)
            }
            
        except PersonNotFoundException:
            raise
        except FaceRecognitionException:
            raise
        except Exception as e:
            logger.error(f"Failed to add photos to person {person_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add photos to person"
            )
    
    async def get_person_stats(self, person_id: str) -> Dict:
        """Get person statistics."""
        try:
            person = await self.get_person(person_id)
            if not person:
                raise PersonNotFoundException(person_id)
            
            # Get photo count
            photos_result = self.db.table("person_photos").select("id", count="exact").eq("person_id", person_id).execute()
            photo_count = photos_result.count
            
            # Get recognition logs count
            logs_result = self.db.table("recognition_logs").select("id", count="exact").eq("person_id", person_id).execute()
            recognition_count = logs_result.count
            
            # Get embedding count from vector database
            embedding_count = self.vector_db.get_person_embedding_count(person_id)
            
            return {
                "person_id": person_id,
                "person_name": person["name"],
                "photo_count": photo_count,
                "embedding_count": embedding_count,
                "recognition_count": recognition_count,
                "created_at": person["created_at"],
                "updated_at": person["updated_at"]
            }
            
        except PersonNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to get person stats {person_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get person statistics"
            )


# Global person service instance
person_service = PersonService()


def get_person_service() -> PersonService:
    """Dependency to get person service."""
    return person_service