from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self):
        self.supabase: Client = None
        self.connect()
    
    def connect(self):
        """Initialize Supabase connection."""
        try:
            self.supabase = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
            logger.info("Connected to Supabase successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def get_client(self) -> Client:
        """Get Supabase client."""
        if not self.supabase:
            self.connect()
        return self.supabase
    
    async def health_check(self) -> bool:
        """Check database connection health."""
        try:
            # Perform a simple query to check connection
            result = self.supabase.table("users").select("id").limit(1).execute()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Global database instance
db_manager = DatabaseManager()


def get_database() -> Client:
    """Dependency to get database client."""
    return db_manager.get_client()