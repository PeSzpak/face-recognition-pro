import React, { useState } from 'react';

const ImageUpload: React.FC = () => {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const imagesArray = Array.from(files);
            setSelectedImages(imagesArray);
            const previews = imagesArray.map(file => URL.createObjectURL(file));
            setPreviewImages(previews);
        }
    };

    const handleRemoveImage = (index: number) => {
        const newSelectedImages = selectedImages.filter((_, i) => i !== index);
        const newPreviewImages = previewImages.filter((_, i) => i !== index);
        setSelectedImages(newSelectedImages);
        setPreviewImages(newPreviewImages);
    };

    const handleUpload = async () => {
        // Implement the upload logic here
        // This could involve sending the images to the backend API
    };

    return (
        <div className="image-upload">
            <input type="file" multiple accept="image/*" onChange={handleImageChange} />
            <div className="preview-container">
                {previewImages.map((image, index) => (
                    <div key={index} className="preview-image">
                        <img src={image} alt={`preview-${index}`} />
                        <button onClick={() => handleRemoveImage(index)}>Remove</button>
                    </div>
                ))}
            </div>
            <button onClick={handleUpload} disabled={selectedImages.length === 0}>
                Upload Images
            </button>
        </div>
    );
};

export default ImageUpload;