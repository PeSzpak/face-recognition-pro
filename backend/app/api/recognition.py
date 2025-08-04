from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.schemas.recognition import RecognitionRequest, RecognitionResponse
from app.services.face_recognition import recognize_face
from app.services.image_processor import process_image

router = APIRouter()

@router.post("/identify", response_model=RecognitionResponse)
async def identify_face(recognition_request: RecognitionRequest):
    try:
        image = await process_image(recognition_request.image)
        result = recognize_face(image)
        return RecognitionResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webcam", response_model=RecognitionResponse)
async def recognize_from_webcam(file: UploadFile = File(...)):
    try:
        image = await process_image(file)
        result = recognize_face(image)
        return RecognitionResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))