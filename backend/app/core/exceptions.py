from fastapi import HTTPException, status


class FaceRecognitionException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class PersonNotFoundException(HTTPException):
    def __init__(self, person_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with ID {person_id} not found"
        )


class InvalidImageException(HTTPException):
    def __init__(self, detail: str = "Invalid image format or corrupted file"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class NoFaceDetectedException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the provided image"
        )


class MultipleFacesException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multiple faces detected. Please provide an image with a single face"
        )


class VectorDatabaseException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector database error: {detail}"
        )


class AuthenticationException(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )