import React, { useRef, useEffect, useState } from 'react';

const WebcamCapture: React.FC<{ onCapture: (image: string) => void }> = ({ onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        const getUserMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setIsStreaming(true);
                }
            } catch (error) {
                console.error("Error accessing webcam: ", error);
            }
        };

        getUserMedia();

        return () => {
            if (videoRef.current) {
                const stream = videoRef.current.srcObject as MediaStream;
                if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                }
            }
        };
    }, []);

    const captureImage = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(videoRef.current, 0, 0);
            const image = canvas.toDataURL('image/png');
            onCapture(image);
        }
    };

    return (
        <div>
            <video ref={videoRef} width="640" height="480" />
            {isStreaming && <button onClick={captureImage}>Capture</button>}
        </div>
    );
};

export default WebcamCapture;