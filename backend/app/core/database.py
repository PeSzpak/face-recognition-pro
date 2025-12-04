import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self):
        self.connection_params = self._parse_database_url()
        self._test_connection()
    
    def _parse_database_url(self):
        """Parse DATABASE_URL into connection parameters."""
        # Format: postgresql://user:password@host:port/database
        url = settings.database_url
        
        # Remove postgresql:// prefix
        url = url.replace('postgresql://', '')
        
        # Split user:password and host:port/database
        auth, location = url.split('@')
        user, password = auth.split(':')
        
        # Split host:port and database
        host_port, database = location.split('/')
        host, port = host_port.split(':')
        
        return {
            'host': host,
            'port': int(port),
            'database': database,
            'user': user,
            'password': password
        }
    
    def _test_connection(self):
        """Test database connection."""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT 1')
            logger.info("Connected to PostgreSQL successfully")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get database connection context manager."""
        conn = psycopg2.connect(**self.connection_params)
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True):
        """Execute a query and return results."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if fetch:
                    return cur.fetchall()
                return None
    
    def execute_many(self, query: str, params_list: list):
        """Execute query with multiple parameter sets."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(query, params_list)


# Global database instance
db_manager = DatabaseManager()


def get_database():
    """Dependency to get database manager."""
    return db_manager
