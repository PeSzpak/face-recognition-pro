import { useState } from 'react';

export const useImageUpload = () => {
    const [images, setImages] = useState<File[]>([]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newImages = Array.from(files);
            setImages(prevImages => [...prevImages, ...newImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prevImages => prevImages.filter((_, i) => i !== index));
    };

    const clearImages = () => {
        setImages([]);
    };

    return {
        images,
        handleImageChange,
        removeImage,
        clearImages,
    };
};

export const isImageFile = (file: File) => {
    return file && file['type'].startsWith('image/');
};

export const getImagePreviewUrl = (file: File) => {
    return URL.createObjectURL(file);
};