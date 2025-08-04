import React, { useState } from 'react';
import { uploadImage, recognizeFace } from '../services/recognition';
import WebcamCapture from './WebcamCapture';
import ImageUpload from './ImageUpload';

const RecognitionPanel = () => {
    const [image, setImage] = useState(null);
    const [recognitionResult, setRecognitionResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleImageUpload = async (file) => {
        setLoading(true);
        setImage(file);
        const result = await recognizeFace(file);
        setRecognitionResult(result);
        setLoading(false);
    };

    const handleWebcamCapture = async (capturedImage) => {
        setLoading(true);
        const result = await recognizeFace(capturedImage);
        setRecognitionResult(result);
        setLoading(false);
    };

    return (
        <div className="recognition-panel">
            <h2>Face Recognition</h2>
            <div className="upload-section">
                <ImageUpload onUpload={handleImageUpload} />
                <WebcamCapture onCapture={handleWebcamCapture} />
            </div>
            {loading && <p>Loading...</p>}
            {recognitionResult && (
                <div className="result">
                    <h3>Recognition Result:</h3>
                    <p>{recognitionResult.name}</p>
                    <p>Confidence: {recognitionResult.confidence}</p>
                </div>
            )}
        </div>
    );
};

export default RecognitionPanel;