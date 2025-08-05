from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import random
import cv2
import numpy as np
from PIL import Image
import io

app = FastAPI(title="Face Recognition API - Simple", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Face Recognition API is running!", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "face-recognition-api"}

# Auth endpoints (SEM /api prefix)
@app.post("/auth/login")
async def mock_login():
    return {
        "access_token": "mock_token_123",
        "token_type": "bearer",
        "user": {
            "id": "1",
            "username": "admin",
            "email": "admin@example.com"
        }
    }

@app.post("/auth/logout")
async def mock_logout():
    return {"message": "Logout successful"}

@app.post("/auth/refresh")
async def mock_refresh():
    return {
        "access_token": "new_mock_token_456",
        "token_type": "bearer"
    }

# Recognition endpoints
@app.post("/api/recognition/identify")
async def mock_recognition():
    # Simular processamento
    await asyncio.sleep(1)
    
    results = [
        {
            "person_id": "1",
            "person_name": "João Silva",
            "confidence": 0.94,
            "status": "success",
            "processing_time": 0.8,
            "recognized": True
        },
        {
            "person_id": "2", 
            "person_name": "Maria Santos",
            "confidence": 0.87,
            "status": "success",
            "processing_time": 0.9,
            "recognized": True
        },
        {
            "person_id": None,
            "person_name": None,
            "confidence": 0.45,
            "status": "no_match",
            "processing_time": 0.7,
            "recognized": False
        }
    ]
    
    return random.choice(results)

@app.post("/api/recognition/upload")
async def mock_upload():
    # Simular upload e processamento
    await asyncio.sleep(1.5)
    
    return {
        "person_id": "1",
        "person_name": "Pedro Silva",
        "confidence": 0.91,
        "status": "success",
        "processing_time": 1.2,
        "recognized": True,
        "face_location": {
            "top": 100,
            "right": 200,
            "bottom": 300,
            "left": 50
        }
    }

@app.post("/api/recognition/live-detection")
async def live_detection(
    image: UploadFile = File(...),
    timestamp: str = Form(...),
    anti_spoofing: str = Form(default="true")
):
    try:
        # Ler imagem
        image_data = await image.read()
        pil_image = Image.open(io.BytesIO(image_data))
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # ANTI-SPOOFING BÁSICO
        # 1. Detectar faces
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(cv_image, 1.1, 4)
        
        if len(faces) == 0:
            return {
                "recognized": False,
                "status": "no_face",
                "message": "Nenhum rosto detectado"
            }
        
        # 2. Análise de qualidade da imagem
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Calcular nitidez (Laplacian variance)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Calcular brilho médio
        brightness = np.mean(gray)
        
        # DETECÇÃO DE SPOOFING
        spoofing_detected = False
        liveness_score = 0.8
        
        # Regras básicas de anti-spoofing
        if sharpness < 100:  # Imagem muito borrada
            spoofing_detected = True
            liveness_score = 0.2
        elif brightness < 50 or brightness > 200:  # Muito escura ou clara
            spoofing_detected = True
            liveness_score = 0.3
        
        if spoofing_detected:
            return {
                "recognized": False,
                "status": "spoofing_detected",
                "message": "Possível tentativa de spoofing detectada",
                "liveness_score": liveness_score,
                "spoofing_detected": True,
                "quality_metrics": {
                    "sharpness": float(sharpness),
                    "brightness": float(brightness)
                }
            }
        
        # Simular reconhecimento facial
        await asyncio.sleep(0.5)
        
        return {
            "recognized": True,
            "person_id": "1",
            "person_name": "Usuário Detectado",
            "confidence": 0.91,
            "status": "success",
            "liveness_score": liveness_score,
            "spoofing_detected": False,
            "processing_time": 0.5,
            "quality_metrics": {
                "sharpness": float(sharpness),
                "brightness": float(brightness)
            }
        }
        
    except Exception as e:
        return {
            "recognized": False,
            "status": "error",
            "message": f"Erro no processamento: {str(e)}"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)