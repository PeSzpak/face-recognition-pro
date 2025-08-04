from pydantic import BaseModel, constr, validator

class PersonValidation(BaseModel):
    name: constr(min_length=1, max_length=100)
    photos: list[str]

    @validator('photos', each_item=True)
    def validate_photo(cls, photo):
        if not photo.endswith(('.png', '.jpg', '.jpeg')):
            raise ValueError('Photo must be a valid image format (png, jpg, jpeg)')
        return photo

class RecognitionRequestValidation(BaseModel):
    image: str

    @validator('image')
    def validate_image(cls, image):
        if not image.endswith(('.png', '.jpg', '.jpeg')):
            raise ValueError('Image must be a valid image format (png, jpg, jpeg)')
        return image

class UserValidation(BaseModel):
    username: constr(min_length=3, max_length=50)
    password: constr(min_length=6)

    @validator('username')
    def validate_username(cls, username):
        if not username.isalnum():
            raise ValueError('Username must be alphanumeric')
        return username