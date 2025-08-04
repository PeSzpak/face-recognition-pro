import os
import uuid
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np
import cv2
from PIL import Image
import base64
import io
from app.utils.image_utils import (
    validate_image_format, base64_to_cv2, cv2_to_base64,
    resize_image, enhance_image_quality, calculate_image_quality_score
)
from app.core.exceptions import InvalidImageException
from app.config import settings

logger = logging.getLogger(__name__)


class ImageProcessor:
    def __init__(self):
        self.upload_path = settings.upload_path
        self.max_file_size = settings.max_file_size
        self.allowed_extensions = settings.allowed_extensions
        
    def validate_image_size(self, image_data: bytes) -> bool:
        """Validate image file size."""
        return len(image_data) <= self.max_file_size
    
    def validate_image_extension(self, filename: str) -> bool:
        """Validate image file extension."""
        if '.' not in filename:
            return False
        extension = filename.rsplit('.', 1)[1].lower()
        return extension in self.allowed_extensions
    
    def process_upload_image(self, base64_image: str, person_id: str, 
                           image_index: int = 0) -> Dict:
        """Process uploaded image and save to disk."""
        try:
            # Convert base64 to cv2 image
            cv2_image = base64_to_cv2(base64_image)
            
            # Enhance image quality
            enhanced_image = enhance_image_quality(cv2_image)
            
            # Resize if too large
            processed_image = resize_image(enhanced_image, (800, 600))
            
            # Calculate quality score
            quality_score = calculate_image_quality_score(processed_image)
            
            # Generate filename
            filename = f"{person_id}_{image_index}_{uuid.uuid4().hex[:8]}.jpg"
            filepath = os.path.join(self.upload_path, filename)
            
            # Save image
            cv2.imwrite(filepath, processed_image)
            
            # Get image dimensions
            height, width = processed_image.shape[:2]
            
            return {
                "filename": filename,
                "filepath": filepath,
                "width": width,
                "height": height,
                "quality_score": quality_score,
                "file_size": os.path.getsize(filepath)
            }
            
        except Exception as e:
            logger.error(f"Failed to process upload image: {e}")
            raise InvalidImageException("Failed to process uploaded image")
    
    def delete_image(self, filepath: str) -> bool:
        """Delete image file from disk."""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete image {filepath}: {e}")
            return False
    
    def get_image_info(self, filepath: str) -> Optional[Dict]:
        """Get image file information."""
        try:
            if not os.path.exists(filepath):
                return None
            
            # Read image
            image = cv2.imread(filepath)
            if image is None:
                return None
            
            height, width = image.shape[:2]
            file_size = os.path.getsize(filepath)
            
            return {
                "filepath": filepath,
                "width": width,
                "height": height,
                "file_size": file_size,
                "exists": True
            }
            
        except Exception as e:
            logger.error(f"Failed to get image info for {filepath}: {e}")
            return None
    
    def batch_process_images(self, base64_images: List[str], 
                           person_id: str) -> List[Dict]:
        """Process multiple images in batch."""
        processed_images = []
        
        for i, base64_image in enumerate(base64_images):
            try:
                result = self.process_upload_image(base64_image, person_id, i)
                processed_images.append({
                    "index": i,
                    "success": True,
                    "data": result
                })
            except Exception as e:
                logger.warning(f"Failed to process image {i}: {e}")
                processed_images.append({
                    "index": i,
                    "success": False,
                    "error": str(e)
                })
        
        return processed_images


# Global image processor instance
image_processor = ImageProcessor()


def get_image_processor() -> ImageProcessor:
    """Dependency to get image processor."""
    return image_processor