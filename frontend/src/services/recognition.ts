import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const recognitionService = {
  identifyFace: async (imageData: FormData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/recognition/identify`, imageData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Error identifying face: ' + error.message);
    }
  },

  recognizeFromWebcam: async (imageData: FormData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/recognition/webcam`, imageData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Error recognizing face from webcam: ' + error.message);
    }
  },

  getRecognitionLogs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/recognition/logs`);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching recognition logs: ' + error.message);
    }
  },

  getRecognitionStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/recognition/stats`);
      return response.data;
    } catch (error) {
      throw new Error('Error fetching recognition statistics: ' + error.message);
    }
  },
};

export default recognitionService;