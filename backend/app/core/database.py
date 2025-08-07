import logging
import time
from typing import Dict, List, Optional, Any, Union
from supabase import create_client, Client
from postgrest import APIError
from app.config import settings
import asyncio
from functools import wraps

logger = logging.getLogger(__name__)


def handle_db_errors(func):
    """
    Decorator para tratar erros de banco de forma consistente.
    Evita repetir try/except em todo lugar.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except APIError as e:
            logger.error(f"❌ Erro da API Supabase: {e}")
            raise DatabaseException(f"Erro na operação do banco: {e}")
        except Exception as e:
            logger.error(f"❌ Erro inesperado no banco: {e}")
            raise DatabaseException(f"Erro inesperado: {e}")
    return wrapper


class DatabaseException(Exception):
    """Exceção customizada para erros de banco."""
    pass


class DatabaseManager:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self.connection_pool_size = 10
        self.is_connected = False
        self.last_health_check = 0
        self.health_check_interval = 300  # 5 minutos
        
        # Conecta no início
        asyncio.create_task(self._connect_async())
    
    async def _connect_async(self):
        """Conecta ao Supabase de forma assíncrona."""
        await asyncio.get_event_loop().run_in_executor(None, self.connect)
    
    def connect(self):
        """
        Inicializa conexão com Supabase.
        Agora com tratamento de erro mais robusto.
        """
        try:
            logger.info("🔌 Conectando ao Supabase...")
            
            # Valida configurações antes de tentar conectar
            if not settings.supabase_url or not settings.supabase_service_key:
                raise DatabaseException("Configurações do Supabase estão incompletas")
            
            # Cria cliente Supabase
            self.supabase = create_client(
                settings.supabase_url,
                settings.supabase_service_key
            )
            
            # Testa conexão com query simples
            self._test_connection()
            
            self.is_connected = True
            self.last_health_check = time.time()
            
            logger.info("✅ Conectado ao Supabase com sucesso")
            
        except Exception as e:
            logger.error(f"❌ Falha na conexão com Supabase: {e}")
            self.is_connected = False
            raise DatabaseException(f"Não foi possível conectar ao banco: {e}")
    
    def _test_connection(self):
        """
        Testa se a conexão está funcionando.
        Faz uma query simples para validar.
        """
        try:
            # Query simples para testar conexão
            result = self.supabase.table("users").select("id").limit(1).execute()
            logger.info("🔍 Teste de conexão bem-sucedido")
        except Exception as e:
            logger.error(f"❌ Teste de conexão falhou: {e}")
            raise DatabaseException("Conexão com banco não está funcionando")
    
    def get_client(self) -> Client:
        """
        Retorna cliente Supabase.
        Inclui verificação de saúde automática.
        """
        # Verifica saúde periodicamente
        current_time = time.time()
        if current_time - self.last_health_check > self.health_check_interval:
            self._periodic_health_check()
        
        if not self.supabase or not self.is_connected:
            self.connect()
        
        return self.supabase
    
    def _periodic_health_check(self):
        """
        Verifica saúde da conexão periodicamente.
        Reconecta se necessário.
        """
        try:
            self._test_connection()
            self.last_health_check = time.time()
        except:
            logger.warning("⚠️ Conexão com banco parece instável, tentando reconectar...")
            self.is_connected = False
            try:
                self.connect()
            except:
                logger.error("❌ Falha na reconexão automática")
    
    def health_check(self) -> Dict:
        """
        Verifica saúde completa do banco.
        Retorna estatísticas úteis.
        """
        try:
            start_time = time.time()
            
            # Testa queries básicas
            users_count = self.supabase.table("users").select("*", count="exact").execute()
            persons_count = self.supabase.table("persons").select("*", count="exact").execute()
            logs_count = self.supabase.table("recognition_logs").select("*", count="exact").execute()
            
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "connected": self.is_connected,
                "response_time_ms": round(response_time * 1000, 2),
                "tables": {
                    "users": len(users_count.data) if users_count.data else 0,
                    "persons": len(persons_count.data) if persons_count.data else 0,
                    "recognition_logs": len(logs_count.data) if logs_count.data else 0
                },
                "last_check": self.last_health_check
            }
            
        except Exception as e:
            logger.error(f"❌ Health check do banco falhou: {e}")
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e)
            }


class DatabaseService:
    """
    Service layer para operações de banco mais complexas.
    Abstrai a lógica específica do Supabase.
    """
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    @property
    def client(self) -> Client:
        return self.db_manager.get_client()
    
    # ================================
    # OPERAÇÕES DE USUÁRIOS
    # ================================
    
    @handle_db_errors
    async def create_user(self, user_data: Dict) -> Dict:
        """Cria novo usuário no banco."""
        result = self.client.table("users").insert(user_data).execute()
        
        if not result.data:
            raise DatabaseException("Falha ao criar usuário")
        
        user = result.data[0]
        logger.info(f"👤 Usuário criado: {user.get('email')}")
        return user
    
    @handle_db_errors
    async def get_user_by_email_or_username(self, identifier: str) -> Optional[Dict]:
        """Busca usuário por email ou username."""
        result = self.client.table("users").select("*").or_(
            f"username.eq.{identifier},email.eq.{identifier}"
        ).execute()
        
        return result.data[0] if result.data else None
    
    @handle_db_errors
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Busca usuário por ID."""
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    @handle_db_errors
    async def update_user(self, user_id: str, update_data: Dict) -> Optional[Dict]:
        """Atualiza dados do usuário."""
        result = self.client.table("users").update(update_data).eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    # ================================
    # OPERAÇÕES DE PESSOAS
    # ================================
    
    @handle_db_errors
    async def create_person(self, person_data: Dict) -> Dict:
        """Cria nova pessoa para reconhecimento."""
        result = self.client.table("persons").insert(person_data).execute()
        
        if not result.data:
            raise DatabaseException("Falha ao criar pessoa")
        
        person = result.data[0]
        logger.info(f"🆔 Pessoa criada: {person.get('name')}")
        return person
    
    @handle_db_errors
    async def get_persons(self, 
                         page: int = 1, 
                         size: int = 20, 
                         search: Optional[str] = None,
                         active_only: bool = True) -> Dict:
        """
        Lista pessoas com paginação e busca.
        Retorna dados + metadados de paginação.
        """
        # Constrói query base
        query = self.client.table("persons").select("*")
        
        if active_only:
            query = query.eq("active", True)
        
        if search:
            query = query.ilike("name", f"%{search}%")
        
        # Conta total de registros
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Aplica paginação
        offset = (page - 1) * size
        result = query.order("created_at", desc=True).range(offset, offset + size - 1).execute()
        
        return {
            "persons": result.data or [],
            "total": total,
            "page": page,
            "size": size,
            "has_next": offset + size < total,
            "has_prev": page > 1
        }
    
    @handle_db_errors
    async def get_person_by_id(self, person_id: str) -> Optional[Dict]:
        """Busca pessoa por ID."""
        result = self.client.table("persons").select("*").eq("id", person_id).execute()
        return result.data[0] if result.data else None
    
    @handle_db_errors
    async def update_person(self, person_id: str, update_data: Dict) -> Optional[Dict]:
        """Atualiza dados da pessoa."""
        result = self.client.table("persons").update(update_data).eq("id", person_id).execute()
        return result.data[0] if result.data else None
    
    @handle_db_errors
    async def delete_person(self, person_id: str) -> bool:
        """Remove pessoa do banco."""
        result = self.client.table("persons").delete().eq("id", person_id).execute()
        success = len(result.data) > 0 if result.data else False
        
        if success:
            logger.info(f"🗑️ Pessoa removida: {person_id}")
        
        return success
    
    # ================================
    # OPERAÇÕES DE LOGS DE RECONHECIMENTO
    # ================================
    
    @handle_db_errors
    async def create_recognition_log(self, log_data: Dict) -> Dict:
        """Cria log de reconhecimento."""
        result = self.client.table("recognition_logs").insert(log_data).execute()
        
        if not result.data:
            raise DatabaseException("Falha ao criar log de reconhecimento")
        
        return result.data[0]
    
    @handle_db_errors
    async def get_recognition_logs(self, 
                                  page: int = 1, 
                                  size: int = 50,
                                  status_filter: Optional[str] = None,
                                  person_id: Optional[str] = None) -> Dict:
        """
        Lista logs de reconhecimento com filtros.
        Inclui nome da pessoa via JOIN.
        """
        # Query com JOIN para pegar nome da pessoa
        query = self.client.table("recognition_logs").select("""
            id, person_id, confidence, status, processing_time, created_at,
            persons!inner(name)
        """)
        
        # Aplica filtros
        if status_filter:
            query = query.eq("status", status_filter)
        
        if person_id:
            query = query.eq("person_id", person_id)
        
        # Conta total
        count_result = query.execute()
        total = len(count_result.data) if count_result.data else 0
        
        # Paginação
        offset = (page - 1) * size
        result = query.order("created_at", desc=True).range(offset, offset + size - 1).execute()
        
        # Processa dados para formato mais limpo
        logs = []
        if result.data:
            for log in result.data:
                processed_log = {
                    **log,
                    "person_name": log["persons"]["name"] if log.get("persons") else None
                }
                del processed_log["persons"]  # Remove estrutura aninhada
                logs.append(processed_log)
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "size": size,
            "has_next": offset + size < total
        }
    
    # ================================
    # ESTATÍSTICAS E ANALYTICS
    # ================================
    
    @handle_db_errors
    async def get_dashboard_stats(self) -> Dict:
        """
        Coleta estatísticas para dashboard.
        Query otimizada para performance.
        """
        try:
            # Dados básicos
            persons_result = self.client.table("persons").select("*", count="exact").execute()
            active_persons_result = self.client.table("persons").select("*", count="exact").eq("active", True).execute()
            logs_result = self.client.table("recognition_logs").select("*", count="exact").execute()
            
            total_persons = len(persons_result.data) if persons_result.data else 0
            active_persons = len(active_persons_result.data) if active_persons_result.data else 0
            total_recognitions = len(logs_result.data) if logs_result.data else 0
            
            # Estatísticas de sucesso
            success_result = self.client.table("recognition_logs").select("*", count="exact").eq("status", "success").execute()
            successful_recognitions = len(success_result.data) if success_result.data else 0
            
            # Cálculos
            accuracy = (successful_recognitions / total_recognitions * 100) if total_recognitions > 0 else 0
            
            # Reconhecimentos hoje (usando SQL function se disponível)
            from datetime import datetime
            today = datetime.now().date().isoformat()
            
            today_result = self.client.table("recognition_logs").select("*", count="exact").gte(
                "created_at", f"{today}T00:00:00"
            ).execute()
            recognitions_today = len(today_result.data) if today_result.data else 0
            
            return {
                "total_persons": total_persons,
                "active_persons": active_persons,
                "total_recognitions": total_recognitions,
                "recognitions_today": recognitions_today,
                "successful_recognitions": successful_recognitions,
                "accuracy": round(accuracy, 2),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao coletar estatísticas: {e}")
            return {
                "total_persons": 0,
                "active_persons": 0,
                "total_recognitions": 0,
                "recognitions_today": 0,
                "successful_recognitions": 0,
                "accuracy": 0,
                "error": str(e)
            }
    
    @handle_db_errors
    async def get_recent_activities(self, limit: int = 10) -> List[Dict]:
        """Busca atividades recentes do sistema."""
        result = self.client.table("recognition_logs").select("""
            id, person_id, confidence, status, processing_time, created_at,
            persons(name)
        """).order("created_at", desc=True).limit(limit).execute()
        
        activities = []
        if result.data:
            for log in result.data:
                person_name = "Desconhecido"
                if log.get("persons") and len(log["persons"]) > 0:
                    person_name = log["persons"][0].get("name", "Desconhecido")
                
                activities.append({
                    "id": log["id"],
                    "type": "recognition_success" if log["status"] == "success" else "recognition_failed",
                    "person_id": log["person_id"],
                    "person_name": person_name,
                    "confidence": log["confidence"],
                    "timestamp": log["created_at"],
                    "details": f"Reconhecimento {'bem-sucedido' if log['status'] == 'success' else 'falhou'}"
                })
        
        return activities


# ================================
# SINGLETON GLOBAL
# ================================

# Instâncias globais
_db_manager: Optional[DatabaseManager] = None
_db_service: Optional[DatabaseService] = None

def get_database() -> Client:
    """
    Dependency para FastAPI - retorna cliente Supabase.
    Mantém compatibilidade com código existente.
    """
    global _db_manager
    
    if _db_manager is None:
        _db_manager = DatabaseManager()
    
    return _db_manager.get_client()

def get_database_service() -> DatabaseService:
    """
    Dependency para operações mais complexas.
    Use este para lógicas avançadas de banco.
    """
    global _db_manager, _db_service
    
    if _db_manager is None:
        _db_manager = DatabaseManager()
    
    if _db_service is None:
        _db_service = DatabaseService(_db_manager)
    
    return _db_service

def get_database_manager() -> DatabaseManager:
    """
    Dependency para operações de gerenciamento.
    """
    global _db_manager
    
    if _db_manager is None:
        _db_manager = DatabaseManager()
    
    return _db_manager