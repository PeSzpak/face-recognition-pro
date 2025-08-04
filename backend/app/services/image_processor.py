from PIL import Image
import numpy as np

def resize_image(image: Image.Image, target_size: tuple) -> Image.Image:
    return image.resize(target_size, Image.ANTIALIAS)

def normalize_image(image: np.ndarray) -> np.ndarray:
    return (image - np.mean(image)) / np.std(image)

def preprocess_image(image_path: str, target_size: tuple) -> np.ndarray:
    image = Image.open(image_path)
    image = resize_image(image, target_size)
    image_array = np.array(image)
    normalized_image = normalize_image(image_array)
    return normalized_image

def validate_image(image: np.ndarray) -> bool:
    if image is None or image.size == 0:
        return False
    if len(image.shape) != 3 or image.shape[2] != 3:
        return False
    return True