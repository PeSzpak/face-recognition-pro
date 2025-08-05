from supabase import create_client, Client
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self.client: Client = None
        self._initialize()
    
    def _initialize(self):
        """Inicializar conexão com Supabase"""
        try:
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
            logger.info("✅ Supabase conectado com sucesso")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar Supabase: {e}")
            # Para desenvolvimento, criar mock client
            self.client = None
    
    def get_client(self) -> Client:
        """Obter cliente Supabase"""
        if self.client is None:
            logger.warning("Supabase não conectado - usando mock")
            return MockSupabaseClient()
        return self.client

class MockSupabaseClient:
    """Cliente mock para desenvolvimento"""
    def __init__(self):
        self.mock_data = {
            "persons": [
                {
                    "id": "1",
                    "name": "João Silva Santos",
                    "email": "joao@empresa.com",
                    "department": "Desenvolvimento",
                    "position": "Desenvolvedor Sênior",
                    "status": "active",
                    "recognition_count": 0
                }
            ],
            "recognition_logs": []
        }
    
    def table(self, table_name: str):
        return MockTable(table_name, self.mock_data)

class MockTable:
    def __init__(self, table_name: str, mock_data: dict):
        self.table_name = table_name
        self.mock_data = mock_data
        self.query_data = mock_data.get(table_name, [])
    
    def select(self, columns: str = "*"):
        return self
    
    def eq(self, column: str, value):
        return self
    
    def limit(self, count: int):
        return self
    
    def execute(self):
        return MockResult(self.query_data)
    
    def insert(self, data):
        return self
    
    def update(self, data):
        return self

class MockResult:
    def __init__(self, data):
        self.data = data

# Instância global
db_service = DatabaseService()

def get_database() -> Client:
    """Dependency para FastAPI"""
    return db_service.get_client()