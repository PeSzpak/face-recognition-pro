// Image processing utilities for the frontend

export class ImageUtils {
    // Convert File to base64
    static fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }
  
    // Convert base64 to blob
    static base64ToBlob(base64: string, contentType: string = 'image/jpeg'): Blob {
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: contentType });
    }
  
    // Resize image while maintaining aspect ratio
    static resizeImage(
      file: File, 
      maxWidth: number = 800, 
      maxHeight: number = 600, 
      quality: number = 0.8
    ): Promise<string> {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
  
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
  
          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;
  
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(resizedBase64);
        };
  
        img.onerror = () => reject(new Error('Failed to load image'));
        
        // Convert file to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  
    // Validate image file
    static validateImage(file: File): { isValid: boolean; error?: string } {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSize = 10 * 1024 * 1024; // 10MB
  
      if (!allowedTypes.includes(file.type)) {
        return {
          isValid: false,
          error: 'Invalid file type. Please upload JPEG or PNG images only.'
        };
      }
  
      if (file.size > maxSize) {
        return {
          isValid: false,
          error: 'File size too large. Maximum size is 10MB.'
        };
      }
  
      return { isValid: true };
    }
  
    // Create image preview
    static createImagePreview(file: File): Promise<string> {
      return this.resizeImage(file, 200, 200, 0.7);
    }
  
    // Get image dimensions
    static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
  
        img.onerror = () => reject(new Error('Failed to load image'));
  
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  
    // Compress image
    static compressImage(file: File, quality: number = 0.8): Promise<File> {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
  
        img.onload = () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          ctx?.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
  
        img.onerror = () => reject(new Error('Failed to load image'));
  
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  
    // Create thumbnail
    static createThumbnail(file: File, size: number = 150): Promise<string> {
      return this.resizeImage(file, size, size, 0.7);
    }
  
    // Extract EXIF data (basic)
    static getImageInfo(file: File): Promise<any> {
      return new Promise(async (resolve) => {
        try {
          const dimensions = await this.getImageDimensions(file);
          
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            dimensions,
            sizeFormatted: this.formatFileSize(file.size)
          });
        } catch (error) {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            sizeFormatted: this.formatFileSize(file.size)
          });
        }
      });
    }
  
    // Format file size
    static formatFileSize(bytes: number): string {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  
    // Check if image has face (basic check using face detection API)
    static async detectFaces(imageBase64: string): Promise<boolean> {
      try {
        // This would integrate with the backend face detection
        // For now, return true as placeholder
        return true;
      } catch (error) {
        console.error('Face detection failed:', error);
        return false;
      }
    }
  
    // Batch process images
    static async batchProcess(
      files: File[], 
      options: {
        resize?: boolean;
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
      } = {}
    ): Promise<string[]> {
      const {
        resize = true,
        maxWidth = 800,
        maxHeight = 600,
        quality = 0.8
      } = options;
  
      const processedImages: string[] = [];
  
      for (const file of files) {
        try {
          let processedImage: string;
          
          if (resize) {
            processedImage = await this.resizeImage(file, maxWidth, maxHeight, quality);
          } else {
            processedImage = await this.fileToBase64(file);
          }
          
          processedImages.push(processedImage);
        } catch (error) {
          console.error(`Failed to process image ${file.name}:`, error);
          // Skip failed images but continue processing others
        }
      }
  
      return processedImages;
    }
  }
  
  export default ImageUtils;