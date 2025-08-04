import cv2
import numpy as np
from PIL import Image
import base64
import io
from typing import Tuple, Optional
import logging
from app.core.exceptions import InvalidImageException

logger = logging.getLogger(__name__)


def validate_image_format(file_content: bytes) -> bool:
    """Validate if the file is a valid image format."""
    try:
        img = Image.open(io.BytesIO(file_content))
        img.verify()
        return True
    except Exception:
        return False


def base64_to_cv2(base64_string: str) -> np.ndarray:
    """Convert base64 string to OpenCV image."""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if not already
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to OpenCV format (BGR)
        cv2_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return cv2_image
    except Exception as e:
        logger.error(f"Error converting base64 to cv2: {e}")
        raise InvalidImageException("Failed to decode base64 image")


def cv2_to_base64(cv2_image: np.ndarray) -> str:
    """Convert OpenCV image to base64 string."""
    try:
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(rgb_image)
        
        # Convert to base64
        buffer = io.BytesIO()
        pil_image.save(buffer, format='JPEG', quality=90)
        
        encoded_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded_image}"
    except Exception as e:
        logger.error(f"Error converting cv2 to base64: {e}")
        raise InvalidImageException("Failed to encode image to base64")


def resize_image(image: np.ndarray, max_size: Tuple[int, int] = (800, 600)) -> np.ndarray:
    """Resize image while maintaining aspect ratio."""
    height, width = image.shape[:2]
    max_width, max_height = max_size
    
    # Calculate scaling factor
    scale = min(max_width / width, max_height / height)
    
    # Only resize if image is larger than max_size
    if scale < 1:
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return image


def enhance_image_quality(image: np.ndarray) -> np.ndarray:
    """Enhance image quality for better face recognition."""
    try:
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        
        # Split LAB channels
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge channels back
        enhanced = cv2.merge([l, a, b])
        
        # Convert back to BGR
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Apply slight Gaussian blur to reduce noise
        enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
        
        return enhanced
    except Exception as e:
        logger.warning(f"Failed to enhance image: {e}")
        return image


def calculate_image_quality_score(image: np.ndarray) -> float:
    """Calculate image quality score (0-1, higher is better)."""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (focus measure)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Calculate brightness
        brightness = np.mean(gray)
        
        # Calculate contrast
        contrast = gray.std()
        
        # Normalize scores
        focus_score = min(laplacian_var / 500, 1.0)  # Normalize to 0-1
        brightness_score = 1 - abs(brightness - 128) / 128  # Optimal around 128
        contrast_score = min(contrast / 50, 1.0)  # Normalize to 0-1
        
        # Combined score
        quality_score = (focus_score * 0.5 + brightness_score * 0.3 + contrast_score * 0.2)
        
        return min(quality_score, 1.0)
    except Exception as e:
        logger.warning(f"Failed to calculate quality score: {e}")
        return 0.5  # Default score


def crop_face_region(image: np.ndarray, face_coords: dict, padding: float = 0.2) -> np.ndarray:
    """Crop face region from image with padding."""
    try:
        x = face_coords['x']
        y = face_coords['y']
        w = face_coords['w']
        h = face_coords['h']
        
        # Add padding
        pad_x = int(w * padding)
        pad_y = int(h * padding)
        
        # Calculate crop coordinates
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(image.shape[1], x + w + pad_x)
        y2 = min(image.shape[0], y + h + pad_y)
        
        # Crop face region
        face_crop = image[y1:y2, x1:x2]
        
        return face_crop
    except Exception as e:
        logger.error(f"Failed to crop face region: {e}")
        return image