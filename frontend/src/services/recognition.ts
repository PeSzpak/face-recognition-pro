import { apiService } from './api';
import {
  RecognitionRequest,
  RecognitionResult,
  RecognitionLog,
  RecognitionStats
} from '@/types';
import { API_ENDPOINTS } from '@/utils/constants';

class RecognitionService {
  // Identify person from image
  async identifyFace(imageBase64: string, threshold?: number): Promise<RecognitionResult> {
    const formData = new FormData();
    formData.append('image_base64', imageBase64);
    
    if (threshold !== undefined) {
      formData.append('threshold', threshold.toString());
    }

    const response = await apiService.post<RecognitionResult>(
      API_ENDPOINTS.RECOGNITION_IDENTIFY,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response;
  }

  // Get recognition logs
  async getRecognitionLogs(
    page: number = 1,
    size: number = 50,
    statusFilter?: string
  ): Promise<RecognitionLog[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (statusFilter) {
      params.append('status_filter', statusFilter);
    }

    const response = await apiService.get<RecognitionLog[]>(
      `${API_ENDPOINTS.RECOGNITION_LOGS}?${params.toString()}`
    );

    return response;
  }

  // Get recognition statistics
  async getRecognitionStats(): Promise<RecognitionStats> {
    const response = await apiService.get<RecognitionStats>(
      API_ENDPOINTS.RECOGNITION_STATS
    );

    return response;
  }

  // Convert file to base64
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Validate image file
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Please upload a JPEG or PNG image.'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size too large. Please upload an image smaller than 10MB.'
      };
    }

    return { isValid: true };
  }

  // Process multiple images for batch recognition
  async batchRecognition(images: string[]): Promise<RecognitionResult[]> {
    const results: RecognitionResult[] = [];

    for (const imageBase64 of images) {
      try {
        const result = await this.identifyFace(imageBase64);
        results.push(result);
      } catch (error) {
        // Add error result for failed recognition
        results.push({
          person_id: undefined,
          person_name: undefined,
          confidence: 0,
          status: 'error',
          processing_time: 0,
          message: 'Recognition failed'
        });
      }
    }

    return results;
  }
}

export const recognitionService = new RecognitionService();