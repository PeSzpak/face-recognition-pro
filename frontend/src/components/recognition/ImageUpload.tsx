import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { RECOGNITION_CONFIG } from '@/utils/constants';
import ImageUtils from '@/utils/imageUtils';

interface ImageUploadProps {
  onImageSelect: (imageBase64: string) => void;
  isLoading?: boolean;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelect, 
  isLoading = false,
  className = ''
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate image
    const validation = ImageUtils.validateImage(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      // Process and resize image
      const processedImage = await ImageUtils.resizeImage(
        file,
        RECOGNITION_CONFIG.WEBCAM_WIDTH,
        RECOGNITION_CONFIG.WEBCAM_HEIGHT,
        0.8
      );

      setSelectedImage(processedImage);
      onImageSelect(processedImage);
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try again.');
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    maxSize: RECOGNITION_CONFIG.MAX_FILE_SIZE,
    disabled: isLoading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const clearImage = () => {
    setSelectedImage(null);
    setDragActive(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {selectedImage ? (
        // Image Preview
        <div className="relative">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
          />
          <button
            onClick={clearImage}
            disabled={isLoading}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <div className="loading-spinner" />
            </div>
          )}
        </div>
      ) : (
        // Upload Zone
        <div
          {...getRootProps()}
          className={`
            upload-zone cursor-pointer
            ${isDragActive || dragActive ? 'dragover' : ''}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-primary-100 rounded-full">
              {isDragActive ? (
                <Upload className="h-8 w-8 text-primary-600" />
              ) : (
                <ImageIcon className="h-8 w-8 text-primary-600" />
              )}
            </div>
            
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Drop the image here' : 'Upload an image'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Drag & drop an image here, or click to select
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Supported formats: JPEG, PNG</p>
                <p>Maximum size: {RECOGNITION_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB</p>
                <p>Best results with clear, front-facing photos</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;