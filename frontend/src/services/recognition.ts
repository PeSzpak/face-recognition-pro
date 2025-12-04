import apiService from "./api";
import { API_ENDPOINTS } from "@/utils/constants";
import {
  RecognitionResult,
  RecognitionHistory,
  RecognitionStats,
  RecognitionLog,
} from "@/types";

class RecognitionService {
  // Identify face from File object (for upload)
  async identifyFace(file: File): Promise<RecognitionResult> {
    const response = await apiService.uploadFile(
      API_ENDPOINTS.RECOGNITION.UPLOAD,
      file
    );
    return response.data;
  }

  // Identify face from base64 string (for webcam)
  async identifyFaceFromBase64(
    imageBase64: string,
    threshold?: number
  ): Promise<RecognitionResult> {
    const formData = new FormData();
    formData.append("image_base64", imageBase64);

    if (threshold !== undefined) {
      formData.append("threshold", threshold.toString());
    }

    const response = await apiService.post(
      API_ENDPOINTS.RECOGNITION_IDENTIFY,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
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
      params.append("status_filter", statusFilter);
    }

    const response = await apiService.get(
      `${API_ENDPOINTS.RECOGNITION_LOGS}?${params.toString()}`
    );

    return response.data;
  }

  // Get recognition history
  async getRecognitionHistory(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{ items: RecognitionHistory[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.date_from) queryParams.append("date_from", params.date_from);
    if (params?.date_to) queryParams.append("date_to", params.date_to);

    const response = await apiService.get(
      `${API_ENDPOINTS.RECOGNITION.HISTORY}?${queryParams.toString()}`
    );
    return response.data;
  }

  // Get recognition statistics
  async getRecognitionStats(): Promise<RecognitionStats> {
    const response = await apiService.get(API_ENDPOINTS.RECOGNITION_STATS);
    return response.data;
  }

  // Batch recognition for multiple images
  async batchRecognition(files: File[]): Promise<RecognitionResult[]> {
    const results: RecognitionResult[] = [];

    for (const file of files) {
      try {
        const result = await this.identifyFace(file);
        results.push(result);
      } catch (error) {
        results.push({
          person_id: undefined,
          person_name: undefined,
          confidence: 0,
          processing_time: 0,
          recognized: false,
          status: "error",
          message: "Recognition failed",
        });
      }
    }

    return results;
  }

  // Convert file to base64 (utility)
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  // Validate image file
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Tipo de arquivo inválido. Use JPEG, PNG ou WebP.",
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "Arquivo muito grande. Tamanho máximo: 10MB.",
      };
    }

    return { isValid: true };
  }

  // Método otimizado com Blob
  async identifyFaceFromWebcam(
    videoElement: HTMLVideoElement
  ): Promise<RecognitionResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Capturar frame atual
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      // Converter para Blob (muito mais eficiente que base64)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error("Erro ao capturar frame"));
            return;
          }

          // Criar FormData para envio
          const formData = new FormData();
          formData.append("image", blob, "webcam-capture.jpg");
          formData.append("timestamp", Date.now().toString());
          formData.append("anti_spoofing", "true");

          try {
            // Enviar para backend
            const response = await fetch("/api/recognition/webcam", {
              method: "POST",
              body: formData,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("face_recognition_access_token")}`,
              },
            });

            const data = await response.json();
            resolve(data);
          } catch (error) {
            reject(error);
          }
        },
        "image/jpeg",
        0.8
      );
    });
  }

}

export const recognitionService = new RecognitionService();
export default recognitionService;
