import apiService from "./api";
import { API_ENDPOINTS } from "@/utils/constants";
import {
  RecognitionResult,
  RecognitionHistory,
  RecognitionStats,
  RecognitionLog,
} from "@/types";

class RecognitionService {
  private isDevelopment = true;

  // Identify face from File object (for upload)
  async identifyFace(file: File): Promise<RecognitionResult> {
    try {
      const response = await apiService.uploadFile(
        API_ENDPOINTS.RECOGNITION.UPLOAD,
        file
      );
      return response.data;
    } catch (error) {
      console.error("Recognition failed:", error);
      // Return mock data for demonstration
      return this.getMockRecognitionResult();
    }
  }

  // Identify face from base64 string (for webcam)
  async identifyFaceFromBase64(
    imageBase64: string,
    threshold?: number
  ): Promise<RecognitionResult> {
    try {
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
    } catch (error) {
      console.error("Base64 recognition failed:", error);
      return this.getMockRecognitionResult();
    }
  }

  // Get recognition logs
  async getRecognitionLogs(
    page: number = 1,
    size: number = 50,
    statusFilter?: string
  ): Promise<RecognitionLog[]> {
    try {
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
    } catch (error) {
      return this.getMockLogs();
    }
  }

  // Get recognition history
  async getRecognitionHistory(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{ items: RecognitionHistory[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.date_from) queryParams.append("date_from", params.date_from);
      if (params?.date_to) queryParams.append("date_to", params.date_to);

      const response = await apiService.get(
        `${API_ENDPOINTS.RECOGNITION.HISTORY}?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      return { items: this.getMockHistory(), total: 5 };
    }
  }

  // Get recognition statistics
  async getRecognitionStats(): Promise<RecognitionStats> {
    try {
      const response = await apiService.get(API_ENDPOINTS.RECOGNITION_STATS);
      return response.data;
    } catch (error) {
      return this.getMockStats();
    }
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
    return new Promise((resolve) => {
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
            resolve({
              recognized: false,
              status: "error",
              message: "Erro ao capturar frame",
            });
            return;
          }

          // Criar FormData para envio
          const formData = new FormData();
          formData.append("image", blob, "webcam-capture.jpg");
          formData.append("timestamp", Date.now().toString());
          formData.append("anti_spoofing", "true");

          if (this.isDevelopment) {
            // Simular processamento
            await new Promise((resolve) => setTimeout(resolve, 1000));
            resolve(this.getMockRecognitionResult());
          } else {
            // Enviar para backend
            const response = await fetch("/api/recognition/live-detection", {
              method: "POST",
              body: formData,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            resolve(await response.json());
          }
        },
        "image/jpeg",
        0.8
      );
    });
  }

  // Mock mais realista com anti-spoofing
  private getMockRecognitionResult(): RecognitionResult {
    const scenarios = [
      {
        recognized: true,
        person_id: "1",
        person_name: "João Silva",
        confidence: 0.94,
        status: "success" as const,
        liveness_score: 0.87, // Score de detecção de vida
        spoofing_detected: false,
        face_quality: "high",
      },
      {
        recognized: true,
        person_id: "2",
        person_name: "Maria Santos",
        confidence: 0.89,
        status: "success" as const,
        liveness_score: 0.92,
        spoofing_detected: false,
        face_quality: "medium",
      },
      {
        recognized: false,
        status: "error" as const,
        message: "Possível tentativa de spoofing detectada",
        liveness_score: 0.23,
        spoofing_detected: true,
        face_quality: "low",
      },
      {
        recognized: false,
        status: "no_face" as const,
        message: "Nenhum rosto detectado na imagem",
        liveness_score: 0.0,
        spoofing_detected: false,
      },
    ];

    return {
      ...scenarios[Math.floor(Math.random() * scenarios.length)],
      processing_time: Math.random() * 0.5 + 0.3,
    };
  }

  private getMockLogs(): RecognitionLog[] {
    return [
      {
        id: "1",
        person_id: "1",
        person_name: "João Silva",
        confidence: 0.94,
        image_path: "/uploads/recognition_1.jpg",
        status: "success",
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        processing_time: 0.8,
      },
      {
        id: "2",
        person_id: undefined,
        person_name: undefined,
        confidence: 0.45,
        image_path: "/uploads/recognition_2.jpg",
        status: "no_match",
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        processing_time: 0.7,
      },
    ];
  }

  private getMockHistory(): RecognitionHistory[] {
    return [
      {
        id: "1",
        person_id: "1",
        person_name: "João Silva",
        confidence: 0.94,
        image_path: "/uploads/recognition_1.jpg",
        recognized: true,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        processing_time: 0.8,
      },
      {
        id: "2",
        person_id: "2",
        person_name: "Maria Santos",
        confidence: 0.87,
        image_path: "/uploads/recognition_2.jpg",
        recognized: true,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        processing_time: 0.9,
      },
      {
        id: "3",
        person_id: undefined,
        person_name: undefined,
        confidence: 0.45,
        image_path: "/uploads/recognition_3.jpg",
        recognized: false,
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        processing_time: 0.7,
      },
    ];
  }

  private getMockStats(): RecognitionStats {
    return {
      total_recognitions: 456,
      successful_recognitions: 398,
      failed_recognitions: 58,
      average_confidence: 0.87,
      total_processing_time: 340.5,
      average_processing_time: 0.75,
    };
  }
}

export const recognitionService = new RecognitionService();
export default recognitionService;
