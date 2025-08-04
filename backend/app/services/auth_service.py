import logging
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserCreate
from app.core.exceptions import AuthenticationException
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self):
        self.db = get_database()
    
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user with username/email and password."""
        try:
            # Find user by username or email
            user_result = self.db.table("users").select("*").or_(
                f"username.eq.{username},email.eq.{username}"
            ).execute()
            
            if not user_result.data:
                return None
            
            user = user_result.data[0]
            
            # Verify password
            if not verify_password(password, user["hashed_password"]):
                return None
            
            # Check if user is active
            if not user.get("is_active", True):
                raise AuthenticationException("Account is disabled")
            
            return user
            
        except AuthenticationException:
            raise
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return None
    
    async def create_user(self, user_data: UserCreate) -> Dict:
        """Create a new user."""
        try:
            # Check if user already exists
            existing_user = self.db.table("users").select("*").eq("email", user_data.email).execute()
            if existing_user.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            
            existing_username = self.db.table("users").select("*").eq("username", user_data.username).execute()
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
            
            result = self.db.table("users").insert(user_dict).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
            
            created_user = result.data[0]
            
            # Remove password from response
            del created_user["hashed_password"]
            
            logger.info(f"User created successfully: {user_data.email}")
            return created_user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User creation failed"
            )
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID."""
        try:
            user_result = self.db.table("users").select("*").eq("id", user_id).execute()
            
            if not user_result.data:
                return None
            
            user = user_result.data[0]
            # Remove password from response
            del user["hashed_password"]
            
            return user
            
        except Exception as e:
            logger.error(f"Failed to get user {user_id}: {e}")
            return None
    
    async def update_user(self, user_id: str, update_data: Dict) -> Optional[Dict]:
        """Update user information."""
        try:
            # If password is being updated, hash it
            if "password" in update_data:
                update_data["hashed_password"] = get_password_hash(update_data["password"])
                del update_data["password"]
            
            result = self.db.table("users").update(update_data).eq("id", user_id).execute()
            
            if not result.data:
                return None
            
            updated_user = result.data[0]
            # Remove password from response
            if "hashed_password" in updated_user:
                del updated_user["hashed_password"]
            
            return updated_user
            
        except Exception as e:
            logger.error(f"Failed to update user {user_id}: {e}")
            return None
    
    def create_access_token_for_user(self, user: Dict) -> str:
        """Create access token for user."""
        access_token_expires = timedelta(minutes=30)
        return create_access_token(
            data={"sub": user["id"], "username": user["username"]},
            expires_delta=access_token_expires
        )


# Global auth service instance
auth_service = AuthService()


def get_auth_service() -> AuthService:
    """Dependency to get auth service."""
    return auth_service