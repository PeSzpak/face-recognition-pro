import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, RotateCcw } from 'lucide-react';
import { WebcamCaptureProps } from '@/types';

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsCaptured(true);
      onCapture(imageSrc);
    }
  };

  const retake = () => {
    setIsCaptured(false);
    setCapturedImage(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        {!isCaptured ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full max-w-md mx-auto rounded-lg"
          />
        ) : (
          <img
            src={capturedImage || ''}
            alt="Captured"
            className="w-full max-w-md mx-auto rounded-lg"
          />
        )}
      </div>
      
      <div className="flex justify-center space-x-4">
        {!isCaptured ? (
          <button
            onClick={capture}
            className="btn-primary flex items-center space-x-2"
          >
            <Camera className="h-4 w-4" />
            <span>Capture</span>
          </button>
        ) : (
          <button
            onClick={retake}
            className="btn-secondary flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retake</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;