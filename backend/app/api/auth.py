from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user
)
from app.core.database import get_database_service, DatabaseService
from app.models.user import UserCreate, User, Token
from app.core.exceptions import AuthenticationException
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=User)
async def register(
    user_data: UserCreate, 
    db_service: DatabaseService = Depends(get_database_service)
):
    """Register a new user using Supabase."""
    try:
        # Check if user already exists
        existing_user = await db_service.get_user_by_email_or_username(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        existing_user = await db_service.get_user_by_email_or_username(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create user using Supabase
        user_payload = {
            "email": user_data.email,
            "username": user_data.username,
            "full_name": user_data.full_name,
            "hashed_password": get_password_hash(user_data.password),
            "is_active": True,
            "created_at": "now()",
            "updated_at": "now()"
        }
        
        created_user = await db_service.create_user(user_payload)
        
        logger.info(f"User registered successfully: {user_data.email}")
        return User(**created_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        # Handle Supabase specific errors
        error_message = str(e).lower()
        if "duplicate" in error_message or "already exists" in error_message:
            if "email" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            elif "username" in error_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db_service: DatabaseService = Depends(get_database_service)
):
    """Login user and return access token."""
    try:
        # Find user by username or email using Supabase
        user = await db_service.get_user_by_email_or_username(form_data.username)
        
        if not user:
            raise AuthenticationException("Invalid username/email or password")
        
        # Verify password
        if not verify_password(form_data.password, user["hashed_password"]):
            raise AuthenticationException("Invalid username/email or password")
        
        # Check if user is active
        if not user.get("is_active", True):
            raise AuthenticationException("Account is disabled")
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": str(user["id"]), "username": user["username"]},
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in successfully: {user['email']}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise AuthenticationException("Login failed")


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user=Depends(get_current_user), 
    db_service: DatabaseService = Depends(get_database_service)
):
    """Get current user information."""
    try:
        user_id = current_user["sub"]
        
        user = await db_service.get_user_by_id(user_id)
        
        if not user:
            raise AuthenticationException("User not found")
        
        return User(**user)
        
    except AuthenticationException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user info: {e}")
        raise AuthenticationException("Failed to get user information")


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user=Depends(get_current_user)):
    """Refresh access token."""
    try:
        # Create new access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": current_user["sub"], "username": current_user["username"]},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise AuthenticationException("Token refresh failed")


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    """Logout user (client-side token removal)."""
    try:
        logger.info(f"User logged out: {current_user.get('username')}")
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"message": "Logged out"}