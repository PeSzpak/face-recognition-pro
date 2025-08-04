from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user
)
from app.core.database import get_database
from app.models.user import UserCreate, User, Token
from app.core.exceptions import AuthenticationException
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=User)
async def register(user_data: UserCreate, db=Depends(get_database)):
    """Register a new user."""
    try:
        # Check if user already exists
        existing_user = db.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        existing_username = db.table("users").select("*").eq("username", user_data.username).execute()
        if existing_username.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user_dict = {
            "email": user_data.email,
            "username": user_data.username,
            "full_name": user_data.full_name,
            "hashed_password": hashed_password,
            "is_active": True
        }
        
        result = db.table("users").insert(user_dict).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        created_user = result.data[0]
        
        # Remove password from response
        user_response = User(**created_user)
        
        logger.info(f"User registered successfully: {user_data.email}")
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    """Login user and return access token."""
    try:
        # Find user by username or email
        user_result = db.table("users").select("*").or_(
            f"username.eq.{form_data.username},email.eq.{form_data.username}"
        ).execute()
        
        if not user_result.data:
            raise AuthenticationException("Invalid username/email or password")
        
        user = user_result.data[0]
        
        # Verify password
        if not verify_password(form_data.password, user["hashed_password"]):
            raise AuthenticationException("Invalid username/email or password")
        
        # Check if user is active
        if not user.get("is_active", True):
            raise AuthenticationException("Account is disabled")
        
        # Create access token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user["id"], "username": user["username"]},
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
async def get_current_user_info(current_user=Depends(get_current_user), db=Depends(get_database)):
    """Get current user information."""
    try:
        user_id = current_user["sub"]
        
        user_result = db.table("users").select("*").eq("id", user_id).execute()
        
        if not user_result.data:
            raise AuthenticationException("User not found")
        
        user = User(**user_result.data[0])
        return user
        
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