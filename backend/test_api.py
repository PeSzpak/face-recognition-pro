from fastapi import FastAPI
import uvicorn
import sys
import os

print("🔄 Iniciando API de teste...")
print(f"📁 Diretório atual: {os.getcwd()}")
print(f"🐍 Python: {sys.version}")

app = FastAPI(
    title="Face Recognition Test API",
    description="API de teste para diagnóstico",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "message": "✅ API funcionando!",
        "status": "ok",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "message": "API de teste funcionando"
    }

@app.get("/api/dashboard/stats")
def dashboard_stats():
    return {
        "total_persons": 15,
        "active_persons": 12,
        "total_recognitions": 1247,
        "recognitions_today": 23,
        "accuracy": 95.3
    }

@app.get("/api/persons/")
def get_persons():
    return [
        {
            "id": "1",
            "name": "João Silva",
            "email": "joao@empresa.com"
        }
    ]

if __name__ == "__main__":
    print("🚀 Iniciando servidor...")
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000,
            log_level="info"
        )
    except Exception as e:
        print(f"❌ Erro ao iniciar: {e}")