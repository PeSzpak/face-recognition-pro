import re
from typing import List, Optional
from fastapi import HTTPException, status
from app.core.exceptions import InvalidImageException


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    """Validate username format."""
    # Username should be 3-30 characters, alphanumeric and underscores
    pattern = r'^[a-zA-Z0-9_]{3,30}$'
    return re.match(pattern, username) is not None


def validate_person_name(name: str) -> bool:
    """Validate person name."""
    # Name should be 2-100 characters, letters, spaces, hyphens, apostrophes
    if not name or len(name.strip()) < 2 or len(name.strip()) > 100:
        return False
    
    pattern = r"^[a-zA-ZÀ-ÿ\s\-'\.]+$"
    return re.match(pattern, name.strip()) is not None


def validate_password_strength(password: str) -> List[str]:
    """Validate password strength and return list of issues."""
    issues = []
    
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        issues.append("Password must contain at least one digit")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        issues.append("Password must contain at least one special character")
    
    return issues


def validate_base64_image(base64_string: str) -> bool:
    """Validate base64 image string."""
    try:
        import base64
        
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        # Try to decode
        image_data = base64.b64decode(base64_string)
        
        # Check if it's a valid image by trying to open with PIL
        from PIL import Image
        import io
        
        img = Image.open(io.BytesIO(image_data))
        img.verify()
        
        return True
        
    except Exception:
        return False


def validate_similarity_threshold(threshold: float) -> bool:
    """Validate similarity threshold value."""
    return 0.0 <= threshold <= 1.0


def validate_pagination_params(page: int, size: int) -> None:
    """Validate pagination parameters."""
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page number must be greater than 0"
        )
    
    if size < 1 or size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 100"
        )


def validate_person_data(name: str, description: Optional[str] = None) -> None:
    """Validate person creation/update data."""
    if not validate_person_name(name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid person name. Name must be 2-100 characters and contain only letters, spaces, hyphens, and apostrophes"
        )
    
    if description and len(description.strip()) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description must be less than 500 characters"
        )


def validate_user_registration_data(email: str, username: str, password: str) -> None:
    """Validate user registration data."""
    if not validate_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    if not validate_username(username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username. Username must be 3-30 characters and contain only letters, numbers, and underscores"
        )
    
    password_issues = validate_password_strength(password)
    if password_issues:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password requirements not met: {'; '.join(password_issues)}"
        )


def validate_image_batch(base64_images: List[str]) -> None:
    """Validate batch of base64 images."""
    if not base64_images:
        raise InvalidImageException("No images provided")
    
    if len(base64_images) > 10:  # Limit batch size
        raise InvalidImageException("Maximum 10 images allowed per batch")
    
    for i, img_b64 in enumerate(base64_images):
        if not validate_base64_image(img_b64):
            raise InvalidImageException(f"Invalid image at index {i}")